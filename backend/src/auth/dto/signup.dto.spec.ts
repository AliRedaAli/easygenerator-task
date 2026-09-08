import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignupDto } from './signup.dto.js';

const validPayload = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Passw0rd!' };

function errorsFor(overrides: Partial<Record<keyof typeof validPayload, string | undefined>>) {
  const dto = plainToInstance(SignupDto, { ...validPayload, ...overrides });
  return validate(dto);
}

describe('SignupDto validation', () => {
  it('accepts a fully valid payload', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  describe('name', () => {
    it.each([
      ['missing', undefined],
      ['empty', ''],
      ['too short', 'ab'],
    ])('rejects a name that is %s', async (_case, name) => {
      const errors = await errorsFor({ name });
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('accepts the 3-character minimum', async () => {
      expect(await errorsFor({ name: 'Bob' })).toHaveLength(0);
    });
  });

  describe('email', () => {
    it.each([
      ['missing', undefined],
      ['missing @', 'not-an-email'],
      ['missing domain', 'ada@'],
      ['missing local part', '@example.com'],
    ])('rejects an email %s', async (_case, email) => {
      const errors = await errorsFor({ email });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });

  describe('password', () => {
    it.each([
      ['missing', undefined],
      ['too short (7 chars, meets complexity)', 'Aa1!aaa'],
      ['missing a letter', '12345678!'],
      ['missing a digit', 'Password!'],
      ['missing a special character', 'Password1'],
    ])('rejects a password that is %s', async (_case, password) => {
      const errors = await errorsFor({ password });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('accepts the 8-character minimum with all three character classes', async () => {
      expect(await errorsFor({ password: 'Aa1!aaaa' })).toHaveLength(0);
    });
  });
});
