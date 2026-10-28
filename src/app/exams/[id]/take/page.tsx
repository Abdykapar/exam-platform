"use client";
import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, BookOpen, AlertCircle, Flag, Check, Loader2 } from "lucide-react";
import { api, type Answer, type TakingView } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDuration, OPTION_LETTERS } from "@/lib/format";

type SaveState = "idle" | "saving" | "saved" | "error";

const isAnswered = (a?: Answer) => !!a && (a.selectedIndex != null || (a.selectedIndexes?.length ?? 0) > 0);

export default function TakeExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [view, setView] = useState<TakingView | null>(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const started = useRef(false);
  const submitted = useRef(false);
  const dirty = useRef(false);
  const clockOffset = useRef(0); // server time − client time, in ms

  // Start (or resume) the attempt once the user is known
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/exams/${id}/take`)}`);
      return;
    }
    if (started.current) return;
    started.current = true;
    api.exams.start(id)
      .then(res => {
        const v = res.data;
        clockOffset.current = new Date(v.serverNow).getTime() - Date.now();
        setAnswers(Object.fromEntries(v.attempt.answers.map(a => [a.questionIndex, a])));
        setView(v);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Could not start the exam"));
  }, [authLoading, user, id, router]);

  const attemptId = view?.attempt._id;

  const submit = useCallback(async (timedOut = false) => {
    if (!attemptId || submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      await api.attempts.submit(attemptId, { answers: Object.values(answers), timedOut });
      router.push(`/exams/${id}/results?attempt=${attemptId}`);
    } catch (err) {
      submitted.current = false;
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Submission failed, please try again");
    }
  }, [attemptId, answers, id, router]);

  // Timer, driven by the server's expiresAt
  useEffect(() => {
    if (!view) return;
    const expiresAt = new Date(view.attempt.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - (Date.now() + clockOffset.current)) / 1000));
      setTimeLeft(left);
      if (left === 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [view, submit]);

  // Autosave, debounced
  useEffect(() => {
    if (!attemptId || !dirty.current) return;
    const t = setTimeout(() => {
      setSaveState("saving");
      api.attempts.saveAnswers(attemptId, Object.values(answers))
        .then(() => { dirty.current = false; setSaveState("saved"); })
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, attemptId]);

  // Warn before leaving mid-exam
  useEffect(() => {
    if (!view) return;
    const warn = (e: BeforeUnloadEvent) => { if (!submitted.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [view]);

  const questions = view?.exam.questions ?? [];
  const q = questions[current];

  const update = useCallback((index: number, patch: Partial<Answer>) => {
    dirty.current = true;
    setAnswers(prev => ({ ...prev, [index]: { ...prev[index], ...patch, questionIndex: index } }));
  }, []);

  const select = useCallback((optIdx: number) => {
    if (!q) return;
    if (q.type === "multiple") {
      const sel = answers[current]?.selectedIndexes ?? [];
      update(current, { selectedIndexes: sel.includes(optIdx) ? sel.filter(i => i !== optIdx) : [...sel, optIdx] });
    } else {
      update(current, { selectedIndex: optIdx });
    }
  }, [q, answers, current, update]);

  const toggleFlag = useCallback(() => update(current, { isFlagged: !answers[current]?.isFlagged }), [answers, current, update]);

  // Keyboard: 1–6 select, ←/→ navigate, F flags
  useEffect(() => {
    if (!q || confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) select(n - 1);
      else if (e.key === "ArrowRight") setCurrent(c => Math.min(questions.length - 1, c + 1));
      else if (e.key === "ArrowLeft") setCurrent(c => Math.max(0, c - 1));
      else if (e.key.toLowerCase() === "f") toggleFlag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, questions.length, confirming, select, toggleFlag]);

  if (error && !view) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
          <p className="font-bold text-slate-800 mb-6">{error}</p>
          <Link href={`/exams/${id}`} className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            Back to exam
          </Link>
        </div>
      </div>
    );
  }

  if (!view || !q || timeLeft === null) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 gap-2">
        <Loader2 size={18} className="animate-spin" /> Preparing your exam…
      </div>
    );
  }

  const totalTime = view.exam.duration * 60;
  const timePercent = (timeLeft / totalTime) * 100;
  const timerColor = timeLeft < 60 ? "text-red-600 animate-pulse" : timeLeft < 300 ? "text-red-500" : timeLeft < 600 ? "text-amber-500" : "text-emerald-500";
  const answeredCount = questions.filter((_, i) => isAnswered(answers[i])).length;
  const unanswered = questions.map((_, i) => i).filter(i => !isAnswered(answers[i]));
  const flagged = questions.map((_, i) => i).filter(i => answers[i]?.isFlagged);
  const a = answers[current];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shrink-0"><BookOpen size={14} className="text-white" /></div>
            <span className="font-bold text-slate-800 text-sm truncate">{view.exam.title}</span>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timerColor}`}>
            <Clock size={18} />
            {formatDuration(timeLeft)}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400 w-20 justify-end">
              {saveState === "saving" && <><Loader2 size={12} className="animate-spin" /> Saving…</>}
              {saveState === "saved" && <><Check size={12} className="text-emerald-500" /> Saved</>}
              {saveState === "error" && <span className="text-red-500">Not saved</span>}
            </span>
            <button onClick={() => setConfirming(true)} disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
              Submit Exam
            </button>
          </div>
        </div>
        {/* Timer bar */}
        <div className="h-1 bg-slate-200">
          <div className={`h-full transition-all duration-1000 ${timeLeft < 300 ? "bg-red-500" : timeLeft < 600 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${timePercent}%` }} />
        </div>
      </header>

      {error && (
        <div className="max-w-5xl mx-auto w-full px-4 pt-4">
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 grid lg:grid-cols-4 gap-6">

        {/* Question panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Question {current + 1} of {questions.length}</span>
            <span>{answeredCount} answered · {flagged.length} flagged</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-line">{q.text}</h2>
              <button onClick={toggleFlag} title="Flag for review (F)"
                className={`shrink-0 p-2 rounded-lg transition-colors ${a?.isFlagged ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500"}`}>
                <Flag size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              {q.type === "multiple" ? "Select all correct answers" : "Select one answer"} · {q.points} point{q.points > 1 ? "s" : ""}
            </p>

            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const selected = q.type === "multiple" ? !!a?.selectedIndexes?.includes(i) : a?.selectedIndex === i;
                return (
                  <button key={i} onClick={() => select(i)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                    }`}>
                    <span className={`inline-flex w-7 h-7 items-center justify-center mr-3 text-xs font-bold ${
                      q.type === "multiple" ? "rounded-md" : "rounded-full"
                    } ${selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {q.type === "multiple" && selected ? <Check size={14} /> : OPTION_LETTERS[i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} /> Previous
            </button>
            {current === questions.length - 1 ? (
              <button onClick={() => setConfirming(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors">
                Finish <Check size={16} />
              </button>
            ) : (
              <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors">
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 text-center hidden sm:block">
            Shortcuts: 1–{q.options.length} select · ← → navigate · F flag
          </p>
        </div>

        {/* Question navigator */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-24">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, i) => {
                const isCurrent = i === current;
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${
                      isCurrent ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                    } ${
                      answers[i]?.isFlagged ? "bg-amber-100 text-amber-700 border border-amber-300" :
                      isAnswered(answers[i]) ? "bg-indigo-600 text-white" :
                      "bg-slate-100 text-slate-500 hover:bg-indigo-50"
                    }`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2">
              {[
                { color: "bg-indigo-600", label: "Answered" },
                { color: "bg-amber-100 border border-amber-300", label: "Flagged" },
                { color: "bg-slate-100", label: "Not answered" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${color}`} />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            {unanswered.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{unanswered.length} question{unanswered.length > 1 ? "s" : ""} unanswered</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit confirmation */}
      {confirming && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => !submitting && setConfirming(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Submit your exam?</h2>
            <p className="text-sm text-slate-500 mb-5">You can&apos;t change your answers after submitting.</p>
            {[
              { list: unanswered, label: "Unanswered", style: "bg-red-50 text-red-700 border-red-200" },
              { list: flagged, label: "Flagged for review", style: "bg-amber-50 text-amber-700 border-amber-200" },
            ].filter(g => g.list.length > 0).map(g => (
              <div key={g.label} className={`mb-3 p-3 rounded-xl border text-sm ${g.style}`}>
                <div className="font-semibold mb-2">{g.label}: {g.list.length}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.list.map(i => (
                    <button key={i} onClick={() => { setCurrent(i); setConfirming(false); }}
                      className="w-8 h-8 rounded-lg bg-white border border-current text-xs font-bold hover:opacity-80">
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirming(false)} disabled={submitting}
                className="flex-1 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">
                Keep working
              </button>
              <button onClick={() => submit()} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
                {submitting && <Loader2 size={16} className="animate-spin" />} Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
