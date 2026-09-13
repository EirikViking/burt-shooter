import base from '../vite.config.js';
export default {...base,cacheDir:'E:/dev-cache/vite-nova-pacing',build:{...base.build,
 outDir:'E:/Codex/builds/nova-swarm/encounter-pacing/build-dist',copyPublicDir:false,emptyOutDir:false}};
