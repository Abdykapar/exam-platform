# ExamPro API (NestJS): Part 4, Attempts, Dashboard, Seed & Tests

Prerequisite: [03-categories-exams.md](03-categories-exams.md). The key design decisions listed there apply here too.

---

## 3. Attempts (taking exams)

### `attempts/schemas/attempt.schema.ts`
```ts
@Schema({ _id: false })
export class AttemptAnswer {
  @Prop({ required: true }) questionIndex: number;               // index in attempt.questions
  @Prop({ type: Number, default: null }) selectedIndex: number | null;
  @Prop({ type: [Number], default: [] }) selectedIndexes: number[];
  @Prop({ default: false }) isFlagged: boolean;
}
const AttemptAnswerSchema = SchemaFactory.createForClass(AttemptAnswer);

export enum AttemptStatus { InProgress = 'in_progress', Submitted = 'submitted', TimedOut = 'timed_out' }

@Schema({ timestamps: true })
export class Attempt {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true }) user: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Exam', required: true, index: true }) exam: Types.ObjectId;
  // Snapshot, taken at start
  @Prop({ required: true }) examTitle: string;
  @Prop() examEmoji: string;
  @Prop({ required: true }) passingScore: number;
  @Prop({ required: true }) duration: number;
  @Prop({ type: [QuestionSchema], default: [] }) questions: Question[];
  // Progress
  @Prop({ type: [AttemptAnswerSchema], default: [] }) answers: AttemptAnswer[];
  @Prop({ type: String, enum: AttemptStatus, default: AttemptStatus.InProgress, index: true }) status: AttemptStatus;
  @Prop({ required: true }) startedAt: Date;
  @Prop({ required: true }) expiresAt: Date;
  @Prop() submittedAt?: Date;
  // Result
  @Prop({ default: 0 }) score: number;
  @Prop({ default: 0 }) correctCount: number;
  @Prop({ default: 0 }) totalQuestions: number;
  @Prop({ default: false }) passed: boolean;
  @Prop({ default: 0 }) timeTakenSeconds: number;
  @Prop({ default: false }) certificateIssued: boolean;
}
export type AttemptDocument = HydratedDocument<Attempt>;
export const AttemptSchema = SchemaFactory.createForClass(Attempt);
```

### `attempts/dto/answers.dto.ts`
```ts
export class AnswerDto {
  @IsInt() @Min(0) questionIndex: number;
  @IsOptional() @IsInt() @Min(0) selectedIndex?: number | null;
  @IsOptional() @IsArray() @IsInt({ each: true }) selectedIndexes?: number[];
  @IsOptional() @IsBoolean() isFlagged?: boolean;
}
export class SaveAnswersDto {
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => AnswerDto) answers: AnswerDto[];
}
export class SubmitAttemptDto extends SaveAnswersDto {
  @IsOptional() @IsBoolean() timedOut?: boolean;
}
```

