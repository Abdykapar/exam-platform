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
    },
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
      request<Res<{ savedAt: string }>>(`/attempts/${attemptId}/answers`, json("PATCH", { answers })),
    submit: (attemptId: string, body: { answers: Answer[]; timedOut?: boolean }) =>
      request<Res<ResultView>>(`/attempts/${attemptId}/submit`, json("POST", body)),
  },

  dashboard: {
    get: () =>
      request<Res<{ stats: DashboardStats; recentAttempts: RecentAttempt[]; scoreHistory: number[] }>>("/dashboard"),
  },
};

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

export type AttemptStatus = "in_progress" | "submitted" | "timed_out";

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
}

export interface TakingView {
  attempt: Pick<Attempt, "_id" | "exam" | "status" | "startedAt" | "expiresAt" | "totalQuestions"> & {
    answers: Answer[];
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
