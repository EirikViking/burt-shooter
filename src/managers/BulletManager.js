export class BulletManager {
  constructor(container, onCap) {
    this.container = container;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.maxPlayerBullets = 200;
    this.maxEnemyBullets = 300;
    this.onCap = onCap;
    this.screenWidth = 800;
    this.screenHeight = 600;
    this.updatingEnemyBullets = false;
    this.pendingEnemyBullets = [];
    this.orphanSweepInterval = 120;
    this.framesUntilOrphanSweep = this.orphanSweepInterval;
    this.cleanupDiagnostics = {
      updatePasses: 0,
      disposedPlayer: 0,
      disposedEnemy: 0,
      disposedPending: 0,
      rejectedAtCap: 0,
      orphanSweeps: 0,
      orphanVisualsRemoved: 0,
      clearOperations: 0,
      lastReason: null,
      lastCleanup: null
    };

    // Enable zIndex sorting on container
    this.container.sortableChildren = true;
  }

  setScreenBounds(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  prepareBullet(bullet, kind) {
    if (!bullet) return false;
    bullet.setScreenBounds?.(this.screenWidth, this.screenHeight);
    bullet.__novaManagedProjectile = true;
    bullet.__novaProjectileKind = kind;
    if (bullet.sprite) {
      bullet.sprite.__novaManagedProjectile = true;
      bullet.sprite.__novaProjectileKind = kind;
      bullet.sprite.__novaProjectileOwner = bullet;
      bullet.sprite.label ||= kind === 'player'
        ? 'player_projectile_visual'
        : 'enemy_projectile_visual';
    }
    return true;
  }

  attachBulletVisual(bullet) {
    const sprite = bullet?.sprite;
    if (!sprite || sprite.destroyed || sprite.parent === this.container) return Boolean(sprite && !sprite.destroyed);
    if (sprite.parent) sprite.parent.removeChild(sprite);
    this.container.addChild(sprite);
    return true;
  }

  disposeBullet(bullet, reason = 'inactive', kind = bullet?.__novaProjectileKind || 'unknown') {
    if (!bullet) return false;
    const wasActive = bullet.active !== false;
    bullet.active = false;
    bullet.__novaDisposedReason = reason;
    const sprite = bullet.sprite;
    if (sprite?.parent) sprite.parent.removeChild(sprite);
    if (sprite && !sprite.destroyed) sprite.destroy?.({ children: true });
    if (!bullet.__novaDisposalCounted) {
      bullet.__novaDisposalCounted = true;
      if (kind === 'player') this.cleanupDiagnostics.disposedPlayer += 1;
      else if (kind === 'enemy') this.cleanupDiagnostics.disposedEnemy += 1;
      else if (kind === 'pending') this.cleanupDiagnostics.disposedPending += 1;
    }
    this.cleanupDiagnostics.lastReason = reason;
    return wasActive;
  }

  deactivateBullet(bullet, reason = 'manual_cleanup') {
    return this.disposeBullet(bullet, reason, bullet?.__novaProjectileKind || 'unknown');
  }

  addPlayerBullet(bullet) {
    if (!this.prepareBullet(bullet, 'player')) return false;
    if (this.playerBullets.length >= this.maxPlayerBullets) {
      if (this.onCap) this.onCap('bullets');
      this.cleanupDiagnostics.rejectedAtCap += 1;
      this.disposeBullet(bullet, 'player_cap_rejected', 'player');
      return false;
    }
    this.playerBullets.push(bullet);
    this.attachBulletVisual(bullet);
    return true;
  }

  addEnemyBullet(bullet) {
    if (!this.prepareBullet(bullet, 'enemy')) return false;
    const currentCount = this.enemyBullets.length + this.pendingEnemyBullets.length;
    if (currentCount >= this.maxEnemyBullets) {
      if (this.onCap) this.onCap('bullets');
      this.cleanupDiagnostics.rejectedAtCap += 1;
      this.disposeBullet(bullet, 'enemy_cap_rejected', 'enemy');
      return false;
    }
    if (this.updatingEnemyBullets) {
      this.pendingEnemyBullets.push(bullet);
      return true;
    }
    this.enemyBullets.push(bullet);
    this.attachBulletVisual(bullet);
    return true;
  }

  compactBulletList(list, {
    delta = null,
    kind = 'unknown',
    reason = 'inactive_update'
  } = {}) {
    if (!Array.isArray(list) || list.length === 0) return 0;
    let writeIndex = 0;
    let removed = 0;
    for (let readIndex = 0; readIndex < list.length; readIndex += 1) {
      const bullet = list[readIndex];
      if (!bullet) {
        removed += 1;
        continue;
      }
      if (delta !== null && bullet.active !== false) bullet.update?.(delta);
      if (bullet.active === false || bullet.sprite?.destroyed) {
        this.disposeBullet(bullet, reason, kind);
        removed += 1;
        continue;
      }
      list[writeIndex] = bullet;
      writeIndex += 1;
    }
    list.length = writeIndex;
    return removed;
  }

  flushPendingEnemyBullets() {
    if (!this.pendingEnemyBullets.length) return 0;
    let attached = 0;
    for (const bullet of this.pendingEnemyBullets) {
      if (!bullet || bullet.active === false || bullet.sprite?.destroyed) {
        this.disposeBullet(bullet, 'pending_inactive', 'pending');
        continue;
      }
      bullet.__novaProjectileKind = 'enemy';
      if (bullet.sprite) bullet.sprite.__novaProjectileKind = 'enemy';
      this.enemyBullets.push(bullet);
      this.attachBulletVisual(bullet);
      attached += 1;
    }
    this.pendingEnemyBullets.length = 0;
    return attached;
  }

  pruneInactiveBullets(kind = 'all', reason = 'manual_prune') {
    let removed = 0;
    if (kind === 'all' || kind === 'player') {
      removed += this.compactBulletList(this.playerBullets, { kind: 'player', reason });
    }
    if (kind === 'all' || kind === 'enemy') {
      removed += this.compactBulletList(this.enemyBullets, { kind: 'enemy', reason });
    }
    return removed;
  }

  clearBulletList(list, reason, kind) {
    if (!Array.isArray(list) || list.length === 0) return 0;
    let cleared = 0;
    for (const bullet of list) {
      if (!bullet) continue;
      if (this.disposeBullet(bullet, reason, kind)) cleared += 1;
    }
    list.length = 0;
    return cleared;
  }

  clearPlayerBullets(reason = 'player_cleanup') {
    const cleared = this.clearBulletList(this.playerBullets, reason, 'player');
    this.recordClear(reason, { player: cleared, enemy: 0, pending: 0 });
    return cleared;
  }

  clearEnemyBullets(reason = 'enemy_cleanup') {
    const cleared = this.clearBulletList(this.enemyBullets, reason, 'enemy');
    const pending = this.clearBulletList(this.pendingEnemyBullets, reason, 'pending');
    this.recordClear(reason, { player: 0, enemy: cleared, pending });
    return cleared + pending;
  }

  clearAll(reason = 'projectile_cleanup') {
    const player = this.clearBulletList(this.playerBullets, reason, 'player');
    const enemy = this.clearBulletList(this.enemyBullets, reason, 'enemy');
    const pending = this.clearBulletList(this.pendingEnemyBullets, reason, 'pending');
    this.recordClear(reason, { player, enemy, pending });
    return player + enemy + pending;
  }

  recordClear(reason, counts) {
    this.cleanupDiagnostics.clearOperations += 1;
    this.cleanupDiagnostics.lastReason = reason;
    this.cleanupDiagnostics.lastCleanup = {
      reason,
      ...counts,
      total: (counts.player || 0) + (counts.enemy || 0) + (counts.pending || 0),
      at: Date.now()
    };
  }

  sweepOrphanVisuals(reason = 'periodic_orphan_sweep') {
    const activeSprites = new Set();
    for (const list of [this.playerBullets, this.enemyBullets]) {
      for (const bullet of list) {
        if (bullet?.active !== false && bullet.sprite && !bullet.sprite.destroyed) {
          activeSprites.add(bullet.sprite);
        }
      }
    }
    let removed = 0;
    for (const child of [...(this.container?.children || [])]) {
      if (!child?.__novaManagedProjectile || activeSprites.has(child)) continue;
      if (child.parent) child.parent.removeChild(child);
      if (!child.destroyed) child.destroy?.({ children: true });
      removed += 1;
    }
    this.cleanupDiagnostics.orphanSweeps += 1;
    this.cleanupDiagnostics.orphanVisualsRemoved += removed;
    if (removed > 0) this.cleanupDiagnostics.lastReason = reason;
    return removed;
  }

  update(delta, enemyScale = 1) {
    this.cleanupDiagnostics.updatePasses += 1;
    this.compactBulletList(this.playerBullets, {
      delta,
      kind: 'player',
      reason: 'player_inactive_update'
    });

    this.updatingEnemyBullets = true;
    try {
      this.compactBulletList(this.enemyBullets, {
        delta: delta * enemyScale,
        kind: 'enemy',
        reason: 'enemy_inactive_update'
      });
    } finally {
      this.updatingEnemyBullets = false;
    }
    if (this.pendingEnemyBullets.length) {
      this.flushPendingEnemyBullets();
    }

    this.framesUntilOrphanSweep -= 1;
    if (this.framesUntilOrphanSweep <= 0) {
      this.framesUntilOrphanSweep = this.orphanSweepInterval;
      this.sweepOrphanVisuals();
    }
  }

  setFocusCombatClarity(active) {
    for (const bullet of this.playerBullets) {
      if (bullet?.active !== false) bullet.setFocusCombatClarity?.(active);
    }
  }

  getTotalCount() {
    return this.playerBullets.length + this.enemyBullets.length;
  }

  getDebugState() {
    const managedVisuals = (this.container?.children || [])
      .filter((child) => child?.__novaManagedProjectile && !child.destroyed).length;
    return {
      player: this.playerBullets.length,
      enemy: this.enemyBullets.length,
      pendingEnemy: this.pendingEnemyBullets.length,
      managedVisuals,
      inPlaceCompaction: true,
      orphanSweepInterval: this.orphanSweepInterval,
      framesUntilOrphanSweep: this.framesUntilOrphanSweep,
      ...this.cleanupDiagnostics,
      lastCleanup: this.cleanupDiagnostics.lastCleanup
        ? { ...this.cleanupDiagnostics.lastCleanup }
        : null
    };
  }
}
