import { mysteryAdmission, recordMysteryArrival } from '../config/EncounterPacing.js';
import { planMysteryLevel, isMysteryWaveEligible, getMystery } from '../config/Mysteries.js';
import { createMysteryEncounter } from '../entities/mysteries/createMysteryEncounter.js';
import { requestMysteryAnnouncement, updateMysteryAnnouncement, cancelMysteryAnnouncement } from '../audio/MysteryAnnouncer.js';
import { MysteryAudio } from '../audio/MysteryAudio.js';
import { SPACE_SNAKES } from '../config/SpaceSnakes.js';

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
  isCurrentPlan() {
    return this.manager.isCurrentSector(this.plan?.sector)
      && (this.plan?.direct || (this.manager.level >= 11
        && getMystery(this.plan?.id)?.unlockSector <= this.manager.level));
  }
  protectsUpcomingWaves() {
    const m = this.manager;
    return this.busy || Boolean(this.plan?.selected && !this.plan.consumed
      && m.waves.slice(m.currentWaveIndex, m.currentWaveIndex + 4).some(wave => wave.mysteryId));
  }
  tryStart(config) {
    const m = this.manager, g = m.game, p = g.scenes.play;
    if (!this.isCurrentPlan()) { this.cancel(); return false; }
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
    // A revisit may replace the entire ordinary wave with one shared-budget
    // interaction. First contact and standalone Molt must already have occurred
    // in this run. No persistent profile history grants combat advantages.
    this.plan.crossover = this.plan.id==='carrion_weaver'&&!this.plan.bossWave
      && m.level>=16&&(g.mysteriesSeen||[]).includes('carrion_weaver')
      && Number.isFinite(m.lastMoltEligibleWave)
      && m.level-(g.lastReassemblyCrossoverSector??-99)>=8;
    const epoch = ++this.epoch;
    const recovery = Math.max(0, 4.2 - (Date.now() - (p.lastHitAt || 0)) / 1000);
    const pending = this.pending = { id: config.mysteryId, config, ready: null, error: null,
      age: 0, announcement:requestMysteryAnnouncement(config.mysteryId), delay: Math.max(recovery, this.plan.delaySeconds), epoch };
    void MysteryAudio.prepare(getMystery(pending.id));
    void createMysteryEncounter(m, pending.id, { attach: false,
      valid: () => this.epoch === epoch && this.pending === pending && this.isCurrentPlan()
    }).then(enemy => {
      if (this.epoch !== epoch || this.pending !== pending) { enemy?.destroy(); return; }
      pending.ready = enemy;
    }).catch(error => { if (this.pending === pending) pending.error = error; });
    return Boolean(this.plan.crossover); // Curated interaction replaces the wave.
  }
  update(delta) {
    if (!this.isCurrentPlan()) { if (this.busy) this.cancel(); return; }
    const m = this.manager, g=m.game, pending = this.pending;
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
        if(this.plan.crossover){
          const chain=m.spawnSpaceSnake(SPACE_SNAKES[0],{molt:true,curatedReassembly:true,healthScalar:.65,count:5});
          m.curatedReassemblyMolt=chain?.molt||null;
          this.active=pending.ready;
          if(chain?.molt){
            const total=chain.sections.reduce((n,e)=>n+e.maxHealth,0)/.65;
            pending.ready.health=pending.ready.maxHealth=total*.35;
            pending.ready.crossoverMolt=chain.molt;
            g.scenes.play.recordThreatDiscovery?.('encounter_crossover','enemies',{sector:m.level},{scoreBonus:false,silent:true});
            pending.ready.definition.escapeSeconds=30;
            g.lastReassemblyCrossoverSector=m.level;
          }
        }
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
