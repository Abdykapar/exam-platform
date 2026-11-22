import type { Answer, QuestionType } from "@/lib/api";

const LETTERS = "ABCDEF";
const BLANK = new Set(["-", ".", "_", "0"]);
// Cyrillic letters that look like Latin ones, for teachers typing on a Russian/Kyrgyz layout
const LOOKALIKES: Record<string, string> = { "А": "A", "В": "B", "С": "C", "Е": "E" };

interface SheetQuestion {
  type: QuestionType;
  options: string[];
}

export interface ParsedAnswers {
  answers: Answer[];
  /** Per question: the letters recognised, "" for blank */
  letters: string[];
  errors: string[];
}

/**
 * "BADC-A" (one letter per question), or "B AC D - A" with separators when a question
 * has several answers. "-" (or "." "_" "0") leaves a question blank.
 */
export function parseAnswerString(input: string, questions: SheetQuestion[]): ParsedAnswers {
  const normalised = [...input.toUpperCase()].map(ch => LOOKALIKES[ch] ?? ch).join("").trim();
  const tokens = !normalised ? [] : /[\s,;]/.test(normalised) ? normalised.split(/[\s,;]+/).filter(Boolean) : [...normalised];

  const errors: string[] = [];
  if (tokens.length > questions.length) {
    errors.push(`${tokens.length} answers entered, but the exam has ${questions.length} questions`);
  }

  const answers: Answer[] = [];
  const letters = questions.map((q, i) => {
    const token = tokens[i];
    if (token === undefined || BLANK.has(token)) return "";
    const picked = [...new Set(token)].sort();
    const bad = picked.filter(l => {
      const idx = LETTERS.indexOf(l);
      return idx < 0 || idx >= q.options.length;
    });
    if (bad.length) {
      errors.push(`Q${i + 1}: "${bad.join("")}" is not an option (A–${LETTERS[q.options.length - 1]})`);
      return token;
    }
    if (q.type === "single" && picked.length > 1) {
      errors.push(`Q${i + 1}: only one answer allowed`);
      return token;
    }
    const idx = picked.map(l => LETTERS.indexOf(l));
    answers.push(q.type === "multiple" ? { questionIndex: i, selectedIndexes: idx } : { questionIndex: i, selectedIndex: idx[0] });
    return picked.join("");
  });

  return { answers, letters, errors };
}

/** The reverse, for editing a saved sheet. */
export function answersToString(answers: Answer[], questions: SheetQuestion[]): string {
  const byIndex = new Map(answers.map(a => [a.questionIndex, a]));
  return questions
    .map((q, i) => {
      const a = byIndex.get(i);
      const idx = q.type === "multiple" ? a?.selectedIndexes ?? [] : a?.selectedIndex != null ? [a.selectedIndex] : [];
      return idx.length ? idx.map(n => LETTERS[n]).join("") : "-";
    })
    .join(" ");
}
