import QRCode from 'qrcode';
import './enjinEdition.css';
import { AudioManager } from '../audio/AudioManager.js';
import { createVaultRunGate, VAULT_RUN_TARGET } from './vaultRunGate.js';
import {
  DEFAULT_CAMPAIGN,
  finishRun,
  getCampaign,
  getCompletionStatus,
  getReward,
  markRewardOpened,
  startRun
} from './api.js';
import { getSteamUrl, openSteam } from './steamLink.js';

const COLLECTION_URL = DEFAULT_CAMPAIGN.collectionUrl;
const ENJIN_RUN_MODE = 'ranked_tactical';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export class EnjinEditionController {
  constructor({ game, app, buildId = 'dev', gitSha = 'unknown' }) {
    this.game = game;
    this.app = app;
    this.buildId = buildId;
    this.gitSha = gitSha;
    this.campaign = { ...DEFAULT_CAMPAIGN };
    this.root = null;
    this.mode = 'menu';
    this.run = null;
    this.gate = null;
    this.reward = null;
    this.completed = false;
    this.inventoryEmpty = false;
    this.restoring = true;
    this.startedAt = 0;
    this.fullscreen = {
      requested: false,
      active: false,
      error: null
    };
    this.tickTimer = null;
    this.boundKeydown = (event) => this.handleKeydown(event);
    this.boundFullscreenGesture = () => {
      if (this.completed || this.mode === 'complete' || document.fullscreenElement) return;
      this.requestFullscreenForRun();
    };
  }

  requestFullscreenForRun() {
    if (typeof document === 'undefined') return false;
    if (document.fullscreenElement) {
      this.fullscreen.requested = true;
      this.fullscreen.active = true;
      this.fullscreen.error = null;
      return true;
    }
    if (this.fullscreen.requested && !this.fullscreen.error) return true;

    const root = document.documentElement;
    if (typeof root?.requestFullscreen !== 'function') {
      this.fullscreen.error = 'fullscreen_unavailable';
      return false;
    }

    this.fullscreen.requested = true;
    this.fullscreen.error = null;
    try {
      // This method is called directly from the Mayhem Tactical pointer event.
      // Keeping the browser request in that gesture is required by the Fullscreen API.
      Promise.resolve(root.requestFullscreen())
        .then(() => {
          this.fullscreen.active = Boolean(document.fullscreenElement);
        })
        .catch((error) => {
          this.fullscreen.active = false;
          this.fullscreen.error = error?.name || 'fullscreen_request_rejected';
        });
    } catch (error) {
      this.fullscreen.active = false;
      this.fullscreen.error = error?.name || 'fullscreen_request_failed';
    }
    return true;
  }

  async mount() {
    document.body.dataset.enjinEdition = '1';
    document.title = 'Nova Swarm: Web3 Arcade | Eirik The Viking Vault Run';
    this.campaign = await getCampaign();
    this.game.enjinEditionModeLocked = ENJIN_RUN_MODE;
    this.game.enjinEditionController = this;
    this.game.scenes?.menu?.setEnjinEditionMode?.(true);
    this.root = document.createElement('div');
    this.root.id = 'enjin-shell';
    document.getElementById('game-container')?.appendChild(this.root);
    this.root.addEventListener('click', (event) => this.handleClick(event));
    window.addEventListener('keydown', this.boundKeydown, true);
    window.addEventListener('pointerdown', this.boundFullscreenGesture, true);
    this.renderMainMenu();

    const status = await getCompletionStatus();
    this.completed = Boolean(status?.completed);
    this.restoring = false;
    if (this.completed) {
      this.mode = 'complete';
      this.reward = await getReward();
      this.inventoryEmpty = !this.reward;
      this.renderCompletion();
    } else {
      this.mode = 'menu';
      this.renderMainMenu();
    }

    this.tickTimer = window.setInterval(() => this.tick(), 100);
    const previousRenderer = window.render_game_to_text;
    if (typeof previousRenderer === 'function') {
      window.render_game_to_text = () => {
        let base = {};
        try { base = JSON.parse(previousRenderer()); } catch { /* keep empty */ }
        return JSON.stringify({
          ...base,
          enjin: {
            edition: 'enjin',
            mode: this.mode,
            score: Math.min(VAULT_RUN_TARGET, Math.max(0, Number(this.game.score) || 0)),
            target: VAULT_RUN_TARGET,
            frozen: Boolean(this.gate?.frozen),
            completed: this.completed,
            inventoryEmpty: this.inventoryEmpty
          }
        });
      };
    }
    window.__enjinMvp = this;
    return this;
  }

  destroy() {
    if (this.tickTimer) window.clearInterval(this.tickTimer);
    window.removeEventListener('keydown', this.boundKeydown, true);
    window.removeEventListener('pointerdown', this.boundFullscreenGesture, true);
    this.root?.remove();
    if (this.game?.scoreGate === this.gate) this.game.scoreGate = null;
    if (this.game?.enjinEditionModeLocked === ENJIN_RUN_MODE) {
      this.game.enjinEditionModeLocked = null;
      this.game.scenes?.menu?.setEnjinEditionMode?.(false);
    }
    if (this.game?.enjinEditionController === this) this.game.enjinEditionController = null;
  }

  handleKeydown(event) {
    if (this.mode === 'validating' || this.mode === 'complete') {
      if (!['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) event.preventDefault();
    }
  }

  handleClick(event) {
    const target = event.target.closest?.('[data-enjin-action]');
    if (!target) return;
    const action = target.dataset.enjinAction;
    if (action === 'start' || action === 'retry') {
      this.beginRun();
    } else if (action === 'steam') {
      openSteam(target.dataset.placement || 'vault_complete');
    } else if (action === 'open-claim') {
      this.openClaim();
    } else if (action === 'copy-claim') {
      this.copyClaim();
    } else if (action === 'terms' || action === 'privacy') {
      this.showModal(action);
    } else if (action === 'close-modal') {
      this.closeModal();
    }
  }

  async beginRun() {
    if (this.completed || this.mode === 'starting' || this.mode === 'playing' || this.mode === 'validating') return false;
    this.mode = 'starting';
    this.renderValidation('CALIBRATING VAULT RUN');
    this.run = await startRun({ buildId: this.buildId });
    if (this.run?.unavailable) {
      this.mode = 'menu';
      this.renderMainMenu('Vault validation is temporarily unavailable. Please try again.');
      return false;
    }
    this.gate = createVaultRunGate({
      target: VAULT_RUN_TARGET,
      onReached: (snapshot) => this.handleGateReached(snapshot)
    });
    this.game.scoreGate = this.gate;
    this.game.enjinEditionModeLocked = ENJIN_RUN_MODE;
    const started = await this.game.startGame(undefined, {
      runMode: ENJIN_RUN_MODE,
      countShipUsage: false
    });
    if (!started) {
      this.mode = 'menu';
      this.renderMainMenu('The Vault Run could not start. Try again.');
      return false;
    }
    this.startedAt = Date.now();
    this.mode = 'playing';
    this.renderPlaying();
    return true;
  }

  tick() {
    if (!this.root) return;
    if (this.mode === 'playing') {
      const score = Math.min(VAULT_RUN_TARGET, Math.max(0, Number(this.game.score) || 0));
      const scoreEl = this.root.querySelector('[data-enjin-score]');
      const progressEl = this.root.querySelector('[data-enjin-progress]');
      if (scoreEl) scoreEl.textContent = score.toLocaleString('en-US');
      if (progressEl) progressEl.style.width = `${Math.min(100, (score / VAULT_RUN_TARGET) * 100)}%`;
      if (this.game.currentSceneName === 'gameOver' && !this.gate?.completed) {
        this.showFailure(score);
      }
    }
  }

  async handleGateReached(snapshot) {
    if (this.mode === 'validating' || this.completed) return;
    this.mode = 'validating';
    this.renderValidation('30,000 REACHED', snapshot);
    AudioManager.playSfx?.('nova_highscore_chime', { force: true, volume: 0.8, minIntervalMs: 0 });
    const result = await finishRun({
      runId: this.run?.runId || 'mock-run',
      ticket: this.run?.ticket || 'mock-ticket',
      buildId: this.buildId,
      rawCrossingScore: snapshot.rawCrossingScore,
      elapsedMs: Math.max(0, Date.now() - this.startedAt),
      sector: this.game.level,
      kills: this.game.totalKills,
      lives: this.game.lives
    });
    this.completed = true;
    this.inventoryEmpty = result?.status === 'inventory_empty' || !result?.reward;
    this.reward = result?.reward || null;
    this.mode = 'complete';
    this.renderCompletion();
  }

  showFailure(score = this.game.score) {
    if (this.completed || this.mode === 'validating' || this.mode === 'complete') return;
    this.mode = 'failed';
    const remaining = Math.max(0, VAULT_RUN_TARGET - Math.floor(Number(score) || 0));
    this.renderFailure(remaining);
  }

  renderLanding(message = '') {
    this.root.className = 'enjin-shell mode-landing';
    this.root.innerHTML = `
      <section class="enjin-screen enjin-landing-screen" aria-labelledby="enjin-title">
        <div class="enjin-hero-grid">
          <div class="enjin-hero-copy">
            <div class="enjin-kicker">NOVA SWARM: WEB3 ARCADE</div>
            <h1 class="enjin-title" id="enjin-title">EIRIK THE VIKING<br>VAULT RUN</h1>
            <p class="enjin-campaign">SCORE 30,000.<br>CLAIM A FREE ENJIN NFT.</p>
            <p class="enjin-copy">Play the Vault Run free in your browser. Reach 30,000 in a validated run and unlock one collectible from the Eirik The Viking collection, while verified rewards remain.</p>
            <div class="enjin-hero-promise" aria-label="Web edition benefits">
              <span>NO WALLET</span><span>FREE TO PLAY</span><span>ONE SCORE GATE</span>
            </div>
          </div>
          <aside class="enjin-vault-panel" aria-label="Eirik The Viking reward preview">
            <div class="enjin-vault-panel-art"><img src="/art/enjin/eirik-viking-mystery-cover.png" alt="Eirik The Viking mystery collectible preview"></div>
            <div class="enjin-vault-panel-copy">
              <div class="enjin-panel-kicker">LIMITED WEB3 DROP</div>
              <h2>THE EIRIK VAULT</h2>
              <p>Beat the gate and unlock one mystery collectible while the verified Beam supply lasts.</p>
              <div class="enjin-panel-meta"><span>FREE CLAIM</span><span>ENJIN BEAM</span></div>
            </div>
          </aside>
        </div>
        <div class="enjin-actions enjin-hero-actions">
          <button class="enjin-button" data-enjin-action="start">START FREE VAULT RUN</button>
          <button class="enjin-button secondary" data-enjin-action="steam" data-placement="landing">PLAY THE FULL GAME ON STEAM</button>
        </div>
        <div class="enjin-mode-lock" aria-label="Web edition game mode">
          <div class="enjin-mode-card active">
            <div class="enjin-mode-glyph">MT</div>
            <div>
              <div class="enjin-mode-title">MAYHEM TACTICAL</div>
              <div class="enjin-mode-meta">MAIN MODE · RECOMMENDED · RANKED</div>
              <div class="enjin-mode-note">ENABLED FOR THIS WEB EDITION</div>
            </div>
          </div>
          <div class="enjin-mode-card disabled" aria-disabled="true">
            <div class="enjin-mode-glyph">MP</div>
            <div>
              <div class="enjin-mode-title">MAYHEM PURE</div>
              <div class="enjin-mode-meta">STEAM BUILD ONLY</div>
            </div>
          </div>
          <div class="enjin-mode-card disabled" aria-disabled="true">
            <div class="enjin-mode-glyph">+</div>
            <div>
              <div class="enjin-mode-title">MORE MODES</div>
              <div class="enjin-mode-meta">STEAM BUILD ONLY</div>
            </div>
          </div>
        </div>
        <p class="enjin-mode-locked-copy">WEB EDITION MODE LOCKED TO MAYHEM TACTICAL. MORE MODES CONTINUE ON STEAM.</p>
        <div class="enjin-steam-bridge" aria-label="Full game invitation">
          <div>
            <div class="enjin-panel-kicker">THE WEB RUN IS THE HOOK</div>
            <strong>THE FULL SWARM CONTINUES ON STEAM.</strong>
            <span>More modes · more sectors · more ships.</span>
          </div>
          <div class="enjin-steam-badge">STEAM EDITION</div>
        </div>
        <div class="enjin-badges">
          <span class="enjin-badge">NO PURCHASE NECESSARY</span>
          <span class="enjin-badge">NFT CLAIMS DELIVERED THROUGH ENJIN BEAM</span>
        </div>
        <p class="enjin-disclaimer">Free digital collectible. No market, resale, exchange, melt, or future value is promised.<br>Independent TinyFoundry promotion using Enjin technology. Not affiliated with or endorsed by Enjin.</p>
        ${message ? `<p class="enjin-validation">${escapeHtml(message)}</p>` : ''}
        <div class="enjin-footer-links"><button class="enjin-link" data-enjin-action="terms">Terms</button><button class="enjin-link" data-enjin-action="privacy">Privacy</button></div>
      </section>`;
  }

  renderMainMenu(message = '') {
    this.root.className = 'enjin-shell mode-menu';
    this.root.innerHTML = message
      ? `<div class="enjin-menu-notice" role="status">${escapeHtml(message)}</div>`
      : '';
  }

  renderPlaying() {
    this.root.className = 'enjin-shell mode-playing';
    this.root.innerHTML = `
      <div class="enjin-playing" aria-live="polite">
        <div class="enjin-hud">
          <div class="enjin-label">VAULT SCORE</div>
          <div class="enjin-hud-score"><span data-enjin-score>0</span> / 30,000</div>
          <div class="enjin-progress" aria-hidden="true"><span data-enjin-progress></span></div>
          <div class="enjin-hud-status">Mayhem Tactical · Reach the gate. The run ends there.</div>
        </div>
      </div>`;
  }

  renderValidation(label = 'VALIDATING VAULT RUN', snapshot = null) {
    this.root.className = 'enjin-shell mode-validating';
    this.root.innerHTML = `
      <section class="enjin-screen">
        <div class="enjin-card">
          <div class="enjin-kicker">EIRIK THE VIKING VAULT RUN</div>
          <div class="enjin-validation">${escapeHtml(label)}</div>
          <h2>${snapshot ? 'THE SCORE GATE IS LOCKED' : 'PREPARING THE ARCADE'}</h2>
          <p>${snapshot ? 'Gameplay is permanently stopped at exactly 30,000 while the free claim is validated.' : 'No wallet connection is needed. Your browser is ready for a free run.'}</p>
        </div>
      </section>`;
  }

  renderFailure(remaining) {
    this.root.className = 'enjin-shell mode-failed';
    this.root.innerHTML = `
      <section class="enjin-screen">
        <div class="enjin-card">
          <div class="enjin-kicker">EIRIK THE VIKING VAULT RUN</div>
          <h2>VAULT RUN FAILED</h2>
          <p>${remaining.toLocaleString('en-US')} POINTS FROM THE VAULT</p>
          <div class="enjin-actions">
            <button class="enjin-button" data-enjin-action="retry">TRY AGAIN</button>
            <button class="enjin-button secondary" data-enjin-action="steam" data-placement="gameover">GET THE FULL GAME ON STEAM</button>
          </div>
          <p class="enjin-disclaimer">The web run is a free taste of the full Nova Swarm score chase. Your next run continues on Steam.</p>
        </div>
      </section>`;
  }

  renderCompletion() {
    this.root.className = 'enjin-shell mode-complete';
    const rewardMarkup = this.reward ? `
      <div class="enjin-reward">
        <div class="enjin-mystery-art" data-enjin-mystery-art>
          <img src="/art/enjin/eirik-viking-mystery-cover.png" alt="Eirik The Viking mystery collectible card">
        </div>
        <div>
          <h3>YOUR EIRIK THE VIKING NFT IS READY</h3>
          <div class="enjin-reward-meta">${escapeHtml(this.reward.tokenName || 'Eirik The Viking Mystery Pilot')}<br>Eirik The Viking collection<br>Enjin Matrix</div>
          ${this.reward.mock ? '<div class="enjin-mock-note">MOCK ENJIN CLAIM · NO NFT WILL BE TRANSFERRED</div>' : ''}
          <div class="enjin-actions">
            <button class="enjin-button pink" data-enjin-action="open-claim">CLAIM YOUR FREE ENJIN NFT</button>
            <button class="enjin-button secondary" data-enjin-action="copy-claim">COPY CLAIM LINK</button>
          </div>
          <div class="enjin-qr-label">SCAN ON DESKTOP · OPEN BUTTON ON MOBILE</div>
          <div class="enjin-qr" data-enjin-qr aria-label="Local claim QR code"></div>
        </div>
      </div>` : `
      <p class="enjin-disclaimer"><strong>THE CURRENT NFT DROP IS EMPTY</strong><br>You reached the end of the free Web3 edition, but no verified claim remains in this preview inventory.</p>`;
    this.root.innerHTML = `
      <section class="enjin-screen enjin-completion-screen">
        <div class="enjin-card">
          <div class="enjin-kicker">30,000 REACHED · VALIDATED VAULT RUN</div>
          <h2>VAULT RUN COMPLETE</h2>
          <p class="enjin-completion-headline">THE FREE WEB3 EDITION ENDS AT 30,000</p>
          <p class="enjin-completion-subcopy">YOU BEAT THE WEB GATE. THE FULL SWARM DOESN'T STOP HERE.</p>
          <div class="enjin-steam-bridge enjin-steam-bridge-complete">
            <div>
              <div class="enjin-panel-kicker">YOUR NEXT RUN STARTS ON STEAM</div>
              <strong>MORE MODES. MORE SECTORS. MORE SWARM.</strong>
              <span>The web edition was the hook. The full Nova Swarm experience keeps going.</span>
            </div>
          <button class="enjin-button enjin-steam-bridge-cta" data-enjin-action="steam" data-placement="vault_complete">CONTINUE BEYOND 30,000 ON STEAM</button>
          </div>
          ${rewardMarkup}
          <div class="enjin-actions">
            ${this.reward ? '<button class="enjin-button enjin-mobile-only" data-enjin-action="open-claim">OPEN ENJIN CLAIM</button>' : ''}
            <a class="enjin-button secondary" href="${COLLECTION_URL}" target="_blank" rel="noopener noreferrer">VIEW EIRIK THE VIKING COLLECTION</a>
          </div>
          <p class="enjin-disclaimer">The Beam system remains authoritative for final redemption. This collectible provides no gameplay advantage and is not promised to work in Steam.</p>
        </div>
      </section>`;
    if (this.reward) this.renderQr();
  }

  async renderQr() {
    const container = this.root.querySelector('[data-enjin-qr]');
    if (!container || !this.reward?.claimUrl) return;
    try {
      const svg = await QRCode.toString(this.reward.claimUrl, {
        type: 'svg',
        margin: 1,
        color: { dark: '#07101e', light: '#ffffff' }
      });
      if (this.mode === 'complete') container.innerHTML = svg;
    } catch {
      container.textContent = 'QR unavailable';
    }
  }

  async openClaim() {
    if (!this.reward?.claimUrl) return;
    await markRewardOpened(this.reward.assignmentId);
    this.reward.status = 'CLAIM OPENED';
    window.open(this.reward.claimUrl, '_blank', 'noopener,noreferrer');
    const note = this.root.querySelector('.enjin-mock-note');
    if (note && !this.reward.mock) note.textContent = 'CLAIM OPENED';
  }

  async copyClaim() {
    if (!this.reward?.claimUrl) return;
    try {
      await navigator.clipboard.writeText(this.reward.claimUrl);
      const button = this.root.querySelector('[data-enjin-action="copy-claim"]');
      if (button) button.textContent = 'CLAIM LINK COPIED';
    } catch {
      // Do not expose a bearer link in a visible fallback or log.
    }
  }

  showModal(kind) {
    const title = kind === 'terms' ? 'Vault Run Terms' : 'Vault Run Privacy';
    const body = kind === 'terms'
      ? 'No purchase is necessary. Browser play is free, and the qualifying score is exactly 30,000. Gameplay ends at 30,000 and a run must pass server validation. One reward is allowed per campaign identity while verified inventory remains. Rewards come only from the Eirik The Viking collection and are free digital collectibles with no promised market, resale, exchange, melt, or future value. TinyFoundry operates this independent promotion; it is not officially endorsed by Enjin. Void where prohibited.'
      : 'This preview uses an anonymous campaign cookie, run score and timing, compact gameplay telemetry, and eligibility records to protect the one-reward limit. We do not request wallets, private keys, recovery phrases, or raw IP addresses. Privacy-preserving abuse signals may be hashed server-side.';
    const modal = document.createElement('div');
    modal.className = 'enjin-modal';
    modal.innerHTML = `<div class="enjin-modal-card" role="dialog" aria-modal="true" aria-labelledby="enjin-modal-title"><h2 id="enjin-modal-title">${title}</h2><p>${body}</p><button class="enjin-button" data-enjin-action="close-modal">CLOSE</button></div>`;
    this.root.appendChild(modal);
  }

  closeModal() {
    this.root.querySelector('.enjin-modal')?.remove();
  }

  // Local-only proof hooks used by the MVP smoke test. They never mint,
  // reserve, or reveal a real claim URL.
  async debugCompleteForTest() {
    if (this.mode !== 'playing') await this.beginRun();
    if (!this.gate) return false;
    this.game.score = VAULT_RUN_TARGET - 50;
    this.gate.score = VAULT_RUN_TARGET - 50;
    this.game.addScore(VAULT_RUN_TARGET * 2, 'mvp_test_crossing');
    return true;
  }

  debugFailForTest() {
    if (!this.gate) return false;
    this.game.gameOver({ fromInterlude: true });
    this.showFailure(this.game.score);
    return true;
  }

  debugState() {
    return {
      mode: this.mode,
      score: Math.min(VAULT_RUN_TARGET, Math.max(0, Number(this.game.score) || 0)),
      target: VAULT_RUN_TARGET,
      frozen: Boolean(this.gate?.frozen),
      completed: this.completed,
      inventoryEmpty: this.inventoryEmpty,
      runMode: this.game.runMode,
      modeLock: ENJIN_RUN_MODE,
      fullscreenRequested: this.fullscreen.requested,
      fullscreenActive: this.fullscreen.active,
      fullscreenError: this.fullscreen.error,
      steamUrl: getSteamUrl('vault_complete')
    };
  }
}

export async function mountEnjinEdition(options) {
  const controller = new EnjinEditionController(options);
  await controller.mount();
  return controller;
}
