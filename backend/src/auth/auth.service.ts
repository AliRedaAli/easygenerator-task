import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';

const SALT_ROUNDS = 10;
const MONGO_DUPLICATE_KEY_CODE = 11000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === MONGO_DUPLICATE_KEY_CODE
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {}

  async signup(name: string, email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      this.logger.warn({ email }, 'signup rejected: email already in use');
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    try {
      const user = await this.usersService.create(name, email, passwordHash);
      this.logger.info({ email }, 'signup succeeded');
      return user;
    } catch (err) {
      // defensive fallback: two concurrent signups can both pass the findByEmail
      // check above before either write lands, racing past it into Mongo's unique index.
      if (isDuplicateKeyError(err)) {
        this.logger.warn({ email }, 'signup rejected: email already in use (race)');
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      this.logger.warn({ email }, 'login failed: invalid credentials');
      throw new UnauthorizedException('Invalid email or password');
    }
    this.logger.info({ email }, 'login succeeded');
    return user;
  }

  /** Signs a fresh access+refresh token pair and stores the refresh token's hash. */
  async issueTokenPair(user: UserDocument) {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);
    await this.usersService.setRefreshTokenHash(user._id.toString(), hashToken(refreshToken));
    return { accessToken, refreshToken };
  }

  /** Verifies a refresh token against the stored hash, then rotates (issues a new pair). */
  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash || hashToken(refreshToken) !== user.refreshTokenHash) {
      this.logger.warn({ userId }, 'refresh rejected: invalid or reused token');
      throw new UnauthorizedException('Invalid refresh token');
    }
    this.logger.info({ email: user.email }, 'refresh succeeded');
    return this.issueTokenPair(user);
  }

  /** Revokes the stored refresh token so a copied cookie stops working immediately. */
  logout(userId: string) {
    this.logger.info({ userId }, 'logout succeeded');
    return this.usersService.setRefreshTokenHash(userId, null);
  }

  private signAccessToken(user: UserDocument) {
    return this.jwtService.sign(
      { sub: user._id.toString(), email: user.email, name: user.name },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        // cast: @nestjs/jwt's `expiresIn` wants a branded `ms` string literal type,
        // but env vars are always plain strings.
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as never,
      },
    );
  }

  private signRefreshToken(user: UserDocument) {
    return this.jwtService.sign(
      { sub: user._id.toString(), email: user.email, name: user.name, jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as never,
      },
    );
  }
}
