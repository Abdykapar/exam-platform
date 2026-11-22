"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, type Category, type CategoryInput } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { btnPrimary, ErrorBanner, errMsg, inputCls } from "@/components/admin/ui";

const EMPTY: CategoryInput = { name: "", emoji: "📚", description: "" };

function CategoryFields({ value, onChange }: { value: CategoryInput; onChange: (v: CategoryInput) => void }) {
  return (
    <>
      <input className={`${inputCls} w-16 text-center`} value={value.emoji ?? ""} maxLength={8} aria-label="Emoji"
        onChange={e => onChange({ ...value, emoji: e.target.value })} />
      <input className={`${inputCls} sm:w-48`} value={value.name} placeholder="Name" required minLength={2} maxLength={50} aria-label="Name"
        onChange={e => onChange({ ...value, name: e.target.value })} />
      <input className={`${inputCls} flex-1`} value={value.description ?? ""} placeholder="Short description (optional)" maxLength={300} aria-label="Description"
        onChange={e => onChange({ ...value, description: e.target.value })} />
    </>
  );
}

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<CategoryInput>(EMPTY);
  const [editing, setEditing] = useState<{ id: string; value: CategoryInput } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api.categories.list()
      .then(res => setCategories(res.data.categories))
      .catch(err => setError(errMsg(err, "Failed to load categories"))),
    [],
  );

  useEffect(() => { load(); }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(errMsg(err, "Action failed"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const clean = (v: CategoryInput): CategoryInput => ({
    name: v.name.trim(),
    emoji: v.emoji?.trim() || "📚",
    description: v.description?.trim() ?? "",
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await run(() => api.categories.create(clean(draft)))) setDraft(EMPTY);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing && await run(() => api.categories.update(editing.id, clean(editing.value)))) setEditing(null);
  };

  const remove = (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    run(() => api.categories.remove(c._id));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Categories</h1>
        <p className="text-sm text-slate-500 mt-1">Students browse exams by category.</p>
      </div>

      <ErrorBanner message={error} />

      <form onSubmit={create} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-2">
        <CategoryFields value={draft} onChange={setDraft} />
        <button type="submit" disabled={busy || draft.name.trim().length < 2} className={btnPrimary}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {categories === null && <div className="h-40 animate-pulse bg-slate-50 rounded-2xl" />}
        {categories?.length === 0 && <p className="text-center text-sm text-slate-500 py-12">No categories yet. Add your first one above.</p>}
        {categories?.map(c =>
          editing?.id === c._id ? (
            <form key={c._id} onSubmit={saveEdit} className="p-4 flex flex-col sm:flex-row gap-2 bg-indigo-50/40">
              <CategoryFields value={editing.value} onChange={value => setEditing({ id: c._id, value })} />
              <div className="flex gap-1">
                <button type="submit" disabled={busy} title="Save" className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><Check size={16} /></button>
                <button type="button" onClick={() => setEditing(null)} title="Cancel" className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100"><X size={16} /></button>
              </div>
            </form>
          ) : (
            <div key={c._id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-2xl w-8 text-center">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800">{c.name}</div>
                {c.description && <div className="text-xs text-slate-500 truncate">{c.description}</div>}
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{c.examCount ?? 0} published</span>
              <div className="flex gap-1">
                <button onClick={() => setEditing({ id: c._id, value: { name: c.name, emoji: c.emoji, description: c.description } })}
                  disabled={busy} title="Edit" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Pencil size={15} /></button>
                {user?.role === "admin" && (
                  <button onClick={() => remove(c)} disabled={busy} title="Delete"
                    className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ),
        )}
      </div>
      {user?.role !== "admin" && <p className="text-xs text-slate-400">Only admins can delete categories.</p>}
    </div>
  );
}
