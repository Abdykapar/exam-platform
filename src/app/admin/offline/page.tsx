"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2, Plus, Printer } from "lucide-react";
import { api, type Exam, type OfflineSession } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { btnPrimary, btnSecondary, ErrorBanner, errMsg, Field, inputCls } from "@/components/admin/ui";

function NewSessionForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [exam, setExam] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [variants, setVariants] = useState(2);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.instructor.exams.list()
      .then(res => setExams(res.data.exams.filter(e => e.questionCount > 0)))
      .catch(err => setError(errMsg(err, "Failed to load exams")));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api.offline.create({ exam, name: name.trim(), date: date || undefined, variants });
      router.push(`/admin/offline/${res.data.session._id}`);
    } catch (err) {
      setError(errMsg(err, "Failed to create session"));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-6 space-y-5">
      <h2 className="font-bold text-slate-800">New paper exam</h2>
      <ErrorBanner message={error} />
      <Field label="Exam" hint="Questions are copied now, so later edits to the exam won't change printed sheets.">
        <select className={inputCls} value={exam} required
          onChange={e => {
            setExam(e.target.value);
            const picked = exams?.find(x => x._id === e.target.value);
            if (picked && !name) setName(picked.title);
          }}>
          <option value="" disabled>{exams ? "Choose an exam" : "Loading…"}</option>
          {exams?.map(e => <option key={e._id} value={e._id}>{e.emoji} {e.title} ({e.questionCount} questions)</option>)}
        </select>
        {exams?.length === 0 && <span className="block text-xs text-amber-600 mt-1">You need an exam with at least one question first.</span>}
      </Field>
      <div className="grid sm:grid-cols-[1fr_180px] gap-4">
        <Field label="Session name" hint="e.g. the class and term, shown on every printed page">
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required maxLength={120} placeholder="Grade 9B midterm" />
        </Field>
        <Field label="Date">
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Versions" hint="Version A keeps the exam's order. Other versions shuffle questions and answers, so neighbours can't copy.">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(n => (
            <button key={n} type="button" onClick={() => setVariants(n)}
              className={`w-24 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${variants === n ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
              {"ABCD".slice(0, n).split("").join(" · ")}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !exam} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />} Create session
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </form>
  );
}

export default function OfflineSessionsPage() {
  const [sessions, setSessions] = useState<OfflineSession[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.offline.list()
      .then(res => setSessions(res.data.sessions))
      .catch(err => setError(errMsg(err, "Failed to load sessions")));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Paper exams</h1>
          <p className="text-sm text-slate-500 mt-1">Print booklets and bubble answer sheets, then enter or scan the filled sheets to grade them.</p>
        </div>
        {!creating && <button onClick={() => setCreating(true)} className={btnPrimary}><Plus size={16} /> New paper exam</button>}
      </div>

      <ErrorBanner message={error} />
      {creating && <NewSessionForm onCancel={() => setCreating(false)} />}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {sessions === null && !error && <div className="h-40 animate-pulse bg-slate-50 rounded-2xl" />}
        {sessions?.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Printer size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">No paper exams yet</p>
            <p className="text-sm mt-1">Create one to print answer sheets for a class.</p>
          </div>
        )}
        {sessions?.map(s => (
          <Link key={s._id} href={`/admin/offline/${s._id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
            <span className="text-2xl">{s.examEmoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 truncate">{s.name}</div>
              <div className="text-xs text-slate-500 truncate">
                {[s.examTitle, formatDate(s.date), `Versions ${s.versions.join(", ")}`].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 whitespace-nowrap">
              <div className="font-semibold text-slate-700 text-sm">{s.sheetCount} sheet{s.sheetCount === 1 ? "" : "s"}</div>
              {s.sheetCount > 0 && <div>avg {s.avgScore}% · {s.passedCount} passed</div>}
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}
