import {
  assignClaim,
  ensureIdentity,
  getExistingAssignment,
  identityForRequest,
  json,
  publicReward
} from '../../../shared/enjin.js';

export async function onRequestGet(context) {
  try {
    const identity = identityForRequest(context.request);
    const db = context.env.WEB3_DB || null;
    await ensureIdentity(db, identity.identityId);
    const assignment = await getExistingAssignment(db, identity.identityId);
    return json({ reward: await publicReward(db, context.env, assignment) }, { setCookie: identity.setCookie });
  } catch {
    return json({ error: 'reward_unavailable' }, { status: 503 });
  }
}
