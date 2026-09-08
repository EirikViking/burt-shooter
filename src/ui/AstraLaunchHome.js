import { Container, Graphics, Rectangle } from 'pixi.js';
import { createText } from '../utils/pixiText.js';
import { translateText as t } from '../i18n/index.js';
import { getShipMetadata } from '../config/ShipMetadata.js';
import { RUN_MODES } from '../game/RunMode.js';
import { playMenuConfirmSfx, playMenuFocusSfx } from './MenuFxLayer.js';
import { getCurrentLayout } from './responsiveLayout.js';

const FONT = 'Rajdhani, Bahnschrift, Segoe UI, sans-serif';
const DISPLAY = 'Orbitron, Rajdhani, sans-serif';
const MODE_KEY = 'nova_launch_menu_mode_v1'; // Local navigation preference, not run/save progress.

export class AstraLaunchHome extends Container {
  constructor(scene) {
    super(); this.scene = scene; scene.mayhemRunMode=RUN_MODES.MAYHEM_TACTICAL; this.zIndex = 30; this.label = 'ui_astraLaunchHome';
    this.surface = 'home'; this.clock = 0;
    this.home = new Container(); this.chrome = new Graphics(); this.addChild(this.chrome, this.home);
    this.title = this.text('NOVA\nSWARM', 72, 0xeaf7ff, DISPLAY, this.home);
    this.title.style.fontWeight = '900'; this.title.style.lineHeight = 76;
    this.title.style.dropShadow = {color:0x4ea4b8,alpha:.32,blur:16,distance:0};
    this.signature = new Graphics(); this.home.addChild(this.signature);
    this.invitation = this.text('', 22, 0xb8ccd9, FONT, this.home);this.invitation.style.breakWords=true;
    this.invitation.style.dropShadow={color:0x020811,alpha:.9,blur:4,distance:1};
    this.shipPlaque=new Graphics();this.home.addChild(this.shipPlaque);
    this.rotateHint=this.text('',13,0xc0d8e0,FONT,this.home);this.rotateHint.style.stroke={color:0x041018,width:3};
    this.shipName = this.text('', 22, 0xeaf7ff, DISPLAY, this.home);
    this.shipLabel = this.text('', 13, 0x80aab9, FONT, this.home);
    this.buttons = {};
    this.options = [];
    this.make('launchTactical', 'PLAY', () => scene.quickStartRun(RUN_MODES.MAYHEM_TACTICAL), 'primary');
    this.make('otherModes', 'OTHER MODES', () => this.openModes(), 'secondary');
    this.make('changeShip', 'CHANGE SHIP', () => scene.openShipSelect(), 'text');
    this.make('hangar', 'SHIP HANGAR', () => scene.openShipSelect(), 'nav');
    this.make('highscores', 'LEADERBOARD', () => scene.storyBtn.emit('pointerdown'), 'nav');
    this.make('threatCodex', 'THREAT CODEX', () => scene.threatCodexBtn.emit('pointerdown'), 'nav');
    this.codexSignal = new Graphics();
    this.codexSignal.eventMode = 'none';
    this.buttons.threatCodex.addChildAt(this.codexSignal, 1);
    this.make('achievements', 'ACHIEVEMENTS', () => scene.achievementsBtn.emit('pointerdown'), 'nav');
    this.make('settings', 'SETTINGS', () => scene.openSettingsOverlay(), 'nav');
    this.make('howToPlay', 'HOW TO PLAY', () => scene.openHowToPlayOverlay(), 'small');
    this.make('exit', 'EXIT GAME', () => scene.openQuitConfirmation(), 'small');
    this.make('backHome', 'BACK', () => this.closeModes(), 'secondary');
    this.buttons.backHome.visible = false;
    this.options = this.options.filter(o => o.id !== 'backHome');
  }

  text(value, size, color, font = FONT, parent = this) {
    const label = createText(value, { fontFamily: font, fontSize: size, fontWeight: '700', fill: color, padding: 4 });
    parent.addChild(label); return label;
  }

  make(id, source, activate, variant) {
    const b = new Container(); b.label = `ui_launch_${id}`; b.eventMode = 'static'; b.cursor = 'pointer';
    b._launchHomeButton = true; b._source = source; b._variant = variant; b._accent = 0xa4f7e0;
    b._bg = new Graphics(); b.addChild(b._bg);
    b._label = this.text('', variant === 'primary' ? 32 : 17, 0xeaf7ff, variant === 'primary' ? DISPLAY : FONT, b);
    b._subtitle = this.text('', 15, 0xa5e2d9, FONT, b);
    if (variant === 'primary') { b._energy = new Graphics(); b._energy.eventMode='none'; b.addChild(b._energy); }
    b.activate = activate; b._paint = () => this.paint(b);
    b.on('pointerover', () => { this.scene.setMenuFocusByButton(b); b._hovered = true; this.paint(b); playMenuFocusSfx(.075); });
    b.on('pointerout', () => { b._hovered = false; this.paint(b); });
    b.on('pointerdown', e => { e?.stopPropagation?.(); this.scene.setInputDevice('keyboard'); playMenuConfirmSfx(.24); activate(); });
    this.addChild(b); this.buttons[id] = b; this.options.push({ id, button: b, activate }); return b;
  }

