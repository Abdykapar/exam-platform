"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import ExamForm from "@/components/admin/ExamForm";

export default function NewExamPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/exams" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-2">
          <ChevronLeft size={15} /> All exams
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900">New exam</h1>
        <p className="text-sm text-slate-500 mt-1">The exam is saved as a draft. You&apos;ll add questions next.</p>
      </div>
      <ExamForm
        submitLabel="Create exam & add questions"
        onSubmit={async input => {
          const res = await api.exams.create(input);
          router.push(`/admin/exams/${res.data.exam._id}?tab=questions`);
        }}
      />
    </div>
  );
}
