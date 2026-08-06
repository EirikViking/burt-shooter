import {
  CAMPAIGN_ID,
  TARGET_SCORE,
  ensureCampaign,
  ensureIdentity,
  identityForRequest,
  identityStatus,
  getSecret,
  json,
  saveRun,
  signTicket
} from '../../../shared/enjin.js';

export async function onRequestPost(context) {
  try {
    const identity = identityForRequest(context.request);
    const db = context.env.WEB3_DB || null;
    await ensureCampaign(db, context.env);
    const identityRow = await ensureIdentity(db, identity.identityId);
    if (identityRow?.completed_at) {
      return json({ error: 'campaign_identity_completed' }, { status: 409, setCookie: identity.setCookie });
    }
    let body = {};
    try { body = await context.request.json(); } catch { /* defaults */ }
    const buildId = String(body.buildId || 'unknown').slice(0, 120);
    const issuedAt = Date.now();
    const expiresAt = issuedAt + 30 * 60 * 1000;
    const runId = `run-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff;
    const payload = {
      runId,
      identityId: identity.identityId,
      campaignId: CAMPAIGN_ID,
      mode: 'enjin_vault_run',
      buildId,
      seed,
      issuedAt,
      expiresAt,
      targetScore: TARGET_SCORE
    };
    const ticket = await signTicket(payload, getSecret(context.env, 'ENJIN_RUN_HMAC_SECRET'));
    await saveRun(db, {
      run_id: runId,
      identity_id: identity.identityId,
      campaign_id: CAMPAIGN_ID,
      mode: 'enjin_vault_run',
      build_id: buildId,
      seed,
      issued_at: issuedAt,
      expires_at: expiresAt,
      ticket,
      created_at: new Date(issuedAt).toISOString()
    });
    return json({
      campaignId: CAMPAIGN_ID,
      runId,
      seed,
      targetScore: TARGET_SCORE,
      buildId,
      issuedAt,
      expiresAt,
      ticket,
      mock: String(context.env.ENJIN_MOCK_MODE || '') === 'true'
    }, { status: 201, setCookie: identity.setCookie });
  } catch {
    return json({ error: 'run_start_unavailable' }, { status: 503 });
  }
}