  paint(b) {
    const w = b._btnWidth || 150, h = b._btnHeight || 44, active = b._focused || b._hovered;
    const g = b._bg; g.clear(); b._label.text = t(b._source);
    const primary = b._variant === 'primary', solid = primary || b._variant === 'secondary';
    if (solid) {
      g.poly([0,0,w-14,0,w,14,w,h,14,h,0,h-14]).fill({color:primary ? (active ? 0x16483f : 0x102c32) : 0x071623,alpha:primary ? .96 : .84});
      g.poly([0,0,w-14,0,w,14,w,h,14,h,0,h-14,0,0]).stroke({color:primary ? 0xe6fff4 : 0x82b5bf,width:active ? 2 : 1,alpha:active ? 1 : .48});
      g.moveTo(16,3).lineTo(w-18,3).stroke({color:0xffffff,width:1,alpha:primary ? .65 : .13});
      if(primary){
        g.poly([1,15,5,19,5,h-17,1,h-21]).fill(0x9dffe0);
        g.poly([w*.65,5,w-19,5,w-5,19,w-5,h-5,w*.47,h-5]).fill({color:0x8fdec6,alpha:.035});
        g.moveTo(18,h-4).lineTo(w-18,h-4).stroke({color:0xffc58c,width:1,alpha:.35});
      }
    } else if (active) {
      g.rect(0,0,w,h).fill({color:0x8fead8,alpha:.08});
      g.moveTo(8,h-1).lineTo(w-8,h-1).stroke({color:0xa4f7e0,width:2,alpha:.95});
    }
    b._label.style.fill = primary ? 0xedfff7 : active ? 0xc9fff1 : 0xb9d0dc;
    b._label.anchor.set(solid ? 0 : .5, .5);
    b._label.position.set(solid ? 24 : w/2, primary ? h*.38 : h/2);
    b._label.scale.set(1); if (b._label.width > w-(solid ? 72 : 12)) b._label.scale.set((w-(solid ? 72 : 12))/b._label.width);
    b._subtitle.visible = primary; b._subtitle.text = primary ? t('MAYHEM TACTICAL') : '';
    b._subtitle.position.set(24,h*.65); b._subtitle.scale.set(1);
    if (b._subtitle.width>w-72) b._subtitle.scale.set((w-72)/b._subtitle.width);
    if (solid) g.poly([w-34,h/2-6,w-24,h/2,w-34,h/2+6]).stroke({color:primary ? 0xaaffdf : 0x8ce7d2,width:2});
    b.hitArea = new Rectangle(0,0,w,h);
  }

  place(id,x,y,w,h) { const b=this.buttons[id]; b.position.set(x,y); b._btnWidth=w; b._btnHeight=h; this.paint(b); }

  updatePresentation(delta, reduced = false) {
    if (!reduced) this.clock += Math.min(3,Math.max(0,delta))/60;
    const time=reduced?0:this.clock, b=this.buttons.launchTactical;
    const codex = this.buttons.threatCodex, signal = this.codexSignal;
    signal.clear();
    codex._label.style.fill = codex._focused || codex._hovered ? 0xc9fff1 : this.scene.codexUnreadCount>0 ? 0xffdda1 : 0xb9d0dc;
    if (this.scene.codexUnreadCount > 0) {
      const cw = codex._btnWidth || 150, ch = codex._btnHeight || 44;
      const pulse = reduced ? .7 : .58 + .25 * Math.sin(time * 2.1);
      signal.roundRect(3, 3, cw - 6, ch - 6, 3).fill({color:0x65e5df, alpha:pulse * .12});
      for (const side of [0, 1]) {
        const x = side ? cw - 5 : 5, inward = side ? -1 : 1;
        signal.moveTo(x + inward * 17, 5).lineTo(x, 5).lineTo(x, ch - 5).lineTo(x + inward * 17, ch - 5)
          .stroke({color:0xffd391, width:2.5, alpha:Math.min(1,pulse+.15)});
      }
      const p = reduced ? .5 : (time * .24) % 1, x = 24 + p * (cw - 72);
      signal.moveTo(x, ch - 4).lineTo(x + 24, ch - 4).stroke({color:0xd7fff8, width:2, alpha:pulse});
    }
    const w=b._btnWidth||150,h=b._btnHeight||44,g=b._energy;
    g.clear();
    // Small luminous edge accents leave the label and input geometry still.
    for(let i=0;i<3;i++){
      const p=(time*.13+i/3)%1,x=18+p*(w-60);
      g.moveTo(x,1).lineTo(Math.min(w-18,x+24),1).stroke({color:0xc9fff0,width:2,alpha:reduced?.45:Math.sin(p*Math.PI)*.85});
    }
    this.signature.clear();
    const x=this.title.x+5,y=this.title.y+this.title.height+9,span=Math.min(w*.6,240);
    this.signature.moveTo(x,y).lineTo(x+span,y).stroke({color:0x91d8dc,width:1,alpha:.25});
    this.signature.moveTo(x,y).lineTo(x+span*.25,y).stroke({color:0xffcc96,width:2,alpha:.8});
    this.signature.circle(x+span+8,y,2).fill({color:0xffd7a5,alpha:reduced?.7:.55+.2*Math.sin(time*.8)});
  }

