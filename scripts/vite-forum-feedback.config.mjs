import base from '../vite.config.js';

export default {
  ...base,
  cacheDir: 'E:/dev-cache/vite-nova-feedback',
  server: { ...base.server, hmr: false },
  build: {
    ...base.build,
    outDir: 'E:/Codex/builds/nova-swarm/forum-feedback-20260913/build-dist',
    copyPublicDir: false,
    emptyOutDir: true
  }
};
