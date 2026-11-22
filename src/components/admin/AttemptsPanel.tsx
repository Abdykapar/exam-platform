"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Flag, ShieldAlert, ShieldCheck } from "lucide-react";
import { api, VIOLATION_LABELS, type AttemptStatus, type InstructorAttempt, type Violation } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import { ErrorBanner, errMsg } from "./ui";

const STATUS: Record<AttemptStatus, { label: string; cls: string }> = {
  in_progress: { label: "In progress", cls: "bg-sky-100 text-sky-700" },
  submitted: { label: "Submitted", cls: "bg-emerald-100 text-emerald-700" },
  timed_out: { label: "Timed out", cls: "bg-amber-100 text-amber-700" },
  auto_submitted: { label: "Auto-submitted", cls: "bg-red-100 text-red-700" },
};

const studentName = (a: InstructorAttempt) =>
  a.user ? `${a.user.firstName} ${a.user.lastName}`.trim() || a.user.email : "Deleted user";

/** "0.4s", "12s", "02:05" */
function formatAway(ms: number) {
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return formatDuration(ms / 1000);
}

/** Every attempt at an exam, flagged by proctoring violations, with a per-attempt timeline. */
export default function AttemptsPanel({ examId }: { examId: string }) {
  const [attempts, setAttempts] = useState<InstructorAttempt[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.instructor.exams.attempts(examId)
      .then(res => setAttempts(res.data.attempts))
      .catch(err => setError(errMsg(err, "Failed to load attempts")));
  }, [examId]);

  if (error) return <ErrorBanner message={error} />;
  if (!attempts) return <div className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />;
  if (!attempts.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
        No one has taken this exam yet.
      </div>
    );
  }

  const flagged = attempts.filter(a => a.violationCount > 0).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        {attempts.length} attempt{attempts.length > 1 ? "s" : ""}
        {flagged > 0 && <> · <span className="text-red-600 font-semibold">{flagged} flagged</span></>}
      </p>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {attempts.map(a => {
          const isOpen = open === a._id;
          const status = STATUS[a.status];
          const logged = a.loggedEvents ?? 0;
          return (
            <div key={a._id}>
              <button onClick={() => setOpen(isOpen ? null : a._id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                {isOpen ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800 truncate">{studentName(a)}</div>
                  <div className="text-xs text-slate-400 truncate">{a.user?.email} · {formatDate(a.startedAt)}</div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  {a.violationCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      <Flag size={11} /> {a.violationCount} violation{a.violationCount > 1 ? "s" : ""}
                    </span>
                  ) : logged > 0 ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{logged} blocked</span>
                  ) : null}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                  {a.status !== "in_progress" && (
                    <span className={`text-sm font-bold w-12 text-right ${a.passed ? "text-emerald-600" : "text-red-600"}`}>{a.score}%</span>
                  )}
                </div>
              </button>
              {isOpen && <Timeline attempt={a} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timeline({ attempt }: { attempt: InstructorAttempt }) {
  const [violations, setViolations] = useState<Violation[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.instructor.attempts.violations(attempt._id)
      .then(res => setViolations(res.data.violations))
      .catch(err => setError(errMsg(err, "Failed to load the timeline")));
  }, [attempt._id]);

  const started = new Date(attempt.startedAt).getTime();

  return (
    <div className="px-4 pb-4 pl-11 bg-slate-50/60">
      {error ? <ErrorBanner message={error} /> : !violations ? (
        <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
      ) : violations.length === 0 ? (
        <p className="flex items-center gap-2 py-3 text-sm text-emerald-700">
          <ShieldCheck size={16} /> No proctoring events recorded.
        </p>
      ) : (
        <ol className="relative border-l border-slate-200 ml-1.5 py-2 space-y-3">
          {violations.map(v => {
            const at = new Date(v.serverAt);
            return (
              <li key={v._id} className="ml-4">
                <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ${v.counted ? "bg-red-500" : "bg-slate-400"}`} />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                  <span className="font-mono text-xs text-slate-500">
                    {at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    <span className="text-slate-400"> (+{formatDuration((at.getTime() - started) / 1000)})</span>
                  </span>
                  <span className={`font-semibold ${v.counted ? "text-red-700" : "text-slate-700"}`}>
                    {v.counted && <ShieldAlert size={13} className="inline mr-1 -mt-0.5" />}
                    {VIOLATION_LABELS[v.type] ?? v.type}
                  </span>
                  {v.durationMs != null && <span className="text-xs text-slate-500">away {formatAway(v.durationMs)}</span>}
                  {!v.counted && <span className="text-xs text-slate-400">blocked, not counted</span>}
                </div>
                {(v.ip || v.userAgent) && (
                  <div className="text-[11px] text-slate-400 truncate" title={v.userAgent}>
                    {v.ip}{v.ip && v.userAgent && " · "}{v.userAgent}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