  layout(width, height) {
    const compact=width<900, s=Math.min(1.6, Math.max(.72, Math.min(width/1280,height/720)));
    const fontScale=Math.min(1.35,Math.max(1,getCurrentLayout()?.uiScale||1));
    const left=width*.055, navY=height-62*s, column=compact ? width*.42 : width*.34;
    this.home.visible=this.surface==='home';
    for (const id of ['launchTactical','otherModes','changeShip']) this.buttons[id].visible=this.surface==='home';
    this.buttons.backHome.visible=this.surface==='modes';
    this.title.position.set(left,height*.13); this.title.style.fontSize=70*s; this.title.style.lineHeight=77*s;
    this.invitation.text=t('Survive the swarm. Defeat bosses. Choose powerful upgrades.');
    this.invitation.style.fontSize=Math.max(17,21*s)*fontScale; this.invitation.style.wordWrap=true; this.invitation.style.wordWrapWidth=column;
    this.invitation.position.set(left,height*.385);
    this.invitation.scale.set(1);
    const invitationRoom=height*.53-this.invitation.y-16*s;
    if(this.invitation.height>invitationRoom)this.invitation.scale.set(invitationRoom/this.invitation.height);
    this.place('launchTactical',left,height*.53,column,84*s);
    this.place('otherModes',left,height*.53+100*s,column,46*s);
    this.shipLabel.text=t('SELECTED SHIP'); this.shipLabel.style.fontSize=13*s;
    this.shipName.text=getShipMetadata(this.scene.getQuickStartShipKey())?.name || this.scene.getQuickStartShipKey();
    this.shipName.style.fontSize=Math.max(16,20*s)*fontScale; this.shipName.scale.set(1);
    const shipX=width*.59, shipY=height*.77;
    this.shipLabel.position.set(shipX,shipY); this.shipName.position.set(shipX,shipY+20*s);
    this.shipPlaque.clear();this.shipPlaque.roundRect(shipX-14*s,shipY-9*s,width*.36,93*s,3*s).fill({color:0x04111b,alpha:.88});
    this.shipPlaque.moveTo(shipX-14*s,shipY-9*s).lineTo(shipX-14*s,shipY+84*s).stroke({color:0xd3af76,width:2,alpha:.75});
    this.rotateHint.text=t('DRAG TO ROTATE');this.rotateHint.position.set(shipX,shipY-30*s);
    if(this.scene.astraMenuShip)this.scene.astraMenuShip.caption.visible=this.surface!=='home';
    if(this.shipName.width>width*.34)this.shipName.scale.set(width*.34/this.shipName.width);
    this.place('changeShip',shipX,shipY+46*s,160*s,30*s);
    const nav=['hangar','highscores','threatCodex','achievements','settings'], gap=8*s, nw=(width-left*2-gap*4)/5;
    nav.forEach((id,i)=>{this.buttons[id]._label.style.fontSize=Math.max(14,16*s)*fontScale;this.place(id,left+i*(nw+gap),navY,nw,42*s);});
    this.buttons.howToPlay._label.style.fontSize=Math.max(12,13*s); this.buttons.exit._label.style.fontSize=Math.max(12,13*s);
    this.place('howToPlay',width-250*s,20*s,150*s,32*s);this.place('exit',width-100*s,20*s,80*s,32*s);
    this.place('backHome',width*.43,20*s,150*s,40*s);
    this.chrome.clear();this.chrome.rect(0,navY-12*s,width,height-navY+12*s).fill({color:0x020811,alpha:.8});
    this.chrome.moveTo(left,navY-12*s).lineTo(width-left,navY-12*s).stroke({color:0x75b5bb,width:1,alpha:.35});
    if(width<600) {
      const full=width-left*2, footY=height-100, plaqueY=footY-85, otherY=plaqueY-56, playY=otherY-78;
      this.title.position.set(left,Math.max(44,height*.06));this.title.style.fontSize=40;this.title.style.lineHeight=44;
      this.invitation.position.set(left,playY-68);this.invitation.style.fontSize=17;this.invitation.style.wordWrapWidth=full;this.invitation.scale.set(1);
      this.place('launchTactical',left,playY,full,66);this.place('otherModes',left,otherY,full,44);
      this.shipLabel.position.set(left+12,plaqueY);this.shipName.position.set(left+12,plaqueY+18);this.shipName.style.fontSize=16;
      this.shipName.scale.set(1);if(this.shipName.width>full-24)this.shipName.scale.set((full-24)/this.shipName.width);
      this.place('changeShip',left,plaqueY+42,full,28);this.rotateHint.visible=false;
      this.shipPlaque.clear();this.shipPlaque.rect(left,plaqueY-7,full,78).fill({color:0x04111b,alpha:.9});
      nav.forEach((id,i)=>this.place(id,left+(i%3)*full/3,footY+Math.floor(i/3)*46,full/3,44));
      this.chrome.clear();this.chrome.rect(0,footY-8,width,height-footY+8).fill({color:0x020811,alpha:.9});
    } else this.rotateHint.visible=true;
    this.scene.legacyMenuLayer.visible=this.surface==='modes';
    for(const key of ['highscoreBtn','storyBtn','threatCodexBtn','achievementsBtn','settingsBtn','musicBtn','helpBtn','exitBtn'])this.scene[key].visible=false;
    if(this.surface==='modes') { this.scene.title.text=t('OTHER MODES'); this.scene.subtitle.visible=false; this.scene.menuPanel.visible=false; }
    this.syncModalPresentation();
  }

