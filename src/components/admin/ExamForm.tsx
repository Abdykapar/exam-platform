"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { api, type Category, type Difficulty, type ExamInput, type InstructorExam } from "@/lib/api";
import { btnPrimary, ErrorBanner, errMsg, Field, inputCls } from "./ui";

const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

interface FormState {
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  duration: string;
  passingScore: string;
  emoji: string;
  tags: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: string;
}

/** Converts a loaded exam (whose category may be populated) into form input. */
export function toExamInput(exam: InstructorExam): ExamInput {
  return {
    title: exam.title,
    description: exam.description,
    category: typeof exam.category === "object" ? exam.category._id : exam.category,
    difficulty: exam.difficulty,
    duration: exam.duration,
    passingScore: exam.passingScore,
    emoji: exam.emoji,
    tags: exam.tags,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    maxAttempts: exam.maxAttempts,
  };
}

const toState = (e?: ExamInput): FormState => ({
  title: e?.title ?? "",
  description: e?.description ?? "",
  category: e?.category ?? "",
  difficulty: e?.difficulty ?? "Beginner",
  duration: String(e?.duration ?? 30),
  passingScore: String(e?.passingScore ?? 70),
  emoji: e?.emoji ?? "📝",
  tags: (e?.tags ?? []).join(", "),
  shuffleQuestions: e?.shuffleQuestions ?? false,
  shuffleOptions: e?.shuffleOptions ?? false,
  maxAttempts: String(e?.maxAttempts ?? 0),
});

export default function ExamForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ExamInput;
  submitLabel: string;
  onSubmit: (input: ExamInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toState(initial));
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.categories.list()
      .then(res => setCategories(res.data.categories))
      .catch(err => setError(errMsg(err, "Failed to load categories")));
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSaved(false);
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        difficulty: form.difficulty,
        duration: Number(form.duration),
        passingScore: Number(form.passingScore),
        emoji: form.emoji.trim() || "📝",
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
        maxAttempts: Number(form.maxAttempts),
      });
      setSaved(true);
    } catch (err) {
      setError(errMsg(err, "Failed to save exam"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <ErrorBanner message={error} />

      <div className="grid sm:grid-cols-[1fr_90px] gap-4">
        <Field label="Title">
          <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)}
            required minLength={3} maxLength={120} placeholder="e.g. Algebra Fundamentals" />
        </Field>
        <Field label="Emoji">
          <input className={`${inputCls} text-center`} value={form.emoji} onChange={e => set("emoji", e.target.value)} maxLength={8} />
        </Field>
      </div>

      <Field label="Description">
        <textarea className={`${inputCls} min-h-24`} value={form.description} onChange={e => set("description", e.target.value)}
          maxLength={2000} placeholder="What does this exam cover, and who is it for?" />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Category">
          <select className={inputCls} value={form.category} onChange={e => set("category", e.target.value)} required>
            <option value="" disabled>{categories ? "Choose a category" : "Loading…"}</option>
            {categories?.map(c => <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>)}
          </select>
          {categories?.length === 0 && (
            <span className="block text-xs text-amber-600 mt-1">
              No categories yet. <Link href="/admin/categories" className="font-semibold underline">Create one first</Link>.
            </span>
          )}
        </Field>
        <Field label="Difficulty">
          <select className={inputCls} value={form.difficulty} onChange={e => set("difficulty", e.target.value as Difficulty)}>
            {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Duration (minutes)">
          <input type="number" className={inputCls} value={form.duration} onChange={e => set("duration", e.target.value)} required min={1} max={600} />
        </Field>
        <Field label="Passing score (%)">
          <input type="number" className={inputCls} value={form.passingScore} onChange={e => set("passingScore", e.target.value)} required min={0} max={100} />
        </Field>
        <Field label="Max attempts" hint="0 = unlimited">
          <input type="number" className={inputCls} value={form.maxAttempts} onChange={e => set("maxAttempts", e.target.value)} required min={0} max={100} />
        </Field>
      </div>

      <Field label="Topics / tags" hint="Comma-separated. Shown as “Topics Covered” on the exam page.">
        <input className={inputCls} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="Equations, Fractions, Powers" />
      </Field>

      <div className="flex flex-wrap gap-6">
        {([
          ["shuffleQuestions", "Shuffle question order"],
          ["shuffleOptions", "Shuffle answer options"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600" />
            {label}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving && <Loader2 size={16} className="animate-spin" />} {submitLabel}
        </button>
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check size={15} /> Saved</span>}
      </div>
    </form>
  );
}