### `attempts/grading.ts` (pure functions, easy to unit-test)
```ts
export const GRACE_MS = 30_000;

/** Copy the exam's questions for one attempt, shuffling and remapping correct answers if enabled. */
export function buildSnapshot(exam: ExamDocument): Question[] {
  const qs = exam.questions.map((q) => q.toObject() as Question);
  const ordered = exam.shuffleQuestions ? shuffle(qs) : qs;
  if (!exam.shuffleOptions) return ordered;
  return ordered.map((q) => {
    const perm = shuffle(q.options.map((_, i) => i));      // perm[newPos] = oldPos
    return {
      ...q,
      options: perm.map((i) => q.options[i]),
      correctIndex: q.correctIndex === undefined ? undefined : perm.indexOf(q.correctIndex),
      correctIndexes: q.correctIndexes?.map((i) => perm.indexOf(i)),
    };
  });
}

/** Drop invalid indexes and duplicates; never trust the client. */
export function sanitizeAnswers(input: AnswerDto[], questions: Question[]): AttemptAnswer[] {
  const out = new Map<number, AttemptAnswer>();
  for (const a of input) {
    const q = questions[a.questionIndex];
    if (!q) continue;
    const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < q.options.length;
    out.set(a.questionIndex, {
      questionIndex: a.questionIndex,
      selectedIndex: a.selectedIndex != null && valid(a.selectedIndex) ? a.selectedIndex : null,
      selectedIndexes: [...new Set((a.selectedIndexes ?? []).filter(valid))],
      isFlagged: !!a.isFlagged,
    });
  }
  return [...out.values()];
}

export function isAnswerCorrect(q: Question, a?: AttemptAnswer): boolean {
  if (!a) return false;
  if (q.type === QuestionType.Multiple) {
    const want = [...(q.correctIndexes ?? [])].sort((x, y) => x - y);
    const got = [...a.selectedIndexes].sort((x, y) => x - y);
    return want.length === got.length && want.every((v, i) => v === got[i]);
  }
  return a.selectedIndex !== null && a.selectedIndex === q.correctIndex;
}

/** Score as a percentage of points, plus a per-question review (includes answers: only for finished attempts). */
export function grade(questions: Question[], answers: AttemptAnswer[], passingScore: number) {
  const byIndex = new Map(answers.map((a) => [a.questionIndex, a]));
  let earned = 0, total = 0, correctCount = 0;
  const review = questions.map((q, index) => {
    const a = byIndex.get(index);
    const isCorrect = isAnswerCorrect(q, a);
    total += q.points;
    if (isCorrect) { earned += q.points; correctCount++; }
    return {
      index, type: q.type, text: q.text, options: q.options, points: q.points,
      correctIndex: q.correctIndex, correctIndexes: q.correctIndexes, explanation: q.explanation,
      selectedIndex: a?.selectedIndex ?? null, selectedIndexes: a?.selectedIndexes ?? [],
      isFlagged: a?.isFlagged ?? false, isCorrect,
    };
  });
  const score = total ? Math.round((earned / total) * 100) : 0;
  return { score, correctCount, passed: score >= passingScore, review };
}
```

### `attempts/attempt.mapper.ts`
```ts
/** What a student sees while taking the exam: no answers, no explanations. */
export function toTakingView(a: AttemptDocument) {
  return {
    attempt: {
      _id: a._id, exam: a.exam, status: a.status, startedAt: a.startedAt, expiresAt: a.expiresAt,
      answers: a.answers, totalQuestions: a.totalQuestions,
    },
    exam: {
      _id: a.exam, title: a.examTitle, emoji: a.examEmoji, duration: a.duration, passingScore: a.passingScore,
      questions: a.questions.map((q, index) => ({ _id: q._id, index, type: q.type, text: q.text, options: q.options, points: q.points })),
    },
    serverNow: new Date(),   // lets the client correct for clock skew
  };
}

export function toResultView(a: AttemptDocument) {
  const { review } = grade(a.questions, a.answers, a.passingScore);
  const { questions, answers, ...summary } = a.toObject();
  return { attempt: summary, exam: { _id: a.exam, title: a.examTitle, emoji: a.examEmoji, passingScore: a.passingScore }, review };
}
```

