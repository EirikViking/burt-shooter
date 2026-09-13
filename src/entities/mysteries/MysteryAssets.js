import { Assets, Rectangle, Texture } from 'pixi.js';
import atlases from '../../config/MysteryAtlases.json' with { type: 'json' };

// Frames share one original source. Leases keep an active encounter alive;
// only unreferenced atlases can be evicted. No fleet-wide preload.
const cache = new Map();
const evictions = new Map();
let sequence = 0;
const MAX_IDLE = 2;

async function trim() {
  const idle = [...cache.values()].filter(row => row.refs === 0 && row.ready)
    .sort((a, b) => b.used - a.used);
  for (const row of idle.slice(MAX_IDLE)) {
    if (row.refs || cache.get(row.id) !== row) continue;
    cache.delete(row.id);
    Object.values(row.frames).forEach(texture => texture.destroy(false));
    const unloading = Promise.resolve(Assets.unload(row.url)).catch(error => {
      console.warn('[MysteryAssets] Failed to unload', row.id, error);
    }).finally(() => evictions.delete(row.id));
    evictions.set(row.id, unloading);
    await unloading;
  }
}

export async function acquireMysteryAtlas(id) {
  const spec = atlases[id];
  if (!spec) throw new Error(`Missing Mystery atlas: ${id}`);
  // Reacquiring a just-evicted ID must wait for its previous source to unload.
  // Otherwise Assets.load can return a texture which that unload then destroys.
  if (evictions.has(id)) await evictions.get(id);
  let row = cache.get(id);
  if (!row) {
    row = { id, url: `/${spec.url}`, refs: 0, used: ++sequence, ready: false };
    cache.set(id, row);
    row.promise = Assets.load(row.url).then(atlas => {
      atlas.source.autoGenerateMipmaps = true;
      atlas.source.scaleMode = 'linear';
      atlas.source.updateMipmaps();
      row.frames = Object.fromEntries(Object.entries(spec.frames).map(([key, rect]) =>
        [key, new Texture({ source: atlas.source, frame: new Rectangle(...rect) })]));
      if (id === 'nova_anvil') {
        // The original art contains one joined clamp assembly. Its two halves
        // articulate separately without duplicating the whole U-shaped part.
        const [x, y, w, h] = spec.frames.bottomLeft, half = Math.floor(w / 2);
        row.frames.clampLeft = new Texture({ source: atlas.source, frame: new Rectangle(x, y, half, h) });
        row.frames.clampRight = new Texture({ source: atlas.source, frame: new Rectangle(x + half, y, w - half, h) });
      }
      if (id === 'siege_orchid') {
        const [x, y, w, h] = spec.frames.topLeft;
        row.frames.chassis = new Texture({ source: atlas.source,
          frame: new Rectangle(x + Math.floor(w * .24), y + Math.floor(h * .24), Math.floor(w * .52), Math.floor(h * .52)) });
      }
      row.ready = true;
      return row;
    }).catch(error => { if (cache.get(id) === row) cache.delete(id); throw error; });
  }
  row.refs++;
  row.used = ++sequence;
  try { await row.promise; } catch (error) { row.refs--; throw error; }
  function lease() {
    let released=false;
    return {frames:row.frames,retain(){
      if(released)throw Error('Cannot retain a released Mystery atlas');
      row.refs++;return lease();
    },release(){
      if(released)return;released=true;row.refs--;row.used=++sequence;void trim();
    }};
  }
  return lease();
}

export function mysteryAssetDiagnostics() {
  return [...cache.values()].map(row => ({ id: row.id, refs: row.refs, ready: row.ready }));
}
