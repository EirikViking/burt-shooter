export const NOVA_EDITIONS = Object.freeze({
  STANDARD: 'standard',
  ENJIN: 'enjin'
});

export const CURRENT_EDITION = typeof __NOVA_EDITION__ !== 'undefined'
  ? __NOVA_EDITION__
  : 'standard';

export const IS_ENJIN_EDITION = CURRENT_EDITION === NOVA_EDITIONS.ENJIN;
