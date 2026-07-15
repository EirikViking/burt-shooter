export const DAILY_SIGNAL_CARD_VERSION = 1;
export const DAILY_SIGNAL_CARD_WIDTH = 1200;
export const DAILY_SIGNAL_CARD_HEIGHT = 675;

const FLIGHT_LOG_STATUSES = new Set(['cleared', 'attempted', 'unopened']);

function toWholeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function normalizeFlightLogStatuses(value) {
  const statuses = (Array.isArray(value) ? value : [])
    .map((status) => normalizeText(status).toLowerCase())
    .map((status) => FLIGHT_LOG_STATUSES.has(status) ? status : 'unopened')
    .slice(-7);
  while (statuses.length < 7) statuses.unshift('unopened');
  return statuses;
}

function compactRulesFingerprint(value) {
  const normalized = normalizeText(value).replace(/[^a-z0-9-]/gi, '').toUpperCase();
  if (!normalized) return 'DCS-LOCAL';
  const separator = normalized.indexOf('-');
  if (separator < 0) return normalized.slice(0, 12);
  return `${normalized.slice(0, separator + 1)}${normalized.slice(separator + 1, separator + 9)}`;
}

export function formatDailySignalCardScore(value) {
  return toWholeNumber(value).toLocaleString('en-US');
}

