import { mysteryAdmission, recordMysteryArrival } from '../config/EncounterPacing.js';
import { planMysteryLevel, isMysteryWaveEligible, getMystery } from '../config/Mysteries.js';
import { createMysteryEncounter } from '../entities/mysteries/createMysteryEncounter.js';
import { requestMysteryAnnouncement, updateMysteryAnnouncement, cancelMysteryAnnouncement } from '../audio/MysteryAnnouncer.js';
import { MysteryAudio } from '../audio/MysteryAudio.js';

// One seeded visitor per level, alongside the authored wave, snake or boss.
// The trusted tour queues the same actors through the ordinary wave lifecycle.
export class MysteryEncounterDirector {
  constructor(manager) { this.manager = manager; this.epoch = 0; this.pending = null; this.active = null; this.plan = null; }
  startLevel() {
    this.cancel();
    const m = this.manager, g = m.game;
    const directId = g.encounterTest?.mysteryId;
    if (directId) {
      // A practice selector still starts from a real authored wave. The
      // mystery is armed only after that lead-in clears, so the test exercises
      // ordinary movement, damage, cooldowns and transition pacing first.
      const authored = m.waves.filter(wave => isMysteryWaveEligible(wave, g) && wave.type !== 'BOSS');
      if (!authored.length) throw new Error('Mystery practice requires an authored combat wave');
      const leadIn = { ...authored[0] };
      delete leadIn.mysteryId;
      const ids = g.encounterTest.mysteryIds || [directId];
      m.waves = [leadIn, ...ids.map((id, index) => ({ ...authored[index % authored.length], mysteryId: id }))];
      m.normalWavesTotal = m.waves.length; m.bossWaveIndex = m.normalWavesTotal;
      this.plan = { selected: true, sector: m.level, id: directId, waveIndex: 1, delaySeconds: 2, direct: true,
        ids: [...ids], completed: [],
        leadInRequired: true, leadInCleared: false };
    } else {
      this.plan = planMysteryLevel({ sector: m.level, seed: g.contentDirector?.seed ?? g.gameId,
        waves: [...m.waves, { type: 'BOSS' }], game: g, seen: g.mysteriesSeen || [], recent: g.mysteriesRecent || [] });
      if (this.plan.selected && this.plan.waveIndex < m.waves.length) m.waves[this.plan.waveIndex].mysteryId = this.plan.id;
    }
    (g.mysteryScheduleLog ||= []).push(this.plan);
    if (g.mysteryScheduleLog.length > 120) g.mysteryScheduleLog.shift();
  }
  get busy() { return Boolean(this.pending || this.active?.active); }
  protectsUpcomingWaves() {
    const m = this.manager;
    return this.busy || Boolean(this.plan?.selected && !this.plan.consumed
      && m.waves.slice(m.currentWaveIndex, m.currentWaveIndex + 4).some(wave => wave.mysteryId));
  }
  tryStart(config) {
    const m = this.manager, g = m.game, p = g.scenes.play;
    if (this.plan?.deferred && !this.plan.direct && !this.plan.spawned && !this.busy
      && config.type !== 'BOSS' && isMysteryWaveEligible(config, g) && !mysteryAdmission(m, this.plan)) {
      config.mysteryId = this.plan.id; this.plan.deferred = null; this.plan.consumed = false;
    }
    if (!config.mysteryId || !this.plan?.selected || this.plan.consumed || config.skipMystery
      || (!this.plan.direct && !isMysteryWaveEligible(config, g))) return false;
    if (this.plan.direct && this.plan.leadInRequired && m.currentWaveIndex < 1) return false;
    if (this.busy || config.mysteryId !== this.plan.id) return false;
    const blocked = mysteryAdmission(m, this.plan);
    if (blocked) { this.plan.deferred = blocked; return false; }
    if (this.plan.direct) this.plan.leadInCleared = true;
    this.plan.consumed = true;
    const epoch = ++this.epoch;
    const recovery = Math.max(0, 4.2 - (Date.now() - (p.lastHitAt || 0)) / 1000);
    const pending = this.pending = { id: config.mysteryId, config, ready: null, error: null,
      age: 0, announcement:requestMysteryAnnouncement(config.mysteryId), delay: Math.max(recovery, this.plan.delaySeconds), epoch };
    void MysteryAudio.prepare(getMystery(pending.id));
    void createMysteryEncounter(m, pending.id, { attach: false,
      valid: () => this.epoch === epoch && this.pending === pending && m.level === this.plan?.sector
    }).then(enemy => {
      if (this.epoch !== epoch || this.pending !== pending) { enemy?.destroy(); return; }
      pending.ready = enemy;
    }).catch(error => { if (this.pending === pending) pending.error = error; });
    return false; // Continue spawning the real wave, including its snake roll.
  }
  update(delta) {
    const m = this.manager, pending = this.pending;
    if (pending) {
      const blocked = mysteryAdmission(m, this.plan);
      if (blocked) { this.cancel(); this.plan.consumed = false; this.plan.deferred = blocked; return; }
      pending.age += Math.min(.1, Math.max(0, delta / 60));
      if (pending.error || (!pending.ready && pending.age > 10) || pending.age > 45) {
        console.warn('[Mystery] Arrival canceled', pending.id, pending.error?.message || 'asset timeout');
        this.cancel(); this.plan.failed = true;
        if (this.plan.direct) m.state = 'MYSTERY_TEST_COMPLETE';
        return;
      }
      if (pending.ready && pending.age >= pending.delay && updateMysteryAnnouncement(pending.announcement,Math.min(.1,Math.max(0,delta/60)))) {
        this.pending = null; this.active = pending.ready;
        this.active.attach();
        if (!this.plan.direct) recordMysteryArrival(m.game, m.level, this.plan.id);
        this.plan.spawned = true;
      }
    }
    if (this.active && !this.active.active) {
      this.plan.outcome = this.active.stats.outcome;
      this.active = null;
      if (this.plan.direct) {
        this.plan.completed.push({ id: this.plan.id, outcome: this.plan.outcome });
        if (this.plan.completed.length < this.plan.ids.length) {
          this.plan.id = this.plan.ids[this.plan.completed.length];
          this.plan.waveIndex++; this.plan.consumed = false; this.plan.spawned = false;
        }
      }
    }
  }
  cancel() {
    ++this.epoch;
    cancelMysteryAnnouncement(this.pending?.announcement);
    this.pending?.ready?.destroy(); this.pending = null;
    this.active?.destroy(); this.active = null;
  }
}
