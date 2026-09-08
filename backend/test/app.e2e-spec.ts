import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/test-app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, close } = await createTestApp());
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
  });

  afterAll(async () => {
    await close();
  });
});
