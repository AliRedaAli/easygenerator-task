import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';

const SALT_ROUNDS = 10;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(name: string, email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.usersService.create(name, email, passwordHash);
    return user;
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
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
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokenPair(user);
  }

  /** Revokes the stored refresh token so a copied cookie stops working immediately. */
  logout(userId: string) {
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
