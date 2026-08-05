const LOCAL_STATE_KEY = 'novaSwarm.enjin.mvp.v1';
const MOCK_CLAIM_ORIGIN = 'https://mock.invalid/enjin/claim/';

const DEFAULT_CAMPAIGN = Object.freeze({
  id: 'eirik-viking-vault-1',
  mode: 'enjin_vault_run',
  targetScore: 30_000,
  title: 'EIRIK THE VIKING VAULT RUN',
  collectionName: 'Eirik The Viking',
  collectionUrl: 'https://nft.io/collection/eirik-the-viking-1/assets',
  mockMode: true,
  availableClaims: 1
});

function shouldUseMockClaims() {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
    || new URLSearchParams(window.location.search).has('enjin_test');
}

function readLocalState() {
  try {
    const value = JSON.parse(window.localStorage?.getItem(LOCAL_STATE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeLocalState(value) {
  try {
    window.localStorage?.setItem(LOCAL_STATE_KEY, JSON.stringify(value));
  } catch {
    // Private browsing or a blocked storage surface should not stop play.
  }
}

function ensureLocalIdentity() {
  const current = readLocalState();
  if (current.identityId) return current.identityId;
  const identityId = `local-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  writeLocalState({ ...current, identityId });
  return identityId;
}

function mockReward(state = readLocalState()) {
  const assignmentId = state.assignmentId || `mock-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  return {
    assignmentId,
    claimUrl: `${MOCK_CLAIM_ORIGIN}${encodeURIComponent(assignmentId)}`,
    tokenName: state.tokenName || 'Eirik The Viking Mystery Pilot',
    imageUrl: state.imageUrl || null,
    collectionName: 'Eirik The Viking',
    network: 'Enjin Matrix',
    status: state.claimOpened ? 'CLAIM OPENED' : 'CLAIM AVAILABLE',
    mock: true
  };
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok || !payload) {
    throw new Error(`enjin_api_${response.status}`);
  }
  return payload;
}

export async function getCampaign() {
  try {
    return { ...DEFAULT_CAMPAIGN, ...(await request('/api/enjin/campaign')) };
  } catch {
    return { ...DEFAULT_CAMPAIGN };
  }
}

export async function getCompletionStatus() {
  const localState = readLocalState();
  try {
    const remote = await request('/api/enjin/completion-status');
    if (localState.completed && shouldUseMockClaims()) {
      return {
        ...remote,
        completed: true,
        assignmentId: localState.assignmentId || remote.assignmentId || null,
        mock: true
      };
    }
    return remote;
  } catch {
    return {
      completed: Boolean(localState.completed),
      assignmentId: localState.assignmentId || null,
      mock: true
    };
  }
}

export async function startRun({ buildId = 'dev' } = {}) {
  ensureLocalIdentity();
  try {
    return await request('/api/enjin/runs/start', {
      method: 'POST',
      body: JSON.stringify({ buildId, mode: 'enjin_vault_run' })
    });
  } catch {
    if (!shouldUseMockClaims()) return { ok: false, unavailable: true, mock: false };
    return {
      mock: true,
      campaignId: DEFAULT_CAMPAIGN.id,
      runId: `mock-run-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      seed: Math.floor(Math.random() * 2 ** 31),
      targetScore: DEFAULT_CAMPAIGN.targetScore,
      buildId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000,
      ticket: 'mock-ticket'
    };
  }
}

export async function finishRun(payload) {
  try {
    const result = await request('/api/enjin/runs/finish', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        mode: 'enjin_vault_run',
        score: 30_000
      })
    });
    const current = readLocalState();
    writeLocalState({
      ...current,
      completed: true,
      assignmentId: result.reward?.assignmentId || current.assignmentId || null,
      tokenName: result.reward?.tokenName || current.tokenName || null,
      imageUrl: result.reward?.imageUrl || current.imageUrl || null,
      mock: Boolean(result.mock)
    });
    return result;
  } catch {
    if (!shouldUseMockClaims()) {
      return { ok: false, mock: false, status: 'unavailable', reward: null };
    }
    const current = readLocalState();
    const reward = current.inventoryEmpty ? null : mockReward(current);
    writeLocalState({
      ...current,
      completed: true,
      assignmentId: reward?.assignmentId || null,
      tokenName: reward?.tokenName || null,
      imageUrl: reward?.imageUrl || null,
      mock: true
    });
    return {
      ok: true,
      mock: true,
      status: reward ? 'assigned' : 'inventory_empty',
      reward
    };
  }
}

export async function getReward() {
  const localState = readLocalState();
  try {
    const remote = await request('/api/enjin/reward/current');
    if (remote?.reward || !localState.completed || !shouldUseMockClaims()) return remote;
    return { reward: mockReward(localState) };
  } catch {
    return shouldUseMockClaims() && localState.completed && localState.assignmentId
      ? { reward: mockReward(localState) }
      : null;
  }
}

export async function markRewardOpened(assignmentId) {
  try {
    return await request('/api/enjin/reward/opened', {
      method: 'POST',
      body: JSON.stringify({ assignmentId })
    });
  } catch {
    if (!shouldUseMockClaims()) return { ok: false, status: 'unavailable', mock: false };
    const state = readLocalState();
    writeLocalState({ ...state, claimOpened: true });
    return { ok: true, status: 'CLAIM OPENED', mock: true };
  }
}

export function trackEnjinEvent(name, placement) {
  const payload = JSON.stringify({
    name: String(name || '').slice(0, 64),
    placement: String(placement || '').slice(0, 64),
    campaignId: DEFAULT_CAMPAIGN.id,
    at: Date.now()
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/enjin/events', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/enjin/events', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        credentials: 'include'
      }).catch(() => {});
    }
  } catch {
    // Analytics must never delay or break the player funnel.
  }
}

export { DEFAULT_CAMPAIGN };
