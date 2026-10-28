# ExamPro API (NestJS): Part 3, Categories, Exams & Questions

Prerequisite: [02-auth.md](02-auth.md) is done.
The attempt schema used here is defined in [04-attempts-dashboard.md](04-attempts-dashboard.md) §3. Create it before compiling.

**Key design decisions**
- **Questions are embedded** in the exam document, and their order is the array order.
- **Attempts snapshot the questions.** When an attempt starts, it copies the exam's questions, already shuffled if shuffling is enabled.
  Instructors can then edit a published exam without breaking attempts that are running or finished,
  and answers always refer to positions in the snapshot, so no index mapping is needed.
- **Students never receive correct answers or explanations** until the attempt is finished.
  Every response goes through an explicit mapper function. Raw documents are never returned to students.
- **The server grades and owns the clock.** `expiresAt` is set when the attempt starts, with a 30-second grace period on submit.

---

## 1. Categories

### `categories/schemas/category.schema.ts`
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, trim: true }) name: string;
  @Prop({ required: true, unique: true }) slug: string;
  @Prop({ default: '' }) description: string;
  @Prop({ default: '📚' }) emoji: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' }) createdBy?: Types.ObjectId;
}
export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);
```

### `categories/dto/category.dto.ts`
```ts
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @Length(2, 50) name: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsString() @MaxLength(8) emoji?: string;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

### `categories/categories.service.ts`
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';
import { Exam } from '../exams/schemas/exam.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { slugify } from '../common/utils';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categories: Model<Category>,
    @InjectModel(Exam.name) private exams: Model<Exam>,
  ) {}

  async list() {
    const categories = await this.categories.aggregate([
      { $lookup: {
          from: 'exams', let: { id: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$category', '$$id'] }, isPublished: true } }, { $count: 'n' }],
          as: 'counts' } },
      { $addFields: { examCount: { $ifNull: [{ $first: '$counts.n' }, 0] } } },
      { $project: { counts: 0, __v: 0 } },
      { $sort: { name: 1 } },
    ]);
    return { data: { categories } };
  }

  async create(dto: CreateCategoryDto, userId: string) {
    const category = await this.categories.create({ ...dto, slug: slugify(dto.name), createdBy: userId });
    return { data: { category } };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const patch = dto.name ? { ...dto, slug: slugify(dto.name) } : dto;
    const category = await this.categories.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
    if (!category) throw new NotFoundException('Category not found');
    return { data: { category } };
  }

  async remove(id: string) {
    if (await this.exams.exists({ category: id })) {
      throw new ConflictException('This category still has exams. Move or delete them first.');
    }
    const res = await this.categories.deleteOne({ _id: id });
    if (!res.deletedCount) throw new NotFoundException('Category not found');
    return { data: {} };
  }
}
```

### `categories/categories.controller.ts`
```ts
@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Public() @Get()
  list() { return this.service.list(); }

  @Roles(Role.Instructor, Role.Admin) @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: JwtUser) { return this.service.create(dto, user.sub); }

  @Roles(Role.Instructor, Role.Admin) @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCategoryDto) { return this.service.update(id, dto); }

  @Roles(Role.Admin) @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string) { return this.service.remove(id); }
}
```
In `categories.module.ts`, register `Category` and `Exam` with `MongooseModule.forFeature`, add the controller and service, and export `MongooseModule`.

---

## 2. Exams & Questions

### `exams/schemas/question.schema.ts`
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum QuestionType { Single = 'single', Multiple = 'multiple' }

@Schema()
export class Question {
  _id: Types.ObjectId;
  @Prop({ type: String, enum: QuestionType, default: QuestionType.Single }) type: QuestionType;
  @Prop({ required: true }) text: string;
  @Prop({ type: [String], required: true }) options: string[];
  @Prop() correctIndex?: number;                                // single
  @Prop({ type: [Number], default: undefined }) correctIndexes?: number[]; // multiple
  @Prop({ default: 1 }) points: number;
  @Prop() explanation?: string;
}
export const QuestionSchema = SchemaFactory.createForClass(Question);

/** Returns an error message, or null when the question is valid. Used by add/update/bulk/publish. */
export function questionError(q: Pick<Question, 'type' | 'text' | 'options' | 'correctIndex' | 'correctIndexes'>): string | null {
  if (!q.text?.trim()) return 'Question text is required';
  if (!q.options || q.options.length < 2 || q.options.length > 6) return 'A question needs 2–6 options';
  if (q.options.some((o) => !o.trim())) return 'Options cannot be empty';
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < q.options.length;
  if (q.type === QuestionType.Multiple) {
    if (!q.correctIndexes?.length || !q.correctIndexes.every(inRange)) return 'Mark at least one correct option';
  } else if (q.correctIndex === undefined || !inRange(q.correctIndex)) {
    return 'Mark the correct option';
  }
  return null;
}
```

