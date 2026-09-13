"""Decode and compare the actual old creature recordings; no filename uniqueness claims."""
import json, pathlib, subprocess, hashlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/creature-audio'
OUT.mkdir(exist_ok=True)
def decode(p):
    r = subprocess.run(['ffmpeg','-v','error','-i',str(p),'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True,check=True)
    return np.frombuffer(r.stdout,dtype='<f4')
def features(x):
    n=1024; frames=np.array([x[i:i+n] for i in range(0,len(x)-n,512)])
    spec=np.abs(np.fft.rfft(frames*np.hanning(n)))**2
    freq=np.fft.rfftfreq(n,1/16000)
    bands=np.array([spec[:,(freq>=lo)&(freq<hi)].mean() for lo,hi in zip([40,100,200,400,800,1600,3200],[100,200,400,800,1600,3200,7800])])
    bands/=max(bands.sum(),1e-12)
    env=np.sqrt((frames**2).mean(axis=1)); env/=max(env.max(),1e-9)
    rhythm=np.interp(np.linspace(0,1,40),np.linspace(0,1,len(env)),env)
    return dict(seconds=round(len(x)/16000,3),peakDb=round(float(20*np.log10(max(np.max(np.abs(x)),1e-9))),2),rmsDb=round(float(20*np.log10(max(np.sqrt(np.mean(x*x)),1e-9))),2),centroidHz=round(float((spec*freq).sum()/max(spec.sum(),1e-9))),bands=bands.tolist(),envelope=rhythm.tolist(),activeFraction=round(float((env>.35).mean()),3))
rows=[]
for folder in ['predator-20260908','core-serpent']:
    for p in sorted((ROOT/'public/audio/sfx'/folder).glob('*.mp3')):
        if not ('serpent' in p.name or 'boss_beast' in p.name):continue
        x=decode(p); rows.append(dict(path=str(p.relative_to(ROOT)).replace('\\','/'),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),**features(x)))
pairs=[]
active=[r for r in rows if 'predator-20260908' in r['path'] and ('hunt' in r['path'] or 'boss_beast' in r['path'])]
for i,a in enumerate(active):
    for b in active[i+1:]:
        av=np.sqrt(a['bands']);bv=np.sqrt(b['bands']); spectral=float(av@bv)
        rhythm=float(np.corrcoef(a['envelope'],b['envelope'])[0,1])
        pairs.append(dict(a=a['path'],b=b['path'],spectralOverlap=round(spectral,4),envelopeCorrelation=round(rhythm,4)))
pairs.sort(key=lambda r:r['spectralOverlap']+.2*r['envelopeCorrelation'],reverse=True)
(OUT/'baseline-analysis.json').write_text(json.dumps(dict(note='Decoded spectral energy and amplitude-envelope analysis; not a human listening test. High overlap flags candidates, not proof of perceptual identity.',recordings=rows,closestPairs=pairs[:30]),indent=2))
print(json.dumps(dict(recordings=len(rows),uniqueBytes=len(set(r['sha256'] for r in rows)),centroidRange=[min(r['centroidHz'] for r in active),max(r['centroidHz'] for r in active)],closestPairs=pairs[:4]),indent=2))
