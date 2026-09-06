# Original synthesized weapon mechanisms. No samples, voices or external assets.
# Regenerate with Python + numpy. Outputs are original project audio.
from pathlib import Path
import numpy as np
import wave

out=Path('public/audio/sfx/arsenal');out.mkdir(parents=True,exist_ok=True)
names=['conductor','forge','mirror','needle','vortex','jester','carrier','monolith','choir','clock']
rate=24000
for i,name in enumerate(names):
    duration=.84;t=np.arange(int(rate*duration))/rate
    rng=np.random.default_rng(7300+i)
    noise=rng.uniform(-1,1,len(t))
    low=np.convolve(noise,np.ones(24)/24,mode='same')
    envelope=np.minimum(1,t/.025)*np.maximum(0,1-t/duration)**.75
    base=43+i*2
    rumble=np.sin(2*np.pi*(base*t+14*t*t))*.30+low*.30
    signal=rumble*envelope
    # Short servo strokes: each assembly has a different cadence and resonance.
    beats=[6,2,4,3,5,3,4,3,6,8][i]
    for j in range(beats):
        start=.035+j*.42/max(1,beats-1)
        a=np.maximum(0,t-start);gate=(t>=start)*np.exp(-a*(28 if i in [1,7] else 43))
        freq=180+i*33+j*17
        metal=np.sin(2*np.pi*freq*a)+.35*np.sin(2*np.pi*freq*2.71*a)
        signal+=gate*(metal*.22+noise*.10)
    rising=130+i*24
    whine=np.sin(2*np.pi*(rising*t+100*t*t))
    if i in [2,8]:whine+=np.sin(2*np.pi*((rising*1.5)*t+60*t*t))*.4
    signal+=whine*np.sin(np.minimum(1,t/duration)*np.pi)**2*.14
    signal*=np.minimum(1,np.maximum(0,(duration-t)/.06))
    signal=signal/(max(.001,np.max(np.abs(signal))))*.68
    with wave.open(str(out/f'{name}.wav'),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((signal*32767).astype('<i2').tobytes())
    print(name,'peak',round(float(np.max(np.abs(signal))),3),'rms',round(float(np.sqrt(np.mean(signal**2))),3))