### `exams/schemas/exam.schema.ts`
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Question, QuestionSchema } from './question.schema';

export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

@Schema({ timestamps: true })
export class Exam {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ default: '' }) description: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', required: true, index: true }) category: Types.ObjectId;
  @Prop({ type: String, enum: DIFFICULTIES, default: 'Beginner' }) difficulty: string;
  @Prop({ required: true }) duration: number;     // minutes
  @Prop({ default: 70 }) passingScore: number;    // percent
  @Prop({ type: [QuestionSchema], default: [] }) questions: Types.DocumentArray<Question>;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true }) instructor: Types.ObjectId;
  @Prop({ default: '📝' }) emoji: string;
  @Prop({ type: [String], default: [] }) tags: string[];
  @Prop({ default: false }) shuffleQuestions: boolean;
  @Prop({ default: false }) shuffleOptions: boolean;
  @Prop({ default: 0 }) maxAttempts: number;      // 0 = unlimited
  @Prop({ default: false, index: true }) isPublished: boolean;
  @Prop({ default: 0 }) enrolledCount: number;
  @Prop({ default: 0 }) rating: number;
}
export type ExamDocument = HydratedDocument<Exam>;
export const ExamSchema = SchemaFactory.createForClass(Exam);
```

### `exams/dto/exam.dto.ts`
```ts
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { DIFFICULTIES } from '../schemas/exam.schema';

export class CreateExamDto {
  @IsString() @Length(3, 120) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsMongoId() category: string;
  @IsIn(DIFFICULTIES) difficulty: string;
  @IsInt() @Min(1) @Max(600) duration: number;
  @IsInt() @Min(0) @Max(100) passingScore: number;
  @IsOptional() @IsString() @MaxLength(8) emoji?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(30, { each: true }) tags?: string[];
  @IsOptional() @IsBoolean() shuffleQuestions?: boolean;
  @IsOptional() @IsBoolean() shuffleOptions?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(100) maxAttempts?: number;
}
export class UpdateExamDto extends PartialType(CreateExamDto) {}

export class ListExamsQueryDto {
  @IsOptional() @IsString() category?: string;   // category slug
  @IsOptional() @IsIn(DIFFICULTIES) difficulty?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}
```

### `exams/dto/question.dto.ts`
```ts
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { QuestionType } from '../schemas/question.schema';

export class QuestionDto {
  @IsOptional() @IsEnum(QuestionType) type: QuestionType = QuestionType.Single;
  @IsString() @MaxLength(2000) text: string;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(6) @IsString({ each: true }) @MaxLength(500, { each: true }) options: string[];
  @IsOptional() @IsInt() @Min(0) correctIndex?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) correctIndexes?: number[];
  @IsOptional() @IsInt() @Min(1) @Max(100) points?: number;
  @IsOptional() @IsString() @MaxLength(2000) explanation?: string;
}
export class UpdateQuestionDto extends PartialType(QuestionDto) {}

export class ReorderQuestionsDto {
  @IsArray() @IsMongoId({ each: true }) order: string[];
}

