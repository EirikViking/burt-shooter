const gitSha = typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'dev';
const shortSha = gitSha.slice(0, 7);
const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : timestamp;
export const BUILD_STAMP = `commit: ${shortSha} | ${timestamp}`;
export const BUILD_SHA = gitSha;
