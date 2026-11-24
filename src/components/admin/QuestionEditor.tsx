"use client";
import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { DEFAULT_TIME_LIMIT, type InstructorQuestion, type QuestionInput, type QuestionType } from "@/lib/api";
import { OPTION_LETTERS } from "@/lib/format";
import { btnPrimary, btnSecondary, ErrorBanner, errMsg, Field, inputCls } from "./ui";

const MAX_OPTIONS = 6;

function initialCorrect(q?: InstructorQuestion): number[] {
  if (!q) return [];
  if (q.type === "multiple") return q.correctIndexes ?? [];
  return q.correctIndex != null ? [q.correctIndex] : [];
}

export default function QuestionEditor({
  initial,
  number,
  timed,
  onSave,
  onCancel,
}: {
  initial?: InstructorQuestion;
  number: number;
  /** The exam uses per-question timing, so show the time field. */
  timed: boolean;
  onSave: (input: QuestionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "single");
  const [text, setText] = useState(initial?.text ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", "", "", ""]);
  const [correct, setCorrect] = useState<number[]>(() => initialCorrect(initial));
  const [points, setPoints] = useState(String(initial?.points ?? 1));
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [timeLimit, setTimeLimit] = useState(String(initial?.timeLimit ?? DEFAULT_TIME_LIMIT));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const changeType = (t: QuestionType) => {
    setType(t);
    if (t === "single") setCorrect(c => c.slice(0, 1));
  };

  const toggleCorrect = (i: number) =>
    setCorrect(c => (type === "single" ? [i] : c.includes(i) ? c.filter(x => x !== i) : [...c, i]));

  const setOption = (i: number, value: string) => setOptions(o => o.map((x, j) => (j === i ? value : x)));

  const removeOption = (i: number) => {
    setOptions(o => o.filter((_, j) => j !== i));
    // Keep the correct markers pointing at the same options
    setCorrect(c => c.filter(x => x !== i).map(x => (x > i ? x - 1 : x)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = options.map(o => o.trim());
    if (trimmed.some(o => !o)) return setError("Fill in every option, or remove the empty ones.");
    if (!correct.length) return setError(type === "single" ? "Mark the correct answer." : "Mark at least one correct answer.");

    setError("");
    setSaving(true);
    try {
      const sorted = [...correct].sort((a, b) => a - b);
      await onSave({
        type,
        text: text.trim(),
        options: trimmed,
        points: Number(points) || 1,
        explanation: explanation.trim(),
        timeLimit: Number(timeLimit) || DEFAULT_TIME_LIMIT,
        ...(type === "multiple" ? { correctIndexes: sorted } : { correctIndex: sorted[0] }),
      });
    } catch (err) {
      setError(errMsg(err, "Failed to save question"));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-800">{initial ? `Edit question ${number}` : `New question ${number}`}</h3>
        <div className="flex rounded-xl border border-slate-200 p-0.5 text-xs font-semibold">
          {(["single", "multiple"] as const).map(t => (
            <button key={t} type="button" onClick={() => changeType(t)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${type === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>
              {t === "single" ? "One answer" : "Multiple answers"}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      <Field label="Question">
        <textarea className={`${inputCls} min-h-20`} value={text} onChange={e => setText(e.target.value)} required maxLength={2000} autoFocus
          placeholder="e.g. Solve: 2x + 3 = 11" />
      </Field>

      <div>
        <span className="block text-sm font-semibold text-slate-700 mb-1.5">
          Options <span className="font-normal text-slate-400">· click the circle to mark {type === "single" ? "the correct answer" : "every correct answer"}</span>
        </span>
        <div className="space-y-2">
          {options.map((opt, i) => {
            const isCorrect = correct.includes(i);
            return (
              <div key={i} className="flex items-center gap-2">
                <button type="button" onClick={() => toggleCorrect(i)} title="Mark as correct"
                  className={`w-9 h-9 shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    type === "single" ? "rounded-full" : "rounded-lg"
                  } ${isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-400 hover:border-emerald-400"}`}>
                  {isCorrect ? <Check size={16} /> : OPTION_LETTERS[i]}
                </button>
                <input className={`${inputCls} ${isCorrect ? "border-emerald-300 bg-emerald-50/40" : ""}`} value={opt}
                  onChange={e => setOption(i, e.target.value)} placeholder={`Option ${OPTION_LETTERS[i]}`} maxLength={500} />
                <button type="button" onClick={() => removeOption(i)} disabled={options.length <= 2} title="Remove option"
                  className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400">
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
        {options.length < MAX_OPTIONS && (
          <button type="button" onClick={() => setOptions(o => [...o, ""])}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            <Plus size={15} /> Add option
          </button>
        )}
      </div>

      <div className={`grid gap-4 ${timed ? "sm:grid-cols-[120px_120px_1fr]" : "sm:grid-cols-[120px_1fr]"}`}>
        <Field label="Points">
          <input type="number" className={inputCls} value={points} onChange={e => setPoints(e.target.value)} min={1} max={100} required />
        </Field>
        {timed && (
          <Field label="Time (seconds)">
            <input type="number" className={inputCls} value={timeLimit} onChange={e => setTimeLimit(e.target.value)} min={5} max={3600} required />
          </Field>
        )}
        <Field label="Explanation (optional)" hint="Shown to students on the results page.">
          <input className={inputCls} value={explanation} onChange={e => setExplanation(e.target.value)} maxLength={2000}
            placeholder="Why the correct answer is correct" />
        </Field>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />} Save question
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}
