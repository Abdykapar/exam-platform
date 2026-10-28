"use client";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Clock, Users, Star, Award, Shield, CheckCircle, BookOpen, ChevronRight, Repeat } from "lucide-react";
import { api, categoryName, type Exam } from "@/lib/api";

const diffColor: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Advanced: "bg-red-100 text-red-700",
};

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.exams.get(id)
      .then(res => setExam(res.data.exam))
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load exam"));
  }, [id]);

  if (error || !exam) {
    return (
      <main>
        <Navbar />
        <div className="max-w-xl mx-auto py-24 px-4 text-center text-slate-500">
          {error ? (
            <>
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-slate-700">{error}</p>
              <Link href="/exams" className="inline-block mt-6 text-indigo-600 font-semibold hover:underline">Browse other exams</Link>
            </>
          ) : (
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          )}
        </div>
      </main>
    );
  }

  const instructor = typeof exam.instructor === "object" ? exam.instructor : null;
  const category = categoryName(exam.category);
  const perQuestion = exam.questionCount ? Math.round((exam.duration / exam.questionCount) * 10) / 10 : exam.duration;

  return (
    <main>
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-indigo-600">Home</Link>
          <ChevronRight size={14} />
          <Link href="/exams" className="hover:text-indigo-600">Exams</Link>
          <ChevronRight size={14} />
          <span className="text-slate-800 font-medium">{exam.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Left: details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{exam.emoji}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${diffColor[exam.difficulty] || ""}`}>{exam.difficulty}</span>
                {category && <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{category}</span>}
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-3">{exam.title}</h1>
              {exam.description && <p className="text-slate-500 leading-relaxed">{exam.description}</p>}
              <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-500">
                {exam.rating > 0 && <span className="flex items-center gap-1.5"><Star size={14} className="fill-amber-400 text-amber-400" /> {exam.rating.toFixed(1)} rating</span>}
                <span className="flex items-center gap-1.5"><Users size={14} /> {exam.enrolledCount.toLocaleString()} enrolled</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> {exam.duration} minutes</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {exam.questionCount} questions</span>
              </div>
            </div>

            {/* Topics */}
            {exam.tags.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 text-lg mb-5">Topics Covered</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {exam.tags.map(t => (
                    <div key={t} className="flex items-center gap-2.5">
                      <CheckCircle size={16} className="text-indigo-500 shrink-0" />
                      <span className="text-slate-600 text-sm">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What to expect */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-lg mb-5">What to Expect</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Clock, title: "Timed", desc: `${exam.duration} min total, ~${perQuestion} min per question`, color: "bg-indigo-50 text-indigo-600" },
                  {
                    icon: exam.maxAttempts ? Repeat : Shield,
                    title: exam.maxAttempts ? "Limited attempts" : "Autosaved",
                    desc: exam.maxAttempts
                      ? `You can take this exam ${exam.maxAttempts} time${exam.maxAttempts > 1 ? "s" : ""}`
                      : "Answers are saved as you go, so you can resume after a reload",
                    color: "bg-emerald-50 text-emerald-600",
                  },
                  { icon: Award, title: "Certificate", desc: `Pass with ${exam.passingScore}%+ to earn a certificate`, color: "bg-amber-50 text-amber-600" },
                ].map(({ icon: Icon, title, desc, color }) => (
                  <div key={title} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}><Icon size={17} /></div>
                    <div className="font-semibold text-slate-800 text-sm mb-1">{title}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructor */}
            {instructor && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 text-lg mb-4">Created By</h2>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                    {instructor.firstName[0]}{instructor.lastName[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{instructor.firstName} {instructor.lastName}</div>
                    {instructor.bio && <div className="text-sm text-slate-500">{instructor.bio}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: sticky enrol card */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">{exam.emoji}</div>
                <div className="text-2xl font-extrabold text-slate-900 mb-1">{exam.title}</div>
                {category && <div className="text-sm text-slate-400">{category}</div>}
              </div>

              <div className="space-y-3 mb-6">
                {[
                  ["Questions", `${exam.questionCount}`],
                  ["Duration", `${exam.duration} minutes`],
                  ["Passing Score", `${exam.passingScore}%`],
                  ["Difficulty", exam.difficulty],
                  ["Attempts", exam.maxAttempts ? `${exam.maxAttempts}` : "Unlimited"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b border-slate-100 pb-3 last:border-0">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>

              <Link href={`/exams/${exam._id}/take`}
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 mb-3">
                Start Exam Now
              </Link>
              <Link href="/exams"
                className="block w-full text-center border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm">
                Browse Other Exams
              </Link>

              <p className="text-center text-xs text-slate-400 mt-4">
                ✓ Free to take &nbsp;·&nbsp; ✓ Instant results
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
