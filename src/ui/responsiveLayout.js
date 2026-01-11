const MOBILE_BREAKPOINT = 720;
const listeners = new Set();

const layoutState = {
  width: 0,
  height: 0,
  isMobile: false,
  isPortrait: true
};

function detectMobile(width, height) {
  const pointerCoarse = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const mobileUserAgent = /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(ua);
  return width <= MOBILE_BREAKPOINT || pointerCoarse || mobileUserAgent || height > width * 1.1;
}

export function applyResponsiveLayout(viewportW = window.innerWidth, viewportH = window.innerHeight) {
  const width = Math.max(320, Math.round(viewportW));
  const height = Math.max(240, Math.round(viewportH));
  const isMobile = detectMobile(width, height);
  layoutState.width = width;
  layoutState.height = height;
  layoutState.isMobile = isMobile;
  layoutState.isPortrait = height >= width;

  listeners.forEach((listener) => {
    try {
      listener(layoutState);
    } catch (error) {
      console.error('Responsive listener error', error);
    }
  });

  return layoutState;
}

export function getCurrentLayout() {
  return layoutState;
}

export function addResponsiveListener(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
