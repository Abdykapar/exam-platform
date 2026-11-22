"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  api,
  ApiError,
  isCountedViolation,
  type ClientViolationType,
  type ProctoringSettings,
  type ProctorState,
  type ViolationType,
} from "@/lib/api";

const HEARTBEAT_MS = 10_000;
const MIN_BLUR_MS = 300; // shorter blurs are OS noise (notifications, IME popups)
const FULLSCREEN_SETTLE_MS = 300; // lets a blur that caused the exit claim it first
const BLOCKED_REPEAT_MS = 2_000; // one log entry per held-down key or click burst
const WARNING_MS = 8_000;

const BLOCKED_COMBOS = new Set(["KeyC", "KeyV", "KeyX", "KeyP", "KeyS", "KeyU", "KeyA"]);
const DEVTOOLS_COMBOS = new Set(["KeyI", "KeyJ", "KeyC"]);

/** Chromium-only parts of the Window Management API, not yet in lib.dom. */
interface ScreenDetails {
  isExtended?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
}
interface NavigatorUAData {
  userAgentData?: { brands: { brand: string }[] };
}

const screenDetails = () => window.screen as Screen & ScreenDetails;

/** True when a second monitor is attached (Chromium only; other browsers report false). */
export const hasExtendedScreen = () => typeof window !== "undefined" && screenDetails().isExtended === true;

const isChromium = () =>
  !!(navigator as Navigator & NavigatorUAData).userAgentData?.brands.some(b => b.brand === "Chromium");

const noopSubscribe = () => () => {};

/** Chrome/Edge/other Chromium; `true` on the server so no notice flashes during hydration. */
export function useIsChromium() {
  return useSyncExternalStore(noopSubscribe, isChromium, () => true);
}

function subscribeFullscreen(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

export function useIsFullscreen() {
  return useSyncExternalStore(subscribeFullscreen, () => !!document.fullscreenElement, () => false);
}

export async function enterFullscreen(): Promise<boolean> {
  if (document.fullscreenElement) return true;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    return true;
  } catch {
    return false;
  }
}

export interface ProctorWarning {
  id: number;
  type: ViolationType;
  counted: boolean;
  /** Counted violations left before auto-submit. */
  remaining: number;
}

export interface ExamProctorOptions {
  attemptId: string;
  settings: ProctoringSettings;
  /** Server count when the attempt was loaded (non-zero on resume). */
  initialViolations?: number;
  /** Listen only while the exam is actually running. */
  active: boolean;
  /** Called once when the server ends the attempt, or the limit is hit and the server can't be reached. */
  onAutoSubmit: (violations: number) => void;
  /** Runs before a counted violation is sent, e.g. flushing answers so an auto-submit grades them. */
  beforeReport?: () => Promise<unknown>;
}

