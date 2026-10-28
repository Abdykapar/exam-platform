"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Award, Target, BarChart3, Clock, CheckCircle, XCircle, ChevronRight, LogOut, PlayCircle } from "lucide-react";
import { api, type Attempt, type DashboardStats, type RecentAttempt } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDuration } from "@/lib/format";

interface DashboardData {
  stats: DashboardStats;
  recentAttempts: RecentAttempt[];
  scoreHistory: number[];
  inProgress: Attempt[];
}

function Sidebar({ name, role, initials }: { name: string; role: string; initials: string }) {
  const navItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard", active: true },
    { icon: BookOpen, label: "Browse Exams", href: "/exams" },
  ];
  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="bg-slate-900 rounded-2xl p-5 sticky top-20">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">{initials}</div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">{name}</div>
            <div className="text-slate-400 text-xs capitalize">{role}</div>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <Link key={label} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/dashboard");
      return;
    }
    Promise.all([api.dashboard.get(), api.attempts.list()])
      .then(([dash, attempts]) => setData({
        ...dash.data,
        inProgress: attempts.data.attempts.filter(a => a.status === "in_progress" && new Date(a.expiresAt) > new Date()),
      }))
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, [authLoading, user, router]);

  if (!user) return null;

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const certificates = data?.recentAttempts.filter(a => a.passed) ?? [];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center"><BookOpen size={14} className="text-white" /></div>
            <span className="font-bold text-slate-800">ExamPro</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">{initials}</div>
            <button onClick={() => { logout(); router.push("/"); }} title="Log out"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <Sidebar name={`${user.firstName} ${user.lastName}`} role={user.role} initials={initials} />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Welcome */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Welcome back, {user.firstName}! 👋</h1>
              <p className="text-slate-500 text-sm mt-1">
                {data?.inProgress.length
                  ? `You have ${data.inProgress.length} exam${data.inProgress.length > 1 ? "s" : ""} in progress.`
                  : "Here's how your exams are going."}
              </p>
            </div>
            <Link href="/exams" className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
              Browse Exams <ChevronRight size={15} />
            </Link>
          </div>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>}

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Exams Taken", value: data ? `${data.stats.examsTaken}` : "–", icon: BookOpen, color: "bg-indigo-600" },
              { label: "Avg. Score", value: data ? `${data.stats.avgScore}%` : "–", icon: Target, color: "bg-emerald-500" },
              { label: "Certificates", value: data ? `${data.stats.certificates}` : "–", icon: Award, color: "bg-amber-500" },
              { label: "Study Hours", value: data ? `${data.stats.studyHours}h` : "–", icon: Clock, color: "bg-violet-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="text-2xl font-extrabold text-slate-800">{value}</div>
                <div className="text-sm text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Score history */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">Score History</h2>
              <span className="text-xs text-slate-400">Last {data?.scoreHistory.length ?? 0} exams</span>
            </div>
            {data && data.scoreHistory.length > 0 ? (
              <div className="flex items-end gap-3 h-32">
                {data.scoreHistory.map((score, i) => (
                  <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                    <span className="text-xs font-semibold text-slate-500">{score}%</span>
                    <div className={`w-full rounded-t-lg ${score >= 50 ? "bg-indigo-500" : "bg-red-400"}`}
                      style={{ height: `${Math.max(score, 2)}%` }} />
                    <span className="text-xs text-slate-400">E{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-10 text-center">Your scores will appear here after your first exam.</p>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent exams */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-4">Recent Exams</h2>
              <div className="space-y-3">
                {data?.recentAttempts.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    No exams yet. <Link href="/exams" className="text-indigo-600 font-semibold hover:underline">Find one to take</Link>
                  </p>
                )}
                {data?.recentAttempts.map(e => {
                  const row = (
                    <>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${e.passed ? "bg-emerald-100" : "bg-red-100"}`}>
                        {e.passed ? <CheckCircle size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{e.emoji} {e.examTitle}</div>
                        <div className="text-xs text-slate-400">
                          {[e.category, formatDate(e.submittedAt), formatDuration(e.timeTakenSeconds)].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-bold text-sm ${e.passed ? "text-emerald-600" : "text-red-500"}`}>{e.score}%</div>
                        <div className={`text-xs ${e.passed ? "text-emerald-500" : "text-red-400"}`}>{e.passed ? "Passed" : "Failed"}</div>
                      </div>
                    </>
                  );
                  const cls = "flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors";
                  return e.exam
                    ? <Link key={e._id} href={`/exams/${e.exam}/results?attempt=${e._id}`} className={cls}>{row}</Link>
                    : <div key={e._id} className={cls}>{row}</div>;
                })}
              </div>
            </div>

            <div className="space-y-5">
              {/* In progress */}
              {data && data.inProgress.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <h2 className="font-bold text-slate-800 mb-4">In Progress</h2>
                  {data.inProgress.map(a => (
                    <div key={a._id} className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-2 last:mb-0">
                      <span className="text-xl">{a.examEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{a.examTitle}</div>
                        <div className="text-xs text-slate-400">Ends {new Date(a.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <Link href={`/exams/${a.exam}/take`} className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline">
                        <PlayCircle size={14} /> Resume
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Certificates */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={18} className="text-amber-600" />
                  <h2 className="font-bold text-slate-800">Recent Certificates</h2>
                </div>
                {certificates.length === 0 && (
                  <p className="text-sm text-slate-500">Pass an exam to earn your first certificate.</p>
                )}
                {certificates.map(c => (
                  <div key={c._id} className="flex items-center justify-between py-2.5 border-b border-amber-200 last:border-0">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{c.emoji} {c.examTitle}</div>
                      <div className="text-xs text-slate-400">{formatDate(c.submittedAt)} · Score: {c.score}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
