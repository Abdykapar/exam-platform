"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { BookOpen, Mail, Lock, User, ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = use(searchParams);
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">

        <div className="hidden lg:block text-white">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><BookOpen size={18} className="text-white" /></div>
            <span className="font-bold text-lg">ExamPro</span>
          </Link>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">Start your learning journey today</h1>
          <p className="text-slate-400 text-base mb-8 leading-relaxed">Join 50,000+ students. Take exams, earn certificates, and track your progress — all for free.</p>
          <ul className="space-y-4">
            {["Access to 2,000+ professional exams", "Instant auto-grading and results", "Digital certificates on passing", "Detailed performance analytics", "Study anytime, anywhere"].map(b => (
              <li key={b} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-cyan-400 shrink-0" />
                <span className="text-slate-300 text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Create your account</h2>
              <p className="text-slate-500 text-sm mt-1">Free forever. No credit card required.</p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Alex" value={form.firstName} onChange={set("firstName")} required
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                  <input type="text" placeholder="Karimov" value={form.lastName} onChange={set("lastName")} required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" placeholder="alex@example.com" value={form.email} onChange={set("email")} required
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                <select value={form.role} onChange={set("role")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="student">Student</option>
                  <option value="instructor">Instructor / Teacher</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" placeholder="Min. 8 characters" value={form.password} onChange={set("password")} required minLength={8}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30">
                {loading ? "Creating account..." : <><span>Create Account</span><ArrowRight size={16} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
