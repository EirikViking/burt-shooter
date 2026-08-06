import {
  ensureIdentity,
  identityForRequest,
  json,
  markOpened
} from '../../../shared/enjin.js';

export async function onRequestPost(context) {
  try {
    const identity = identityForRequest(context.request);
    const body = await context.request.json();
    const db = context.env.WEB3_DB || null;
    await ensureIdentity(db, identity.identityId);
    const assignment = await markOpened(db, identity.identityId, body.assignmentId || null);
    return json({ ok: Boolean(assignment), status: assignment?.status || 'CLAIM AVAILABLE' }, { setCookie: identity.setCookie });
  } catch {
    return json({ error: 'reward_open_unavailable' }, { status: 503 });
  }
}
