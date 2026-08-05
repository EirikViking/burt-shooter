import {
  CAMPAIGN_ID,
  COLLECTION_NAME,
  COLLECTION_URL,
  OWNER_PROFILE_URL,
  TARGET_SCORE,
  availableClaimCount,
  ensureCampaign,
  ensureIdentity,
  identityForRequest,
  json
} from '../../shared/enjin.js';

export async function onRequestGet(context) {
  try {
    const identity = identityForRequest(context.request);
    const db = context.env.WEB3_DB || null;
    await ensureCampaign(db, context.env);
    await ensureIdentity(db, identity.identityId);
    return json({
      id: CAMPAIGN_ID,
      mode: 'enjin_vault_run',
      targetScore: TARGET_SCORE,
      title: 'EIRIK THE VIKING VAULT RUN',
      collectionName: COLLECTION_NAME,
      collectionUrl: COLLECTION_URL,
      ownerProfileUrl: OWNER_PROFILE_URL,
      mockMode: String(context.env.ENJIN_MOCK_MODE || '') === 'true',
      availableClaims: await availableClaimCount(db)
    }, { setCookie: identity.setCookie });
  } catch {
    return json({ error: 'campaign_unavailable' }, { status: 503 });
  }
}
