const CAMPAIGN_ID = 'eirik-viking-vault-1';
const TARGET_SCORE = 25_000;
const IDENTITY_COOKIE = 'nova_swarm_enjin_identity';
const COLLECTION_NAME = 'Eirik The Viking';
const COLLECTION_URL = 'https://nft.io/collection/eirik-the-viking-1/assets';
const OWNER_PROFILE_URL = 'https://nft.io/profile/efSNY8oi5msvDVTWdCkzjpZ9NsNqS9UwCkTx5qKJqGx16qQgd/owned';
const MOCK_SECRET = 'preview-only-enjin-mvp-secret';

const memoryStore = globalThis.__novaSwarmEnjinMemory || (globalThis.__novaSwarmEnjinMemory = {
  campaigns: new Map(),
  identities: new Map(),
  runs: new Map(),
  checkpoints: [],
  claims: [],
  assignments: new Map(),
  events: []
});

let schemaPromise = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS enjin_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    collection_name TEXT NOT NULL,
    collection_url TEXT NOT NULL,
    owner_profile_url TEXT NOT NULL,
    target_score INTEGER NOT NULL,
    mode TEXT NOT NULL,
    mock_mode INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS enjin_identities (
    identity_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    assignment_id INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS enjin_runs (
    run_id TEXT PRIMARY KEY,
    identity_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    build_id TEXT NOT NULL,
    seed INTEGER NOT NULL,
    issued_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ticket TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    score INTEGER NOT NULL DEFAULT 0,
    raw_crossing_score INTEGER,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS enjin_run_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    score INTEGER NOT NULL,
    sector INTEGER NOT NULL,
    kills INTEGER NOT NULL,
    digest TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS enjin_claim_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT NOT NULL,
    claim_ciphertext TEXT NOT NULL,
    claim_fingerprint TEXT NOT NULL UNIQUE,
    token_name TEXT,
    image_url TEXT,
    collection_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    assigned_identity TEXT,
    assigned_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS enjin_reward_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT NOT NULL,
    identity_id TEXT NOT NULL UNIQUE,
    claim_id INTEGER NOT NULL UNIQUE,
    token_name TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'CLAIM AVAILABLE',
    opened_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS enjin_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT NOT NULL,
    identity_id TEXT,
    event_name TEXT NOT NULL,
    placement TEXT,
    created_at TEXT NOT NULL
  )`
];

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(value) {
  const padded = String(value).replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((String(value).length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function digestBytes(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function getSecret(env, name) {
  const value = String(env?.[name] || '');
  if (value) return value;
  if (String(env?.ENJIN_MOCK_MODE || '') === 'true') return MOCK_SECRET;
  throw new Error(`${name}_missing`);
}

async function encryptClaim(claimUrl, secret) {
  const keyBytes = await digestBytes(secret);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, new TextEncoder().encode(claimUrl)));
  return `v1.${base64UrlEncode(nonce)}.${base64UrlEncode(ciphertext)}`;
}

async function decryptClaim(ciphertext, secret) {
  const [, noncePart, cipherPart] = String(ciphertext || '').split('.');
  if (!noncePart || !cipherPart) throw new Error('claim_ciphertext_invalid');
  const keyBytes = await digestBytes(secret);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlDecode(noncePart) }, key, base64UrlDecode(cipherPart));
  return new TextDecoder().decode(plain);
}

async function signTicket(payload, secret) {
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = base64UrlEncode(await hmac(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

async function verifyTicket(ticket, secret) {
  const [payloadPart, signaturePart] = String(ticket || '').split('.');
  if (!payloadPart || !signaturePart) return null;
  const expected = await hmac(payloadPart, secret);
  const supplied = base64UrlDecode(signaturePart);
  if (expected.length !== supplied.length || !expected.every((value, index) => value === supplied[index])) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  } catch {
    return null;
  }
}

function getDb(env) {
  return env?.WEB3_DB || null;
}

async function ensureSchema(db) {
  if (!db) return;
  if (!schemaPromise) {
    schemaPromise = db.batch(SCHEMA.map((statement) => db.prepare(statement))).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  const match = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function identityForRequest(request) {
  const existing = getCookie(request, IDENTITY_COOKIE);
  const identityId = existing || randomId('identity');
  return {
    identityId,
    setCookie: existing ? null : `${IDENTITY_COOKIE}=${encodeURIComponent(identityId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`
  };
}

export function json(data, { status = 200, setCookie = null } = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  if (setCookie) headers.append('Set-Cookie', setCookie);
  return new Response(JSON.stringify(data), { status, headers });
}

export async function ensureIdentity(db, identityId) {
  const current = memoryStore.identities.get(identityId);
  if (!db) {
    if (!current) memoryStore.identities.set(identityId, { identity_id: identityId, campaign_id: CAMPAIGN_ID, created_at: nowIso(), completed_at: null, assignment_id: null });
    return memoryStore.identities.get(identityId);
  }
  await ensureSchema(db);
  await db.prepare('INSERT OR IGNORE INTO enjin_identities (identity_id, campaign_id, created_at) VALUES (?, ?, ?)')
    .bind(identityId, CAMPAIGN_ID, nowIso()).run();
  return db.prepare('SELECT * FROM enjin_identities WHERE identity_id = ?').bind(identityId).first();
}

export async function ensureCampaign(db, env) {
  const mockMode = String(env?.ENJIN_MOCK_MODE || '') === 'true';
  const record = {
    id: CAMPAIGN_ID,
    name: 'Nova Swarm - Eirik The Viking Vault Drop #1',
    collection_name: COLLECTION_NAME,
    collection_url: COLLECTION_URL,
    owner_profile_url: OWNER_PROFILE_URL,
    target_score: TARGET_SCORE,
    mode: 'enjin_vault_run',
    mock_mode: mockMode ? 1 : 0,
    created_at: nowIso()
  };
  if (!db) {
    if (!memoryStore.campaigns.has(CAMPAIGN_ID)) memoryStore.campaigns.set(CAMPAIGN_ID, record);
    return memoryStore.campaigns.get(CAMPAIGN_ID);
  }
  await ensureSchema(db);
  await db.prepare(`INSERT OR IGNORE INTO enjin_campaigns
    (id, name, collection_name, collection_url, owner_profile_url, target_score, mode, mock_mode, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(record.id, record.name, record.collection_name, record.collection_url, record.owner_profile_url, record.target_score, record.mode, record.mock_mode, record.created_at)
    .run();
  return db.prepare('SELECT * FROM enjin_campaigns WHERE id = ?').bind(CAMPAIGN_ID).first();
}

export async function availableClaimCount(db) {
  if (!db) return memoryStore.claims.filter((claim) => claim.status === 'available').length;
  await ensureSchema(db);
  const row = await db.prepare("SELECT COUNT(*) AS count FROM enjin_claim_inventory WHERE campaign_id = ? AND status = 'available'").bind(CAMPAIGN_ID).first();
  return Number(row?.count || 0);
}

export async function seedMockClaim(db, env) {
  if (String(env?.ENJIN_MOCK_MODE || '') !== 'true') return;
  const existingCount = await availableClaimCount(db);
  if (existingCount > 0) return;
  const claimUrl = `https://mock.invalid/enjin/claim/${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  const claimCiphertext = await encryptClaim(claimUrl, getSecret(env, 'ENJIN_CLAIM_ENCRYPTION_SECRET'));
  const claim = {
    campaign_id: CAMPAIGN_ID,
    claim_ciphertext: claimCiphertext,
    claim_fingerprint: base64UrlEncode((await digestBytes(claimUrl)).slice(0, 12)),
    token_name: 'Eirik The Viking Mystery Pilot',
    image_url: null,
    collection_name: COLLECTION_NAME,
    status: 'available',
    assigned_identity: null,
    assigned_at: null,
    created_at: nowIso()
  };
  if (!db) {
    memoryStore.claims.push({ id: memoryStore.claims.length + 1, ...claim });
    return;
  }
  await ensureSchema(db);
  await db.prepare(`INSERT OR IGNORE INTO enjin_claim_inventory
    (campaign_id, claim_ciphertext, claim_fingerprint, token_name, image_url, collection_name, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(claim.campaign_id, claim.claim_ciphertext, claim.claim_fingerprint, claim.token_name, claim.image_url, claim.collection_name, claim.status, claim.created_at)
    .run();
}

async function getExistingAssignment(db, identityId) {
  if (!db) {
    const assignment = memoryStore.assignments.get(identityId);
    if (!assignment) return null;
    const claim = memoryStore.claims.find((entry) => entry.id === assignment.claim_id);
    return claim ? { ...assignment, claim_ciphertext: claim.claim_ciphertext, claim_status: claim.status, claim_id: claim.id, token_name: claim.token_name, image_url: claim.image_url, collection_name: claim.collection_name } : null;
  }
  await ensureSchema(db);
  return db.prepare(`SELECT a.*, c.claim_ciphertext, c.status AS claim_status, c.collection_name
    FROM enjin_reward_assignments a JOIN enjin_claim_inventory c ON c.id = a.claim_id
    WHERE a.identity_id = ? AND a.campaign_id = ? LIMIT 1`).bind(identityId, CAMPAIGN_ID).first();
}

export async function assignClaim(db, env, identityId) {
  const existing = await getExistingAssignment(db, identityId);
  if (existing) return existing;
  await seedMockClaim(db, env);
  const secret = getSecret(env, 'ENJIN_CLAIM_ENCRYPTION_SECRET');
  const createdAt = nowIso();
  if (!db) {
    const claim = memoryStore.claims.find((entry) => entry.campaign_id === CAMPAIGN_ID && entry.status === 'available');
    if (!claim) return null;
    claim.status = 'assigned';
    claim.assigned_identity = identityId;
    claim.assigned_at = createdAt;
    const assignment = { id: memoryStore.assignments.size + 1, campaign_id: CAMPAIGN_ID, identity_id: identityId, claim_id: claim.id, token_name: claim.token_name, image_url: claim.image_url, status: 'CLAIM AVAILABLE', opened_at: null, created_at: createdAt, claim_ciphertext: claim.claim_ciphertext, claim_status: claim.status, collection_name: claim.collection_name };
    memoryStore.assignments.set(identityId, assignment);
    return assignment;
  }
  await ensureSchema(db);
  const claim = await db.prepare("SELECT * FROM enjin_claim_inventory WHERE campaign_id = ? AND status = 'available' ORDER BY id LIMIT 1").bind(CAMPAIGN_ID).first();
  if (!claim) return null;
  try {
    await db.batch([
      db.prepare("UPDATE enjin_claim_inventory SET status = 'assigned', assigned_identity = ?, assigned_at = ? WHERE id = ? AND status = 'available'").bind(identityId, createdAt, claim.id),
      db.prepare(`INSERT INTO enjin_reward_assignments
        (campaign_id, identity_id, claim_id, token_name, image_url, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'CLAIM AVAILABLE', ?)`)
        .bind(CAMPAIGN_ID, identityId, claim.id, claim.token_name, claim.image_url, createdAt),
      db.prepare('UPDATE enjin_identities SET assignment_id = ? WHERE identity_id = ?').bind(claim.id, identityId)
    ]);
  } catch {
    return getExistingAssignment(db, identityId);
  }
  return getExistingAssignment(db, identityId);
}

export async function publicReward(db, env, assignment) {
  if (!assignment) return null;
  const claimUrl = await decryptClaim(assignment.claim_ciphertext, getSecret(env, 'ENJIN_CLAIM_ENCRYPTION_SECRET'));
  return {
    assignmentId: assignment.id,
    claimUrl,
    tokenName: assignment.token_name || 'Eirik The Viking Mystery Pilot',
    imageUrl: assignment.image_url || null,
    collectionName: COLLECTION_NAME,
    collectionUrl: COLLECTION_URL,
    network: 'Enjin Matrix',
    status: assignment.status || 'CLAIM AVAILABLE',
    mock: String(env?.ENJIN_MOCK_MODE || '') === 'true'
  };
}

export async function markCompleted(db, identityId, assignmentId = null) {
  const completedAt = nowIso();
  if (!db) {
    const identity = memoryStore.identities.get(identityId) || { identity_id: identityId, campaign_id: CAMPAIGN_ID, created_at: completedAt };
    identity.completed_at = completedAt;
    identity.assignment_id = assignmentId;
    memoryStore.identities.set(identityId, identity);
    return identity;
  }
  await ensureSchema(db);
  await db.prepare('UPDATE enjin_identities SET completed_at = ?, assignment_id = ? WHERE identity_id = ?').bind(completedAt, assignmentId, identityId).run();
  return db.prepare('SELECT * FROM enjin_identities WHERE identity_id = ?').bind(identityId).first();
}

export async function identityStatus(db, identityId) {
  if (!db) return memoryStore.identities.get(identityId) || null;
  await ensureSchema(db);
  return db.prepare('SELECT * FROM enjin_identities WHERE identity_id = ?').bind(identityId).first();
}

export async function getRun(db, runId) {
  if (!db) return memoryStore.runs.get(runId) || null;
  await ensureSchema(db);
  return db.prepare('SELECT * FROM enjin_runs WHERE run_id = ?').bind(runId).first();
}

export async function saveRun(db, run) {
  if (!db) {
    memoryStore.runs.set(run.run_id, run);
    return run;
  }
  await ensureSchema(db);
  await db.prepare(`INSERT INTO enjin_runs
    (run_id, identity_id, campaign_id, mode, build_id, seed, issued_at, expires_at, ticket, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`)
    .bind(run.run_id, run.identity_id, run.campaign_id, run.mode, run.build_id, run.seed, run.issued_at, run.expires_at, run.ticket, run.created_at).run();
  return run;
}

export async function updateRun(db, runId, values) {
  if (!db) {
    const run = memoryStore.runs.get(runId);
    if (run) Object.assign(run, values);
    return run;
  }
  await ensureSchema(db);
  const fields = Object.keys(values);
  if (!fields.length) return getRun(db, runId);
  await db.prepare(`UPDATE enjin_runs SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE run_id = ?`)
    .bind(...fields.map((field) => values[field]), runId).run();
  return getRun(db, runId);
}

export async function saveCheckpoint(db, values) {
  if (!db) {
    memoryStore.checkpoints.push(values);
    return values;
  }
  await ensureSchema(db);
  await db.prepare(`INSERT INTO enjin_run_checkpoints (run_id, elapsed_ms, score, sector, kills, digest, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(values.run_id, values.elapsed_ms, values.score, values.sector, values.kills, values.digest || null, nowIso()).run();
  return values;
}

export async function logEvent(db, values) {
  if (!db) {
    memoryStore.events.push(values);
    return;
  }
  await ensureSchema(db);
  await db.prepare('INSERT INTO enjin_events (campaign_id, identity_id, event_name, placement, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(CAMPAIGN_ID, values.identityId || null, values.eventName, values.placement || null, nowIso()).run();
}

export async function markOpened(db, identityId, assignmentId) {
  const status = 'CLAIM OPENED';
  if (!db) {
    const assignment = memoryStore.assignments.get(identityId);
    if (assignment && (!assignmentId || String(assignment.id) === String(assignmentId))) {
      assignment.status = status;
      assignment.opened_at = nowIso();
    }
    return assignment;
  }
  await ensureSchema(db);
  await db.prepare(`UPDATE enjin_reward_assignments SET status = ?, opened_at = ? WHERE identity_id = ? AND (? IS NULL OR id = ?)`)
    .bind(status, nowIso(), identityId, assignmentId || null, assignmentId || null).run();
  return getExistingAssignment(db, identityId);
}

export {
  CAMPAIGN_ID,
  COLLECTION_NAME,
  COLLECTION_URL,
  OWNER_PROFILE_URL,
  TARGET_SCORE,
  decryptClaim,
  getExistingAssignment,
  getSecret,
  signTicket,
  verifyTicket
};
