const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const root='E:/Codex/builds/nova-swarm/rescue-batch',before=root+'/source-before',baseline='E:/Codex/builds/nova-swarm/surprises/current';
const files={
 'src/game/ArcadeFirstLight.js':'ArcadeFirstLight.js',
 'src/managers/ArcadeFirstLightDirector.js':'ArcadeFirstLightDirector.js',
 'src/effects/ArcadeFirstLightVisual.js':'ArcadeFirstLightVisual.js',
 'src/entities/Bullet.js':'Bullet.js',
 'src/config/EncounterEvolutionTest.js':'EncounterEvolutionTest.js',
 'src/config/EncounterPacing.js':'EncounterPacing.js',
 'src/i18n/firstLightText.js':'firstLightText.js',
 'src/effects/PremiumArt.js':'PremiumArt.js',
 'src/audio/SoundCatalog.js':'SoundCatalog.js',
 'src/assets/assetManifest.js':'assetManifest.js'
 ,'src/effects/CombatWreckVisual.js':'CombatWreckVisual.js'
};
let patch='';
for(const [file,old]of [...Object.entries(files).map(([f,n])=>[f,before+'/'+n]),...['version.json','sw.js','_headers'].map(n=>['public/'+n,baseline+'/'+n])]){
 let data;try{data=execFileSync('git',['diff','--no-index','--binary','--',old,file],{encoding:'utf8',maxBuffer:10000000});}catch(e){if(e.status!==1)throw e;data=e.stdout;}
 patch+=data.replace(/^diff --git .*$/m,`diff --git a/${file} b/${file}`).replace(/^--- .*$/m,`--- a/${file}`).replace(/^\+\+\+ .*$/m,`+++ b/${file}`);
}
fs.writeFileSync(root+'/rollback.patch',patch);
execFileSync('git',['apply','--reverse','--check','--ignore-space-change',root+'/rollback.patch'],{stdio:'inherit'});
console.log('PASS source-only reverse review; new unused helpers, unique assets, tests and documentation are retained. Nothing applied.');
