import { Container, Graphics } from 'pixi.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';

let registered = false;
export const MENU_AUDIO_TIP = 'Crew too chatty? Engines too loud? Tame sounds and voices in Settings. The swarm has no mute button.';

export function claimLaunchTip(storage) {
  if (registered) return false;
  registered = true;
  let count = 1;
  try {
    storage ||= globalThis.localStorage;
    count = Math.max(0, Math.floor(Number(storage.getItem('nova_audio_tip_launches_v1')) || 0)) + 1;
    storage.setItem('nova_audio_tip_launches_v1', String(count));
  } catch { /* An unavailable preference store must not interrupt launching. */ }
  return count === 1 || count % 10 === 0;
}

export class MenuAudioTip extends Container {
  constructor() {
    super();
    this.label = 'ui_menu_audio_launch_tip';
    this.zIndex = 90;
    this.eventMode = 'none';
    this.startedAt = null;
    this.plate = new Graphics();
    this.copy = createText(translateText(MENU_AUDIO_TIP), {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif', fontSize: 16,
      fill: '#d7eef4', fontWeight: '600', wordWrap: true, wordWrapWidth: 398
    });
    this.copy.position.set(18, 14);
    this.addChild(this.plate, this.copy);
    this.alpha = 0;
  }

  update(width, height, obstructed = false) {
    this.startedAt ??= performance.now();
    const elapsed = performance.now() - this.startedAt;
    if (elapsed > 10500 || obstructed) { this.destroy({children:true}); return; }
    const w = Math.min(440, width - 36);
    this.copy.style.wordWrapWidth = w - 36;
    const h = this.copy.height + 28;
    this.position.set((width-w)/2, height < 600 ? 10 : 24);
    this.alpha = Math.min(1, Math.max(0,(elapsed-1500)/650), Math.max(0,(10500-elapsed)/900));
    this.plate.clear().roundRect(0,0,w,h,10).fill({color:0x05131f,alpha:.96});
    this.plate.roundRect(0,0,w,h,10).stroke({color:0x75e4e5,alpha:.48,width:1});
    this.plate.moveTo(18,h-1).lineTo(18+(w-36)*Math.max(0,1-(elapsed-1500)/9000),h-1).stroke({color:0x9ceee0,width:2,alpha:.8});
  }
}
