import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Real player projectiles, collision, enemy movement and attack warnings at
// wall-clock speed. The offense probe ignores player damage explicitly; the
// survival probes use normal lives and invulnerability rules.
const out = process.env.CHECK_OUTPUT_DIR || 'test-results/encounter-balance';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];
try {
  for (const id of (process.env.BALANCE_PRESET ? [process.env.BALANCE_PRESET] : ['dual-boss', 'boss-snake'])) {
    for (const pilot of (process.env.BALANCE_PILOTS || 'offense').split(',')) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if(m.text().startsWith('[BalanceProbe]')) console.log(m.text()); });
      await page.route('**/*', r => /^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url()) ? r.continue() : r.abort());
      await page.addInitScript(id => { window.__novaEncounterTest = { getPreset: async () => id }; }, id);
      await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:5213'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
 await launchEncounterTestFromHangar(page);
      await page.waitForFunction(() => window.__game?.scenes.play?.enemyManager?.discoveryEncounter?.plan && window.__game.scenes.play.enemyManager.boss?.active, null, { timeout: 120000 });
      await page.evaluate(async ({ship,extras}) => {
        if(!ship&&!extras)return;
        const g=window.__game,p=g.scenes.play;p.setPaused(true);
        if(ship){
          const {ShipData}=await import('/src/config/ShipData.js');
          const {Player}=await import('/src/entities/Player.js');
          const row=ShipData.find(s=>s.name.toLowerCase()===ship.toLowerCase());
          if(!row)throw Error('Unknown loadout ship '+ship);
          p.player.destroy();p.player.sprite?.parent?.removeChild(p.player.sprite);
          p.player=new Player(p.gameplayGame.getWidth()/2,p.gameplayGame.getHeight()-100,p.inputManager,p.gameplayGame,row.spriteKey);
          p.gameContainer.addChild(p.player.sprite);
          for(const id of g.encounterTest.baselineAugmentIds)p.player.applyRunAugment(id);
        }
        window.__probeAugments=[];
        for(const id of (extras||'').split(',').filter(Boolean))window.__probeAugments.push({id,result:p.player.applyRunAugment(id)});
        p.setPaused(false);
      },{ship:process.env.BALANCE_SHIP,extras:process.env.BALANCE_AUGMENTS});
      await page.evaluate(pilot => {
        const g = window.__game, p = g.scenes.play, m = p.enemyManager, d = m.discoveryEncounter;
        const start = performance.now();
        const probe = window.__balanceProbe = { pilot, appliedExtraAugments:window.__probeAugments||[], ship: p.player.config.id, damage: p.player.bulletDamage,
          shotDelay: p.player.shootDelay, shots: p.player.multiShot, livesAtStart: g.lives,
          incoming: 0, outgoing: 0, dodges: 0, volleys: {}, hits: [], kills: [], losses: [], frames: [], samples: [],
          enemies: [d.primary, d.guest, ...(d.snake?.sections || [])].filter(Boolean).map(e => ({
            id: e.profile?.id || e.type, hp: e.health, max: e.maxHealth
          })) };
        console.log('[BalanceProbe] started', pilot, JSON.stringify(probe.enemies));
        p.debugInvincible = pilot === 'offense';
        p.isDebugInvincibleActive = () => pilot === 'offense';
        const loseLife = g.loseLife.bind(g);
        g.loseLife = options => { probe.losses.push({at:(performance.now()-start)/1000,...options});return loseLife(options); };
        const add = p.bulletManager.addEnemyBullet.bind(p.bulletManager);
        p.bulletManager.addEnemyBullet = bullet => { probe.incoming++; return add(bullet); };
        const playerShoot = p.player.shoot.bind(p.player);
        p.player.shoot = () => { const b = playerShoot(); probe.outgoing += b.length; return b; };
        const observed = new Set();
        function observeEnemies() { for (const enemy of [d.primary, d.guest, ...(d.snake?.sections || [])].filter(Boolean)) {
          if(observed.has(enemy))continue; observed.add(enemy);
          probe.arrivals ||= []; probe.arrivals.push({at:(performance.now()-start)/1000,id:enemy.profile?.id||enemy.type,hp:enemy.maxHealth});
          const key = enemy.profile?.id || `${enemy.type}-${enemy.chain?.sections.indexOf(enemy)}`;
          const shoot = enemy.shoot.bind(enemy);
          enemy.shoot = (...args) => { const b = shoot(...args); if (b?.length) probe.volleys[key] = (probe.volleys[key] || 0) + 1; return b; };
          const damage = enemy.takeDamage.bind(enemy);
          enemy.takeDamage = amount => { const hp = enemy.health, killed = damage(amount);
            probe.hits.push({ at: (performance.now() - start) / 1000, key, damage: hp - enemy.health });
            if (killed) probe.kills.push({ at: (performance.now() - start) / 1000, key });
            return killed;
          };
        }
        }
        observeEnemies();
        probe.overlapSeconds=0;
        p.inputManager.isFiring = () => true;
        if(pilot==='dodge-blink'){
          const key=p.inputManager.isKeyPressed.bind(p.inputManager);
          p.inputManager.isKeyPressed=name=>{
            if(name!=='ShiftLeft')return key(name);
            if(p.player.dodgeCooldown>0||p.player.isDodging)return false;
            return p.bossHazards.some(h=>p.isPlayerInsideBossHazard({...h,elapsedMs:(h.elapsedMs||0)+140}));
          };
          const dodge=p.player.startDodge.bind(p.player);
          p.player.startDodge=()=>{probe.dodges++;return dodge();};
        }
        // Steering goes through Player.update at its normal speed; no teleport,
        // damage multiplier, extra shots or manually reduced health.
        p.inputManager.getMouseSteeringIntent = (x, y) => {
          if (pilot === 'stationary') return { active: true, moveX: 0, moveY: 0 };
          const target = m.enemies.find(e => e.active && e.kind === 'boss') || m.enemies.find(e => e.active && e.kind === 'space_snake');
          let aim = target?.x ?? g.getWidth() * .5;
          if (pilot.startsWith('dodge')) {
            const bullets = p.bulletManager.enemyBullets.filter(b => b.active);
            // Read the actual visible attack envelopes as well as bullets.
            // A bullet-only pilot flies straight into the large warned beams.
            const warnings = [d.primary,d.guest].filter(b=>b?.active&&b.attackWarningToken);
            const risk = qx => {
              let score = Math.abs(qx-aim)/480 + Math.abs(qx-x)/320;
              for(const b of bullets) for(const t of [0,15,30]) {
                if(Math.hypot(b.x+(b.vx||0)*t-qx,b.y+(b.vy||0)*t-y)<65)score+=12;
              }
              for(const b of warnings){
                const w=b.attackWarningToken,a=w.lockedAim.angle;
                if(Number.isFinite(a)){
                  const dx=qx-b.x,dy=y-b.y,along=dx*Math.cos(a)+dy*Math.sin(a);
                  const half=along*Math.tan((w.safeLanes.find(s=>s.kind==='aimed-edges')?.width||.2)*.5)+65;
                  if(along>0&&Math.abs(-dx*Math.sin(a)+dy*Math.cos(a))<half)score+=35;
                }
              }
              for(const h of p.bossHazards){
                const query={player:{x:qx,y,active:true,radius:p.player.radius},normalizeBossHazardAngle:p.normalizeBossHazardAngle};
                if(p.isPlayerInsideBossHazard.call(query,{...h,colossus:null}))score+=35;
              }
              return score;
            };
            const candidates=Array.from({length:13},(_,i)=>Math.max(80,Math.min(g.getWidth()-80,x+(i-6)*45)));
            aim=candidates.reduce((best,qx)=>risk(qx)<risk(best)?qx:best,x);
          }
          return { active: true, moveX: Math.max(-1, Math.min(1, (aim - x) / 24)), moveY: Math.max(-1, Math.min(1, (g.getHeight() * .82 - y) / 24)) };
        };
        let previous = start, sampled = -1;
        function frame(now) {
          observeEnemies();
          if(d.primary.active&&d.primary.health>0&&(d.guest?.active||d.snake?.sections.some(s=>s.active)))probe.overlapSeconds+=(now-previous)/1000;
          probe.frames.push(now - previous); previous = now;
          const elapsed = (now - start) / 1000;
          if (Math.floor(elapsed) !== sampled) { sampled = Math.floor(elapsed);
            probe.samples.push({ at: elapsed, hp: [d.primary.health, d.guest?.health], snake: d.snake?.sections.filter(s => s.active).length || 0, bullets: p.bulletManager.enemyBullets.filter(b => b.active).length, lives: g.lives });
            if(sampled%20===0)console.log('[BalanceProbe]', JSON.stringify(probe.samples.at(-1)));
          }
          if (m.bossDefeatedThisLevel || g.lives <= 0 || elapsed >= 100) {
            probe.complete = m.bossDefeatedThisLevel; probe.elapsed = elapsed; probe.lives = g.lives; probe.done = true; g.app.ticker.stop();
          } else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }, pilot);
      await page.waitForFunction(() => window.__balanceProbe.done || window.__balanceProbe.arrivals.length>1,null,{timeout:80000});
      if(!await page.evaluate(()=>window.__balanceProbe.done)){await page.waitForTimeout(1800);await page.screenshot({path:`${out}/${id}-${pilot}-overlap.png`});}
      await page.waitForFunction(() => window.__balanceProbe.done, null, { timeout: 115000 });
      const state = await page.evaluate(() => window.__balanceProbe);
      await page.screenshot({ path: `${out}/${id}-${pilot}.png` });
      results.push({ id, ...state, errors });
      writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
      assert.deepEqual(errors, []);
      if(pilot==='offense' && !process.env.BALANCE_MEASURE_ONLY){
        assert.ok(state.complete,'Normal projectiles can finish the complete encounter');
        assert.ok(state.elapsed>=25&&state.elapsed<=75,'Fixed-loadout encounter resists a seconds-long wipe without becoming a damage sponge');
        assert.ok(Object.keys(state.volleys).length>=2,'Both opponents actually attacked');
      }
      console.log(JSON.stringify({ id, pilot, overlapSeconds:state.overlapSeconds, arrivals:state.arrivals, elapsed: state.elapsed, complete: state.complete, lives: state.lives,dodges:state.dodges,
        damage: state.damage, shotDelay: state.shotDelay, enemies: state.enemies, incoming: state.incoming, volleys: state.volleys, kills: state.kills }));
      await page.close();
    }
  }
} finally { await browser.close(); }
