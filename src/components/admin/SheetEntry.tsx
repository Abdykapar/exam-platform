"use client";
import { useMemo, useRef, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { api, type OfflineSessionFull, type OfflineSheet } from "@/lib/api";
import { answersToString, parseAnswerString } from "./answer-string";
import { btnPrimary, btnSecondary, ErrorBanner, errMsg, Field, inputCls } from "./ui";

export default function SheetEntry({
  session,
  editing,
  onSaved,
  onCancel,
}: {
  session: OfflineSessionFull;
  /** When set, the form edits this sheet instead of adding a new one */
  editing?: OfflineSheet;
  onSaved: (sheet: OfflineSheet) => void;
  onCancel?: () => void;
}) {
  const questionsFor = (letter: string) => session.variants.find(v => v.letter === letter)?.questions ?? [];

  const [variant, setVariant] = useState(editing?.variant ?? session.variants[0].letter);
  const [name, setName] = useState(editing?.studentName ?? "");
  const [text, setText] = useState(() => (editing ? answersToString(editing.answers, questionsFor(editing.variant)) : ""));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<OfflineSheet | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const answersRef = useRef<HTMLInputElement>(null);

  const questions = questionsFor(variant);
  const parsed = useMemo(() => parseAnswerString(text, questions), [text, questions]);
  const answeredCount = parsed.letters.filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed.errors.length) return;
    setError("");
    setSaving(true);
    try {
      const body = { variant, studentName: name.trim(), answers: parsed.answers };
      const res = editing
        ? await api.offline.updateSheet(session._id, editing._id, body)
        : await api.offline.addSheet(session._id, body);
      onSaved(res.data.sheet);
      if (!editing) {
        // Ready for the next sheet in the pile
        setLastSaved(res.data.sheet);
        setName("");
        setText("");
        nameRef.current?.focus();
      }
    } catch (err) {
      setError(errMsg(err, "Failed to save sheet"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white rounded-2xl shadow-sm p-5 space-y-4 ${editing ? "border-2 border-indigo-200" : "border border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-slate-800">{editing ? `Edit sheet #${editing.number}` : "Enter answers from a sheet"}</h2>
        {lastSaved && !editing && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle size={15} /> Saved #{lastSaved.number}{lastSaved.studentName && ` · ${lastSaved.studentName}`} · {lastSaved.score}%
          </span>
        )}
      </div>

      <ErrorBanner message={error} />

      <div className="grid sm:grid-cols-[auto_1fr] gap-4">
        <Field label="Version">
          <div className="flex gap-1.5">
            {session.variants.map(v => (
              <button key={v.letter} type="button" onClick={() => setVariant(v.letter)}
                className={`w-11 h-[42px] rounded-xl border-2 font-bold text-sm transition-colors ${variant === v.letter ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
                {v.letter}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Student name (as written on the sheet)">
          <input ref={nameRef} className={inputCls} value={name} onChange={e => setName(e.target.value)} maxLength={120} autoFocus={!editing}
            placeholder="Optional"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); answersRef.current?.focus(); } }} />
        </Field>
      </div>

      <Field label="Answers" hint={`One letter per question, e.g. BADC-A. Use spaces when a question has several answers, e.g. B AC D. "-" = blank.`}>
        <input ref={answersRef} className={`${inputCls} font-mono tracking-wider uppercase ${parsed.errors.length ? "border-red-300 focus:ring-red-400" : ""}`}
          value={text} onChange={e => setText(e.target.value)} spellCheck={false} autoComplete="off" placeholder="BADC-A…" />
      </Field>

      {/* Live preview of how the answers were read */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Preview · version {variant}</span>
          <span>{answeredCount} of {questions.length} answered</span>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1">
          {questions.map((q, i) => {
            const value = parsed.letters[i];
            const bad = parsed.errors.some(err => err.startsWith(`Q${i + 1}:`));
            return (
              <div key={q._id} title={q.text}
                className={`rounded-lg px-1.5 py-1 text-center border ${bad ? "border-red-300 bg-red-50 text-red-700" : value ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-slate-100 bg-slate-50 text-slate-400"}`}>
                <div className="text-[10px] leading-none opacity-70">{i + 1}{q.type === "multiple" ? "*" : ""}</div>
                <div className="font-mono font-bold text-sm leading-tight">{value || "–"}</div>
              </div>
            );
          })}
        </div>
        {parsed.errors.length > 0 && (
          <ul className="mt-2 text-xs text-red-600 space-y-0.5">
            {parsed.errors.map(err => <li key={err}>{err}</li>)}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving || parsed.errors.length > 0} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />} {editing ? "Save changes" : "Save & next sheet"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} disabled={saving} className={btnSecondary}>Cancel</button>}
      </div>
    </form>
  );
}
