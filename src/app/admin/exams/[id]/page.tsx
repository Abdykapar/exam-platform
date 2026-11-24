"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Check, ChevronLeft, Copy, ExternalLink, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { api, type InstructorExam } from "@/lib/api";
import ExamForm, { toExamInput } from "@/components/admin/ExamForm";
import QuestionsPanel from "@/components/admin/QuestionsPanel";
import AttemptsPanel from "@/components/admin/AttemptsPanel";
import { btnPrimary, btnSecondary, ErrorBanner, errMsg, StatusBadge } from "@/components/admin/ui";

type Tab = "details" | "questions" | "attempts";
const TABS: Tab[] = ["details", "questions", "attempts"];

export default function EditExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = use(params);
  const { tab: tabParam } = use(searchParams);
  const [tab, setTab] = useState<Tab>(TABS.find(t => t === tabParam) ?? "details");
  const [exam, setExam] = useState<InstructorExam | null>(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.instructor.exams.get(id)
      .then(res => setExam(res.data.exam))
      .catch(err => setError(errMsg(err, "Failed to load exam")));
  }, [id]);

  if (!exam) {
    return error ? (
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <Link href="/admin/exams" className="text-indigo-600 font-semibold hover:underline">Back to exams</Link>
      </div>
    ) : (
      <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    );
  }

  const togglePublish = async () => {
    setPublishing(true);
    setError("");
    try {
      const res = exam.isPublished ? await api.exams.unpublish(exam._id) : await api.exams.publish(exam._id);
      setExam(res.data.exam);
    } catch (err) {
      setError(errMsg(err, "Failed to update status"));
    } finally {
      setPublishing(false);
    }
  };

  const noQuestions = exam.questions.length === 0;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/exams/${exam._id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/exams" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-2">
          <ChevronLeft size={15} /> All exams
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-4xl">{exam.emoji}</span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-slate-900 truncate">{exam.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge published={exam.isPublished} />
                {exam.isPublished && (
                  <Link href={`/exams/${exam._id}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                    View as student <ExternalLink size={12} />
                  </Link>
                )}
                {exam.isPublished && (
                  <button onClick={copyLink} className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
                  </button>
                )}
                {exam.accessPassword && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500" title="Students need this password to join">
                    <Lock size={12} /> Password: <code className="font-semibold text-slate-700">{exam.accessPassword}</code>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button onClick={togglePublish} disabled={publishing || (!exam.isPublished && noQuestions)}
              className={exam.isPublished ? btnSecondary : btnPrimary}>
              {publishing ? <Loader2 size={16} className="animate-spin" /> : exam.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
              {exam.isPublished ? "Unpublish" : "Publish"}
            </button>
            {!exam.isPublished && noQuestions && <span className="text-xs text-slate-400">Add a question to publish</span>}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="flex gap-1 border-b border-slate-200">
        {([
          ["details", "Details"],
          ["questions", `Questions (${exam.questions.length})`],
          ["attempts", "Attempts"],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <ExamForm
          initial={toExamInput(exam)}
          submitLabel="Save changes"
          onSubmit={async input => {
            const res = await api.exams.update(exam._id, input);
            setExam(res.data.exam);
          }}
        />
      ) : tab === "questions" ? (
        <QuestionsPanel exam={exam} onChange={setExam} />
      ) : (
        <AttemptsPanel examId={exam._id} />
      )}
    </div>
  );
}