### `attempts/attempts.service.ts`
```ts
@Injectable()
export class AttemptsService {
  constructor(
    @InjectModel(Attempt.name) private attempts: Model<Attempt>,
    @InjectModel(Exam.name) private exams: Model<Exam>,
  ) {}

  async start(examId: string, userId: string) {
    const exam = await this.exams.findOne({ _id: examId, isPublished: true });
    if (!exam) throw new NotFoundException('Exam not found');

    // Resume an unfinished attempt instead of creating a new one
    let attempt = await this.attempts.findOne({ user: userId, exam: examId, status: AttemptStatus.InProgress });
    if (attempt && this.isExpired(attempt)) {
      await this.finish(attempt, true);
      attempt = null;
    }

    if (!attempt) {
      const previous = await this.attempts.countDocuments({ user: userId, exam: examId });
      if (exam.maxAttempts > 0 && previous >= exam.maxAttempts) {
        throw new ForbiddenException('You have used all attempts for this exam');
      }
      const questions = buildSnapshot(exam);
      const now = new Date();
      attempt = await this.attempts.create({
        user: userId, exam: exam._id,
        examTitle: exam.title, examEmoji: exam.emoji, passingScore: exam.passingScore, duration: exam.duration,
        questions, totalQuestions: questions.length,
        startedAt: now, expiresAt: new Date(now.getTime() + exam.duration * 60_000),
      });
      if (previous === 0) await this.exams.updateOne({ _id: exam._id }, { $inc: { enrolledCount: 1 } });
    }
    return { data: toTakingView(attempt) };
  }

  async saveAnswers(id: string, userId: string, dto: SaveAnswersDto) {
    const attempt = await this.getOwn(id, userId);
    if (attempt.status !== AttemptStatus.InProgress) throw new ConflictException('This attempt is already submitted');
    if (this.isExpired(attempt)) throw new ForbiddenException('Time is up');
    attempt.answers = sanitizeAnswers(dto.answers, attempt.questions);
    await attempt.save();
    return { data: { savedAt: new Date() } };
  }

  async submit(id: string, userId: string, dto: SubmitAttemptDto) {
    const attempt = await this.getOwn(id, userId);
    if (attempt.status !== AttemptStatus.InProgress) return { data: toResultView(attempt) }; // idempotent
    const late = this.isExpired(attempt);
    if (!late) attempt.answers = sanitizeAnswers(dto.answers, attempt.questions); // late: grade last autosave
    await this.finish(attempt, late || !!dto.timedOut);
    return { data: toResultView(attempt) };
  }

  async findOne(id: string, userId: string) {
    const attempt = await this.getOwn(id, userId);
    if (attempt.status === AttemptStatus.InProgress) {
      if (!this.isExpired(attempt)) return { data: toTakingView(attempt) };
      await this.finish(attempt, true);
    }
    return { data: toResultView(attempt) };
  }

  async listMine(userId: string) {
    const attempts = await this.attempts.find({ user: userId }).select('-questions -answers').sort({ createdAt: -1 }).lean();
    return { data: { attempts } };
  }

  private async finish(attempt: AttemptDocument, timedOut: boolean) {
    const { score, correctCount, passed } = grade(attempt.questions, attempt.answers, attempt.passingScore);
    const end = Math.min(Date.now(), attempt.expiresAt.getTime());
    attempt.set({
      score, correctCount, passed, certificateIssued: passed,
      status: timedOut ? AttemptStatus.TimedOut : AttemptStatus.Submitted,
      submittedAt: new Date(end),
      timeTakenSeconds: Math.max(0, Math.round((end - attempt.startedAt.getTime()) / 1000)),
    });
    await attempt.save();
  }

  private isExpired(a: AttemptDocument) {
    return Date.now() > a.expiresAt.getTime() + GRACE_MS;
  }

  private async getOwn(id: string, userId: string) {
    const attempt = await this.attempts.findOne({ _id: id, user: userId });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }
}
```

### `attempts/attempts.controller.ts`
```ts
@ApiTags('attempts') @ApiBearerAuth()
@Controller()
export class AttemptsController {
  constructor(private service: AttemptsService) {}

  @HttpCode(200) @Post('exams/:id/start')
  start(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.start(id, u.sub); }

  @Get('attempts')
  list(@CurrentUser() u: JwtUser) { return this.service.listMine(u.sub); }

  @Get('attempts/:id')
  get(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.findOne(id, u.sub); }

  @Patch('attempts/:id/answers')
  save(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: SaveAnswersDto, @CurrentUser() u: JwtUser) { return this.service.saveAnswers(id, u.sub, dto); }

  @HttpCode(200) @Post('attempts/:id/submit')
  submit(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: SubmitAttemptDto, @CurrentUser() u: JwtUser) { return this.service.submit(id, u.sub, dto); }
}
```
Every role can take exams, so this controller has no `@Roles`. In the module, register `Attempt` and `Exam`, and export `MongooseModule`.

---

## 4. Dashboard

