import {mkdir,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const apiKey=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;
if(!apiKey)throw new Error('ElevenLabs API key must be supplied in the environment.');
const root='public/audio/ambience/orbital-hangar';await mkdir(root,{recursive:true});
const common='Cinematic orbital hangar ambience. Seamless, mysterious, restrained. No music, melody, beat, voices or alarms. ';
const stems=[
 {id:'reactor',duration:29,text:'Deep powerful distant reactor resonance with textured bass machinery and a huge enclosed space. The low air pressure very slowly breathes, industrial energy behind thick walls. Rich quiet low midrange so it remains present on small speakers. A restrained living spacecraft, no big loud events.'},
 {id:'machinery',duration:23,text:'Very distant magnetic machinery moving and turbine systems cycling in an enormous hangar, soft diffuse air and metallic resonances. Uneven slow swells, tiny servo movements, long room reflections. Minimal bass because this is a detail layer over a reactor. Calm anticipation, restrained and realistic.'},
 {id:'signals',duration:19,text:'Sparse distant non melodic electronic energy tones, ghostly communications equipment resonance and faint synthetic pulses with irregular long pauses, blurred by a vast reverberant space. Strange advanced technology working quietly beyond the ship. No recognizable notes or tune, no arpeggios, no regular beep sequence.'},
 {id:'shimmer',duration:17,text:'Extremely delicate high frequency crystalline energy shimmer and soft electrical filaments moving in distant space. Airy spectral texture that slowly appears and disappears, faint charged dust and gentle electromagnetic interference, soft non tonal glass-like resonance, never piercing or bright. No percussion or melody.'}
];
const receipt=[];
for(const stem of stems){
 const file=`${root}/${stem.id}.mp3`;
 try{await access(file);console.log('Existing authored stem',stem.id);continue;}catch{}
 const body={text:common+stem.text,duration_seconds:stem.duration,prompt_influence:.65,model_id:'eleven_text_to_sound_v2',loop:true};
 const response=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw new Error(`ElevenLabs ${stem.id}: HTTP ${response.status} ${JSON.stringify((await response.json()).detail)}`);
 const data=Buffer.from(await response.arrayBuffer());await writeFile(file,data);
 receipt.push({id:stem.id,file,request:body,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,generatedAt:new Date().toISOString()});
 await writeFile('docs/fleet-identity-20260908/hangar-audio-receipt.json',JSON.stringify(receipt,null,2));
 console.log('ELEVENLABS_HANGAR_STEM',stem.id,data.length);
}
