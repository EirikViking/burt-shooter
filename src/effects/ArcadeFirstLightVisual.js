import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { createText } from '../utils/pixiText.js';
import { FIRST_LIGHT_ENGLISH } from '../i18n/firstLightText.js';
import { ENCOUNTER_EVOLUTION_ENGLISH } from '../i18n/encounterEvolutionText.js';
import { CONVOY_PAYBACK } from '../game/ArcadeFirstLight.js';
import { translateText } from '../i18n/index.js';
const firstLightText = (key, params) => translateText(FIRST_LIGHT_ENGLISH[key], params);
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { drawEnergySurface } from './AstraEnergyMaterial.js';
import { FIRST_LIGHT_DESIGNS, getFirstLightDesign } from '../config/FirstLightDesigns.js';
import {prewarmPremiumArt,premiumTexture} from './PremiumArt.js';
import {ConvoySurpriseVisual} from './ConvoySurpriseVisual.js';
import {convoySurpriseText} from '../i18n/convoySurpriseText.js';
import {reactorTowText} from '../i18n/reactorTowText.js';
import {counterweightText} from '../i18n/counterweightText.js';
import {IonDriveVisual,updateRescueDrives} from './IonDriveVisual.js';

let artPromise;
export function loadFirstLightArt() {
  return artPromise ||= Promise.all([
    Promise.all(Object.values(FIRST_LIGHT_DESIGNS).flat().map(async design =>
      [design.art, await Assets.load(`/art/first-light/${design.art}.webp`)])),
    Promise.all(Array.from({length:8},(_,rank)=>GameAssets.ensureRankShipTexture(rank))),
    Assets.load('/art/first-light/impact-atlas.webp'),prewarmPremiumArt()
  ]).then(([entries,escorts,impact])=>{
    if(escorts.some(tex=>!tex || tex.width<=1))throw new Error('Escort hull art not ready');
    const designs=Object.fromEntries(entries);
    return {convoy:designs['prison-transport'],rival:designs['rival-core-hull'],designs,escorts,impact};
  }).catch(() => { artPromise = null; return null; });
}
const smooth = t => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export class FirstLightVisual {
  constructor(scene, art) {
    this.scene = scene; this.art = art; this.root = new Container(); this.root.label = 'first_light_encounters';
    // Opaque hulls stay below the player's hull/hitbox and all live projectiles.
    this.root.zIndex = -1; scene.gameContainer.addChild(this.root);
    this.contact = new Container(); this.root.addChild(this.contact);
    this.energy = new Graphics(); this.contact.addChild(this.energy);
    this.body = new Sprite(art.convoy); this.body.anchor.set(.5); this.contact.addChild(this.body);
    this.modules = [-1,1].map(()=>{const s=new Sprite();s.anchor.set(.5);this.contact.addChild(s);return s;});
    this.parts = new Graphics(); this.contact.addChild(this.parts);
    this.captives = [-1, 1].map(side => this.ship(side,this.contact));
    this.wing = new Container(); this.root.addChild(this.wing);
    this.wingEnergy = new Graphics(); this.wing.addChild(this.wingEnergy);
    this.drives = Array.from({length:4},()=>new IonDriveVisual(this.wing));
    this.allies = [-1, 1].map(side => this.ship(side,this.wing));
    const style = { fontFamily: 'Rajdhani, sans-serif', fontSize: 26, fontWeight: '700', fill: 0xf0fcff,
      stroke: { color: 0x071320, width: 4 }, align: 'center', wordWrap: true, breakWords: true, wordWrapWidth: 450 };
    this.title = createText('', style); this.title.anchor.set(.5); this.contact.addChild(this.title);
    this.hint = createText('', { ...style, fontSize: 20, fontWeight: '600', fill: 0xaeeff0 }); this.hint.anchor.set(.5); this.contact.addChild(this.hint);
    this.escortText = createText('', { ...style, fontSize: 20, fill: 0x7affe0 }); this.escortText.anchor.set(.5); this.wing.addChild(this.escortText);
    this.targets = []; this.shards = []; this.frames = []; this.wreckage = [];
    this.pose = { x: 0, y: 0, width: 0, height: 0 }; this.destroyed = false;
    this.sections = new Map(); this.sectionTextures=[]; this.hitFlashes={};
    this.breakupSections = new Map(); this.lastEncounter = null; this.lastSuspended = false;
    this.suspendAge = 99; this.resumeAge = 99; this.deathEncounter = null;
    this.presence = 1; this.departureProgress = 0; this.departureDuration = null; this.departureSegment = null;
    this.impacts=[];
    this.impactFrames=Array.from({length:8},(_,i)=>new Texture({source:art.impact.source,
      frame:new Rectangle((i%4)*art.impact.width/4,Math.floor(i/4)*art.impact.height/2,art.impact.width/4,art.impact.height/2)}));
    for(const design of FIRST_LIGHT_DESIGNS.rival){
      const tex=art.designs[design.art];
      const edge=Math.floor(tex.width*.22);
      const frames=[new Rectangle(0,0,edge,tex.height),new Rectangle(edge,0,tex.width-edge*2,tex.height),new Rectangle(tex.width-edge,0,edge,tex.height)];
      const textures=frames.map(frame=>new Texture({source:tex.source,frame}));
      this.breakupSections.set(design.id,textures);
      if(design.id!=='ravager')this.sections.set(design.id,textures);
      this.sectionTextures.push(...textures);
    }
    const gunSource=art.designs['rival-forge'];
    this.fallbackGun=new Texture({source:gunSource.source,frame:new Rectangle(Math.floor(gunSource.width*.02),Math.floor(gunSource.height*.14),Math.floor(gunSource.width*.19),Math.floor(gunSource.height*.64))});
    this.sectionTextures.push(this.fallbackGun);
    for (const tex of [art.convoy, art.rival]) for (let i = 0; i < 12; i++) {
      const fw = tex.width / 8, fh = tex.height / 5;
      this.frames.push(new Texture({ source: tex.source, frame: new Rectangle((i % 6 + 1) * fw, (Math.floor(i / 6) + 1) * fh, fw, fh) }));
    }
    this.surpriseView=new ConvoySurpriseVisual(this.contact,art);
  }
  ship(side,parent) {
    const s = new Sprite(this.art.escorts[side<0?0:1]);
    s.anchor.set(.5); s.width = 40; s.height = 44; s.visible = false; parent.addChild(s); return s;
  }
  burst(x, y, kind = 'convoy', big = false) {
    const rendered=kind==='rival'&&this.scene.particleManager?.detonations?.emit(x,y,big?1:.6,big);
    const impact=new Sprite(this.impactFrames[0]);impact.anchor.set(.5);impact.position.set(x,y);
    impact.visible=!rendered;
    impact.width=impact.height=big?Math.max(220,this.pose.width*.95):116;
    this.root.addChild(impact);this.impacts.push({sprite:impact,age:0,life:big?1.15:.62,big});
    const count = big ? 18 : 8, start = kind === 'rival' ? 12 : 0;
    for (let i = 0; i < count; i++) {
      const s = new Sprite(this.frames[start + i % 12]); s.anchor.set(.5); s.position.set(x, y);
      const size = (big ? 24 : 13) + i % 4 * 4; s.width = size; s.height = size * .7;
      const a = i * 2.39996; const speed = (big ? 80 : 40) + (i % 5) * 24;
      this.root.addChild(s); this.shards.push({ sprite: s, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, spin: (i % 2 ? -1 : 1) * 2.5, age: 0, life: big ? 1.6 : .9 });
    }
  }
  update(model, seconds, width, height, player, charges = {}) {
    const reduced = getReducedMotionEnabled(), flash = getFlashIntensityScale(), e = model.encounter;
    this.energy.clear(); this.wingEnergy.clear(); this.parts.clear(); this.targets = [];
    if(e!==this.lastEncounter){
      for(const sprite of this.wreckage)sprite.destroy();
      this.wreckage=[];this.deathEncounter=null;this.lastEncounter=e;
      this.lastSuspended=Boolean(e?.suspended);this.suspendAge=99;this.resumeAge=99;
      this.presence=e?.suspended?0:1;this.departureProgress=0;
      this.departureDuration=e?.duration;this.departureSegment=null;
    } else if(e && e.suspended!==this.lastSuspended){
      this.lastSuspended=e.suspended;
      if(e.suspended)this.suspendAge=0;else this.resumeAge=0;
    }
    if(e?.suspended)this.suspendAge+=seconds;else this.resumeAge+=seconds;
    // A reactor hit during re-entry resolves where the player can see the wreck.
    if(e?.won){this.resumeAge=99;this.presence=1;}
    // Reverse from the current position/exposure when a short warning ends.
    // Restarting independent exit/entry curves teleported partially hidden hulls.
    const presenceStep=Math.max(0,Math.min(.1,seconds))/.95;
    this.presence=clamp(this.presence+(e?.suspended?-presenceStep:presenceStep),0,1);
    const exposure=smooth(this.presence);
    this.contact.alpha=e?exposure:0;
    const payback=model.payback?.status==='active'?model.payback:null;
    const wingEscorts=payback?payback.escorts:model.escorts;
    this.contact.visible=Boolean(e);this.wing.visible=wingEscorts.length>0;
    this.wing.alpha=model.supportActive===false?.65:1;
    this.modules.forEach(s=>s.visible=false);
    const deathAge=e?.won?Math.max(0,e.age-e.wonAt):0;
    this.body.visible = Boolean(e && (!e.won || deathAge<.32)); this.title.visible = Boolean(e); this.hint.visible = Boolean(e);
    this.captives.forEach(s => { s.visible = false; }); this.allies.forEach(s => { s.visible = false; }); this.drives.forEach(d=>d.hide());
    if (e) {
      const convoy = e.kind === 'convoy', design=getFirstLightDesign(e.kind,e.variant);
      const tex = this.art.designs[design.art];
      const bw = Math.min(design.width,width*.60,height*.37*tex.width/tex.height), bh = bw * tex.height / tex.width;
      const direction = e.variant === 1 ? -1 : 1;
      const arrival = smooth(e.age / 1.4);
      // A defeated rival breaks up on screen; only a surviving contact flies away.
      // A late rescue changes the remaining launch budget. Continue an exit
      // already in progress from its current point instead of flying back in.
      if(e.duration!==this.departureDuration){
        this.departureSegment=this.departureProgress>0
          ?{age:e.age,progress:this.departureProgress}:null;
        this.departureDuration=e.duration;
      }
      const segment=this.departureSegment;
      const departure = e.won ? 0 : segment
        ?segment.progress+(1-segment.progress)*smooth((e.age-segment.age)/Math.max(.001,e.duration-segment.age))
        :smooth((e.age - (e.duration - 1.5)) / 1.5);
      this.departureProgress=departure;
      let x = width * .5 + (convoy ? direction * (1 - arrival) * (-width * .8) + direction * departure * width * .8 : 0);
      const hudBounds = this.scene.hud?.missionPanel?.getBounds();
      const hudBottom = hudBounds?.height ? this.root.toLocal({x: hudBounds.x, y: hudBounds.y + hudBounds.height}).y : 0;
      const safeCenterY = Math.min(height * .56, Math.max(170, height * .3, hudBottom + bh * .5 + 24));
      let y = safeCenterY + (convoy ? Math.min(66,height*.09)-departure*36 : -(1 - arrival + departure) * height * .55);
      // Descend over the chosen lanes. A lateral entrance swept both guns
      // through one autofire stream before players could choose a component.
      if(e.counterweight){x=width*.5+departure*width*.8;y-=(1-arrival)*height*.6;}
      y-=(1-exposure)*height*.58;
      if(!e.counterweight)x += Math.sin(e.age * .5 + e.variant) * Math.min(design.drift, width * .07)*arrival*(1-departure);
      if (!convoy && (e.hp.left <= 0) !== (e.hp.right <= 0)) x += (e.hp.left <= 0 ? 1 : -1) * Math.sin(e.age * .8) * 24;
      this.pose = { x, y, width: bw, height: bh, fieldHeight:height,fieldWidth:width };
      this.body.texture = tex; this.body.position.set(x, y); this.body.width = bw; this.body.height = bh;
      const sections=this.sections.get(design.id);
      if(sections){
        this.body.texture=sections[1];this.body.width=bw*sections[1].width/tex.width;
        for(const [i,side] of [-1,1].entries()){
          const part=i?'right':'left',module=this.modules[i];module.texture=sections[i?2:0];
          module.visible=e.hp[part]>0&&(!e.won||deathAge<.32);module.width=bw*module.texture.width/tex.width;module.height=bh;
          module.position.set(x+side*(bw-module.width)*.5,y);
        }
      }
      this.body.rotation = !convoy && !reduced ? (e.hp.left <= 0 ? .035 : 0) - (e.hp.right <= 0 ? .035 : 0) : 0;
      if(!e.surprise)for (const [index, part] of ['left', 'right'].entries()) {
        const side = index ? 1 : -1;
        const mounts={lancer:[.42,.10],forge:[.39,.15],vortex:[.42,.33],wasp:[.43,.14],oracle:[.35,.28]};
        const mount=mounts[design.id]||[.164,-.08];
        const px = x + side * bw * (convoy ? .249 : mount[0]), py = y + bh * (convoy ? .12 : mount[1]);
        if (e.hp[part] > 0 && !e.won) {
          const color = design.color;
          if (convoy) {
            const captive = this.captives[index]; captive.texture=premiumTexture(index?'fighterB':'fighterA')||this.art.escorts[design.escortRanks[index]];
            captive.visible = true; captive.position.set(px, py - 11); captive.width = 48; captive.scale.y=captive.scale.x;captive.rotation=Math.PI; captive.alpha = .9;
            this.parts.moveTo(px-14,py-6).lineTo(px-14,py+5).stroke({color:index?0xffd795:0x5cf0df,width:3,alpha:1});
            // Solid mechanical clamps, no surrounding energy ring.
            this.parts.roundRect(px - 25, py + 5, 50, 17, 3).fill(0x253740);
            this.parts.rect(px - 22, py + 8, 44, 4).fill(color);
            this.parts.rect(px - 25, py - 12, 7, 32).fill(0x84949a); this.parts.rect(px + 18, py - 12, 7, 32).fill(0x84949a);
          } else {
            if(!sections){const module=this.modules[index];module.texture=this.fallbackGun;module.visible=true;
              module.position.set(px,py);module.width=47;module.height=77;}
            const charge = charges[part] || 0;
            if (charge > 0) {
              drawEnergySurface(this.parts, {kind:'corona',x:px,y:py+12,width:38+charge*14,height:44+charge*18,color,alpha:charge*.58,minExposure:.3});
            }
          }
          const hp = e.hp[part] / e.maxHp.side;
          this.parts.roundRect(px - 25, py + 38, 50, 5, 2).fill(0x07111b);
          this.parts.roundRect(px - 25, py + 38, 50 * hp, 5, 2).fill(color);
          this.targets.push({ part, x: px, y: py + (convoy ? 8 : 7), radius: convoy ? 27 : 25 });
        }
      }
      if (!convoy && !e.won && e.hp.left <= 0 && e.hp.right <= 0) {
        const coreY={ravager:-.12,lancer:-.13,forge:-.05,vortex:-.035,wasp:-.19,oracle:.13};
        const cy = y + bh * (coreY[design.id]??-.12);
        drawEnergySurface(this.energy, { kind: 'corona', x, y: cy, width: 66, height: 90, color: 0xffa450, alpha: .5, minExposure: .4 });
        drawEnergySurface(this.parts,{kind:'corona',x,y:cy,width:30,height:42,color:design.color,alpha:.72,minExposure:.4});
        this.parts.rect(x-30,cy+35,60,5).fill(0x201110); this.parts.rect(x-30,cy+35,60*e.hp.core/e.maxHp.core,5).fill(0xffbe65);
        this.targets.push({ part:'core', x, y:cy, radius:28 });
      }
      if(!e.counterweight)for (const side of [-1, 1]) drawEnergySurface(this.energy,{kind:'rift',x:x+side*bw*.1,y:y-bh*.28,width:18,height:32,color:convoy?0x59dfe6:0xfb8660,alpha:.26,minExposure:.3});
      if(convoy && e.hp.left<=0 && e.hp.right<=0){
        const thrust=smooth((e.age-(e.duration-2.3))/.85);
        for(const side of [-1,1])drawEnergySurface(this.energy,{kind:'corona',x:x+side*bw*.29,y:y+bh*.3,
          width:30+thrust*20,height:56+thrust*80,color:design.color,alpha:.4+thrust*.26,minExposure:.24});
      }
      const modulesCleared = e.hp.left <= 0 && e.hp.right <= 0;
      if(e.surprise){this.body.visible=false;this.targets=this.surpriseView.update(e,this.pose,this.captives,charges,{reduced,flash});}
      this.title.text = `${firstLightText(e.won ? 'victory' : convoy ? (modulesCleared ? 'rescue' : 'convoyTitle') : modulesCleared ? 'core' : 'rivalTitle')}${e.won||modulesCleared?'':` · ${design.name}`}`;
      this.hint.text = e.won || modulesCleared ? '' : firstLightText(convoy ? 'convoyHint' : 'rivalHint');
      if(e.surprise&&!modulesCleared&&!e.counterweight){this.title.text=translateText(convoySurpriseText(e.surprise,'title'));this.hint.text=translateText(convoySurpriseText(e.surprise,'hint'));}
      if(e.reactor){this.title.text=translateText(reactorTowText(e,'title'));this.hint.text=e.reactor.harmless||e.reactor.spent?'':translateText(reactorTowText(e,'hint'));}
      if(e.counterweight){this.title.text=translateText(counterweightText(e,'title'));this.hint.text=['disabled','spent','expired'].includes(e.counterweight.phase)?'':translateText(counterweightText(e,'hint'));}
      const readableScale = Math.max(1, .62 / Math.max(.1,this.scene.getActivePlayfieldRect().scale || 1));
      for (const label of [this.title, this.hint]) {
        label.style.wordWrapWidth = Math.min(650,(width-64)/readableScale); label.scale.set(readableScale);
        if(label.width>width-40)label.scale.set(readableScale*(width-40)/label.width);
      }
      this.title.position.set(width*.5,y+bh*.5+32);
      if(e.counterweight)this.title.y=Math.max(this.title.y,y+bw*.40+24);
      this.hint.position.set(width*.5,this.title.y+this.title.height*.5+this.hint.height*.5+4);
      if(e.won){
        if(this.deathEncounter!==e){
          this.deathEncounter=e;
          for(const [index,texture] of this.breakupSections.get(design.id).entries()){
            const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.visible=false;this.contact.addChild(sprite);
            this.wreckage.push(sprite);
          }
        }
        const breakProgress=smooth((deathAge-.27)/1.45);
        for(const [index,sprite] of this.wreckage.entries()){
          const side=index-1;
          sprite.visible=deathAge>=.27;sprite.width=bw*sprite.texture.width/tex.width;sprite.height=bh;
          sprite.position.set(x+side*(bw-sprite.width)*.5+side*breakProgress*bw*.48,
            y+breakProgress*(index===1?bh*.32:-bh*.13));
          sprite.rotation=(reduced?0:side*breakProgress*.48);
          sprite.tint=deathAge>.67?0x947d80:0xffffff;
          sprite.alpha=Math.max(0,1-smooth((deathAge-.62)/1.05));
        }
        drawEnergySurface(this.energy,{kind:'pressure',x,y,width:bw*(.45+breakProgress*.65),height:bh*(.5+breakProgress*.6),
          color:design.color,alpha:(.45+.22*flash)*Math.max(0,1-deathAge/1.6),minExposure:.18});
        drawEnergySurface(this.parts,{kind:'corona',x,y,width:70+breakProgress*75,height:82+breakProgress*85,
          color:0xffbb73,alpha:.5*Math.max(0,1-deathAge/1.7),minExposure:.22});
        if(deathAge>=.38&&!e._secondImpact){e._secondImpact=true;this.burst(x-bw*.22,y-bh*.06,'rival');}
        if(deathAge>=.83&&!e._thirdImpact){e._thirdImpact=true;this.burst(x+bw*.2,y+bh*.12,'rival');}
      } else for(const sprite of this.wreckage)sprite.visible=false;
      if(e.suspended||this.presence<1)this.targets=[];
    }
    if(!e?.surprise)this.surpriseView.root.visible=false;
    for (const escort of wingEscorts) {
      const index = escort.side < 0 ? 0 : 1, sprite = this.allies[index]; sprite.visible = true;
      sprite.texture=premiumTexture(index?'fighterB':'fighterA')||this.art.escorts[escort.rank??index];
      const marked=payback?this.targets.find(t=>t.part===payback.part):null;
      const origin = escort.origin || {x:payback?(escort.side<0?-50:width+50):width*.5,y:payback?height*.58:height*.3};
      const t = smooth((escort.joinAge??escort.age)/(payback?CONVOY_PAYBACK.arrival:.9));
      sprite.width=68+(1-t)*16;sprite.scale.y=sprite.scale.x;
      const px = payback?clamp((marked?.x||width*.5)+escort.side*65,40,width-40):clamp(player.x+escort.side*54,24,width-24);
      const py = payback?Math.min(height*.74,(marked?.y||height*.35)+165):clamp(player.y+17,24,height-24);
      const arc = reduced ? 0 : Math.sin(t*Math.PI)*70*escort.side;
      sprite.position.set(origin.x+(px-origin.x)*t+arc,origin.y+(py-origin.y)*t);
      sprite.rotation = Math.PI+(reduced ? 0 : -escort.side*(1-t)*.7);
      const exit = payback?smooth((payback.age-(payback.departAt??CONVOY_PAYBACK.arrival+CONVOY_PAYBACK.firingSeconds))/CONVOY_PAYBACK.departure)
        :smooth((escort.age-9.3)/.7); sprite.y -= exit*height*.6; sprite.alpha=1-exit;
      escort.x=sprite.x;escort.y=sprite.y;
      const wingColor=index?0xffd795:0x5cf0df;
      // The same side stripe is present in captivity, escort service and return.
      this.wingEnergy.moveTo(sprite.x-18,sprite.y+4).lineTo(sprite.x-18,sprite.y+20).stroke({color:wingColor,width:4,alpha:1-exit});
      if(marked&&payback.age<3.2&&payback.departAt==null){
        this.wingEnergy.moveTo(marked.x-34,marked.y-28).lineTo(marked.x-34,marked.y+28)
          .moveTo(marked.x+34,marked.y-28).lineTo(marked.x+34,marked.y+28).stroke({color:0x73e8d1,width:2,alpha:.8});
      }
      if(t<1)drawEnergySurface(this.wingEnergy,{kind:'pressure',x:sprite.x,y:sprite.y,
        width:72+(1-t)*24,height:80+(1-t)*20,color:wingColor,alpha:.27*(1-t),minExposure:.16});
    }
    updateRescueDrives(this.drives,this.allies,wingEscorts,{reduced,flash});
    this.escortText.visible=wingEscorts.length>0&&(!payback||payback.age<2.6);
    this.escortText.text=payback?translateText(ENCOUNTER_EVOLUTION_ENGLISH.payback,{wing:payback.identity.map(a=>a.callsign).join(' + ')})
      :`${wingEscorts.map(a=>a.callsign).join(' + ')} · ${firstLightText('escort',{seconds:Math.ceil(Math.max(0,...model.escorts.map(a=>10-a.age)))})}`;
    this.escortText.style.wordWrapWidth=width-64;
    this.escortText.position.set(width*.5,payback?height-76:height-46);
    for (const shard of this.shards) {
      shard.age+=seconds; const motion=reduced?.2:1;
      shard.sprite.x+=shard.vx*seconds*motion; shard.sprite.y+=shard.vy*seconds*motion;
      shard.sprite.rotation+=shard.spin*seconds*motion;shard.sprite.alpha=Math.max(0,1-shard.age/shard.life);
      if(shard.age>=shard.life)shard.sprite.destroy();
    }
    this.shards=this.shards.filter(s=>s.age<s.life);
    for(const impact of this.impacts){
      impact.age+=seconds;const progress=Math.min(1,impact.age/impact.life);
      impact.sprite.texture=this.impactFrames[Math.min(7,Math.floor(progress*8))];
      impact.sprite.alpha=(.45+.4*flash)*Math.min(1,(1-progress)*3);
      if(impact.age>=impact.life)impact.sprite.destroy();
    }
    this.impacts=this.impacts.filter(impact=>impact.age<impact.life);
    // No oscillator or flash at intensity zero; mechanical targets remain readable.
    this.energy.alpha=.65+.35*flash;
  }
  destroy() { if(this.destroyed)return;this.destroyed=true;this.drives.forEach(d=>d.destroy());this.surpriseView.destroy();this.root.destroy({children:true});for(const t of [...this.frames,...this.sectionTextures,...this.impactFrames])t.destroy(false);this.shards=[];this.impacts=[]; }
}