`GET /api/dashboard` returns the shape `api.ts` expects: `{ stats, recentAttempts, scoreHistory }`.
```ts
@Injectable()
export class DashboardService {
  constructor(@InjectModel(Attempt.name) private attempts: Model<Attempt>) {}

  async get(userId: string) {
    const done = await this.attempts
      .find({ user: userId, status: { $ne: AttemptStatus.InProgress } })
      .select('-questions -answers').sort({ submittedAt: -1 })
      .populate({ path: 'exam', select: 'category', populate: { path: 'category', select: 'name' } })
      .lean();

    const scores = done.map((a) => a.score);
    const stats = {
      examsTaken: done.length,
      avgScore: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0,
      certificates: done.filter((a) => a.passed).length,
      studyHours: Math.round((done.reduce((s, a) => s + a.timeTakenSeconds, 0) / 3600) * 10) / 10,
    };
    const recentAttempts = done.slice(0, 5).map((a) => ({
      _id: a._id, examTitle: a.examTitle, emoji: a.examEmoji,
      category: (a.exam as unknown as { category?: { name: string } })?.category?.name ?? '',
      score: a.score, passed: a.passed, submittedAt: a.submittedAt, timeTakenSeconds: a.timeTakenSeconds,
    }));
    const scoreHistory = scores.slice(0, 10).reverse();
    return { data: { stats, recentAttempts, scoreHistory } };
  }
}
```
The controller is `@Get('dashboard')` with `@CurrentUser()`. The module imports `AttemptsModule` for the model.

---

## 5. Seed script: `src/seed.ts`

Add `"seed": "nest build && node dist/seed"` to `package.json`. Running it more than once is safe, because everything is upserted.
```ts
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { Role, User } from './users/schemas/user.schema';
import { Category } from './categories/schemas/category.schema';
import { Exam } from './exams/schemas/exam.schema';
import { slugify } from './common/utils';

const CATEGORIES = [
  ['Mathematics', '📐'], ['Sciences', '🔬'], ['Languages', '🗣️'], ['IT', '💻'],
  ['History', '🏛️'], ['Business', '📊'], ['Arts', '🎨'], ['Medicine', '🩺'],
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const users = app.get<Model<User>>(getModelToken(User.name));
  const categories = app.get<Model<Category>>(getModelToken(Category.name));
  const exams = app.get<Model<Exam>>(getModelToken(Exam.name));

  const password = await bcrypt.hash('password123', 10);
  const upsertUser = (email: string, firstName: string, role: Role) =>
    users.findOneAndUpdate({ email }, { email, firstName, lastName: 'Demo', role, password }, { upsert: true, new: true });

  await upsertUser('student@exampro.com', 'Student', Role.Student);
  const instructor = await upsertUser('instructor@exampro.com', 'Instructor', Role.Instructor);
  await upsertUser('admin@exampro.com', 'Admin', Role.Admin);

  const cats: Record<string, Category & { _id: unknown }> = {};
  for (const [name, emoji] of CATEGORIES) {
    cats[name] = await categories.findOneAndUpdate(
      { slug: slugify(name) }, { name, slug: slugify(name), emoji }, { upsert: true, new: true }).lean();
  }

  const sample = [
    {
      title: 'Algebra Fundamentals', category: cats.Mathematics._id, difficulty: 'Beginner', duration: 15, emoji: '➗',
      questions: [
        { text: 'Solve: 2x + 3 = 11', options: ['x = 3', 'x = 4', 'x = 5', 'x = 7'], correctIndex: 1, explanation: '2x = 8, so x = 4.' },
        { text: 'Which are prime numbers?', type: 'multiple', options: ['2', '9', '11', '15'], correctIndexes: [0, 2] },
        { text: 'What is 3²?', options: ['6', '9', '12'], correctIndex: 1 },
      ],
    },
    {
      title: 'Web Basics', category: cats.IT._id, difficulty: 'Beginner', duration: 10, emoji: '🌐',
      questions: [
        { text: 'What does HTML stand for?', options: ['HyperText Markup Language', 'High Tech Modern Language'], correctIndex: 0 },
        { text: 'Which HTTP method is idempotent?', options: ['POST', 'PUT', 'PATCH'], correctIndex: 1, explanation: 'Repeating a PUT has the same effect.' },
      ],
    },
  ];
  for (const e of sample) {
    await exams.findOneAndUpdate({ title: e.title },
      { ...e, instructor: instructor._id, isPublished: true, passingScore: 60 }, { upsert: true });
  }

  console.log('Seed complete. Users: student|instructor|admin @exampro.com / password123');
  await app.close();
}
void seed();
```
Add more sample exams by extending `sample`.

