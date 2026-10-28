# ExamPro API (NestJS): Part 1, Setup & Core

Backend for the ExamPro frontend (this repo). Stack: **NestJS 11 + MongoDB (Mongoose) + JWT**.
Read the parts in order:
1. **Setup & core** (this file): project setup, config and shared infrastructure.
2. [02-auth.md](02-auth.md): users and authentication.
3. [03-categories-exams.md](03-categories-exams.md): categories, exams and questions.
4. [04-attempts-dashboard.md](04-attempts-dashboard.md): taking exams, the dashboard, seed data, tests and the frontend changes.

## Contract with the frontend (do not break)

The frontend in `src/lib/api.ts` expects all of the following:

- Base URL `http://localhost:5000/api`, with a `Bearer <jwt>` token in the `Authorization` header.
- Successful responses look like `{ success: true, data: {...} }`. Login and register also return a top-level `token`.
- Errors look like `{ success: false, message: "..." }`, and `message` is shown to the user.
- Ids are Mongo `_id` values.

---

## 1. Create the project

Create it **next to** `exam-platform`, not inside it:

```bash
cd ~
npx @nestjs/cli new exam-platform-api --package-manager npm --strict
cd exam-platform-api

npm i @nestjs/mongoose mongoose @nestjs/config @nestjs/jwt @nestjs/swagger @nestjs/throttler \
      bcryptjs class-validator class-transformer
npm i -D @types/bcryptjs mongodb-memory-server

npx nest g module users && npx nest g module auth && npx nest g module categories \
 && npx nest g module exams && npx nest g module attempts && npx nest g module dashboard
```

Delete `src/app.controller.ts`, `src/app.service.ts` and `src/app.controller.spec.ts`, and remove their references from `app.module.ts`.

### `.env` (never commit) and `.env.example` (commit)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/exampro
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=604800
CLIENT_URL=http://localhost:3000
```
`JWT_EXPIRES_IN` is in seconds. Add `.env` to `.gitignore`.

To run MongoDB locally: `docker run -d --name exampro-mongo -p 27017:27017 mongo:7`

---

## 2. Folder structure (final)

```
src/
  main.ts
  app.module.ts
  seed.ts
  common/
    decorators/   public.decorator.ts roles.decorator.ts current-user.decorator.ts
    guards/       auth.guard.ts roles.guard.ts
    filters/      all-exceptions.filter.ts
    interceptors/ response.interceptor.ts
    pipes/        parse-object-id.pipe.ts
    types.ts
    utils.ts
  users/
    users.module.ts
    schemas/user.schema.ts
  auth/
    auth.module.ts auth.controller.ts auth.service.ts
    dto/register.dto.ts dto/login.dto.ts dto/update-profile.dto.ts
  categories/   (Part 3)
  exams/        (Part 3) also holds questions.controller/service
  attempts/     (Part 4)
  dashboard/    (Part 4)
test/
  app.e2e-spec.ts
```

---

## 3. `main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('CLIENT_URL', 'http://localhost:3000') });

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('ExamPro API').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(config.get('PORT', 5000));
}
void bootstrap();
```

## 4. `app.module.ts`

Global pipes, guards, filters and interceptors are registered as **providers**, not in `main.ts`, so that e2e tests get them too.

```ts
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ExamsModule } from './exams/exams.module';
import { AttemptsModule } from './attempts/attempts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ uri: c.getOrThrow<string>('MONGO_URI') }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: Number(c.get('JWT_EXPIRES_IN', 604800)) },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    UsersModule, AuthModule, CategoriesModule, ExamsModule, AttemptsModule, DashboardModule,
  ],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }) },
    // Guards run in this order: rate limit → authenticate → authorize
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
```

---

## 5. Common infrastructure

### `common/types.ts`
```ts
import { Role } from '../users/schemas/user.schema';

export interface JwtUser {
  sub: string;
  role: Role;
}
```

### `common/utils.ts`
```ts
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Fisher–Yates; returns a new array */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

### Decorators
```ts
// common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
/** Route works without a token; if a valid token is sent, req.user is still set. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/schemas/user.schema';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../types';
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => ctx.switchToHttp().getRequest().user,
);
```

### `common/guards/auth.guard.ts`
Every route requires a valid JWT unless it is marked `@Public()`.
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtUser } from '../types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      try {
        req.user = await this.jwt.verifyAsync<JwtUser>(token);
      } catch {
        if (!isPublic) throw new UnauthorizedException('Session expired, please log in again');
      }
    }
    if (!isPublic && !req.user) throw new UnauthorizedException('Not authenticated');
    return true;
  }
}
```

### `common/guards/roles.guard.ts`
```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../users/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('You do not have access to this action');
    return true;
  }
}
```

### `common/interceptors/response.interceptor.ts`
Controllers return `{ data }` (or `{ token, data }`), and this interceptor adds `success: true`.
```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((body) => ({ success: true, ...body })));
  }
}
```

### `common/filters/all-exceptions.filter.ts`
```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as string | { message?: string | string[] };
      const raw = typeof body === 'string' ? body : body.message ?? exception.message;
      message = Array.isArray(raw) ? raw.join(', ') : raw;
    } else if ((exception as { code?: number })?.code === 11000) {
      status = 409;
      message = 'A record with this value already exists';
    } else {
      this.logger.error(exception);
    }
    res.status(status).json({ success: false, message });
  }
}
```

### `common/pipes/parse-object-id.pipe.ts`
```ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (!isValidObjectId(value)) throw new BadRequestException('Invalid id');
    return value;
  }
}
```
Use it as `@Param('id', ParseObjectIdPipe) id: string`.

---

Next: [02-auth.md](02-auth.md).
