const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root='E:/Codex/tmp/nova-rescue-batch/prepared',checkpoint='E:/Codex/builds/nova-swarm/rescue-batch/source-before';fs.mkdirSync(root,{recursive:true});
const edits={
 'src/entities/Bullet.js':[
 ['this.behaviorPhase = Math.random() * Math.PI * 2;','this.behaviorPhase = Number.isFinite(visualConfig?.cosmeticPhase) ? visualConfig.cosmeticPhase : Math.random() * Math.PI * 2;']
 ],
 'src/game/ArcadeFirstLight.js':[
 ['  const radius = target.radius + Math.min(12, Number(bullet.radius) || 0);',`  if(target.halfWidth&&target.halfHeight){
    const expand=Math.min(12,Number(bullet.radius)||0),rx=target.halfWidth+expand,ry=target.halfHeight+expand;
    const nx=(ax-target.x)/rx,ny=(ay-target.y)/ry,ndx=dx/rx,ndy=dy/ry;
    const t=Math.max(0,Math.min(1,-(nx*ndx+ny*ndy)/(ndx*ndx+ndy*ndy||1)));
    return (nx+t*ndx)**2+(ny+t*ndy)**2<=1;
  }
  const radius = target.radius + Math.min(12, Number(bullet.radius) || 0);`]
 ],
 'src/managers/ArcadeFirstLightDirector.js':[
 ["if(this.event&&!this.event.won)AudioManager.playSfx(`first_light_${this.event.kind==='convoy'?'convoy_depart':'rival_retreat'}`);","if(this.event&&!this.event.won)AudioManager.playSfx(`first_light_${this.event.kind==='convoy'?'convoy_depart':'rival_retreat'}`,{preserveGameplayRng:Boolean(this.event.surprise)});"],
 ["AudioManager.playSfx('first_light_convoy_rescue_join');","AudioManager.playSfx('first_light_convoy_rescue_join',{preserveGameplayRng:Boolean(this.event?.surprise)});"],
 ['const b=new Bullet(target.x,target.y+24,Math.cos(angle)*3,Math.sin(angle)*3,1,0xffa16b,false);','const b=new Bullet(target.x,target.y+24,Math.cos(angle)*3,Math.sin(angle)*3,1,0xffa16b,false,{cosmeticPhase:e.age*.73});'],
 ["if(cover){this.model.hit(cover.part,Number(bullet.damage)||1,bullet);s.bulletManager.deactivateBullet(bullet,'rescue_cover');}","if(cover&&this.model.hit(cover.part,Number(bullet.damage)||1,bullet))s.bulletManager.deactivateBullet(bullet,'rescue_cover');"],
 ['const b=new Bullet(ally.x,ally.y-18,Math.sin(angle)*10,-Math.cos(angle)*10,Math.max(.6,(Number(s.player.bulletDamage)||1)*(ally.side<0?.4:.8)),ally.side<0?0x73e8d1:0xffd08b,true);','const heading=pressure?Math.atan2(pressure.y-ally.y,pressure.x-ally.x):null;\n        const b=new Bullet(ally.x,ally.y-18,pressure?Math.cos(heading)*10:Math.sin(angle)*10,pressure?Math.sin(heading)*10:-Math.cos(angle)*10,Math.max(.6,(Number(s.player.bulletDamage)||1)*(ally.side<0?.4:.8)),ally.side<0?0x73e8d1:0xffd08b,true,this.model.encounter?.surprise?{cosmeticPhase:ally.age*1.3}:null);']
 ]
};
const rows=[];
for(const [source,pairs]of Object.entries(edits)){
 const bytes=fs.readFileSync(source);let text=bytes.toString('utf8');
 for(const [a,b]of pairs){if(text.includes(b))continue;if(text.split(a).length!==2)throw Error('Ambiguous edit '+source);text=text.replace(a,b);}
 const before=path.join(checkpoint,path.basename(source));if(!fs.existsSync(before))fs.writeFileSync(before,bytes);
 const prepared=path.join(root,path.basename(source));fs.writeFileSync(prepared,text);rows.push({source:path.resolve(source),prepared,beforeSha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(rows,null,2));console.log('Prepared bounded rescue safety edits');
