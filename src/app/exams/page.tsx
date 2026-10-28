"use client";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Search, Clock, Users, Star, ChevronRight, Filter } from "lucide-react";
import { api, type Exam } from "@/lib/api";

const CATEGORIES = ["All", "Mathematics", "Sciences", "Languages", "IT", "History", "Business", "Arts", "Medicine"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

const diffColor: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Advanced: "bg-red-100 text-red-700",
};

function ExamCard({ exam }: { exam: Exam }) {
  const instructor = typeof exam.instructor === "object" ? exam.instructor : null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-3xl">{exam.emoji}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${diffColor[exam.difficulty] || ""}`}>
            {exam.difficulty}
          </span>
        </div>
        <h3 className="font-bold text-slate-800 text-base mb-1.5 leading-snug">{exam.title}</h3>
        <p className="text-slate-500 text-sm line-clamp-2 mb-3">{exam.description}</p>
        {instructor && (
          <p className="text-xs text-slate-400 mb-3">by {instructor.firstName} {instructor.lastName}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Clock size={12} /> {exam.duration} min</span>
          <span className="flex items-center gap-1"><Users size={12} /> {exam.enrolledCount || 0}</span>
          {exam.rating > 0 && <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" /> {exam.rating.toFixed(1)}</span>}
        </div>
      </div>
      <div className="px-5 pb-5">
        <Link href={`/exams/${exam._id}`}
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors">
          View Exam <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.exams.list({
        page,
        ...(search && { search }),
        ...(category !== "All" && { category }),
        ...(difficulty !== "All" && { difficulty }),
      });
      setExams(res.data.exams);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, difficulty]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-br from-indigo-950 to-indigo-800 py-14 px-4 text-white text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Browse All Exams</h1>
        <p className="text-indigo-300 text-base max-w-xl mx-auto">
          {total > 0 ? `${total} exams available across all categories` : "Explore professional examinations"}
        </p>
        <div className="relative mt-6 max-w-lg mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search exams..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-slate-800 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex gap-8">
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-24 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold text-sm"><Filter size={15} /> Category</div>
              <div className="space-y-1">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => { setCategory(c); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === c ? "bg-indigo-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-700 mb-3">Difficulty</div>
              <div className="space-y-1">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => { setDifficulty(d); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${difficulty === d ? "bg-indigo-600 text-white font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-lg font-semibold">No exams found</p>
              <p className="text-sm mt-1">
                {total === 0 ? "Start the API server and seed the database to see exams." : "Try changing your filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {exams.map(exam => <ExamCard key={exam._id} exam={exam} />)}
              </div>
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: pages }).map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={`w-9 h-9 rounded-lg font-semibold text-sm transition-colors ${page === i + 1 ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
