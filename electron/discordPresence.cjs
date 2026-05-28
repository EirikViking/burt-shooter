const DEFAULT_UPDATE_INTERVAL_MS = 15000;
const DEFAULT_RECONNECT_INTERVAL_MS = 60000;
const DISCORD_SNOWFLAKE_RE = /^\d{17,22}$/;

function isValidDiscordClientId(clientId) {
  return DISCORD_SNOWFLAKE_RE.test(String(clientId || '').trim());
}

function normalizeScene(scene) {
  return String(scene || '').trim();
}

function buildDiscordActivity(textState = {}, options = {}) {
  const scene = normalizeScene(textState.scene);
  const startTimestamp = options.startTimestamp || Date.now();
  const largeImageKey = String(options.largeImageKey || '').trim();
  const activity = {
    details: 'Arcade patrol',
    state: 'In the menu',
    startTimestamp,
    instance: false
  };

  if (scene === 'play') {
    const level = Math.max(1, Math.floor(Number(textState.level) || Number(textState.wave?.level) || 1));
    activity.state = `Sector ${level}`;
  } else if (scene === 'gameOver') {
    activity.state = 'Game over';
  } else if (scene === 'highscore') {
    activity.state = 'Viewing leaderboard';
  } else if (scene === 'shipSelect' || scene === 'shipDetails') {
    activity.state = 'In the hangar';
  } else if (scene === 'achievements') {
    activity.state = 'Checking achievements';
  } else if (scene === 'threatCodex') {
    activity.state = 'Reading threat intel';
  }

  if (largeImageKey) {
    activity.largeImageKey = largeImageKey;
    activity.largeImageText = 'Nova Swarm';
  }

  return activity;
}

function safeErrorMessage(error) {
  return error?.message || String(error);
}

function createDiscordPresence({
  clientId,
  enabled = true,
  largeImageKey = '',
  logger = console,
  readTextState,
  updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS,
  reconnectIntervalMs = DEFAULT_RECONNECT_INTERVAL_MS
} = {}) {
  const normalizedClientId = String(clientId || '').trim();
  const startTimestamp = Date.now();
  let DiscordRPC = null;
  let client = null;
  let connected = false;
  let stopped = false;
  let updateTimer = null;
  let reconnectTimer = null;
  let lastActivitySignature = '';

  const status = {
    enabled: Boolean(enabled),
    configured: isValidDiscordClientId(normalizedClientId),
    connected: false,
    lastError: null,
    lastActivity: null
  };

  function clearTimers() {
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer || !status.enabled || !status.configured) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect().catch(() => {});
    }, reconnectIntervalMs);
    reconnectTimer.unref?.();
  }

  function scheduleUpdate(delay = updateIntervalMs) {
    if (stopped || updateTimer || !connected) return;
    updateTimer = setTimeout(() => {
      updateTimer = null;
      updateActivity().catch((error) => {
        status.lastError = safeErrorMessage(error);
        logger.warn?.(`[DiscordPresence] update failed: ${status.lastError}`);
      });
    }, delay);
    updateTimer.unref?.();
  }

  async function updateActivity() {
    if (stopped || !client || !connected) return;
    const textState = typeof readTextState === 'function' ? await readTextState() : {};
    const activity = buildDiscordActivity(textState || {}, { startTimestamp, largeImageKey });
    const signature = JSON.stringify(activity);
    if (signature !== lastActivitySignature) {
      await client.setActivity(activity);
      lastActivitySignature = signature;
      status.lastActivity = activity;
    }
    scheduleUpdate();
  }

  async function connect() {
    if (stopped || connected || !status.enabled || !status.configured) return status;
    try {
      if (!DiscordRPC) DiscordRPC = require('discord-rpc');
      DiscordRPC.register(normalizedClientId);
      client = new DiscordRPC.Client({ transport: 'ipc' });
      client.on('disconnected', () => {
        connected = false;
        status.connected = false;
        clearTimers();
        scheduleReconnect();
      });
      await client.login({ clientId: normalizedClientId });
      connected = true;
      status.connected = true;
      status.lastError = null;
      await updateActivity();
      logger.info?.('[DiscordPresence] connected');
    } catch (error) {
      connected = false;
      status.connected = false;
      status.lastError = safeErrorMessage(error);
      logger.warn?.(`[DiscordPresence] disabled until Discord is available: ${status.lastError}`);
      try {
        await client?.destroy?.();
      } catch {}
      client = null;
      scheduleReconnect();
    }
    return status;
  }

  return {
    start() {
      if (!status.enabled) {
        status.lastError = 'disabled by config';
        return status;
      }
      if (!status.configured) {
        status.lastError = 'missing NOVA_SWARM_DISCORD_CLIENT_ID';
        logger.info?.('[DiscordPresence] skipped: missing Discord Application Client ID');
        return status;
      }
      connect().catch(() => {});
      return status;
    },
    async stop() {
      stopped = true;
      clearTimers();
      connected = false;
      status.connected = false;
      try {
        await client?.clearActivity?.();
      } catch {}
      try {
        await client?.destroy?.();
      } catch {}
      client = null;
      return status;
    },
    getStatus() {
      return { ...status };
    }
  };
}

module.exports = {
  buildDiscordActivity,
  createDiscordPresence,
  isValidDiscordClientId
};
