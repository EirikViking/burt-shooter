// Called only after EncounterEvolutionTest has classified a loopback DEV run
// as a progression-free prototype. Packaged/public URLs cannot use these paths.
export async function setupEncounterExpansionTest(scene,id){
  const g=scene.game,m=scene.enemyManager;
  m.clearEnemies();m.clearPendingWaveSpawns();scene.firstLightDirector.cancel('expansion-test');
  m.state='WAVE_ACTIVE';m.phase='WAVES';m.waves=[{type:'grunt',count:0}];m.currentWaveIndex=0;m.normalWavesTotal=1;m.spawning=true;
  const sector=id.startsWith('breach')||id==='planetfall'?10:id==='crossover'?23:id==='reassembly'?11:16;g.level=m.level=sector;
  const {Enemy}=await import('../entities/Enemy.js');
  if(['reassembly','crossover'].includes(id)){
    const {createMysteryEncounter}=await import('../entities/mysteries/createMysteryEncounter.js');
    const a=await createMysteryEncounter(m,'carrion_weaver');
    if(id==='crossover'){
      const {SPACE_SNAKES}=await import('./SpaceSnakes.js');const chain=m.spawnSpaceSnake(SPACE_SNAKES[0],{molt:true,curatedReassembly:true,healthScalar:.65,count:5});
      a.crossoverMolt=chain.molt;const budget=chain.sections.reduce((n,e)=>n+e.maxHealth,0)/.65;a.health=a.maxHealth=budget*.35;
    }else for(const x of [.25,.5,.75]){const e=new Enemy(g.getWidth()*x,g.getHeight()*.25,'grunt',sector,m.game);m.enemies.push(e);m.container.addChild(e.sprite);}
  }else if(id.startsWith('breach')||id==='planetfall'){
    m.phase='BOSS';m.state='BOSS_ACTIVE';await m.spawnBoss(sector);
  }else if(['graveyard','siege','migration'].includes(id)){
    const {AuthoredEnvironment}=await import('../managers/AuthoredEnvironment.js');const {ENVIRONMENTS}=await import('../game/EncounterEnvironments.js');
    await AuthoredEnvironment.prewarm();
    m.environment=new AuthoredEnvironment(m,ENVIRONMENTS.find(e=>e.id===id),{count:6});
  }else if(id==='orbit-breaker'){
    g.level=m.level=6;scene.player.applyPowerup('orbit_breaker');
    for(const [i,type]of ['grunt','striker','turret','grunt','grunt'].entries()){const e=new Enemy(g.getWidth()*(.3+i*.1),g.getHeight()*.45,type,6,m.game);m.enemies.push(e);m.container.addChild(e.sprite);}
  }else if(id==='fusions'){
    g.runMode='ranked_tactical';for(const aug of ['drones','salvage_clock','phase_reactor','phase_wake','blink_drive'])scene.player.applyRunAugment(aug);
    for(const [i,type]of ['grunt','striker','turret'].entries()){const e=new Enemy(g.getWidth()*(.25+i*.25),g.getHeight()*.22,type,sector,m.game);m.enemies.push(e);m.container.addChild(e.sprite);}
  }
  m.spawning=false;scene.encounterExpansionTestReady=true;
  if(id==='orbit-breaker'){
    window.render_game_to_text=()=>JSON.stringify({coordinates:'origin top-left, x right, y down',prototype:g.runPolicy.prototype,sector:g.level,score:g.score,paused:scene.isPaused,player:{x:scene.player.x,y:scene.player.y,powerup:scene.player.activePowerup.type,remainingMs:scene.player.getActivePowerupRemainingMs(scene.player.getGameplayClockMs())},hammer:scene.player.orbitBreaker?{...scene.player.orbitBreaker.model.position,hits:scene.player.orbitBreaker.hits,clears:scene.player.orbitBreaker.clears}:null,enemies:m.enemies.filter(e=>e.active).map(e=>({type:e.type,x:e.x,y:e.y,health:e.health}))});
    window.render_game_to_text.playScene=scene;
    window.advanceTime=ms=>{if(g.scenes.play!==scene)return;g.app.ticker.stop();const count=Math.min(600,Math.max(0,Math.round((Number(ms)||0)/(1000/60))));for(let i=0;i<count;i++)scene.update(1);g.app.render();};
    window.advanceTime.playScene=scene;
  }
}
