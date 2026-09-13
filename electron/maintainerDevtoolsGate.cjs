const crypto = require('node:crypto');

const MAINTAINER_DEVTOOLS_KEY_SHA256 = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const DEVTOOLS_KEY_ARG = '--nova-devtools-key=';

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function constantTimeEqualHex(left, right) {
  const normalizedLeft = String(left || '').trim().toLowerCase();
  const normalizedRight = String(right || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalizedLeft) || !/^[0-9a-f]{64}$/.test(normalizedRight)) return false;
  return crypto.timingSafeEqual(Buffer.from(normalizedLeft, 'hex'), Buffer.from(normalizedRight, 'hex'));
}

function readDevtoolsKeyArg(argv = []) {
  for (const arg of argv) {
    const value = String(arg || '');
    if (value.startsWith(DEVTOOLS_KEY_ARG)) return value.slice(DEVTOOLS_KEY_ARG.length);
  }
  return '';
}

function getMaintainerDevtoolsState(argv = process.argv) {
  const candidate = readDevtoolsKeyArg(argv);
  const candidateHash = candidate ? sha256Hex(candidate) : '';
  const enabled = Boolean(candidate && constantTimeEqualHex(candidateHash, MAINTAINER_DEVTOOLS_KEY_SHA256));
  return Object.freeze({
    enabled,
    source: enabled ? 'launch_arg' : 'none'
  });
}

module.exports = {
  DEVTOOLS_KEY_ARG,
  MAINTAINER_DEVTOOLS_KEY_SHA256,
  constantTimeEqualHex,
  getMaintainerDevtoolsState,
  readDevtoolsKeyArg,
  sha256Hex
};
