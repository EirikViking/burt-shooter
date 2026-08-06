import { ensureIdentity, identityForRequest, json, logEvent } from '../../shared/enjin.js';

export async function onRequestPost(context) {
  try {
    const identity = identityForRequest(context.request);
    const body = await context.request.json();
    const db = context.env.WEB3_DB || null;
    await ensureIdentity(db, identity.identityId);
    await logEvent(db, {
      identityId: identity.identityId,
      eventName: String(body.name || '').slice(0, 64),
      placement: String(body.placement || '').slice(0, 64)
    });
    return json({ ok: true }, { status: 202, setCookie: identity.setCookie });
  } catch {
    return json({ ok: false }, { status: 202 });
  }
}