export class BulkQuestionsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => QuestionDto)
  questions: QuestionDto[];
}
```

### `exams/exam.mapper.ts`
```ts
/** Public view: no questions at all, only the count (students get questions via /start). */
export function toPublicExam<T extends { questions: unknown[] }>(exam: T) {
  const { questions, ...rest } = exam;
  return { ...rest, questionCount: questions.length };
}
```

### `exams/exams.service.ts`
```ts
@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(Exam.name) private exams: Model<Exam>,
    @InjectModel(Category.name) private categories: Model<Category>,
    @InjectModel(Attempt.name) private attempts: Model<Attempt>,
  ) {}

  // ---------- public ----------
  async listPublished(q: ListExamsQueryDto) {
    const limit = 12;
    const page = q.page ?? 1;
    const filter: Record<string, unknown> = { isPublished: true };
    if (q.category) {
      const cat = await this.categories.findOne({ slug: q.category }).select('_id');
      if (!cat) return { data: { exams: [], total: 0, pages: 1, page } };
      filter.category = cat._id;
    }
    if (q.difficulty) filter.difficulty = q.difficulty;
    if (q.search) filter.title = { $regex: escapeRegex(q.search), $options: 'i' };

    const [docs, total] = await Promise.all([
      this.exams.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('category', 'name slug emoji').populate('instructor', 'firstName lastName').lean(),
      this.exams.countDocuments(filter),
    ]);
    return { data: { exams: docs.map(toPublicExam), total, pages: Math.max(1, Math.ceil(total / limit)), page } };
  }

  async getPublished(id: string) {
    const exam = await this.exams.findOne({ _id: id, isPublished: true })
      .populate('category', 'name slug emoji').populate('instructor', 'firstName lastName bio avatar').lean();
    if (!exam) throw new NotFoundException('Exam not found');
    return { data: { exam: toPublicExam(exam) } };
  }

  // ---------- instructor ----------
  async listMine(user: JwtUser) {
    const filter = user.role === Role.Admin ? {} : { instructor: user.sub };
    const docs = await this.exams.find(filter).sort({ updatedAt: -1 }).populate('category', 'name slug emoji').lean();
    return { data: { exams: docs.map(toPublicExam) } };
  }

  async getForEdit(id: string, user: JwtUser) {
    const exam = await this.getEditable(id, user);
    await exam.populate('category', 'name slug emoji');
    return { data: { exam } };   // full exam including correct answers (owner only)
  }

  async create(dto: CreateExamDto, user: JwtUser) {
    await this.assertCategory(dto.category);
    const exam = await this.exams.create({ ...dto, instructor: user.sub, isPublished: false });
    return { data: { exam } };
  }

  async update(id: string, dto: UpdateExamDto, user: JwtUser) {
    const exam = await this.getEditable(id, user);
    if (dto.category) await this.assertCategory(dto.category);
    exam.set(dto);
    await exam.save();
    return { data: { exam } };
  }

  async remove(id: string, user: JwtUser) {
    const exam = await this.getEditable(id, user);
    if (await this.attempts.exists({ exam: exam._id })) {
      throw new ConflictException('Students have already taken this exam. Unpublish it instead.');
    }
    await exam.deleteOne();
    return { data: {} };
  }

  async setPublished(id: string, user: JwtUser, publish: boolean) {
    const exam = await this.getEditable(id, user);
    if (publish) {
      if (!exam.questions.length) throw new BadRequestException('Add at least one question before publishing');
      exam.questions.forEach((q, i) => {
        const err = questionError(q);
        if (err) throw new BadRequestException(`Question ${i + 1}: ${err}`);
      });
    }
    exam.isPublished = publish;
    await exam.save();
    return { data: { exam } };
  }

  /** Loads an exam the user may edit: its instructor, or any admin. */
  async getEditable(id: string, user: JwtUser): Promise<ExamDocument> {
    const exam = await this.exams.findById(id);
    if (!exam) throw new NotFoundException('Exam not found');
    if (user.role !== Role.Admin && !exam.instructor.equals(user.sub)) {
      throw new ForbiddenException('You can only edit your own exams');
    }
    return exam;
  }

  private async assertCategory(id: string) {
    if (!(await this.categories.exists({ _id: id }))) throw new BadRequestException('Category does not exist');
  }
}
```

### `exams/questions.service.ts`
Each method returns the whole updated exam, so the editor can re-render from a single response.
```ts
@Injectable()
export class QuestionsService {
  constructor(private exams: ExamsService) {}

  async add(examId: string, dto: QuestionDto, user: JwtUser) {
    const exam = await this.exams.getEditable(examId, user);
    this.validate(dto);
    exam.questions.push(dto);
    return this.save(exam);
  }

  async update(examId: string, qid: string, dto: UpdateQuestionDto, user: JwtUser) {
    const exam = await this.exams.getEditable(examId, user);
    const q = exam.questions.id(qid);
    if (!q) throw new NotFoundException('Question not found');
    this.validate({ ...q.toObject(), ...dto });
    q.set(dto);
    return this.save(exam);
  }

  async remove(examId: string, qid: string, user: JwtUser) {
    const exam = await this.exams.getEditable(examId, user);
    const q = exam.questions.id(qid);
    if (!q) throw new NotFoundException('Question not found');
    q.deleteOne();
    return this.save(exam);
  }

