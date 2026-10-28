# ExamPro API (NestJS): Part 2, Users & Auth

Prerequisite: [01-setup-core.md](01-setup-core.md).

---

## 6. Users

### `users/schemas/user.schema.ts`
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum Role {
  Student = 'student',
  Instructor = 'instructor',
  Admin = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true }) firstName: string;
  @Prop({ required: true, trim: true }) lastName: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) email: string;
  @Prop({ required: true, select: false }) password: string;
  @Prop({ type: String, enum: Role, default: Role.Student }) role: Role;
  @Prop() bio?: string;
  @Prop() avatar?: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

// Never leak password hashes, even if a query selects them
UserSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});
```

### `users/users.module.ts`
```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  exports: [MongooseModule],
})
export class UsersModule {}
```

---

## 7. Auth

### DTOs
```ts
// auth/dto/register.dto.ts
import { IsEmail, IsIn, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @Length(1, 50) firstName: string;
  @IsString() @Length(1, 50) lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  // Admins are never self-registered; create them via the seed script or the DB
  @IsIn(['student', 'instructor']) role: 'student' | 'instructor';
}

// auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

// auth/dto/update-profile.dto.ts
import { IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';
export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(1, 50) firstName?: string;
  @IsOptional() @IsString() @Length(1, 50) lastName?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional() @IsUrl() avatar?: string;
}
```
Role and email cannot be changed through `PATCH /auth/me`. `whitelist` and `forbidNonWhitelisted` reject them.

### `auth/auth.service.ts`
```ts
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private users: Model<User>, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.exists({ email })) throw new ConflictException('Email is already registered');
    const user = await this.users.create({ ...dto, email, password: await bcrypt.hash(dto.password, 10) });
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return { data: { user } };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.users.findByIdAndUpdate(userId, dto, { new: true, runValidators: true });
    if (!user) throw new NotFoundException('User not found');
    return { data: { user } };
  }

  private async issueToken(user: UserDocument) {
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, data: { user } };
  }
}
```

### `auth/auth.controller.ts`
```ts
import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/types';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.sub);
  }

  @Patch('me')
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.sub, dto);
  }
}
```

### `auth/auth.module.ts`
```ts
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({ imports: [UsersModule], controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
```

---

## Checkpoint (before Part 3)

To run Parts 1–2 on their own, temporarily comment out the four feature modules in `app.module.ts`. Then:

```bash
npm run start:dev
curl -s -X POST localhost:5000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"firstName":"Test","lastName":"User","email":"t@t.com","password":"password123","role":"student"}'
```
- The register call returns `{ success: true, token, data: { user } }`, and `user` has no `password` field.
- `GET /api/auth/me` without a token returns `401 { success:false, message }`.
- Swagger UI is available at `http://localhost:5000/api/docs`.
- The frontend's `/register` and `/login` pages work end to end.

Next: [03-categories-exams.md](03-categories-exams.md).
