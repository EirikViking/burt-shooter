import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { installBrokenPipeGuards } from '../electron/stdioSafety.cjs';

const stream = new EventEmitter();
installBrokenPipeGuards([stream]);
assert.doesNotThrow(() => stream.emit('error', Object.assign(new Error('closed sink'), { code: 'EPIPE' })));
const unexpected = Object.assign(new Error('real failure'), { code: 'EIO' });
assert.throws(() => stream.emit('error', unexpected), (error) => error === unexpected);

// Reproduce the actual launch failure: the parent closes the logging pipe while
// the GUI process continues. IPC is a separate channel used only by this test.
const child = spawn(process.execPath, ['-e', `
  require('./electron/stdioSafety.cjs').installBrokenPipeGuards();
  process.send('ready');
  process.on('message', () => {
    console.log('logging after the launcher has gone');
    setTimeout(() => { process.send('survived'); process.disconnect(); }, 200);
  });
`], { cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
let survived = false;
let stderr = '';
child.stderr.on('data', (data) => { stderr += data; });
child.on('message', (message) => {
  if (message === 'ready') { child.stdout.destroy(); child.send('write'); }
  if (message === 'survived') survived = true;
});
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
assert.equal(code, 0, stderr);
assert.equal(survived, true);
console.log('PASS: disconnected logging pipe survives; unrelated errors still propagate.');
