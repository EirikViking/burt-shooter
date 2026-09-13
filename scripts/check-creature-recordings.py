import pathlib,json,subprocess,hashlib
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
names=[('arrival',3.5),('hunt',2.5),('hunt_alt',2.5),('attack',.85),('break',.65),('phase',2.8),('rage',3.2),('death',4)]
def profile(x):
 n=1024;frames=np.array([x[i:i+n] for i in range(0,len(x)-n,256)])
 power=np.abs(np.fft.rfft(frames*np.hanning(n)))**2;freq=np.fft.rfftfreq(n,1/16000)
 bands=np.array([power[:,(freq>=lo)&(freq<hi)].mean() for lo,hi in zip([40,100,200,400,800,1600,3200],[100,200,400,800,1600,3200,7800])]);bands/=max(bands.sum(),1e-12)
 envelope=np.sqrt((frames**2).mean(axis=1));envelope/=max(envelope.max(),1e-9)
 return {'bands':bands.tolist(),'envelope':np.interp(np.linspace(0,1,40),np.linspace(0,1,len(envelope)),envelope).tolist(),'centroidHz':int((power*freq).sum()/max(power.sum(),1e-9)),'rmsDb':round(float(20*np.log10(max(np.sqrt(np.mean(x*x)),1e-9))),2),'peakDb':round(float(20*np.log10(max(np.max(np.abs(x)),1e-9))),2)}
rows=[];errors=[]
for p in sorted((ROOT/'public/audio/sfx/creatures-v2').glob('*.mp3')):
 result=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True,check=True)
 x=np.frombuffer(result.stdout,dtype='<f4');offset=0;cues={}
 for name,duration in names:
  sample=x[round(offset*16000):round((offset+duration)*16000)];cues[name]=profile(sample);offset+=duration+.12
  if cues[name]['peakDb']>-.5 or cues[name]['rmsDb']< -34:errors.append(f'{p.stem}/{name}: unusable levels {cues[name]["rmsDb"]}/{cues[name]["peakDb"]}')
 if abs(len(x)/16000-offset)>.08:errors.append(f'{p.stem}: incorrect bank duration')
 rows.append({'id':p.stem,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'seconds':len(x)/16000,'bytes':p.stat().st_size,'cues':cues})
if len(rows)!=64:errors.append(f'Expected 64 banks, found {len(rows)}')
if len(set(r['sha256'] for r in rows))!=64:errors.append('Duplicate or missing banks')
pairs=[]
for i,a in enumerate(rows):
 for b in rows[i+1:]:
  fa=a['cues']['arrival'];fb=b['cues']['arrival'];spectral=float(np.sqrt(fa['bands'])@np.sqrt(fb['bands']));temporal=float(np.corrcoef(fa['envelope'],fb['envelope'])[0,1])
  pairs.append({'a':a['id'],'b':b['id'],'spectralOverlap':round(spectral,4),'rhythmCorrelation':round(temporal,4)})
pairs.sort(key=lambda p:p['spectralOverlap']+.2*p['rhythmCorrelation'],reverse=True)
report={'note':'Decoded bank boundaries, level and acoustic similarity checks; not a listening verdict. Similar spectral envelopes alone do not imply perceptual interchangeability.','errors':errors,'rows':rows,'closestPairs':pairs[:30]}
(ROOT/'docs/creature-audio/quality.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'banks':len(rows),'bytes':sum(r['bytes'] for r in rows),'errors':errors,'closestPairs':pairs[:8]},indent=2))
if errors:raise SystemExit(1)
