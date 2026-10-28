"use client";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, Menu, X, Bell, User, ChevronDown } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">ExamPro</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</Link>
            <Link href="/exams" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Exams</Link>
            <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</Link>
            <Link href="/#about" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">About</Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
              Get Started
            </Link>
          </div>

          {/* Mobile burger */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1">
          {["/#features", "/exams", "/#pricing", "/#about"].map((href, i) => (
            <Link key={i} href={href} onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100">
              {["Features", "Exams", "Pricing", "About"][i]}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <Link href="/login" className="block text-center px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg">Sign In</Link>
            <Link href="/register" className="block text-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
