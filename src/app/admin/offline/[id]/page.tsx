"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ChevronLeft, Download, FileKey, Loader2, Pencil, Search, Sheet, Trash2 } from "lucide-react";
import { api, download, type OfflineSessionFull, type OfflineSheet, type PdfKind } from "@/lib/api";
import { fileSafe, formatDate } from "@/lib/format";
import SheetEntry from "@/components/admin/SheetEntry";
import { btnSecondary, ErrorBanner, errMsg, inputCls } from "@/components/admin/ui";

export default function OfflineSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<OfflineSessionFull | null>(null);
  const [sheets, setSheets] = useState<OfflineSheet[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // which download is running
  const [editing, setEditing] = useState<OfflineSheet | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([api.offline.get(id), api.offline.sheets(id)])
      .then(([s, sh]) => {
        setSession(s.data.session);
        setSheets(sh.data.sheets);
      })
      .catch(err => setError(errMsg(err, "Failed to load session")));
  }, [id]);

  if (!session) {
    return error ? (
      <div className="space-y-4">
        <ErrorBanner message={error} />
        <Link href="/admin/offline" className="text-indigo-600 font-semibold hover:underline">Back to paper exams</Link>
      </div>
    ) : (
      <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    );
  }

  const base = fileSafe(session.name) || "session";

  const fetchFile = async (key: string, path: string, filename: string) => {
    setBusy(key);
    setError("");
    try {
      await download(path, filename);
    } catch (err) {
      setError(errMsg(err, "Download failed"));
    } finally {
      setBusy(null);
    }
  };

  const pdf = (kind: PdfKind, variant?: string) =>
    fetchFile(`${kind}${variant ?? ""}`, api.offline.pdfPath(session._id, kind, variant), `${base}-${kind}${variant ? `-${variant}` : ""}.pdf`);

  const saved = (sheet: OfflineSheet) => {
    setSheets(list => (list.some(s => s._id === sheet._id) ? list.map(s => (s._id === sheet._id ? sheet : s)) : [...list, sheet]));
    setEditing(null);
  };

  const removeSheet = async (sheet: OfflineSheet) => {
    if (!confirm(`Delete sheet #${sheet.number}${sheet.studentName ? ` (${sheet.studentName})` : ""}?`)) return;
    try {
      await api.offline.removeSheet(session._id, sheet._id);
      setSheets(list => list.filter(s => s._id !== sheet._id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete sheet"));
    }
  };

  const removeSession = async () => {
    if (!confirm(`Delete "${session.name}" and all ${sheets.length} entered sheets? This cannot be undone.`)) return;
    try {
      await api.offline.remove(session._id);
      router.push("/admin/offline");
    } catch (err) {
      setError(errMsg(err, "Failed to delete session"));
    }
  };

  const passed = sheets.filter(s => s.passed).length;
  const avg = sheets.length ? Math.round(sheets.reduce((sum, s) => sum + s.score, 0) / sheets.length) : 0;
  const query = search.trim().toLowerCase();
  const visible = [...sheets]
    .sort((a, b) => b.number - a.number)
    .filter(s => !query || s.studentName.toLowerCase().includes(query) || String(s.number) === query);

  const DownloadButton = ({ id: key, onClick, children }: { id: string; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={busy !== null} className={`${btnSecondary} !py-2 !px-3`}>
      {busy === key ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {children}
    </button>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link href="/admin/offline" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-2">
          <ChevronLeft size={15} /> Paper exams
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-4xl">{session.examEmoji}</span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-slate-900 truncate">{session.name}</h1>
              <p className="text-sm text-slate-500">
                {[session.examTitle, formatDate(session.date), `${session.questionCount} questions`, `pass mark ${session.passingScore}%`].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <button onClick={removeSession} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete session">
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* 1. Print */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-slate-800 mb-1">1. Print</h2>
        <p className="text-sm text-slate-500 mb-4">
          Print one booklet and one answer sheet per student, matching their version. Sheets of the same version can be photocopied.
        </p>
        <div className="space-y-2">
          {session.variants.map(v => (
            <div key={v.letter} className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm font-semibold text-slate-700">Version {v.letter}</span>
              <DownloadButton id={`booklet${v.letter}`} onClick={() => pdf("booklet", v.letter)}>Booklet</DownloadButton>
              <DownloadButton id={`answer-sheet${v.letter}`} onClick={() => pdf("answer-sheet", v.letter)}>Answer sheet</DownloadButton>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100">
            <span className="w-24 text-sm font-semibold text-slate-700">Teacher</span>
            <button onClick={() => pdf("answer-key")} disabled={busy !== null} className={`${btnSecondary} !py-2 !px-3`}>
              {busy === "answer-key" ? <Loader2 size={15} className="animate-spin" /> : <FileKey size={15} />} Answer key (all versions)
            </button>
          </div>
        </div>
      </section>

      {/* 2. Enter answers */}
      <section className="space-y-2">
        <h2 className="font-bold text-slate-800">2. Grade the filled sheets</h2>
        {editing ? (
          <SheetEntry key={editing._id} session={session} editing={editing} onSaved={saved} onCancel={() => setEditing(null)} />
        ) : (
          <SheetEntry session={session} onSaved={saved} />
        )}
        <p className="text-xs text-slate-400">Scanning sheets automatically is coming next: for now, type the answers from each sheet.</p>
      </section>

      {/* 3. Results */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <div>
            <h2 className="font-bold text-slate-800">3. Results</h2>
            <p className="text-sm text-slate-500">
              {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
              {sheets.length > 0 && ` · average ${avg}% · ${passed} passed (${Math.round((passed / sheets.length) * 100)}%)`}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} !py-2 pl-8 w-44`} placeholder="Name or #" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => fetchFile("csv", api.offline.csvPath(session._id), `${base}-results.csv`)} disabled={busy !== null || !sheets.length}
              className={`${btnSecondary} !py-2 !px-3`}>
              {busy === "csv" ? <Loader2 size={15} className="animate-spin" /> : <Sheet size={15} />} Export CSV
            </button>
          </div>
        </div>
        {sheets.length === 0 ? (
          <p className="text-center text-sm text-slate-500 pb-10">No sheets entered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-semibold px-5 py-2.5">#</th>
                  <th className="text-left font-semibold px-3 py-2.5">Name</th>
                  <th className="text-center font-semibold px-3 py-2.5">Version</th>
                  <th className="text-right font-semibold px-3 py-2.5">Score</th>
                  <th className="text-right font-semibold px-3 py-2.5">Correct</th>
                  <th className="text-left font-semibold px-3 py-2.5">Result</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(s => (
                  <tr key={s._id} className={editing?._id === s._id ? "bg-indigo-50/50" : ""}>
                    <td className="px-5 py-2.5 text-slate-400 font-mono">{s.number}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{s.studentName || <span className="text-slate-400 font-normal">No name</span>}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-slate-600">{s.variant}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{s.score}%</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{s.correctCount}/{s.totalQuestions}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {s.passed ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        <button onClick={() => { setEditing(s); window.scrollTo({ top: 0, behavior: "smooth" }); }} title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Pencil size={14} /></button>
                        <button onClick={() => removeSheet(s)} title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
