"use client";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, BarChart3, RotateCcw, Flag, Lightbulb } from "lucide-react";
import { api, isResultView, type ResultView, type ReviewQuestion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDuration, OPTION_LETTERS } from "@/lib/format";

function chosen(q: ReviewQuestion) {
  const idx = q.type === "multiple" ? q.selectedIndexes : q.selectedIndex != null ? [q.selectedIndex] : [];
  return idx.map(i => `${OPTION_LETTERS[i]}. ${q.options[i]}`).join(", ");
}

function correct(q: ReviewQuestion) {
  const idx = q.type === "multiple" ? q.correctIndexes ?? [] : q.correctIndex != null ? [q.correctIndex] : [];
  return idx.map(i => `${OPTION_LETTERS[i]}. ${q.options[i]}`).join(", ");
}

export default function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { id } = use(params);
  const { attempt: attemptParam } = use(searchParams);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [result, setResult] = useState<ResultView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/exams/${id}/results${attemptParam ? `?attempt=${attemptParam}` : ""}`)}`);
      return;
    }
    (async () => {
      let attemptId = attemptParam;
      if (!attemptId) {
        // No attempt in the URL: show the latest finished attempt for this exam
        const { data } = await api.attempts.list();
        attemptId = data.attempts.find(a => a.exam === id && a.status !== "in_progress")?._id;
        if (!attemptId) throw new Error("You haven't finished this exam yet.");
      }
      const { data } = await api.attempts.get(attemptId);
      if (!isResultView(data)) {
        router.replace(`/exams/${id}/take`);
        return;
      }
      setResult(data);
    })().catch(err => setError(err instanceof Error ? err.message : "Failed to load results"));
  }, [authLoading, user, id, attemptParam, router]);

  if (error || !result) {
    return (
      <main>
        <Navbar />
        <div className="max-w-xl mx-auto py-24 px-4 text-center text-slate-500">
          {error ? (
            <>
              <p className="text-lg font-semibold text-slate-700">{error}</p>
              <Link href={`/exams/${id}`} className="inline-block mt-6 text-indigo-600 font-semibold hover:underline">Back to exam</Link>
            </>
          ) : (
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          )}
        </div>
      </main>
    );
  }

  const { attempt, exam, review } = result;
  const wrong = attempt.totalQuestions - attempt.correctCount;
  const timeTaken = formatDuration(attempt.timeTakenSeconds);

  return (
    <main>
      <Navbar />

      {/* Hero result banner */}
      <section className={`py-16 px-4 text-center ${attempt.passed
        ? "bg-gradient-to-br from-emerald-600 to-teal-600"
        : "bg-gradient-to-br from-red-600 to-rose-600"}`}>
        <div className="max-w-2xl mx-auto text-white">
          <div className="text-6xl mb-4">{attempt.passed ? "🎉" : "😔"}</div>
          <div className="text-xl font-semibold mb-1 text-white/80">{exam.emoji} {exam.title}</div>
          <div className="text-8xl font-extrabold mb-3">{attempt.score}%</div>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-lg font-bold mb-3 bg-white/20 text-white">
            {attempt.passed ? <CheckCircle size={20} /> : <XCircle size={20} />}
            {attempt.passed ? "Passed" : "Not Passed"}
          </div>
          <div className="text-sm text-white/70 mb-6">
            {formatDate(attempt.submittedAt)}
            {attempt.status === "timed_out" && " · Time ran out, graded from your saved answers"}
          </div>
          <div className="flex justify-center gap-8 text-sm">
            {[
              [`${attempt.correctCount}/${attempt.totalQuestions}`, "Correct"],
              [timeTaken, "Time Taken"],
              [`${exam.passingScore}%`, "Pass Mark"],
            ].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-white/70">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={`/exams/${id}`}
            className="flex items-center gap-2 border border-slate-200 text-slate-700 font-semibold px-5 py-3 rounded-xl hover:bg-slate-50 transition-colors">
            <RotateCcw size={16} /> Retake Exam
          </Link>
          <Link href="/dashboard"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm">
            <BarChart3 size={16} /> My Dashboard
          </Link>
        </div>

        {/* Score breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2"><BarChart3 size={20} className="text-indigo-600" /> Score Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Score", value: `${attempt.score}%`, color: "bg-indigo-50 text-indigo-700" },
              { label: "Correct", value: attempt.correctCount, color: "bg-emerald-50 text-emerald-700" },
              { label: "Incorrect", value: wrong, color: "bg-red-50 text-red-700" },
              { label: "Time Used", value: timeTaken, color: "bg-amber-50 text-amber-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-xl p-4 text-center`}>
                <div className="text-2xl font-extrabold">{value}</div>
                <div className="text-xs font-semibold mt-1 opacity-70">{label}</div>
              </div>
            ))}
          </div>

          {/* Score bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Your score: {attempt.score}%</span>
              <span>Pass mark: {exam.passingScore}%</span>
            </div>
            <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${attempt.passed ? "bg-emerald-500" : "bg-red-500"} transition-all`}
                style={{ width: `${attempt.score}%` }} />
              <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-500"
                style={{ left: `${exam.passingScore}%` }} />
            </div>
          </div>
        </div>

        {/* Question review */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 text-lg mb-5">Question Review</h2>
          <div className="space-y-4">
            {review.map(q => (
              <div key={q.index} className={`p-4 rounded-xl border ${q.isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 mt-0.5 ${q.isCorrect ? "text-emerald-500" : "text-red-500"}`}>
                    {q.isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm mb-2 whitespace-pre-line">
                      {q.index + 1}. {q.text}
                      {q.isFlagged && <Flag size={12} className="inline ml-2 text-amber-500" />}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className={q.isCorrect ? "text-emerald-700" : "text-red-700"}>
                        Your answer: <strong>{chosen(q) || "Not answered"}</strong>
                      </span>
                      {!q.isCorrect && (
                        <span className="text-emerald-700">
                          Correct: <strong>{correct(q)}</strong>
                        </span>
                      )}
                    </div>
                    {q.explanation && (
                      <p className="mt-2 text-xs text-slate-600 flex items-start gap-1.5">
                        <Lightbulb size={13} className="text-amber-500 shrink-0 mt-px" /> {q.explanation}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${q.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {q.isCorrect ? `+${q.points}` : "0"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-lg mb-4">What&apos;s Next?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { emoji: "📚", title: "Practice More", desc: "Browse other exams to keep improving.", href: "/exams" },
              { emoji: "📈", title: "Track Progress", desc: "See your score history on the dashboard.", href: "/dashboard" },
            ].map(({ emoji, title, desc, href }) => (
              <Link key={title} href={href} className="bg-white/10 hover:bg-white/20 rounded-xl p-4 transition-colors block">
                <span className="text-2xl">{emoji}</span>
                <div className="font-bold text-sm mt-2 mb-1">{title}</div>
                <div className="text-xs text-indigo-200">{desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
