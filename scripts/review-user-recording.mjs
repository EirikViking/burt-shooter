import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const input = process.argv[2];
const out = process.argv[3];
assert(input && out && out.replaceAll('\\', '/').startsWith('E:/Codex/builds/nova-swarm/'));
assert(process.env.TEMP?.replaceAll('\\', '/').startsWith('E:/Codex/tmp/'));
assert.equal(fs.realpathSync(input).toLowerCase(), path.resolve(input).toLowerCase());
assert(!fs.existsSync(out), 'A review must not overwrite existing evidence');
fs.mkdirSync(out, {recursive: true});
assert.equal(fs.realpathSync(out).toLowerCase(), path.resolve(out).toLowerCase());
function run(tool, args, log) {
  const r = spawnSync(tool, args, {encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 600000});
  if (log) fs.writeFileSync(path.join(out, log), r.stdout + r.stderr);
  assert.equal(r.status, 0, r.error?.message || r.stderr.slice(-2500));
  return r.stdout;
}
const metadata = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', input]));
fs.writeFileSync(path.join(out, 'metadata.json'), JSON.stringify(metadata, null, 2));
console.log(JSON.stringify({phase: 'timeline', duration: metadata.format.duration}));
run('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-threads', '4', '-i', input,
  '-an', '-vf', "fps=2,scale=384:216,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='%{pts\\:hms}':fontsize=20:fontcolor=white:borderw=2:bordercolor=black:x=8:y=8,tile=6x4:padding=2:margin=2",
  '-fps_mode', 'vfr', '-q:v', '3', path.join(out, 'timeline-%03d.jpg')], 'timeline.log');
console.log(JSON.stringify({phase: 'audio'}));
run('ffmpeg', ['-hide_banner', '-threads', '4', '-i', input, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', 'NUL'], 'audio-loudness.log');
const packets = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_packets',
  '-show_entries', 'packet=pts_time,duration_time', '-of', 'json', input]));
const times = packets.packets.map(p => Number(p.pts_time)).filter(Number.isFinite).sort((a, b) => a - b);
const gaps = times.slice(1).map((t, i) => (t - times[i]) * 1000).sort((a, b) => a - b);
const summary = {input, inputBytes: fs.statSync(input).size, duration: Number(metadata.format.duration),
  sampling: 'Full timeline at two frames per second; each sheet covers12seconds. Not every source frame or continuous audio listening.',
  sheets: fs.readdirSync(out).filter(n => /^timeline-\d+\.jpg$/.test(n)).length,
  videoPackets: times.length, recordingTimestampGapMs: {p50: gaps[Math.floor(gaps.length * .5)], p99: gaps[Math.floor(gaps.length * .99)], max: gaps.at(-1)},
  limitation: 'Recording timestamps measure capture cadence, not engine CPU/GPU frame times.'};
fs.writeFileSync(path.join(out, 'review-input.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
