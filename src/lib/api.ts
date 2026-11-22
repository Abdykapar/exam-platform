const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || "Request failed", res.status);
  return data;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * POST that survives the page being closed (keepalive). Used instead of
 * navigator.sendBeacon, which can't send the Authorization header. Falls back to a
 * normal request in browsers that refuse keepalive with a CORS preflight.
 */
async function keepalive<T>(path: string, body: unknown): Promise<T> {
  try {
    return await request<T>(path, { ...json("POST", body), keepalive: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) return request<T>(path, json("POST", body));
    throw err;
  }
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body !== undefined && { body: JSON.stringify(body) }),
});

type Res<T> = { success: boolean; data: T };

export const api = {
  auth: {
    register: (body: { firstName: string; lastName: string; email: string; password: string; role: string }) =>
      request<Res<{ user: User }> & { token: string }>("/auth/register", json("POST", body)),

    login: (body: { email: string; password: string }) =>
      request<Res<{ user: User }> & { token: string }>("/auth/login", json("POST", body)),

    getMe: () => request<Res<{ user: User }>>("/auth/me"),

    updateProfile: (body: Partial<Pick<User, "firstName" | "lastName" | "bio" | "avatar">>) =>
      request<Res<{ user: User }>>("/auth/me", json("PATCH", body)),
  },

  categories: {
    list: () => request<Res<{ categories: Category[] }>>("/categories"),
    create: (body: CategoryInput) => request<Res<{ category: Category }>>("/categories", json("POST", body)),
    update: (id: string, body: Partial<CategoryInput>) =>
      request<Res<{ category: Category }>>(`/categories/${id}`, json("PATCH", body)),
    remove: (id: string) => request<Res<object>>(`/categories/${id}`, json("DELETE")),
  },

  exams: {
    list: (params?: { category?: string; difficulty?: string; search?: string; page?: number }) => {
      const q = new URLSearchParams(
        Object.entries(params ?? {}).map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<Res<{ exams: Exam[]; total: number; pages: number; page: number }>>(`/exams${q ? `?${q}` : ""}`);
    },
    get: (id: string) => request<Res<{ exam: Exam }>>(`/exams/${id}`),
    start: (examId: string) => request<Res<TakingView>>(`/exams/${examId}/start`, json("POST")),

    // Instructor / admin
    create: (body: ExamInput) => request<Res<{ exam: InstructorExam }>>("/exams", json("POST", body)),
    update: (id: string, body: Partial<ExamInput>) =>
      request<Res<{ exam: InstructorExam }>>(`/exams/${id}`, json("PATCH", body)),
    remove: (id: string) => request<Res<object>>(`/exams/${id}`, json("DELETE")),
    publish: (id: string) => request<Res<{ exam: InstructorExam }>>(`/exams/${id}/publish`, json("POST")),
    unpublish: (id: string) => request<Res<{ exam: InstructorExam }>>(`/exams/${id}/unpublish`, json("POST")),
  },

  instructor: {
    exams: {
      list: () => request<Res<{ exams: Exam[] }>>("/instructor/exams"),
      get: (id: string) => request<Res<{ exam: InstructorExam }>>(`/instructor/exams/${id}`),
      attempts: (id: string) => request<Res<{ attempts: InstructorAttempt[] }>>(`/instructor/exams/${id}/attempts`),
    },
    attempts: {
      violations: (attemptId: string) =>
        request<Res<{ attempt: InstructorAttempt; violations: Violation[] }>>(`/instructor/attempts/${attemptId}/violations`),
    },
  },

  proctoring: {
    report: (body: ViolationReport) => keepalive<Res<ProctorState>>("/exam/violation", body),
    heartbeat: (attemptId: string) => keepalive<Res<ProctorState>>("/exam/heartbeat", { attemptId }),
  },

  questions: {
    add: (examId: string, body: QuestionInput) =>
      request<Res<{ exam: InstructorExam }>>(`/exams/${examId}/questions`, json("POST", body)),
    update: (examId: string, qid: string, body: Partial<QuestionInput>) =>
      request<Res<{ exam: InstructorExam }>>(`/exams/${examId}/questions/${qid}`, json("PATCH", body)),
    remove: (examId: string, qid: string) =>
      request<Res<{ exam: InstructorExam }>>(`/exams/${examId}/questions/${qid}`, json("DELETE")),
    reorder: (examId: string, order: string[]) =>
      request<Res<{ exam: InstructorExam }>>(`/exams/${examId}/questions/reorder`, json("PUT", { order })),
    bulk: (examId: string, questions: QuestionInput[]) =>
      request<Res<{ exam: InstructorExam }>>(`/exams/${examId}/questions/bulk`, json("POST", { questions })),
  },

  attempts: {
    list: () => request<Res<{ attempts: Attempt[] }>>("/attempts"),
    /** In-progress attempts return the taking view; finished ones return the result view. */
    get: (attemptId: string) => request<Res<TakingView | ResultView>>(`/attempts/${attemptId}`),
    saveAnswers: (attemptId: string, answers: Answer[]) =>
      request<Res<{ savedAt: string; proctoring?: ProctorState }>>(`/attempts/${attemptId}/answers`, json("PATCH", { answers })),
    submit: (attemptId: string, body: { answers: Answer[]; timedOut?: boolean }) =>
      request<Res<ResultView>>(`/attempts/${attemptId}/submit`, json("POST", body)),
  },

  offline: {
    list: (exam?: string) =>
      request<Res<{ sessions: OfflineSession[] }>>(`/offline-sessions${exam ? `?exam=${exam}` : ""}`),
    create: (body: { exam: string; name: string; date?: string; variants: number }) =>
      request<Res<{ session: OfflineSession }>>("/offline-sessions", json("POST", body)),
    get: (id: string) => request<Res<{ session: OfflineSessionFull }>>(`/offline-sessions/${id}`),
    remove: (id: string) => request<Res<object>>(`/offline-sessions/${id}`, json("DELETE")),
    sheets: (id: string) => request<Res<{ sheets: OfflineSheet[] }>>(`/offline-sessions/${id}/sheets`),
    addSheet: (id: string, body: SheetInput) =>
      request<Res<{ sheet: OfflineSheet }>>(`/offline-sessions/${id}/sheets`, json("POST", body)),
    updateSheet: (id: string, sheetId: string, body: Partial<SheetInput>) =>
      request<Res<{ sheet: OfflineSheet }>>(`/offline-sessions/${id}/sheets/${sheetId}`, json("PATCH", body)),
    removeSheet: (id: string, sheetId: string) =>
      request<Res<object>>(`/offline-sessions/${id}/sheets/${sheetId}`, json("DELETE")),
    pdfPath: (id: string, kind: PdfKind, variant?: string) =>
      `/offline-sessions/${id}/pdf/${kind}${variant ? `?variant=${variant}` : ""}`,
    csvPath: (id: string) => `/offline-sessions/${id}/results.csv`,
  },

  dashboard: {
    get: () =>
      request<Res<{ stats: DashboardStats; recentAttempts: RecentAttempt[]; scoreHistory: number[] }>>("/dashboard"),
  },
};

/** Downloads an authenticated file (PDF, CSV) and saves it in the browser. */
export async function download(path: string, filename: string) {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message || "Download failed", res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const isResultView = (v: TakingView | ResultView): v is ResultView => "review" in v;

export const categoryName = (c: Category | string | undefined) => (typeof c === "object" ? c.name : "");

// Types
export type Role = "student" | "instructor" | "admin";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type QuestionType = "single" | "multiple";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  bio?: string;
  avatar?: string;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  emoji?: string;
  examCount?: number;
}

export type CategoryInput = Pick<Category, "name" | "description" | "emoji">;

export interface Exam {
  _id: string;
  title: string;
  description: string;
  category: Category | string;
  difficulty: Difficulty;
  duration: number;
  passingScore: number;
  questionCount: number;
  instructor: User | string;
  emoji: string;
  enrolledCount: number;
  rating: number;
  tags: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: number;
  /** Missing on exams created before proctoring existed. */
  proctoring?: ProctoringSettings;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamInput {
  title: string;
  description?: string;
  category: string;
  difficulty: Difficulty;
  duration: number;
  passingScore: number;
  emoji?: string;
  tags?: string[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxAttempts?: number;
  proctoring?: ProctoringSettings;
}

export interface ProctoringSettings {
  enabled: boolean;
  maxViolations: number;
  requireFullscreen: boolean;
}

export const DEFAULT_PROCTORING: ProctoringSettings = { enabled: false, maxViolations: 3, requireFullscreen: true };

/** Mirrors the server. Counted ones are "left the exam"; the rest were blocked, so only logged. */
export const COUNTED_VIOLATIONS = [
  "tab_hidden", "window_blur", "fullscreen_exit", "multiple_monitors", "print_screen", "heartbeat_missed",
] as const;
export const BLOCKED_VIOLATIONS = [
  "copy", "cut", "paste", "context_menu", "blocked_shortcut", "devtools_shortcut",
] as const;
export type ViolationType = (typeof COUNTED_VIOLATIONS)[number] | (typeof BLOCKED_VIOLATIONS)[number];
export type ClientViolationType = Exclude<ViolationType, "heartbeat_missed">;

export const isCountedViolation = (t: ViolationType) => (COUNTED_VIOLATIONS as readonly string[]).includes(t);

export const VIOLATION_LABELS: Record<ViolationType, string> = {
  tab_hidden: "Switched tab or minimized",
  window_blur: "Left the exam window",
  fullscreen_exit: "Exited fullscreen",
  multiple_monitors: "Extra monitor connected",
  print_screen: "Pressed Print Screen",
  heartbeat_missed: "Page stopped responding",
  copy: "Tried to copy",
  cut: "Tried to cut",
  paste: "Tried to paste",
  context_menu: "Opened the right-click menu",
  blocked_shortcut: "Used a blocked shortcut",
  devtools_shortcut: "Tried to open developer tools",
};

export interface ViolationReport {
  attemptId: string;
  type: ClientViolationType;
  at: string;
  durationMs?: number;
}

export interface ProctorState {
  status: AttemptStatus;
  violationCount: number;
  maxViolations: number;
}

export interface Violation {
  _id: string;
  type: ViolationType;
  counted: boolean;
  clientAt: string;
  serverAt: string;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
}

/** Question as a student sees it while taking an exam (no answers). */
export interface Question {
  _id: string;
  index: number;
  type: QuestionType;
  text: string;
  options: string[];
  points: number;
}

export interface QuestionInput {
  type?: QuestionType;
  text: string;
  options: string[];
  correctIndex?: number;
  correctIndexes?: number[];
  points?: number;
  explanation?: string;
}

export type InstructorQuestion = QuestionInput & { _id: string; type: QuestionType; points: number };

export type InstructorExam = Omit<Exam, "questionCount"> & { questions: InstructorQuestion[] };

export interface Answer {
  questionIndex: number;
  selectedIndex?: number | null;
  selectedIndexes?: number[];
  isFlagged?: boolean;
}

export type AttemptStatus = "in_progress" | "submitted" | "timed_out" | "auto_submitted";

export interface Attempt {
  _id: string;
  exam: string;
  examTitle: string;
  examEmoji?: string;
  passingScore: number;
  duration: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  timeTakenSeconds: number;
  status: AttemptStatus;
  certificateIssued: boolean;
  violationCount?: number;
}

export interface InstructorAttempt extends Attempt {
  user: Pick<User, "_id" | "firstName" | "lastName" | "email"> | null;
  violationCount: number;
  loggedEvents?: number;
}

export interface TakingView {
  attempt: Pick<Attempt, "_id" | "exam" | "status" | "startedAt" | "expiresAt" | "totalQuestions"> & {
    answers: Answer[];
    /** Snapshot taken when the attempt started; missing on older attempts. */
    proctoring?: ProctoringSettings;
    violationCount?: number;
  };
  exam: { _id: string; title: string; emoji?: string; duration: number; passingScore: number; questions: Question[] };
  serverNow: string;
}

export interface ResultView {
  attempt: Attempt;
  exam: { _id: string; title: string; emoji?: string; passingScore: number };
  review: ReviewQuestion[];
}

export interface ReviewQuestion {
  index: number;
  type: QuestionType;
  text: string;
  options: string[];
  points: number;
  correctIndex?: number;
  correctIndexes?: number[];
  explanation?: string;
  selectedIndex: number | null;
  selectedIndexes: number[];
  isCorrect: boolean;
  isFlagged: boolean;
}

export interface DashboardStats {
  examsTaken: number;
  avgScore: number;
  certificates: number;
  studyHours: number;
}

export interface RecentAttempt {
  _id: string;
  exam: string | null; // null if the exam was deleted
  examTitle: string;
  category: string;
  emoji: string;
  score: number;
  passed: boolean;
  submittedAt: string;
  timeTakenSeconds: number;
}

export type PdfKind = "answer-sheet" | "booklet" | "answer-key";

export interface OfflineSession {
  _id: string;
  exam: string;
  name: string;
  date?: string;
  examTitle: string;
  examEmoji?: string;
  passingScore: number;
  duration: number;
  versions: string[];
  questionCount: number;
  createdAt: string;
  sheetCount: number;
  avgScore: number;
  passedCount: number;
  reviewCount: number;
}

export interface OfflineSessionFull extends OfflineSession {
  variants: { letter: string; questions: InstructorQuestion[] }[];
}

export interface SheetInput {
  variant: string;
  studentName?: string;
  answers: Answer[];
}

export interface OfflineSheet {
  _id: string;
  number: number;
  variant: string;
  studentName: string;
  answers: Answer[];
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  source: "manual" | "scan";
  status: "graded" | "needs_review";
  createdAt: string;
}
