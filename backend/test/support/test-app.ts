import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Boots a full Nest app against an in-memory Mongo instance, wired the same
 * way as `main.ts` (prefix, cookies, validation) — so e2e specs don't need a
 * running Docker Mongo or real JWT secrets.
 */
export async function createTestApp() {
  // ponytail: MongoDB 8's memory-server binary SIGABRTs on macOS 13; 6.0.x
  // is the widest-compatible pin. Bump once CI/dev machines are all newer.
  const mongod = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

  // Imported dynamically, after the env vars above are set — AppModule reads
  // MONGODB_URI at module-evaluation time via MongooseModule.forRoot().
  const { AppModule } = await import('../../src/app.module.js');
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return {
    app,
    async close() {
      await app.close();
      await mongod.stop();
    },
  };
}
