import { LANGUAGE_CHANGE_EVENT, translateText } from './index.js';

let installed = false;
const trackedText = new Set();

function findTextDescriptor(PIXI) {
  let proto = PIXI?.Text?.prototype || null;
  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'text');
    if (descriptor?.get && descriptor?.set) {
      return { owner: proto, descriptor };
    }
    proto = Object.getPrototypeOf(proto);
  }
  return null;
}

function cleanTrackedText() {
  for (const item of [...trackedText]) {
    if (!item || item.destroyed) trackedText.delete(item);
  }
}

export function installPixiTextLocalization(PIXI) {
  if (installed) return true;
  const textDescriptor = findTextDescriptor(PIXI);
  if (!textDescriptor) return false;

  const { owner, descriptor } = textDescriptor;
  const originalGet = descriptor.get;
  const originalSet = descriptor.set;

  function applyLocalizedText(target) {
    if (!target || target.destroyed) return;
    const source = target.__novaI18nSourceText;
    if (source == null) return;
    target.__novaI18nApplying = true;
    try {
      originalSet.call(target, translateText(source));
      target.updateText?.(false);
    } finally {
      target.__novaI18nApplying = false;
    }
  }

  Object.defineProperty(owner, 'text', {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      return originalGet.call(this);
    },
    set(value) {
      if (this.__novaI18nApplying) {
        originalSet.call(this, value);
        return;
      }
      this.__novaI18nSourceText = String(value ?? '');
      trackedText.add(this);
      applyLocalizedText(this);
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
      cleanTrackedText();
      for (const item of trackedText) {
        applyLocalizedText(item);
      }
    });
  }

  installed = true;
  return true;
}
