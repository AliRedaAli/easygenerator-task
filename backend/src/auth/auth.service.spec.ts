import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import type { PinoLogger } from 'nestjs-pino';
import { AuthService } from './auth.service.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import type { UsersService } from '../users/users.service.js';

function buildAuthService() {
  const usersService = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    setRefreshTokenHash: vi.fn(),
  } satisfies Partial<UsersService>;
  const jwtService = { sign: vi.fn() } satisfies Partial<JwtService>;
  const configService = {
    get: vi.fn().mockReturnValue('15m'),
    getOrThrow: vi.fn().mockReturnValue('test-secret'),
  } satisfies Partial<ConfigService>;
  const logger = { info: vi.fn(), warn: vi.fn() } satisfies Partial<PinoLogger>;

  const authService = new AuthService(
    usersService as unknown as UsersService,
    jwtService as unknown as JwtService,
    configService as unknown as ConfigService,
    logger as unknown as PinoLogger,
  );

  return { authService, usersService, jwtService };
}

describe('AuthService', () => {
  describe('signup', () => {
    it('rejects signup when the email is already in use', async () => {
      const { authService, usersService } = buildAuthService();
      usersService.findByEmail.mockResolvedValue({ _id: 'u1' } as unknown as UserDocument);

      await expect(authService.signup('Ada Lovelace', 'ada@example.com', 'Passw0rd!')).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('hashes the password before creating the user', async () => {
      const { authService, usersService } = buildAuthService();
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation((name: string, email: string, passwordHash: string) =>
        Promise.resolve({ name, email, passwordHash } as unknown as UserDocument),
      );

      await authService.signup('Ada Lovelace', 'ada@example.com', 'Passw0rd!');

      const passwordHash = usersService.create.mock.calls[0][2] as string;
      expect(passwordHash).not.toBe('Passw0rd!');
      expect(await bcrypt.compare('Passw0rd!', passwordHash)).toBe(true);
    });
  });

  describe('validateUser', () => {
    it('returns the user when the password matches', async () => {
      const { authService, usersService } = buildAuthService();
      const passwordHash = await bcrypt.hash('Passw0rd!', 10);
      usersService.findByEmail.mockResolvedValue({
        email: 'ada@example.com',
        passwordHash,
      } as unknown as UserDocument);

      const user = await authService.validateUser('ada@example.com', 'Passw0rd!');

      expect(user.email).toBe('ada@example.com');
    });

    it('rejects an incorrect password', async () => {
      const { authService, usersService } = buildAuthService();
      const passwordHash = await bcrypt.hash('Passw0rd!', 10);
      usersService.findByEmail.mockResolvedValue({
        email: 'ada@example.com',
        passwordHash,
      } as unknown as UserDocument);

      await expect(authService.validateUser('ada@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when no user exists for the email', async () => {
      const { authService, usersService } = buildAuthService();
      usersService.findByEmail.mockResolvedValue(null);

      await expect(authService.validateUser('nobody@example.com', 'whatever')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('rotates the token pair when the refresh token matches the stored hash', async () => {
      const { authService, usersService, jwtService } = buildAuthService();
      const refreshToken = 'valid-refresh-token';
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
      usersService.findById.mockResolvedValue({
        _id: { toString: () => 'u1' },
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        refreshTokenHash,
      } as unknown as UserDocument);
      jwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');

      const result = await authService.refresh('u1', refreshToken);

      expect(result).toEqual({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });
      expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith('u1', expect.any(String));
    });

    it('rejects a refresh token that does not match the stored hash', async () => {
      const { authService, usersService } = buildAuthService();
      usersService.findById.mockResolvedValue({
        _id: { toString: () => 'u1' },
        refreshTokenHash: 'some-other-hash',
      } as unknown as UserDocument);

      await expect(authService.refresh('u1', 'wrong-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
