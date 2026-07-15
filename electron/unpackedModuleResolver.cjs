const fs = require('node:fs');
const path = require('node:path');

function unpackedModuleCandidates(moduleName) {
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', moduleName));
  }
  const appRoot = path.resolve(__dirname, '..');
  if (appRoot.includes('.asar')) {
    candidates.push(path.join(appRoot.replace('.asar', '.asar.unpacked'), 'node_modules', moduleName));
  }
  return [...new Set(candidates)];
}

function requireOptionalPackagedModule(moduleName) {
  let primaryError = null;
  try {
    return require(moduleName);
  } catch (error) {
    primaryError = error;
  }

  for (const candidate of unpackedModuleCandidates(moduleName)) {
    if (!fs.existsSync(path.join(candidate, 'package.json'))) continue;
    try {
      return require(candidate);
    } catch (error) {
      throw error;
    }
  }

  if (primaryError?.code === 'MODULE_NOT_FOUND') return null;
  throw primaryError;
}

module.exports = {
  requireOptionalPackagedModule,
  unpackedModuleCandidates
};
