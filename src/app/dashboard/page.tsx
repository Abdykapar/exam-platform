import Link from "next/link";
import { BookOpen, Award, Target, BarChart3, Clock, CheckCircle, TrendingUp, Users, Star, ChevronRight, Bell } from "lucide-react";

const recentExams = [
  { title: "Mathematics Fundamentals", score: 78, passed: true, date: "Aug 4, 2024", duration: "32:14", category: "Mathematics" },
  { title: "English Language B2", score: 85, passed: true, date: "Aug 1, 2024", duration: "48:02", category: "Languages" },
  { title: "Physics Advanced", score: 55, passed: false, date: "Jul 28, 2024", duration: "87:30", category: "Sciences" },
  { title: "Python Basics", score: 92, passed: true, date: "Jul 22, 2024", duration: "35:10", category: "IT" },
];

const upcomingExams = [
  { title: "Chemistry Fundamentals", date: "Aug 10, 2024", category: "Sciences", emoji: "🧪" },
  { title: "Business Management", date: "Aug 15, 2024", category: "Business", emoji: "📊" },
];

function Sidebar() {
  const navItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard", active: true },
    { icon: BookOpen, label: "My Exams", href: "/exams" },
    { icon: Award, label: "Certificates", href: "/dashboard/certificates" },
    { icon: Target, label: "Practice", href: "/exams" },
    { icon: Users, label: "Leaderboard", href: "/dashboard/leaderboard" },
  ];
  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="bg-slate-900 rounded-2xl p-5 sticky top-20">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">AK</div>
          <div>
            <div className="text-white font-semibold text-sm">Alex Karimov</div>
            <div className="text-slate-400 text-xs">Pro Member</div>
          </div>
        </div>
        <nav className="space-y-1 mb-6">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <Link key={label} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-4">
          <div className="text-white font-semibold text-xs mb-1">Pro Plan Active</div>
          <div className="text-indigo-300 text-xs mb-3">Unlimited exams · All features</div>
          <Link href="#" className="text-xs text-indigo-300 hover:text-white font-semibold">Manage Plan →</Link>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
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
            <button className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer">AK</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <Sidebar />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Welcome */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Welcome back, Alex! 👋</h1>
              <p className="text-slate-500 text-sm mt-1">You have 2 exams scheduled this week.</p>
            </div>
            <Link href="/exams" className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
              Browse Exams <ChevronRight size={15} />
            </Link>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Exams Taken", value: "24", icon: BookOpen, color: "bg-indigo-600", change: "+3 this month" },
              { label: "Avg. Score", value: "82%", icon: Target, color: "bg-emerald-500", change: "+5% vs last month" },
              { label: "Certificates", value: "6", icon: Award, color: "bg-amber-500", change: "2 new" },
              { label: "Study Hours", value: "47h", icon: Clock, color: "bg-violet-500", change: "This month" },
            ].map(({ label, value, icon: Icon, color, change }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="text-2xl font-extrabold text-slate-800">{value}</div>
                <div className="text-sm text-slate-500 mt-0.5">{label}</div>
                <div className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                  <TrendingUp size={11} /> {change}
                </div>
              </div>
            ))}
          </div>

          {/* Progress chart mock */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">Score History</h2>
              <select className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-500 focus:outline-none">
                <option>Last 6 exams</option>
                <option>Last 10 exams</option>
                <option>All time</option>
              </select>
            </div>
            {/* Bar chart mockup */}
            <div className="flex items-end gap-3 h-32">
              {[78, 85, 55, 92, 70, 88].map((score, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-500">{score}%</span>
                  <div className={`w-full rounded-t-lg transition-all ${score >= 70 ? "bg-indigo-500" : "bg-red-400"}`}
                    style={{ height: `${(score / 100) * 100}%` }} />
                  <span className="text-xs text-slate-400">E{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent exams */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800">Recent Exams</h2>
                <Link href="/exams" className="text-xs text-indigo-600 font-semibold hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {recentExams.map((e) => (
                  <div key={e.title} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${e.passed ? "bg-emerald-100" : "bg-red-100"}`}>
                      {e.passed ? <CheckCircle size={16} className="text-emerald-600" /> : <Star size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">{e.title}</div>
                      <div className="text-xs text-slate-400">{e.date} · {e.duration}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm ${e.passed ? "text-emerald-600" : "text-red-500"}`}>{e.score}%</div>
                      <div className={`text-xs ${e.passed ? "text-emerald-500" : "text-red-400"}`}>{e.passed ? "Passed" : "Failed"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming + Certificates */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-bold text-slate-800 mb-4">Upcoming Exams</h2>
                {upcomingExams.map((e) => (
                  <div key={e.title} className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 mb-2 last:mb-0">
                    <span className="text-xl">{e.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 text-sm">{e.title}</div>
                      <div className="text-xs text-slate-400">{e.category} · {e.date}</div>
                    </div>
                    <Link href="/exams" className="text-xs text-indigo-600 font-bold hover:underline">Prepare</Link>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={18} className="text-amber-600" />
                  <h2 className="font-bold text-slate-800">Recent Certificates</h2>
                </div>
                {[
                  { title: "Python Basics", date: "Jul 22, 2024", score: "92%" },
                  { title: "English B2", date: "Aug 1, 2024", score: "85%" },
                ].map((c) => (
                  <div key={c.title} className="flex items-center justify-between py-2.5 border-b border-amber-200 last:border-0">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{c.title}</div>
                      <div className="text-xs text-slate-400">{c.date} · Score: {c.score}</div>
                    </div>
                    <button className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                      Download
                    </button>
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
