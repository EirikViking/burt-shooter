import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

const buildId = process.env.BUILD_ID || new Date().toISOString();
let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  gitSha = process.env.GIT_SHA || gitSha;
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __GIT_SHA__: JSON.stringify(gitSha)
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 3000
  }
});
