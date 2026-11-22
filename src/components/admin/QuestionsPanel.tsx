"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, FileJson, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api, type InstructorExam, type InstructorQuestion, type QuestionInput } from "@/lib/api";
import { OPTION_LETTERS } from "@/lib/format";
import QuestionEditor from "./QuestionEditor";
import { btnPrimary, btnSecondary, ErrorBanner, errMsg, inputCls } from "./ui";

const IMPORT_EXAMPLE = `[
  { "text": "2 + 2 = ?", "options": ["3", "4", "5"], "correctIndex": 1 },
  { "text": "Pick the even numbers", "type": "multiple",
    "options": ["1", "2", "4"], "correctIndexes": [1, 2], "points": 2,
    "explanation": "2 and 4 are divisible by 2" }
]`;

type ExamResponse = Promise<{ data: { exam: InstructorExam } }>;

function isCorrect(q: InstructorQuestion, i: number) {
  return q.type === "multiple" ? !!q.correctIndexes?.includes(i) : q.correctIndex === i;
}

export default function QuestionsPanel({ exam, onChange }: { exam: InstructorExam; onChange: (exam: InstructorExam) => void }) {
  const [editing, setEditing] = useState<string | null>(null); // question id, or "new"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");

  const questions = exam.questions;
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  const run = async (call: () => ExamResponse) => {
    setBusy(true);
    setError("");
    try {
      onChange((await call()).data.exam);
      return true;
    } catch (err) {
      setError(errMsg(err, "Something went wrong"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Errors here are shown by the editor itself
  const save = async (input: QuestionInput) => {
    const res = editing === "new"
      ? await api.questions.add(exam._id, input)
      : await api.questions.update(exam._id, editing!, input);
    onChange(res.data.exam);
    setEditing(null);
  };

  const move = (index: number, delta: number) => {
    const order = questions.map(q => q._id);
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    run(() => api.questions.reorder(exam._id, order));
  };

  const remove = (q: InstructorQuestion, n: number) => {
    if (!confirm(`Delete question ${n}?`)) return;
    run(() => api.questions.remove(exam._id, q._id));
  };

  const runImport = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      return setError("That isn't valid JSON.");
    }
    if (!Array.isArray(parsed) || !parsed.length) return setError("Paste a JSON array of questions.");
    if (await run(() => api.questions.bulk(exam._id, parsed as QuestionInput[]))) {
      setImporting(false);
      setImportText("");
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      {questions.length === 0 && editing !== "new" && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">❓</p>
          <p className="font-semibold text-slate-700">No questions yet</p>
          <p className="text-sm mt-1">Add questions one by one, or import several from JSON.</p>
        </div>
      )}

      {questions.map((q, i) =>
        editing === q._id ? (
          <QuestionEditor key={q._id} initial={q} number={i + 1} onSave={save} onCancel={() => setEditing(null)} />
        ) : (
          <div key={q._id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${busy ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 whitespace-pre-line">{q.text}</p>
                <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-slate-400">
                  <span>{q.type === "multiple" ? "Multiple answers" : "One answer"}</span>·
                  <span>{q.points} point{q.points > 1 ? "s" : ""}</span>
                </div>
                <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
                  {q.options.map((opt, oi) => (
                    <li key={oi} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${isCorrect(q, oi) ? "bg-emerald-50 text-emerald-800 font-medium" : "text-slate-600"}`}>
                      <span className="text-xs font-bold w-4">{OPTION_LETTERS[oi]}</span>
                      <span className="flex-1 min-w-0 truncate">{opt}</span>
                      {isCorrect(q, oi) && <Check size={14} className="text-emerald-600 shrink-0" />}
                    </li>
                  ))}
                </ul>
                {q.explanation && <p className="mt-2 text-xs text-slate-500">💡 {q.explanation}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-0.5 shrink-0">
                <button onClick={() => move(i, -1)} disabled={busy || i === 0} title="Move up"
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={busy || i === questions.length - 1} title="Move down"
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={15} /></button>
                <button onClick={() => setEditing(q._id)} disabled={busy || editing !== null} title="Edit"
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30"><Pencil size={15} /></button>
                <button onClick={() => remove(q, i + 1)} disabled={busy} title="Delete"
                  className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ),
      )}

      {editing === "new" && (
        <QuestionEditor number={questions.length + 1} onSave={save} onCancel={() => setEditing(null)} />
      )}

      {importing && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Import questions from JSON</h3>
          <p className="text-xs text-slate-500">
            Paste an array. Each question needs <code>text</code> and 2–6 <code>options</code>, plus <code>correctIndex</code> (counting from 0),
            or <code>&quot;type&quot;: &quot;multiple&quot;</code> with <code>correctIndexes</code>.
          </p>
          <textarea className={`${inputCls} font-mono text-xs min-h-48`} value={importText} onChange={e => setImportText(e.target.value)}
            placeholder={IMPORT_EXAMPLE} />
          <div className="flex gap-2">
            <button onClick={runImport} disabled={busy || !importText.trim()} className={btnPrimary}>
              {busy && <Loader2 size={16} className="animate-spin" />} Import
            </button>
            <button onClick={() => setImporting(false)} disabled={busy} className={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}

      {editing === null && !importing && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditing("new")} disabled={busy} className={btnPrimary}><Plus size={16} /> Add question</button>
          <button onClick={() => setImporting(true)} disabled={busy} className={btnSecondary}><FileJson size={16} /> Import JSON</button>
        </div>
      )}

      <div className="sticky bottom-0 bg-slate-50/95 backdrop-blur border-t border-slate-200 -mx-1 px-1 py-3 text-sm text-slate-500">
        {questions.length} question{questions.length === 1 ? "" : "s"} · {totalPoints} point{totalPoints === 1 ? "" : "s"} total
      </div>
    </div>
  );
}
