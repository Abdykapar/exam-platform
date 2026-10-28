# ExamPro — Exam Builder & Exam Taking: Implementation Instructions

Instructions for adding exam authoring (categories, exams, questions) and finishing the exam-taking flow.
Work through the phases in order. Each phase ends with a checklist you can verify.

---

## 0. Current state (read first)

- **Frontend (this repo):** Next.js 16.3 (App Router), React 19, Tailwind 4, `lucide-react` icons.
  - Next 16 has breaking changes. Read `node_modules/next/dist/docs/01-app/` before writing routes,
    especially for dynamic `params`, which are a Promise in recent versions.
  - API client: `src/lib/api.ts` (`request<T>()` + `api` object + shared types).
  - Auth: `src/lib/auth-context.tsx` (JWT in `localStorage`, `useAuth()` → `user`, `login`, `logout`).
  - Existing pages: `/login`, `/register`, `/dashboard`, `/exams`, `/exams/[id]`, `/exams/[id]/take`, `/exams/[id]/results`.
  - Categories are currently **hardcoded** in `src/app/exams/page.tsx` (`CATEGORIES` array), and `Exam.category` is a plain string.
- **Backend:** none in this repo. The frontend calls `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`).
  The backend will be NestJS + MongoDB (see §1).
- **Roles:** `student | instructor | admin` (already on `User`).

---

## 1. Backend (NestJS, separate project `exam-platform-api`)

The full backend instructions are in [docs/backend/](backend/), in four parts. Start with [01-setup-core.md](backend/01-setup-core.md).

These security rules must hold:
1. Students never receive `correctIndex`, `correctIndexes` or `explanation` until their attempt is finished.
2. The server does all grading and owns the timer (`expiresAt`, with a 30-second grace period).
3. Only an exam's instructor, or an admin, can edit it. Only an admin can delete categories.

**Checklist:** the seed runs; all 3 demo users can log in from the existing login page;
`GET /api/exams/:id` contains no answers.

---

## 2. Frontend: API client & types

In `src/lib/api.ts`:
1. Add a `Category` type: `{ _id, name, slug, description?, emoji?, examCount? }`.
2. Change `Exam.category` to `Category | string`.
3. Add authoring types:
   `QuestionInput = { type, text, options, correctIndex?, correctIndexes?, points, explanation? }`,
   and `InstructorQuestion = Question & QuestionInput`.
4. Add `api.categories.{list, create, update, remove}`, `api.instructor.exams.{list, get}`,
   `api.exams.{create, update, remove, publish, unpublish}`,
   `api.questions.{add, update, remove, reorder, bulk}`, and `api.attempts.saveAnswers`.
5. Follow the existing `request<{ success: boolean; data: {...} }>` pattern.

In `src/app/exams/page.tsx`, replace the hardcoded `CATEGORIES` with `api.categories.list()`. Filter by `slug`.

---

## 3. Frontend: route protection

Create `src/components/RequireRole.tsx`:
- Use `useAuth()`. While `loading` is true, show a spinner.
- With no user, redirect to `/login?next=<current path>`.
- If the user's role is not allowed, show a "Not authorized" message with a link to `/dashboard`.

Wrap every `/instructor/*` page with `<RequireRole roles={["instructor","admin"]}>`.
You can do this once in `src/app/instructor/layout.tsx`.

In `Navbar.tsx`, show an **"Instructor"** link when `user.role !== "student"`.

---

## 4. Frontend: instructor pages (new)

```
src/app/instructor/
  layout.tsx                    role guard + sidebar (Exams, Categories)
  page.tsx                      redirect → /instructor/exams
  categories/page.tsx           list + inline create/edit/delete
  exams/page.tsx                table of my exams
  exams/new/page.tsx            create exam form → redirect to edit page
  exams/[id]/edit/page.tsx      tabs: Details | Questions | Settings | Preview
```

### 4.1 Categories page
- Table columns: emoji, name, description, exam count, actions.
- A "New category" button opens a modal with name, emoji and description fields.
- Delete asks for confirmation. If the API returns 409 ("has exams"), show its message.

