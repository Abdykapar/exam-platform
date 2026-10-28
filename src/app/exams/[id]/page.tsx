import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Clock, Users, Star, Award, Shield, CheckCircle, BookOpen, BarChart3, ChevronRight } from "lucide-react";

export default function ExamDetailPage({ params }: { params: { id: string } }) {
  const exam = {
    id: params.id,
    title: "Mathematics Fundamentals",
    category: "Mathematics",
    difficulty: "Beginner",
    questions: 30,
    duration: 45,
    students: 1240,
    rating: 4.8,
    passingScore: 70,
    emoji: "📐",
    description: "A comprehensive examination covering core mathematics concepts including algebra, geometry, and basic calculus. Designed for students seeking to verify foundational mathematical competency.",
    topics: ["Algebra & Equations","Geometry & Trigonometry","Functions & Graphs","Basic Calculus","Statistics & Probability","Number Theory"],
    instructor: { name: "Dr. Asel Mamytova", role: "Professor of Mathematics", avatar: "AM" },
    reviews: [
      { name: "Bektur A.", score: 92, text: "Well-structured exam. Questions are clear and the timer is fair.", avatar: "BA" },
      { name: "Zarina K.", score: 85, text: "Excellent coverage of all topics. Got my certificate within seconds!", avatar: "ZK" },
    ],
  };

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
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{exam.difficulty}</span>
                <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{exam.category}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-3">{exam.title}</h1>
              <p className="text-slate-500 leading-relaxed">{exam.description}</p>
              <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Star size={14} className="fill-amber-400 text-amber-400" /> {exam.rating} rating</span>
                <span className="flex items-center gap-1.5"><Users size={14} /> {exam.students.toLocaleString()} enrolled</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> {exam.duration} minutes</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {exam.questions} questions</span>
              </div>
            </div>

            {/* Topics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-lg mb-5">Topics Covered</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {exam.topics.map(t => (
                  <div key={t} className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-indigo-500 shrink-0" />
                    <span className="text-slate-600 text-sm">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What to expect */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-lg mb-5">What to Expect</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Clock, title: "Timed", desc: `${exam.duration} min total, ~1.5 min per question`, color: "bg-indigo-50 text-indigo-600" },
                  { icon: Shield, title: "Secure", desc: "Full-screen mode with anti-cheat detection", color: "bg-emerald-50 text-emerald-600" },
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
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-lg mb-4">Created By</h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {exam.instructor.avatar}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{exam.instructor.name}</div>
                  <div className="text-sm text-slate-500">{exam.instructor.role}</div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 text-lg mb-5">Student Reviews</h2>
              <div className="space-y-4">
                {exam.reviews.map(r => (
                  <div key={r.name} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{r.avatar}</div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-slate-800 text-sm">{r.name}</span>
                        <span className="text-xs text-emerald-600 font-bold">Score: {r.score}%</span>
                      </div>
                      <p className="text-slate-500 text-sm">{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: sticky enrol card */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">{exam.emoji}</div>
                <div className="text-2xl font-extrabold text-slate-900 mb-1">{exam.title}</div>
                <div className="text-sm text-slate-400">{exam.category}</div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  ["Questions", `${exam.questions} multiple-choice`],
                  ["Duration", `${exam.duration} minutes`],
                  ["Passing Score", `${exam.passingScore}%`],
                  ["Difficulty", exam.difficulty],
                  ["Certificate", "On passing"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b border-slate-100 pb-3 last:border-0">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>

              <Link href={`/exams/${exam.id}/take`}
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 mb-3">
                Start Exam Now
              </Link>
              <Link href="/exams"
                className="block w-full text-center border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm">
                Browse Other Exams
              </Link>

              <p className="text-center text-xs text-slate-400 mt-4">
                ✓ Free to take &nbsp;·&nbsp; ✓ Instant results &nbsp;·&nbsp; ✓ PDF certificate
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
