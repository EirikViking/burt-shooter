import {
  CAMPAIGN_ID,
  TARGET_SCORE,
  assignClaim,
  ensureCampaign,
  ensureIdentity,
  getRun,
  getSecret,
  identityForRequest,
  identityStatus,
  json,
  markCompleted,
  publicReward,
  updateRun,
  verifyTicket
} from '../../../shared/enjin.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const identity = identityForRequest(context.request);
    const db = context.env.WEB3_DB || null;
    await ensureCampaign(db, context.env);
    await ensureIdentity(db, identity.identityId);
    const ticket = await verifyTicket(body.ticket, getSecret(context.env, 'ENJIN_RUN_HMAC_SECRET'));
    const run = await getRun(db, body.runId);
    if (!ticket || !run || ticket.runId !== run.run_id || ticket.identityId !== identity.identityId || ticket.campaignId !== CAMPAIGN_ID || ticket.mode !== 'enjin_vault_run') {
      return json({ error: 'run_validation_failed' }, { status: 400, setCookie: identity.setCookie });
    }
    if (Date.now() > Number(ticket.expiresAt || 0) || Number(body.score) < TARGET_SCORE) {
      return json({ error: 'run_validation_failed' }, { status: 400, setCookie: identity.setCookie });
    }
    const existingStatus = await identityStatus(db, identity.identityId);
    if (existingStatus?.completed_at && run.status === 'complete') {
      const assignment = await assignClaim(db, context.env, identity.identityId);
      const reward = await publicReward(db, context.env, assignment);
      return json({ ok: true, status: reward ? 'assigned' : 'inventory_empty', reward, mock: String(context.env.ENJIN_MOCK_MODE || '') === 'true' }, { setCookie: identity.setCookie });
    }
    const assignment = await assignClaim(db, context.env, identity.identityId);
    const reward = await publicReward(db, context.env, assignment);
    await markCompleted(db, identity.identityId, assignment?.claim_id || null);
    await updateRun(db, run.run_id, {
      status: 'complete',
      score: TARGET_SCORE,
      raw_crossing_score: Math.max(TARGET_SCORE, Math.floor(Number(body.rawCrossingScore) || TARGET_SCORE))
    });
    return json({
      ok: true,
      status: reward ? 'assigned' : 'inventory_empty',
      reward,
      mock: String(context.env.ENJIN_MOCK_MODE || '') === 'true'
    }, { setCookie: identity.setCookie });
  } catch {
    return json({ error: 'run_finish_unavailable' }, { status: 503 });
  }
}