### 4.2 My Exams page
- Columns: title, category, questions count, status badge (Draft/Published), updated date, actions (Edit, Preview, Publish/Unpublish, Delete).
- Filters: status and category. Add a search box.

### 4.3 Create / Edit exam: Details tab
- Fields: title, description, category (select from `api.categories.list()`), difficulty, duration (min), passing score (%), emoji, tags.
- Validate on the client too: required fields and number ranges as listed in §1.3.
- Submitting creates the exam as a draft and opens the Questions tab.

### 4.4 Edit exam: Questions tab (question builder)
- Show a list of question cards in `order`. Each card shows its number, text, options, the correct answer highlighted, and points.
- **Add question** opens an inline editor with:
  - a type selector (single / multiple),
  - question text (textarea),
  - option rows, each with a radio (single) or checkbox (multiple) to mark it correct, a text input and a remove button,
  - "+ Add option" (minimum 2, maximum 6 options),
  - points and an optional explanation.
- Before saving, validate that the text is non-empty, every option is non-empty, and at least one option is marked correct.
- Reorder questions with up and down buttons, then call `reorder`. Drag-and-drop is optional.
- **Import JSON:** paste an array of `QuestionInput` and call `bulk`. Show errors per row.
- Show a sticky footer with "N questions · M points total".

### 4.5 Settings tab
Settings: shuffle questions, shuffle options, max attempts, and Publish/Unpublish.
Disable Publish if there are 0 questions, and explain why next to the button.

### 4.6 Preview tab
Render the exam with the same `QuestionView` component that the take page uses, in read-only mode. Do not create an attempt.

---

## 5. Frontend: exam taking (update `/exams/[id]/take`)

Extract reusable pieces into `src/components/exam/`:
- `QuestionView.tsx`: the question text plus options. Use radio inputs for single answers and checkboxes for multiple.
- `QuestionNavigator.tsx`: a grid of numbered buttons in three states (answered, flagged, unanswered).
- `ExamTimer.tsx`: counts down from `attempt.expiresAt` (server time), not from page load.

Required behavior:
1. On mount, call `api.exams.start(id)`, or resume an existing `in_progress` attempt returned by the server.
2. Show one question per screen, with Prev/Next buttons, a "Flag for review" toggle, and the navigator grid.
3. **Autosave:** debounce changes by 1–2 seconds and call `api.attempts.saveAnswers`. Show "Saved ✓" or "Saving…".
4. Show a timer warning at 5 minutes and at 1 minute. At 0, submit automatically with `timedOut: true`.
5. Before submitting, show a confirmation modal listing the unanswered and flagged questions.
6. Show a `beforeunload` warning while the attempt is in progress.
7. Keyboard shortcuts: keys 1–6 select an option, ←/→ move between questions, F flags the question.
8. After submitting, go to `/exams/[id]/results?attempt=<attemptId>`.

The results page already exists. Make sure it reads `review[]` from the submit or attempt response and shows the explanations.

---

## 6. Testing & done criteria

- **Backend:** Jest + Supertest. Cover role guards, answer stripping, grading, the timer, and category delete returning 409.
- **Frontend:** `npm run build` and `npm run lint` must pass.
- **Manual end-to-end test:**
  1. Log in as the instructor and create the category "Physics".
  2. Create an exam in that category, add 3 questions (one of them multiple-choice), and publish it.
  3. Log in as the student, find the exam under Physics, start it, answer 2 questions, reload the page, and check that the answers are restored.
  4. Submit and check that the score and explanations are correct.
  5. Confirm that the student cannot open `/instructor/*` or call the authoring endpoints, which should return 403.

## 7. Suggested build order
1. Backend models, auth and seed → 2. Categories API and UI → 3. Exam CRUD and the My Exams page →
4. Question builder → 5. Publish flow and student listing → 6. Take-page refactor with autosave and timer → 7. Tests.
