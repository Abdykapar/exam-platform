"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, categoryName, type Exam } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { btnPrimary, ErrorBanner, errMsg, inputCls, StatusBadge } from "@/components/admin/ui";

type StatusFilter = "all" | "published" | "draft";

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const load = useCallback(
    () => api.instructor.exams.list()
      .then(res => setExams(res.data.exams))
      .catch(err => setError(errMsg(err, "Failed to load exams"))),
    [],
  );

  useEffect(() => { load(); }, [load]);

  const act = async (exam: Exam, action: () => Promise<unknown>) => {
    setBusy(exam._id);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(errMsg(err, "Action failed"));
    } finally {
      setBusy(null);
    }
  };

  const togglePublish = (exam: Exam) =>
    act(exam, () => (exam.isPublished ? api.exams.unpublish(exam._id) : api.exams.publish(exam._id)));

  const remove = (exam: Exam) => {
    if (!confirm(`Delete "${exam.title}"? This cannot be undone.`)) return;
    act(exam, () => api.exams.remove(exam._id));
  };

  const visible = (exams ?? []).filter(e =>
    (status === "all" || (status === "published") === e.isPublished) &&
    e.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Exams</h1>
          <p className="text-sm text-slate-500 mt-1">Create exams, add questions, and publish them for students.</p>
        </div>
        <Link href="/admin/exams/new" className={btnPrimary}><Plus size={16} /> New exam</Link>
      </div>

      <ErrorBanner message={error} />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-10`} placeholder="Search exams…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={`${inputCls} w-auto`} value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {exams === null ? (
          <div className="h-48 animate-pulse bg-slate-50" />
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-semibold text-slate-700">{exams.length ? "No exams match your filters" : "No exams yet"}</p>
            {!exams.length && (
              <Link href="/admin/exams/new" className="inline-block mt-4 text-indigo-600 font-semibold hover:underline">Create your first exam</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Exam</th>
                  <th className="text-left font-semibold px-3 py-3">Category</th>
                  <th className="text-center font-semibold px-3 py-3">Questions</th>
                  <th className="text-left font-semibold px-3 py-3">Status</th>
                  <th className="text-left font-semibold px-3 py-3">Updated</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(exam => (
                  <tr key={exam._id} className={busy === exam._id ? "opacity-50" : ""}>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/exams/${exam._id}`} className="flex items-center gap-2.5 font-semibold text-slate-800 hover:text-indigo-600">
                        <span className="text-xl">{exam.emoji}</span>
                        <span className="truncate max-w-64">{exam.title}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500">{categoryName(exam.category)}</td>
                    <td className="px-3 py-3.5 text-center text-slate-600">{exam.questionCount}</td>
                    <td className="px-3 py-3.5"><StatusBadge published={exam.isPublished} /></td>
                    <td className="px-3 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(exam.updatedAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/exams/${exam._id}`} title="Edit" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600">
                          <Pencil size={15} />
                        </Link>
                        <button onClick={() => togglePublish(exam)} disabled={busy !== null}
                          title={exam.isPublished ? "Unpublish" : "Publish"}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600">
                          {exam.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button onClick={() => remove(exam)} disabled={busy !== null} title="Delete"
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
