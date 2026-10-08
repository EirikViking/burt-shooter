import base from '../vite.config.js';
export default {...base,cacheDir:'E:/dev-cache/vite-mystery-v2',build:{...base.build,
  outDir:'E:/Codex/builds/nova-swarm/mystery-v2/build-dist',copyPublicDir:false,emptyOutDir:false}};