export function useExamProctor({
  attemptId,
  settings,
  initialViolations = 0,
  active,
  onAutoSubmit,
  beforeReport,
}: ExamProctorOptions) {
  const max = settings.maxViolations;
  const [count, setCount] = useState(initialViolations);
  const [warning, setWarning] = useState<ProctorWarning | null>(null);
  const [locked, setLocked] = useState(false);
  const isFullscreen = useIsFullscreen();

  const countRef = useRef(initialViolations);
  const finished = useRef(false);
  const pending = useRef(0);
  const callbacks = useRef({ onAutoSubmit, beforeReport });
  useEffect(() => {
    callbacks.current = { onAutoSubmit, beforeReport };
  });

  const listening = settings.enabled && active && !locked;

  const setBoth = useCallback((n: number) => {
    countRef.current = n;
    setCount(n);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setLocked(true);
    callbacks.current.onAutoSubmit(countRef.current);
  }, []);

  /** The server's count is the source of truth, in both directions. */
  const apply = useCallback((s: ProctorState) => {
    setBoth(s.violationCount);
    if (s.status !== "in_progress") finish();
    else setLocked(false);
  }, [finish, setBoth]);

  const onError = useCallback((err: unknown) => {
    // 409: the attempt is already over (auto-submitted by another request, or submitted)
    if (err instanceof ApiError && err.status === 409) finish();
  }, [finish]);

  const report = useCallback(async (type: ClientViolationType, durationMs?: number) => {
    if (finished.current) return;
    const counted = isCountedViolation(type);
    if (counted) setBoth(countRef.current + 1);
    const reachedLimit = counted && countRef.current >= max;
    // Disable the exam immediately; the server confirms (or overrules) below
    if (reachedLimit) setLocked(true);
    setWarning({ id: Date.now(), type, counted, remaining: Math.max(0, max - countRef.current) });

    pending.current++;
    try {
      if (counted) await callbacks.current.beforeReport?.().catch(() => undefined);
      const res = await api.proctoring.report({
        attemptId,
        type,
        at: new Date().toISOString(),
        ...(durationMs !== undefined && { durationMs: Math.round(durationMs) }),
      });
      apply(res.data);
    } catch (err) {
      onError(err);
      // Server unreachable at the limit: end the exam from the client side
      if (reachedLimit && !(err instanceof ApiError && err.status > 0)) finish();
    } finally {
      pending.current--;
    }
  }, [attemptId, max, apply, onError, finish, setBoth]);

  // Detection
  useEffect(() => {
    if (!listening) return;
    let hiddenAt: number | null = null;
    let blurAt: number | null = null;
    let fullscreenTimer: ReturnType<typeof setTimeout> | undefined;
    const lastBlocked = new Map<ClientViolationType, number>();

    const away = () => hiddenAt !== null || blurAt !== null;

    const blocked = (e: Event, type: ClientViolationType) => {
      e.preventDefault();
      const now = Date.now();
      if (now - (lastBlocked.get(type) ?? 0) < BLOCKED_REPEAT_MS) return;
      lastBlocked.set(type, now);
      void report(type);
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        blurAt = null; // the tab switch owns this episode, so it's counted once
      } else if (hiddenAt !== null) {
        const ms = Date.now() - hiddenAt;
        hiddenAt = null;
        void report("tab_hidden", ms);
      }
    };

    const onBlur = () => {
      if (!document.hidden) blurAt = Date.now();
    };

    const onFocus = () => {
      if (blurAt === null) return;
      const ms = Date.now() - blurAt;
      blurAt = null;
      if (ms >= MIN_BLUR_MS) void report("window_blur", ms);
    };

    const onFullscreen = () => {
      if (!settings.requireFullscreen || document.fullscreenElement) return;
      clearTimeout(fullscreenTimer);
      // Alt+Tab or the Windows key can exit fullscreen and blur together: count that once, as time away
      fullscreenTimer = setTimeout(() => {
        if (!away() && !document.fullscreenElement) void report("fullscreen_exit");
      }, FULLSCREEN_SETTLE_MS);
    };

    const onScreenChange = () => {
      if (screenDetails().isExtended) void report("multiple_monitors");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const devtools =
        e.key === "F12" ||
        (mod && e.shiftKey && DEVTOOLS_COMBOS.has(e.code)) ||
        (e.metaKey && e.altKey && DEVTOOLS_COMBOS.has(e.code)); // macOS Cmd+Opt+I/J/C
      if (devtools) return blocked(e, "devtools_shortcut");
      if (mod && BLOCKED_COMBOS.has(e.code)) return blocked(e, "blocked_shortcut");
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // The OS takes the screenshot before the browser sees the key, so this can only be logged
      if (e.key !== "PrintScreen") return;
      navigator.clipboard?.writeText("").catch(() => undefined);
      void report("print_screen");
    };

    const onCopy = (e: ClipboardEvent) => blocked(e, e.type as "copy" | "cut" | "paste");
    const onContextMenu = (e: MouseEvent) => blocked(e, "context_menu");
    const onSelectStart = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => e.preventDefault();

    const scr = screenDetails();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreen);
    scr.addEventListener?.("change", onScreenChange);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    for (const t of ["copy", "cut", "paste"] as const) document.addEventListener(t, onCopy, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("selectstart", onSelectStart, true);
    document.addEventListener("dragstart", onDragStart, true);

    return () => {
      clearTimeout(fullscreenTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreen);
      scr.removeEventListener?.("change", onScreenChange);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      for (const t of ["copy", "cut", "paste"] as const) document.removeEventListener(t, onCopy, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("selectstart", onSelectStart, true);
      document.removeEventListener("dragstart", onDragStart, true);
    };
  }, [listening, settings.requireFullscreen, report]);

  // Heartbeat: only while the student is actually looking at the exam. Silence the
  // client didn't explain becomes a server-side `heartbeat_missed`.
  useEffect(() => {
    if (!listening) return;
    const beat = () => {
      if (document.visibilityState !== "visible" || !document.hasFocus() || pending.current > 0) return;
      api.proctoring.heartbeat(attemptId).then(res => apply(res.data)).catch(onError);
    };
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [listening, attemptId, apply, onError]);

  // Auto-dismiss the warning banner
  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => setWarning(null), WARNING_MS);
    return () => clearTimeout(t);
  }, [warning]);

  return {
    violations: Math.min(count, max),
    maxViolations: max,
    warning,
    dismissWarning: useCallback(() => setWarning(null), []),
    isFullscreen,
    /** Content must be unusable until the student is back in fullscreen. */
    needsFullscreen: listening && settings.requireFullscreen && !isFullscreen,
    locked,
  };
}