export function formatDailySignalCardTime(value) {
  const totalSeconds = toWholeNumber(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDailySignalCardFlightLog(statuses = []) {
  return normalizeFlightLogStatuses(statuses).map((status) => {
    if (status === 'cleared') return '◆';
    if (status === 'attempted') return '◇';
    return '·';
  }).join('  ');
}

export function createDailySignalCardModel(report) {
  const summary = report?.summary || null;
  const daily = summary?.dailySignal || null;
  if (!summary || summary.runMode !== 'daily_signal' || !daily) return null;

  const flightLogStatuses = normalizeFlightLogStatuses(daily.flightLog?.statuses);
  const finishSector = Math.max(1, toWholeNumber(daily.finishSector, 10));
  const runCleared = summary.runCleared === true;
  return Object.freeze({
    version: DAILY_SIGNAL_CARD_VERSION,
    dailyKey: normalizeText(daily.dailyKey, 'UTC'),
    runCleared,
    score: toWholeNumber(summary.score),
    sectorReached: runCleared ? finishSector : Math.max(1, toWholeNumber(summary.sectorReached, 1)),
    runtimeSeconds: toWholeNumber(summary.runtimeSeconds),
    shipId: normalizeText(summary.shipId),
    shipName: normalizeText(summary.shipName, 'Nova Swarm Pilot'),
    routeId: normalizeText(daily.templateId),
    routeLabel: normalizeText(daily.templateLabel, 'Daily Signal'),
    finishSector,
    attemptCount: Math.max(1, toWholeNumber(daily.attemptCount, 1)),
    rulesFingerprint: compactRulesFingerprint(daily.rulesHash),
    contractValid: daily.valid === true,
    recordStored: daily.recordStored === true,
    recordSaveFailed: daily.recordSaveFailed === true,
    newBestAttempt: daily.newAttemptBest === true,
    newBestClear: daily.newClearBest === true,
    flightLog: Object.freeze({
      statuses: Object.freeze(flightLogStatuses),
      clears: toWholeNumber(daily.flightLog?.clears),
      attemptedDays: toWholeNumber(daily.flightLog?.attemptedDays)
    })
  });
}

export function getDailySignalCardFilename(model) {
  const date = normalizeText(model?.dailyKey, 'utc').replace(/[^0-9a-z-]+/gi, '-').replace(/^-+|-+$/g, '') || 'utc';
  const state = model?.runCleared ? 'cleared' : `sector-${Math.max(1, toWholeNumber(model?.sectorReached, 1))}`;
  const score = String(toWholeNumber(model?.score)).padStart(8, '0');
  return `nova-swarm-daily-signal-${date}-${state}-${score}.png`;
}

export function createDailySignalCardCopy(model, translate = (source, vars = {}) => {
  let text = String(source || '');
  Object.entries(vars).forEach(([key, value]) => { text = text.replaceAll(`{${key}}`, String(value)); });
  return text;
}) {
  if (!model) return null;
  const score = formatDailySignalCardScore(model.score);
  const time = formatDailySignalCardTime(model.runtimeSeconds);
  const route = translate(model.routeLabel);
  const result = translate(model.runCleared ? 'DAILY SIGNAL CLEARED' : 'DAILY SIGNAL ENDED');
  const recordBadge = !model.contractValid
    ? translate('PRACTICE RESULT // CONTRACT VALIDITY FAILED')
    : model.recordSaveFailed
      ? translate('RECORD NOT STORED')
      : model.newBestClear || model.newBestAttempt
        ? translate('NEW DAILY SIGNAL BEST')
        : translate('LOCAL ONLY');
  const flightLog = formatDailySignalCardFlightLog(model.flightLog.statuses);
  const caption = translate('Nova Swarm Daily Signal // {date} // {result} // Score {score} // Sector {sector} // Time {time} // {ship} // {route} // Local signal, no public rank. #NovaSwarm', {
    date: model.dailyKey,
    result,
    score,
    sector: model.sectorReached,
    time,
    ship: model.shipName,
    route
  });

  return Object.freeze({
    title: translate('CABINET SIGNAL RECEIPT'),
    mode: translate('DAILY CABINET SIGNAL'),
    result,
    recordBadge,
    scoreLabel: translate('SCORE'),
    score,
    sectorLabel: translate('SECTOR'),
    sector: String(model.sectorReached),
    timeLabel: translate('TIME'),
    time,
    loanerLabel: translate('LOANER'),
    ship: model.shipName,
    routeLabel: translate('Route directive'),
    route,
    attemptLabel: translate('ATTEMPT {attempt}', { attempt: model.attemptCount }),
    flightLogLabel: translate('7-day flight log'),
    flightLog,
    flightLogClears: `${model.flightLog.clears}/7`,
    rulesLabel: translate('Rules fingerprint'),
    rulesFingerprint: model.rulesFingerprint,
    disclosure: translate('LOCAL SIGNAL // NO PUBLIC RANK'),
    caption
  });
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createStableRandom(seed) {
  let state = stableHash(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function drawImageCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, (image.width - sourceWidth) / 2);
  const sourceY = Math.max(0, (image.height - sourceHeight) / 2);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

async function loadCardImage(url) {
  if (!url || typeof Image === 'undefined') return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function setCardFont(context, size, weight = 700) {
  context.font = `${weight} ${size}px Rajdhani, Orbitron, Bahnschrift, Arial, sans-serif`;
}

function drawFittedText(context, text, x, y, maxWidth, startSize, {
  minSize = 15,
  weight = 700,
  align = 'left',
  fill = '#ffffff',
  stroke = null,
  strokeWidth = 0
} = {}) {
  const value = normalizeText(text);
  let size = startSize;
  setCardFont(context, size, weight);
  while (size > minSize && context.measureText(value).width > maxWidth) {
    size -= 1;
    setCardFont(context, size, weight);
  }
  context.textAlign = align;
  context.textBaseline = 'middle';
  if (stroke && strokeWidth > 0) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.strokeText(value, x, y, maxWidth);
  }
  context.fillStyle = fill;
  context.fillText(value, x, y, maxWidth);
  return size;
}

function drawPanel(context, x, y, width, height, accent, alpha = 0.92) {
  context.beginPath();
  context.roundRect(x, y, width, height, 16);
  context.fillStyle = `rgba(3, 15, 29, ${alpha})`;
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = accent;
  context.globalAlpha = 0.75;
  context.fillRect(x, y, 7, height);
  context.globalAlpha = 1;
}

function drawSignalTrace(context, model, x, y, width, height, accent) {
  const random = createStableRandom(`${model.dailyKey}:${model.rulesFingerprint}:${model.score}`);
  const columns = 28;
  const rows = 4;
  const gap = 3;
  const cellWidth = (width - gap * (columns - 1)) / columns;
  const cellHeight = (height - gap * (rows - 1)) / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const active = random() > 0.38;
      context.fillStyle = active ? accent : 'rgba(70, 120, 145, 0.2)';
      context.globalAlpha = active ? 0.72 + random() * 0.25 : 1;
      context.fillRect(x + column * (cellWidth + gap), y + row * (cellHeight + gap), cellWidth, cellHeight);
    }
  }
  context.globalAlpha = 1;
}

export async function renderDailySignalCard(model, copy, {
  backdropUrl = null,
  shipUrl = null,
  canvasFactory = () => document.createElement('canvas')
} = {}) {
  if (!model || !copy) throw new Error('Daily Signal card model and copy are required.');
  const canvas = canvasFactory();
  canvas.width = DAILY_SIGNAL_CARD_WIDTH;
  canvas.height = DAILY_SIGNAL_CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Daily Signal card canvas is unavailable.');

  const [backdrop, ship] = await Promise.all([loadCardImage(backdropUrl), loadCardImage(shipUrl)]);
  const width = canvas.width;
  const height = canvas.height;
  const accent = model.runCleared ? '#ffe777' : '#ff5bd6';
  const cyan = '#46f6ff';
  const mint = '#78ffd2';
  const random = createStableRandom(`${model.dailyKey}:${model.rulesFingerprint}`);

  context.fillStyle = '#010711';
  context.fillRect(0, 0, width, height);
  if (backdrop) {
    context.save();
    context.globalAlpha = 0.52;
    drawImageCover(context, backdrop, 0, 0, width, height);
    context.restore();
  }
  const shade = context.createLinearGradient(0, 0, width, height);
  shade.addColorStop(0, 'rgba(1, 7, 18, 0.92)');
  shade.addColorStop(0.58, 'rgba(2, 10, 25, 0.74)');
  shade.addColorStop(1, model.runCleared ? 'rgba(34, 27, 5, 0.68)' : 'rgba(36, 2, 34, 0.74)');
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 120; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 0.5 + random() * 1.8;
    context.fillStyle = index % 7 === 0 ? accent : index % 3 === 0 ? mint : cyan;
    context.globalAlpha = 0.18 + random() * 0.48;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  context.strokeStyle = 'rgba(70, 246, 255, 0.34)';
  context.lineWidth = 1;
  for (let y = 32; y < height; y += 22) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.strokeStyle = cyan;
  context.lineWidth = 3;
  context.strokeRect(24, 24, width - 48, height - 48);
  context.strokeStyle = accent;
  context.lineWidth = 1;
  context.strokeRect(34, 34, width - 68, height - 68);
  context.fillStyle = cyan;
  context.fillRect(24, 24, 170, 5);
  context.fillStyle = accent;
  context.fillRect(width - 242, height - 29, 218, 5);

  drawFittedText(context, 'NOVA SWARM', 60, 64, 300, 22, { weight: 900, fill: mint });
  drawFittedText(context, copy.title, 60, 106, 690, 44, { minSize: 28, weight: 900, fill: '#ffffff', stroke: '#031323', strokeWidth: 5 });
  drawFittedText(context, `${copy.mode}  //  ${model.dailyKey}`, 62, 142, 690, 21, { minSize: 15, weight: 800, fill: cyan });

  const statusWidth = 360;
  context.beginPath();
  context.roundRect(width - statusWidth - 56, 54, statusWidth, 58, 12);
  context.fillStyle = model.runCleared ? 'rgba(93, 68, 4, 0.84)' : 'rgba(74, 5, 64, 0.84)';
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.stroke();
  drawFittedText(context, copy.result, width - 56 - statusWidth / 2, 83, statusWidth - 30, 25, {
    minSize: 17,
    weight: 900,
    align: 'center',
    fill: '#ffffff'
  });
  drawFittedText(context, copy.recordBadge, width - 56, 134, statusWidth, 16, {
    minSize: 12,
    weight: 800,
    align: 'right',
    fill: accent
  });

  drawPanel(context, 54, 172, 648, 210, cyan, 0.9);
  drawFittedText(context, copy.scoreLabel, 84, 205, 180, 18, { weight: 900, fill: mint });
  drawFittedText(context, copy.score, 84, 278, 570, 82, { minSize: 52, weight: 900, fill: '#ffffff', stroke: '#061425', strokeWidth: 7 });

  const metricY = 345;
  drawFittedText(context, `${copy.sectorLabel}  ${copy.sector}`, 86, metricY, 230, 25, { minSize: 18, weight: 900, fill: accent });
  drawFittedText(context, `${copy.timeLabel}  ${copy.time}`, 330, metricY, 230, 25, { minSize: 18, weight: 900, fill: cyan });
  drawFittedText(context, copy.attemptLabel, 660, metricY, 190, 17, { minSize: 13, weight: 800, align: 'right', fill: '#d8fbff' });

  const shipCenterX = 936;
  const shipCenterY = 315;
  const glow = context.createRadialGradient(shipCenterX, shipCenterY, 20, shipCenterX, shipCenterY, 240);
  glow.addColorStop(0, model.runCleared ? 'rgba(255, 231, 119, 0.34)' : 'rgba(255, 91, 214, 0.34)');
  glow.addColorStop(0.45, 'rgba(70, 246, 255, 0.17)');
  glow.addColorStop(1, 'rgba(70, 246, 255, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(shipCenterX, shipCenterY, 250, 0, Math.PI * 2);
  context.fill();
  for (const [radius, color, lineWidth] of [[216, accent, 3], [180, cyan, 2], [145, mint, 1]]) {
    context.strokeStyle = color;
    context.globalAlpha = radius === 216 ? 0.72 : 0.4;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.arc(shipCenterX, shipCenterY, radius, -Math.PI * 0.9, Math.PI * 0.72);
    context.stroke();
  }
  context.globalAlpha = 1;
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2;
    const inner = 224;
    const outer = index % 3 === 0 ? 246 : 236;
    context.strokeStyle = index % 2 ? cyan : accent;
    context.lineWidth = index % 3 === 0 ? 4 : 2;
    context.beginPath();
    context.moveTo(shipCenterX + Math.cos(angle) * inner, shipCenterY + Math.sin(angle) * inner);
    context.lineTo(shipCenterX + Math.cos(angle) * outer, shipCenterY + Math.sin(angle) * outer);
    context.stroke();
  }
  if (ship) {
    const maxShipSize = 318;
    const scale = Math.min(maxShipSize / ship.width, maxShipSize / ship.height);
    const shipWidth = ship.width * scale;
    const shipHeight = ship.height * scale;
    context.save();
    context.shadowColor = accent;
    context.shadowBlur = 28;
    context.drawImage(ship, shipCenterX - shipWidth / 2, shipCenterY - shipHeight / 2, shipWidth, shipHeight);
    context.restore();
  } else {
    context.fillStyle = accent;
    context.globalAlpha = 0.84;
    context.beginPath();
    context.moveTo(shipCenterX, shipCenterY - 128);
    context.lineTo(shipCenterX + 76, shipCenterY + 108);
    context.lineTo(shipCenterX, shipCenterY + 58);
    context.lineTo(shipCenterX - 76, shipCenterY + 108);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
  }
  drawFittedText(context, `${copy.loanerLabel} // ${copy.ship}`, shipCenterX, 540, 440, 22, {
    minSize: 15,
    weight: 900,
    align: 'center',
    fill: '#ffffff',
    stroke: '#031323',
    strokeWidth: 4
  });

  drawPanel(context, 54, 400, 648, 150, accent, 0.88);
  drawFittedText(context, copy.routeLabel, 84, 427, 250, 16, { weight: 900, fill: accent });
  drawFittedText(context, copy.route, 84, 462, 570, 27, { minSize: 19, weight: 900, fill: '#ffffff' });
  drawFittedText(context, copy.flightLogLabel, 84, 505, 230, 16, { weight: 800, fill: mint });
  drawFittedText(context, copy.flightLog, 292, 505, 270, 24, { minSize: 17, weight: 900, fill: '#ffffff' });
  drawFittedText(context, copy.flightLogClears, 666, 505, 82, 18, { minSize: 14, weight: 900, align: 'right', fill: cyan });

  drawFittedText(context, `${copy.rulesLabel}: ${copy.rulesFingerprint}`, 60, 584, 490, 16, { minSize: 12, weight: 700, fill: '#9ddce6' });
  drawSignalTrace(context, model, 60, 606, 492, 28, accent);
  drawFittedText(context, copy.disclosure, width - 58, 611, 540, 23, { minSize: 15, weight: 900, align: 'right', fill: accent });

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Signal card PNG encoding failed.')), 'image/png');
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Signal card data conversion failed.'));
    reader.readAsDataURL(blob);
  });
}

