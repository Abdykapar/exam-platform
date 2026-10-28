const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// Auth
export const api = {
  auth: {
    register: (body: { firstName: string; lastName: string; email: string; password: string; role: string }) =>
      request<{ success: boolean; token: string; data: { user: User } }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

    login: (body: { email: string; password: string }) =>
      request<{ success: boolean; token: string; data: { user: User } }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

    getMe: () => request<{ success: boolean; data: { user: User } }>("/auth/me"),

    updateProfile: (body: Partial<User>) =>
      request<{ success: boolean; data: { user: User } }>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
  },

  exams: {
    list: (params?: { category?: string; difficulty?: string; search?: string; page?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ success: boolean; data: { exams: Exam[]; total: number; pages: number; page: number } }>(
        `/exams${q ? `?${q}` : ""}`
      );
    },
    get: (id: string) => request<{ success: boolean; data: { exam: Exam } }>(`/exams/${id}`),
    start: (examId: string) =>
      request<{ success: boolean; data: { attempt: Attempt; exam: Exam } }>(`/exams/${examId}/start`, { method: "POST" }),
  },

  attempts: {
    list: () => request<{ success: boolean; data: { attempts: Attempt[] } }>("/attempts"),
    get: (attemptId: string) =>
      request<{ success: boolean; data: { attempt: Attempt; exam: Exam; review: ReviewQuestion[] } }>(`/attempts/${attemptId}`),
    submit: (attemptId: string, body: { answers: Answer[]; timedOut?: boolean }) =>
      request<{ success: boolean; data: { attempt: Attempt; exam: Exam; review: ReviewQuestion[] } }>(
        `/attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify(body) }
      ),
  },

  dashboard: {
    get: () =>
      request<{ success: boolean; data: { stats: DashboardStats; recentAttempts: RecentAttempt[]; scoreHistory: number[] } }>("/dashboard"),
  },
};

// Types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "student" | "instructor" | "admin";
  bio?: string;
  avatar?: string;
  createdAt: string;
}

export interface Question {
  _id: string;
  index: number;
  text: string;
  options: string[];
  points: number;
}

export interface Exam {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: number;
  passingScore: number;
  questions: Question[];
  instructor: User | string;
  emoji: string;
  enrolledCount: number;
  rating: number;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
}

export interface Answer {
  questionIndex: number;
  selectedIndex: number | null;
  isFlagged?: boolean;
}

export interface Attempt {
  _id: string;
  exam: Exam | string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  timeTakenSeconds: number;
  submittedAt: string;
  status: string;
  certificateIssued: boolean;
}

export interface ReviewQuestion {
  index: number;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  selectedIndex: number | null;
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
  examTitle: string;
  category: string;
  emoji: string;
  score: number;
  passed: boolean;
  submittedAt: string;
  timeTakenSeconds: number;
}
