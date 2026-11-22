import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export const inputCls =
  "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
      <AlertCircle size={16} className="shrink-0 mt-0.5" /> {message}
    </div>
  );
}

export function StatusBadge({ published }: { published: boolean }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {published ? "Published" : "Draft"}
    </span>
  );
}

export const errMsg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