export async function saveDailySignalCard(canvas, filename, {
  appBridge = globalThis.window?.__novaApp || null,
  documentRef = globalThis.document || null,
  urlApi = globalThis.URL || null
} = {}) {
  const blob = await canvasToBlob(canvas);
  if (typeof appBridge?.saveSignalCard === 'function') {
    const dataUrl = await blobToDataUrl(blob);
    return appBridge.saveSignalCard({ filename, dataUrl });
  }
  if (!documentRef || !urlApi?.createObjectURL) throw new Error('Signal card download is unavailable.');
  const href = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.style.display = 'none';
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout?.(() => urlApi.revokeObjectURL(href), 1000);
  return { ok: true, downloaded: true, filename };
}

export async function copyDailySignalCaption(caption, {
  appBridge = globalThis.window?.__novaApp || null,
  navigatorRef = globalThis.navigator || null,
  documentRef = globalThis.document || null
} = {}) {
  const text = normalizeText(caption);
  if (!text) throw new Error('Signal card caption is empty.');
  if (typeof appBridge?.copyText === 'function') return appBridge.copyText({ text });
  if (typeof navigatorRef?.clipboard?.writeText === 'function') {
    await navigatorRef.clipboard.writeText(text);
    return { ok: true, copied: true };
  }
  if (!documentRef) throw new Error('Clipboard is unavailable.');
  const textarea = documentRef.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  documentRef.body.appendChild(textarea);
  textarea.select();
  const copied = documentRef.execCommand?.('copy') === true;
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy failed.');
  return { ok: true, copied: true };
}
