"""Reproducible creature cue editing. Originals are never modified.
Render short related gestures from each unique performance, with controlled headroom.
"""
import pathlib, json, subprocess, hashlib, wave, sys
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'docs/creature-audio'; OUT=ROOT/'public/audio/sfx/creatures-v2'; OUT.mkdir(parents=True,exist_ok=True)
SR=44100
def decode(p):
 r=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-ac','2','-ar',str(SR),'-af','highpass=f=48,lowpass=f=7800','-f','f32le','-'],capture_output=True,check=True)
 x=np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2).copy()
 mid=x.mean(axis=1);rms=np.sqrt(np.mean(x*x))
 if np.sqrt(np.mean(mid*mid))<rms*.5:
  # A few generated stereo tails cancel in mono. Keep the stronger channel as the stable center.
  mono=x[:,np.argmax(np.mean(x*x,axis=0))];x=np.stack([mono,mono],axis=1)
 else:
  x=mid[:,None]+(x-mid[:,None])*.65
 return x
def fade(x,ins=.025,outs=.12):
 x=x.copy();a=min(len(x),int(ins*SR));b=min(len(x),int(outs*SR))
 x[:a]*=np.linspace(0,1,a)[:,None];x[-b:]*=np.linspace(1,0,b)[:,None];return x
def window(x,start,duration):
 n=int(duration*SR);y=np.zeros((n,2),np.float32);piece=x[int(start*SR):int(start*SR)+n];y[:len(piece)]=piece;return fade(y)
def active_window(x,duration,region=(0,1)):
 a=int(len(x)*region[0]);b=int(len(x)*region[1]);n=min(int(duration*SR),b-a)
 if n<SR//5:return window(x,0,duration)
 energy=np.mean(x*x,axis=1);sums=np.concatenate(([0],np.cumsum(energy,dtype=np.float64)))
 starts=np.arange(a,max(a+1,b-n+1),max(1,SR//30));energies=sums[starts+n]-sums[starts]
 start=int(starts[np.argmax(energies)])
 return window(x,start/SR,duration)
def overlap(a,b,delay,gain):
 y=a.copy();k=int(delay*SR);n=min(len(y)-k,len(b));
 if n>0:y[k:k+n]+=b[:n]*gain
 return y
def master(x,target=-21):
 # Conservatively normalize the active signal, not silence. Soft peak limiting only if required.
 rms=np.sqrt(np.mean(x*x));peak=np.max(np.abs(x));gain=min(10**((target-20*np.log10(max(rms,1e-9)))/20),.64/max(peak,1e-9))
 return fade(x*gain,.008,.10)
def write_wav(p,x):
 with wave.open(str(p),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
only=set(sys.argv[1:]);previous=json.loads((SRC/'mastering.json').read_text()) if only and (SRC/'mastering.json').exists() else {'rows':[]}
rows=[r for r in previous['rows'] if r['id'] not in only]
for p in json.loads((SRC/'design.json').read_text()):
 if only and p['id'] not in only:continue
 events=['signature','death_body' if p['id']=='space_snake_mantis' else 'death','aggression','mechanism']
 paths=[SRC/'originals'/f"{p['id']}-{event}.mp3" for event in events]
 if not all(x.exists() for x in paths):continue
 signature,death,aggression,mechanism=map(decode,paths)
 arrival=active_window(signature,3.5,(0,.8));hunt=active_window(signature,2.5,(.2,.75));alt=active_window(signature,2.5,(.6,1))
 # Preserve the native anatomy, varying articulation rather than transposing the same roar.
 anatomy=active_window(mechanism,1.0)
 arrival=overlap(arrival,anatomy,.22,.26)
 # The first analysis found these two signatures too close in broadband breath and phrasing.
 # Give the illusion predator an interrupted near/far response; the collector gets tangible crop clatter.
 if p['id']=='nova_boss_23':
  arrival=np.zeros((int(3.5*SR),2),np.float32)
  arrival=overlap(arrival,fade(active_window(signature,1.15)[::-1]),.08,.85)
  arrival=overlap(arrival,active_window(signature,1.25,(.45,1)),1.65,.48)
  arrival=overlap(arrival,active_window(mechanism,.22),3.05,.58)
 if p['id']=='nova_boss_48':
  arrival[:int(1.25*SR)]*=.24
  for start,source in [(.08,.05),(.44,.75),(.94,1.55)]:arrival=overlap(arrival,window(mechanism,source,.26),start,.72)
 if np.sqrt(np.mean(alt*alt))<np.sqrt(np.mean(hunt*hunt))*.18:alt=active_window(aggression,2.5)
 attack=active_window(mechanism,.85);fracture=overlap(active_window(mechanism,.65,(.35,1)),active_window(death,.3),.16,.22)
 phase=overlap(active_window(aggression,2.8),anatomy,1.45,.18)
 rage=overlap(active_window(aggression,3.2),active_window(signature,1.15,(.4,1)),.68,.24)
 cues={'arrival':arrival,'hunt':hunt,'hunt_alt':alt,'attack':attack,'break':fracture,'phase':phase,'rage':rage,'death':window(death,0,4)}
 parts=[];stats={}
 for name,x in cues.items():
  y=master(x,-22 if name in ['attack','break'] else -20.5);parts += [y,np.zeros((int(.12*SR),2),np.float32)]
  stats[name]={'rmsDb':round(float(20*np.log10(max(np.sqrt(np.mean(y*y)),1e-9))),2),'peakDb':round(float(20*np.log10(max(np.max(np.abs(y)),1e-9))),2),'sha256':hashlib.sha256(y.tobytes()).hexdigest()}
 bank=np.concatenate(parts);tmp=SRC/f"{p['id']}.wav";write_wav(tmp,bank)
 target=OUT/f"{p['id']}.mp3"
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(tmp),'-c:a','libmp3lame','-b:a','160k',str(target)],check=True)
 # Only the known intermediate created above is removed. Provider originals stay editable.
 tmp.unlink()
 rows.append({'id':p['id'],'sourceSHA256':[hashlib.sha256(x.read_bytes()).hexdigest() for x in paths],'bankSHA256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'cues':stats})
 print('Mastered',p['id'],flush=True)
(SRC/'mastering.json').write_text(json.dumps({'process':'44.1kHz stereo; 48Hz highpass and 7.8kHz lowpass; phrase edits, brief overlap for escalation, fades, active-phrase RMS and conservative -3.9dB sample-peak ceiling. Playback rate remains 1. No external source uploads.', 'rows':rows},indent=2))
print('Banks:',len(rows))