  syncModalPresentation() {
    const modal=Boolean(this.scene.quitConfirmOpen||this.scene.sectorSelectorOpen||this.scene.settingsOverlay||this.scene.howToPlayOverlay||this.scene.modeBriefingOverlay);
    this.eventMode=modal?'none':'passive';
    this.alpha=modal?.3:1;
    // Settings language changes can replace the turntable after layout finishes.
    if(this.scene.astraMenuShip)this.scene.astraMenuShip.caption.visible=this.surface!=='home';
  }

  openModes() {
    this.surface='modes'; this.scene.mayhemRunMode=RUN_MODES.RANKED;this.scene.newPilotCueDismissed=true;
    let saved={id:'launchTactical'}; try { saved=JSON.parse(localStorage.getItem(MODE_KEY)||'null')||saved; } catch { /* Local preference is optional. */ }
    if([RUN_MODES.OVERRUN_PURE,RUN_MODES.OVERRUN_TACTICAL].includes(saved.overrun))this.scene.overrunRunMode=saved.overrun;
    this.scene.buildMenuNavigation();
    const index=this.scene.menuOptions.findIndex(o=>o.id===saved.id); this.scene.setMenuFocus(Math.max(0,index));
    this.scene.refreshButtonCopy(this.scene.tacticalStartBtn,{forceGpuRefresh:true}); this.scene.layoutMenu();
  }
  closeModes() {
    this.rememberMode();
    this.scene.mayhemRunMode=RUN_MODES.MAYHEM_TACTICAL;
    this.surface='home'; this.scene.buildMenuNavigation(); this.scene.setMenuFocus(0); this.scene.layoutMenu();
  }
  rememberMode() {
    const id=this.scene.getSelectedMenuOptionId();
    if(this.surface!=='modes'||!['launchTactical','dailySignal','scout','sectorStart','overrun'].includes(id))return;
    try{localStorage.setItem(MODE_KEY,JSON.stringify({id,overrun:this.scene.overrunRunMode}));}catch{/* Local preference is optional. */}
  }
  navigate({up,down,left,right,confirm,cancel,tab,reverse}) {
    if(cancel){this.surface==='modes'?this.closeModes():this.scene.openQuitConfirmation();return;}
    if(up||left||(tab&&reverse))this.scene.moveMenuFocus(-1);
    else if(down||right||tab)this.scene.moveMenuFocus(1);
    if(confirm)this.scene.activateFocusedMenuOption();
  }
  debug() { return {surface:this.surface,primaryRunMode:RUN_MODES.MAYHEM_TACTICAL,selectedShip:this.scene.getQuickStartShipKey(),buttons:Object.fromEntries(Object.entries(this.buttons).map(([id,b])=>[id,{visible:b.visible,text:b._label.text,x:b.x,y:b.y,width:b._btnWidth,height:b._btnHeight}]))}; }
}