  async reorder(examId: string, order: string[], user: JwtUser) {
    const exam = await this.exams.getEditable(examId, user);
    const byId = new Map(exam.questions.map((q) => [q._id.toString(), q.toObject()]));
    if (order.length !== byId.size || new Set(order).size !== order.length || !order.every((id) => byId.has(id))) {
      throw new BadRequestException('order must list every question id exactly once');
    }
    exam.set('questions', order.map((id) => byId.get(id)));
    return this.save(exam);
  }

  async bulk(examId: string, questions: QuestionDto[], user: JwtUser) {
    const exam = await this.exams.getEditable(examId, user);
    const errors = questions
      .map((q, i) => { const e = questionError(q); return e && `Row ${i + 1}: ${e}`; })
      .filter(Boolean);
    if (errors.length) throw new BadRequestException(errors.join('; '));
    exam.questions.push(...questions);
    return this.save(exam);
  }

  private validate(q: Parameters<typeof questionError>[0]) {
    const err = questionError(q);
    if (err) throw new BadRequestException(err);
  }

  private async save(exam: ExamDocument) {
    await exam.save();
    return { data: { exam } };
  }
}
```

### Controllers
```ts
// exams/exams.controller.ts
@ApiTags('exams') @ApiBearerAuth()
@Controller()
export class ExamsController {
  constructor(private service: ExamsService) {}

  @Public() @Get('exams')
  list(@Query() q: ListExamsQueryDto) { return this.service.listPublished(q); }

  @Public() @Get('exams/:id')
  get(@Param('id', ParseObjectIdPipe) id: string) { return this.service.getPublished(id); }

  @Roles(Role.Instructor, Role.Admin) @Get('instructor/exams')
  mine(@CurrentUser() u: JwtUser) { return this.service.listMine(u); }

  @Roles(Role.Instructor, Role.Admin) @Get('instructor/exams/:id')
  getForEdit(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.getForEdit(id, u); }

  @Roles(Role.Instructor, Role.Admin) @Post('exams')
  create(@Body() dto: CreateExamDto, @CurrentUser() u: JwtUser) { return this.service.create(dto, u); }

  @Roles(Role.Instructor, Role.Admin) @Patch('exams/:id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateExamDto, @CurrentUser() u: JwtUser) { return this.service.update(id, dto, u); }

  @Roles(Role.Instructor, Role.Admin) @Delete('exams/:id')
  remove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.remove(id, u); }

  @Roles(Role.Instructor, Role.Admin) @HttpCode(200) @Post('exams/:id/publish')
  publish(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.setPublished(id, u, true); }

  @Roles(Role.Instructor, Role.Admin) @HttpCode(200) @Post('exams/:id/unpublish')
  unpublish(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.setPublished(id, u, false); }
}

// exams/questions.controller.ts
@ApiTags('questions') @ApiBearerAuth()
@Roles(Role.Instructor, Role.Admin)
@Controller('exams/:id/questions')
export class QuestionsController {
  constructor(private service: QuestionsService) {}

  @Post() add(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: QuestionDto, @CurrentUser() u: JwtUser) { return this.service.add(id, dto, u); }
  @Post('bulk') bulk(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: BulkQuestionsDto, @CurrentUser() u: JwtUser) { return this.service.bulk(id, dto.questions, u); }
  @Put('reorder') reorder(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReorderQuestionsDto, @CurrentUser() u: JwtUser) { return this.service.reorder(id, dto.order, u); }
  @Patch(':qid') update(@Param('id', ParseObjectIdPipe) id: string, @Param('qid', ParseObjectIdPipe) qid: string, @Body() dto: UpdateQuestionDto, @CurrentUser() u: JwtUser) { return this.service.update(id, qid, dto, u); }
  @Delete(':qid') remove(@Param('id', ParseObjectIdPipe) id: string, @Param('qid', ParseObjectIdPipe) qid: string, @CurrentUser() u: JwtUser) { return this.service.remove(id, qid, u); }
}
```
In `exams.module.ts`, register `Exam`, `Category` and `Attempt` with `forFeature`. Add both controllers, provide `ExamsService` and `QuestionsService`, and export `MongooseModule`.

---

Next: [04-attempts-dashboard.md](04-attempts-dashboard.md).
