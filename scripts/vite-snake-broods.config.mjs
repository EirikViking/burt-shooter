import base from '../vite.config.js';
export default {...base,cacheDir:'E:/dev-cache/vite-snake-broods',build:{...base.build,
 outDir:'E:/Codex/builds/nova-swarm/snake-broods/build-dist',copyPublicDir:false,emptyOutDir:false}};
