import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/test-app.js';

let app: INestApplication;
let close: () => Promise<void>;

const validSignup = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Passw0rd!' };

beforeAll(async () => {
  ({ app, close } = await createTestApp());
});

afterAll(async () => {
  await close();
});

describe('Auth (e2e)', () => {
  it('signs up, sets auth cookies, and returns the user via /me', async () => {
    const agent = request.agent(app.getHttpServer());

    const signupRes = await agent.post('/api/auth/signup').send(validSignup).expect(201);
    expect(signupRes.body).toEqual({ name: validSignup.name, email: validSignup.email });
    expect(signupRes.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token='),
        expect.stringContaining('refresh_token='),
      ]),
    );

    const meRes = await agent.get('/api/auth/me').expect(200);
    expect(meRes.body).toEqual({ name: validSignup.name, email: validSignup.email });
  });

  it('rejects a duplicate signup email with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ name: 'Grace Hopper', email: 'grace@example.com', password: 'Passw0rd!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ name: 'Grace Hopper', email: 'grace@example.com', password: 'Passw0rd!' })
      .expect(409);
  });

  it.each([
    ['too-short name', { name: 'Al', email: 'al@example.com', password: 'Passw0rd!' }],
    ['invalid email', { name: 'Al Gore', email: 'not-an-email', password: 'Passw0rd!' }],
    ['weak password', { name: 'Al Gore', email: 'al2@example.com', password: 'password' }],
    ['missing name', { email: 'al3@example.com', password: 'Passw0rd!' }],
    ['missing email', { name: 'Al Gore', password: 'Passw0rd!' }],
    ['missing password', { name: 'Al Gore', email: 'al4@example.com' }],
  ])('rejects signup with %s (400)', async (_case, payload) => {
    await request(app.getHttpServer()).post('/api/auth/signup').send(payload).expect(400);
  });

  it('surfaces the DTO validation message in the 400 response body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ name: 'Al', email: 'al@example.com', password: 'Passw0rd!' })
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining(['name must be at least 3 characters long']),
    );
  });

  it('rotates the refresh token and rejects reuse of the old one', async () => {
    const signupRes = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ name: 'Alan Turing', email: 'alan@example.com', password: 'Passw0rd!' })
      .expect(201);
    const preRotationCookies = signupRes.headers['set-cookie'] as unknown as string[];

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', preRotationCookies)
      .expect(201);

    // replaying the pre-rotation refresh cookie must now fail
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', preRotationCookies)
      .expect(401);
  });

  it('logout revokes the refresh token and clears the session', async () => {
    const agent = request.agent(app.getHttpServer());
    const signupRes = await agent
      .post('/api/auth/signup')
      .send({ name: 'Katherine Johnson', email: 'katherine@example.com', password: 'Passw0rd!' })
      .expect(201);
    const cookiesAtSignup = signupRes.headers['set-cookie'] as unknown as string[];

    await agent.post('/api/auth/logout').expect(201);

    // the agent's cookie jar no longer holds the (cleared) access token
    await agent.get('/api/auth/me').expect(401);

    // the pre-logout refresh token is invalidated server-side too
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookiesAtSignup)
      .expect(401);
  });
});
