import base from '../vite.config.js';
export default {...base,cacheDir:'E:/dev-cache/vite-veilborn-test-30',build:{...base.build,
 outDir:'E:/Codex/builds/nova-swarm/veilborn-test-30/build-dist',copyPublicDir:false,emptyOutDir:false}};
