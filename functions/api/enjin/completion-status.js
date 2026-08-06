import {
  ensureIdentity,
  getExistingAssignment,
  identityForRequest,
  identityStatus,
  json
} from '../../shared/enjin.js';

export async function onRequestGet(context) {
  try {
    const identity = identityForRequest(context.request);
    const db = context.env.WEB3_DB || null;
    await ensureIdentity(db, identity.identityId);
    const status = await identityStatus(db, identity.identityId);
    const assignment = await getExistingAssignment(db, identity.identityId);
    return json({ completed: Boolean(status?.completed_at), assignmentId: assignment?.id || null }, { setCookie: identity.setCookie });
  } catch {
    return json({ error: 'completion_status_unavailable' }, { status: 503 });
  }
}
