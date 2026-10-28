"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, ChevronLeft, ChevronRight, BookOpen, AlertCircle, Flag } from "lucide-react";

const questions = [
  { id: 1, text: "What is the result of 2x + 5 = 15?", options: ["x = 4","x = 5","x = 6","x = 7"], correct: 1 },
  { id: 2, text: "Which of the following is a prime number?", options: ["9","15","17","21"], correct: 2 },
  { id: 3, text: "What is the area of a circle with radius 7? (Use π ≈ 3.14)", options: ["143.07","153.86","163.24","133.14"], correct: 1 },
  { id: 4, text: "Simplify: (3² + 4²)", options: ["5","25","49","7"], correct: 1 },
  { id: 5, text: "What is the slope of the line y = 3x − 2?", options: ["-2","2","3","-3"], correct: 2 },
  { id: 6, text: "If a triangle has angles 60° and 80°, what is the third angle?", options: ["30°","40°","50°","60°"], correct: 1 },
  { id: 7, text: "What is the value of √144?", options: ["11","12","13","14"], correct: 1 },
  { id: 8, text: "Solve: 5! (5 factorial)", options: ["60","100","120","150"], correct: 2 },
  { id: 9, text: "What is 15% of 200?", options: ["25","30","35","40"], correct: 1 },
  { id: 10, text: "Which expression equals x² − 9?", options: ["(x−3)(x+3)","(x−9)(x+1)","(x−3)²","(x+3)²"], correct: 0 },
];

const TOTAL_TIME = 45 * 60; // 45 minutes in seconds

export default function TakeExamPage() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);

  // Timer
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); setSubmitted(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const timePercent = (timeLeft / TOTAL_TIME) * 100;
  const timerColor = timeLeft < 300 ? "text-red-500" : timeLeft < 600 ? "text-amber-500" : "text-emerald-500";

  const select = (optIdx: number) => {
    setAnswers(prev => ({ ...prev, [current]: optIdx }));
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(current) ? next.delete(current) : next.add(current);
      return next;
    });
  };

  const answered = Object.keys(answers).length;
  const q = questions[current];

  if (submitted) {
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">{passed ? "🎉" : "😔"}</div>
          <div className={`text-5xl font-extrabold mb-2 ${passed ? "text-emerald-500" : "text-red-500"}`}>{pct}%</div>
          <div className={`text-lg font-bold mb-1 ${passed ? "text-emerald-700" : "text-red-700"}`}>{passed ? "Passed!" : "Not Passed"}</div>
          <p className="text-slate-500 text-sm mb-6">{score} of {questions.length} correct</p>
          <div className="flex flex-col gap-3">
            <Link href={`/exams/1/results`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors">
              View Detailed Results
            </Link>
            <Link href="/exams" className="border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              Back to Exams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center"><BookOpen size={14} className="text-white" /></div>
            <span className="font-bold text-slate-800 text-sm">Mathematics Fundamentals</span>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timerColor}`}>
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={() => setSubmitted(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            Submit Exam
          </button>
        </div>
        {/* Timer bar */}
        <div className="h-1 bg-slate-200">
          <div className={`h-full transition-all duration-1000 ${timeLeft < 300 ? "bg-red-500" : timeLeft < 600 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${timePercent}%` }} />
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 grid lg:grid-cols-4 gap-6">

        {/* Question panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Question {current + 1} of {questions.length}</span>
            <span>{answered} answered · {flagged.size} flagged</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 leading-relaxed">{q.text}</h2>
              <button onClick={toggleFlag} title="Flag question"
                className={`shrink-0 p-2 rounded-lg transition-colors ${flagged.has(current) ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500"}`}>
                <Flag size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const selected = answers[current] === i;
                return (
                  <button key={i} onClick={() => select(i)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                    }`}>
                    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full mr-3 text-xs font-bold ${
                      selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      {["A","B","C","D"][i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} /> Previous
            </button>
            <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Question navigator */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-24">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, i) => {
                const isAnswered = answers[i] !== undefined;
                const isFlagged = flagged.has(i);
                const isCurrent = i === current;
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${
                      isCurrent ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                    } ${
                      isFlagged ? "bg-amber-100 text-amber-700 border border-amber-300" :
                      isAnswered ? "bg-indigo-600 text-white" :
                      "bg-slate-100 text-slate-500 hover:bg-indigo-50"
                    }`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2">
              {[
                { color: "bg-indigo-600", label: "Answered" },
                { color: "bg-amber-100 border border-amber-300", label: "Flagged" },
                { color: "bg-slate-100", label: "Not answered" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${color}`} />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            {answered < questions.length && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{questions.length - answered} question{questions.length - answered > 1 ? "s" : ""} unanswered</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
