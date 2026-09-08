import { access, chmod, copyFile, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = resolve(projectRoot, 'backend/.env.example');
const envPath = resolve(projectRoot, '.env');

try {
  await access(envPath, constants.F_OK);
  throw new Error('.env already exists; remove it or update it manually');
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

await copyFile(templatePath, envPath);

let env = await readFile(envPath, 'utf8');
env = env.replace(/^MONGODB_URI=.*$/m, 'MONGODB_URI=mongodb://mongo:27017/appdb');
env = env.replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${randomBytes(32).toString('base64url')}`);
env = env.replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${randomBytes(32).toString('base64url')}`);

await writeFile(envPath, env, { mode: 0o600 });
await chmod(envPath, 0o600);
console.log('Created .env with generated JWT secrets.');