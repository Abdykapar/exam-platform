"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2, Maximize, Monitor, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { VIOLATION_LABELS, type ProctoringSettings } from "@/lib/api";
import { enterFullscreen, hasExtendedScreen, useExamProctor, useIsChromium } from "./useExamProctor";

export interface ExamGuardProps {
  settings: ProctoringSettings;
  examTitle: string;
  /** Null until `onStart` has created (or resumed) the attempt. */
  attemptId: string | null;
  initialViolations?: number;
  /** Creates or resumes the attempt. Runs after fullscreen is entered. */
  onStart: () => Promise<void>;
  onAutoSubmit: (violations: number) => void;
  beforeReport?: () => Promise<unknown>;
  /** False once the exam has been submitted normally: stops all detection. */
  active?: boolean;
  children: ReactNode;
}

/**
 * Wraps a proctored exam: a start screen with the rules, then the exam with
 * violation detection, warnings and a fullscreen lock. Detection only deters and
 * records. The server counts violations and decides when to auto-submit.
 */
export default function ExamGuard(props: ExamGuardProps) {
  const [started, setStarted] = useState(false);
  if (!started || !props.attemptId) {
    return <StartScreen {...props} onStarted={() => setStarted(true)} />;
  }
  return <ActiveExam key={props.attemptId} {...props} attemptId={props.attemptId} />;
}

function StartScreen({
  settings,
  examTitle,
  onStart,
  onStarted,
}: Pick<ExamGuardProps, "settings" | "examTitle" | "onStart"> & { onStarted: () => void }) {
  const chromium = useIsChromium();
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  // Fullscreen needs a user gesture, so it's requested directly in the click handler
  const start = async () => {
    setError("");
    if (hasExtendedScreen()) {
      setError("A second monitor is connected. Disconnect all extra displays, then try again.");
      return;
    }
    setStarting(true);
    if (settings.requireFullscreen && !(await enterFullscreen())) {
      setStarting(false);
      setError("Your browser blocked fullscreen. Allow fullscreen for this site and try again.");
      return;
    }
    try {
      await onStart();
      onStarted();
    } catch (err) {
      setStarting(false);
      setError(err instanceof Error ? err.message : "Could not start the exam");
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    }
  };

  const rules = [
    settings.requireFullscreen && "The exam runs in fullscreen. Leaving fullscreen locks the exam until you return.",
    "Don't switch tabs, minimize the browser or open other apps.",
    "Use one monitor only. Disconnect any extra displays before you start.",
    "Copying, pasting, right-clicking, printing and developer tools are blocked and logged.",
    `After ${settings.maxViolations} violation${settings.maxViolations > 1 ? "s" : ""} your exam is submitted automatically with the answers saved so far.`,
    "Your answers are saved automatically as you go.",
  ].filter((r): r is string => !!r);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Proctored exam</p>
            <h1 className="text-xl font-extrabold text-slate-900 truncate">{examTitle}</h1>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5">
          {rules.map(rule => (
            <li key={rule} className="flex gap-2.5 text-sm text-slate-600">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              {rule}
            </li>
          ))}
        </ul>

        {!chromium && (
          <div className="mt-6 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>For the most reliable exam experience, use Google Chrome or Microsoft Edge. Some checks, like detecting a second monitor, only work there.</span>
          </div>
        )}

        {error && (
          <div className="mt-6 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
            <Monitor size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button onClick={start} disabled={starting}
          className="mt-8 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors">
          {starting ? <Loader2 size={18} className="animate-spin" /> : <Maximize size={18} />}
          Start exam
        </button>
      </div>
    </div>
  );
}

function ActiveExam({
  settings,
  attemptId,
  initialViolations,
  onAutoSubmit,
  beforeReport,
  active = true,
  children,
}: ExamGuardProps & { attemptId: string }) {
  const proctor = useExamProctor({ attemptId, settings, initialViolations, active, onAutoSubmit, beforeReport });
  const { violations, maxViolations, warning, needsFullscreen, locked } = proctor;
  const blocked = active && (locked || needsFullscreen);
  const overlay = useRef<HTMLDivElement>(null);

  // Client-side navigation to the results keeps the document fullscreen; leave it
  useEffect(() => () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }, []);

  // `inert` stops clicks and focus, but not window-level shortcuts (1–6, arrows, F)
  useEffect(() => {
    if (!blocked) return;
    const swallow = (e: KeyboardEvent) => {
      if (e.target instanceof Node && overlay.current?.contains(e.target)) return;
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("keydown", swallow, true);
    return () => window.removeEventListener("keydown", swallow, true);
  }, [blocked]);

  const badgeColor =
    violations === 0 ? "bg-white text-slate-600 border-slate-200" :
    violations < maxViolations ? "bg-amber-50 text-amber-700 border-amber-300" :
    "bg-red-50 text-red-700 border-red-300";

  return (
    <>
      <div inert={blocked} className="select-none">{children}</div>

      {active && (
        <div className={`fixed bottom-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm text-xs font-bold ${badgeColor}`}>
          <ShieldAlert size={14} /> Violations: {violations}/{maxViolations}
        </div>
      )}

      {active && warning && !locked && (
        <div role="alert" key={warning.id}
          className="fixed top-16 inset-x-0 z-40 mx-auto max-w-xl px-4">
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${warning.counted ? "bg-red-600" : "bg-slate-800"}`}>
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{VIOLATION_LABELS[warning.type]}</p>
              <p className="text-white/85">
                {warning.counted
                  ? `This was recorded as a violation. ${warning.remaining} warning${warning.remaining === 1 ? "" : "s"} left before your exam is submitted automatically.`
                  : "This action is blocked during the exam and has been logged."}
              </p>
            </div>
            <button onClick={proctor.dismissWarning} aria-label="Dismiss" className="text-white/70 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {active && needsFullscreen && !locked && (
        <div ref={overlay} className="fixed inset-0 z-[60] bg-slate-900/95 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <Maximize size={40} className="mx-auto text-indigo-600 mb-4" />
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Return to fullscreen</h2>
            <p className="text-sm text-slate-500 mb-6">
              You left fullscreen, and this was recorded. The exam stays locked until you go back. Your timer keeps running.
            </p>
            <button onClick={() => void enterFullscreen()} autoFocus
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors">
              <Maximize size={18} /> Re-enter fullscreen
            </button>
          </div>
        </div>
      )}

      {active && locked && (
        <div ref={overlay} className="fixed inset-0 z-[60] bg-slate-900/95 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <ShieldAlert size={40} className="mx-auto text-red-600 mb-4" />
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Exam submitted due to violations</h2>
            <p className="text-sm text-slate-500">
              You reached {maxViolations} violation{maxViolations > 1 ? "s" : ""}. Your exam was submitted with the answers saved so far. Redirecting to your results…
            </p>
            <Loader2 size={20} className="animate-spin mx-auto mt-5 text-slate-400" />
          </div>
        </div>
      )}
    </>
  );
}
