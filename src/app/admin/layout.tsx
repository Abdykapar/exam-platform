"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FileText, FolderOpen, Loader2, Printer, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/admin/exams", label: "Exams", icon: FileText },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/offline", label: "Paper exams", icon: Printer },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 gap-2">
        <Loader2 size={18} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (user.role === "student") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-md mx-auto py-24 px-4 text-center">
          <ShieldAlert size={40} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">Not authorized</h1>
          <p className="text-slate-500 text-sm mb-6">Only instructors and admins can create exams.</p>
          <Link href="/dashboard" className="text-indigo-600 font-semibold hover:underline">Go to your dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        <aside className="lg:w-56 shrink-0">
          <nav className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex lg:flex-col gap-1 lg:sticky lg:top-24">
            <div className="hidden lg:block px-3 pt-2 pb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
              {user.role === "admin" ? "Admin" : "Instructor"}
            </div>
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Icon size={16} /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
