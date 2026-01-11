const MOBILE_BREAKPOINT = 720;
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
const DESKTOP_SCALE_MIN = 0.9;
const DESKTOP_SCALE_MAX = 1.4;
const MOBILE_SCALE_MIN = 0.8;
const MOBILE_SCALE_MAX = 1.2;
const listeners = new Set();

const layoutState = {
  width: 0,
  height: 0,
  isMobile: false,
  isPortrait: true,
  scale: 1,
  safeArea: { left: 0, top: 0, right: 0, bottom: 0 }
};

function detectMobile(width, height) {
  const pointerCoarse = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const mobileUserAgent = /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(ua);
  return width <= MOBILE_BREAKPOINT || pointerCoarse || mobileUserAgent || height > width * 1.1;
}

function computeScale(width, height, isMobile) {
  const scaleX = width / BASE_WIDTH;
  const scaleY = height / BASE_HEIGHT;
  const rawScale = Math.min(scaleX, scaleY);
  const minScale = isMobile ? MOBILE_SCALE_MIN : DESKTOP_SCALE_MIN;
  const maxScale = isMobile ? MOBILE_SCALE_MAX : DESKTOP_SCALE_MAX;
  return Math.max(minScale, Math.min(maxScale, rawScale));
}

function computeSafeArea(width, height, isMobile) {
  const margin = isMobile ? 12 : 16;
  return {
    left: margin,
    top: margin,
    right: width - margin,
    bottom: height - margin
  };
}

export function applyResponsiveLayout(viewportW = window.innerWidth, viewportH = window.innerHeight) {
  const width = Math.max(320, Math.round(viewportW));
  const height = Math.max(240, Math.round(viewportH));
  const isMobile = detectMobile(width, height);
  const isPortrait = height >= width;
  const scale = computeScale(width, height, isMobile);
  const safeArea = computeSafeArea(width, height, isMobile);

  layoutState.width = width;
  layoutState.height = height;
  layoutState.isMobile = isMobile;
  layoutState.isPortrait = isPortrait;
  layoutState.scale = scale;
  layoutState.safeArea = safeArea;

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