---

## 6. Tests

**Unit tests.** `attempts/grading.spec.ts` should cover:
- `isAnswerCorrect` for single answers, multiple answers, and missing answers;
- `grade`, including point weighting and rounding;
- that `buildSnapshot` with `shuffleOptions` still points `correctIndex` at the same option text;
- that `sanitizeAnswers` drops out-of-range indexes and duplicates.

**End-to-end tests.** `test/app.e2e-spec.ts` uses `mongodb-memory-server`, which downloads a MongoDB binary on its first run:
```ts
let app: INestApplication; let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
});
afterAll(async () => { await app.close(); await mongod.stop(); });
```
Required scenarios:
1. Register as an instructor, create a category, create an exam, add 2 questions (single and multiple), and publish it. Expect 200 for each step.
2. A student calling `POST /exams` or `POST /categories` gets 403. Calling either without a token gets 401.
3. `GET /exams/:id` and `POST /exams/:id/start` contain no `correctIndex` or `explanation` (check the stringified body).
4. Start, then `PATCH` the answers, then call start again. The second call returns **the same attempt** with the saved answers.
5. Submitting the correct answers gives a score of 100 and `passed: true`. Submitting again returns the same result (idempotent).
6. With `maxAttempts: 1`, a second start after submitting returns 403.
7. Set `expiresAt` in the past directly in the DB. Then submit returns status `timed_out` and grades only the autosaved answers.
8. Deleting a category that still has exams returns 409. Deleting an exam that has attempts returns 409.
9. Publishing an exam with 0 questions returns 400.

Run: `npm run test && npm run test:e2e && npm run build`.

---

## 7. Frontend changes required (`exam-platform` repo)

1. In `src/lib/api.ts`:
   - Add `questionCount: number` to `Exam`, and change `category` to `Category | string`.
   - Add `type?: 'single' | 'multiple'` to `Question`.
   - Add `selectedIndexes?: number[]` to `Answer` and to `ReviewQuestion`.
   - `start` and `attempts.get` now also return `serverNow`.
   - Add the new client methods: categories, `instructor.exams`, exam CRUD and publish, questions, and `attempts.saveAnswers` (`PATCH /attempts/:id/answers`).
2. Public exam endpoints no longer return `questions`. Show `questionCount` instead.
3. `exams/page.tsx` should load categories from `GET /categories` and filter with `?category=<slug>`.
4. The take, results and detail pages use mock data today. Wire them up as described in §5 of [../exam-builder-spec.md](../exam-builder-spec.md).

## Endpoint summary

| Method | Path | Access |
|---|---|---|
| POST | /auth/register, /auth/login | public (rate-limited) |
| GET/PATCH | /auth/me | logged in |
| GET | /categories | public |
| POST/PATCH | /categories(/:id) | instructor, admin |
| DELETE | /categories/:id | admin |
| GET | /exams, /exams/:id | public (published only, no answers) |
| GET | /instructor/exams(/:id) | instructor (own), admin (all) |
| POST/PATCH/DELETE | /exams(/:id) | owner, admin |
| POST | /exams/:id/publish, /unpublish | owner, admin |
| POST/PATCH/DELETE/PUT | /exams/:id/questions… | owner, admin |
| POST | /exams/:id/start | logged in |
| GET | /attempts, /attempts/:id | own attempts |
| PATCH | /attempts/:id/answers | own, in progress, before expiry |
| POST | /attempts/:id/submit | own |
| GET | /dashboard | logged in |
