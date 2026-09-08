import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // ponytail: each spec file boots its own mongodb-memory-server; running
    // files in parallel races two downloads of the same binary onto the same
    // cache path on a cold CI runner. Sequential is fine at this suite size.
    fileParallelism: false,
  },
});
