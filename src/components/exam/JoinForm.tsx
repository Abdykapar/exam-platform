"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const inputCls =
  "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all";

/** sessionStorage key the take page reads the password from (logged-in students). */
export const examPasswordKey = (examId: string) => `exam-password:${examId}`;

/**
 * Entry to a password-protected exam. Visitors without an account (or with a
 * guest session from another exam) give their name and join as a guest;
 * logged-in students only give the password.
 */
export default function JoinForm({ examId }: { examId: string }) {
  const router = useRouter();
  const { user, loading, setSession } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const asGuest = !user || !!user.isGuest;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (asGuest) {
        const res = await api.exams.join(examId, { firstName: firstName.trim(), lastName: lastName.trim(), password });
        setSession(res.token, res.data.user);
      } else {
        try {
          sessionStorage.setItem(examPasswordKey(examId), password);
        } catch {
          // Storage blocked: the take page will ask the student to come back here
        }
      }
      router.push(`/exams/${examId}/take`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the exam");
      setBusy(false);
    }
  };

  if (loading) return <div className="h-40 bg-slate-100 rounded-xl animate-pulse mb-3" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Lock size={14} className="text-indigo-600" /> This exam needs a password
      </p>
      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>}
      {asGuest && (
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)}
            placeholder="First name" required maxLength={50} autoComplete="given-name" aria-label="First name" />
          <input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)}
            placeholder="Last name" required maxLength={50} autoComplete="family-name" aria-label="Last name" />
        </div>
      )}
      <input type="password" className={inputCls} value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Exam password" required maxLength={64} autoComplete="off" aria-label="Exam password" />
      <button type="submit" disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30">
        {busy && <Loader2 size={16} className="animate-spin" />} Join Exam
      </button>
      {!asGuest && user && (
        <p className="text-xs text-slate-400 text-center">Joining as {user.firstName} {user.lastName}</p>
      )}
    </form>
  );
}
