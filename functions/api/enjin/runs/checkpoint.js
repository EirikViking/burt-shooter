import {
  CAMPAIGN_ID,
  TARGET_SCORE,
  getRun,
  getSecret,
  identityForRequest,
  json,
  saveCheckpoint,
  verifyTicket
} from '../../../shared/enjin.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const identity = identityForRequest(context.request);
    const db = context.env.WEB3_DB || null;
    const ticket = await verifyTicket(body.ticket, getSecret(context.env, 'ENJIN_RUN_HMAC_SECRET'));
    const run = await getRun(db, body.runId);
    if (!ticket || !run || ticket.runId !== run.run_id || ticket.identityId !== identity.identityId || ticket.campaignId !== CAMPAIGN_ID) {
      return json({ error: 'checkpoint_rejected' }, { status: 400, setCookie: identity.setCookie });
    }
    const score = Math.min(TARGET_SCORE, Math.max(0, Math.floor(Number(body.score) || 0)));
    await saveCheckpoint(db, {
      run_id: run.run_id,
      elapsed_ms: Math.max(0, Math.floor(Number(body.elapsedMs) || 0)),
      score,
      sector: Math.max(1, Math.floor(Number(body.sector) || 1)),
      kills: Math.max(0, Math.floor(Number(body.kills) || 0)),
      digest: String(body.previousDigest || '').slice(0, 128)
    });
    return json({ ok: true, runId: run.run_id, score }, { setCookie: identity.setCookie });
  } catch {
    return json({ error: 'checkpoint_unavailable' }, { status: 503 });
  }
}
