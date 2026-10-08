import { translateText as t } from '../i18n/index.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { getProfileScopedStorageKey } from '../profile/ProfileStorageNamespace.js';

export function explainOnslaughtFirstFlight(game) {
  const key=getProfileScopedStorageKey('novaSwarm.onslaughtFirstFlight.v1');
  try { if(localStorage.getItem(key)==='seen')return Promise.resolve(true); } catch { /* optional preference */ }
  if(typeof document==='undefined')return Promise.resolve(true);
  if(game.onslaughtBriefingPromise)return game.onslaughtBriefingPromise;
  game.onslaughtBriefingOpen=true;
  game.onslaughtBriefingPromise=new Promise(resolve=>{
    const previousFocus=document.activeElement;
    const overlay=document.createElement('div');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',t('ONSLAUGHT'));
    overlay.style.cssText='position:fixed;inset:0;z-index:999999;background:#020811eb;display:grid;place-items:center;color:#eaf7ff;font-family:Rajdhani,Segoe UI,sans-serif;padding:24px';
    const panel=document.createElement('div');panel.style.cssText='max-width:660px;padding:30px;border:1px solid #cfaa74;background:#102036;border-radius:8px';overlay.append(panel);
    for(const [tag,source] of [['h1','ONSLAUGHT'],['h2','Sector 51 · Prepared Tactical loadout · Full career XP'],['p','Launch straight into the late-game fight and chase separate global records from a zero starting score.'],['p','Earn full career XP from eligible post-launch events. Supplied upgrades and skipped sectors grant no rewards or checkpoint credit.']]){const el=document.createElement(tag);el.textContent=t(source);el.style.lineHeight='1.4';panel.append(el);}
    const controls=document.createElement('div');controls.style.cssText='display:flex;gap:18px;margin-top:24px';panel.append(controls);
    const nav=new GamepadNavigator();nav.suppressUntilReleased();let frame=0,closed=false;
    const finish=accepted=>{if(closed)return;closed=true;cancelAnimationFrame(frame);window.removeEventListener('keydown',keys,true);overlay.remove();game.onslaughtBriefingOpen=false;game.onslaughtBriefingPromise=null;if(accepted){try{localStorage.setItem(key,'seen');}catch{}}else previousFocus?.focus?.();game.currentScene?.menuGamepadNavigator?.suppressUntilReleased();game.currentScene?.gamepadNavigator?.suppressUntilReleased();resolve(accepted);};
    const buttons=[];
    for(const [source,accepted] of [['START FLIGHT',true],['BACK',false]]){const b=document.createElement('button');b.textContent=t(source);b.style.cssText='padding:14px 20px;background:#183b40;color:#edfff7;border:1px solid #9cdace;border-radius:4px;font:700 18px Rajdhani,Segoe UI,sans-serif;cursor:pointer';b.onclick=()=>finish(accepted);controls.append(b);buttons.push(b);}
    let focused=0;
    const keys=e=>{e.stopImmediatePropagation();if(['Escape','Enter',' ','Tab','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(e.key==='Escape')finish(false);else if(e.key==='Enter'||e.key===' ')finish(focused===0);else if(['Tab','ArrowLeft','ArrowRight'].includes(e.key)){focused=1-focused;buttons[focused].focus();}};
    const poll=()=>{const p=nav.update().pressed;if(p.cancel||p.back)finish(false);else if(p.confirm)finish(focused===0);else if(p.left||p.right||p.up||p.down){focused=1-focused;buttons[focused].focus();}if(!closed)frame=requestAnimationFrame(poll);};
    window.addEventListener('keydown',keys,true);document.body.append(overlay);buttons[0].focus();frame=requestAnimationFrame(poll);
  });
  return game.onslaughtBriefingPromise;
}
