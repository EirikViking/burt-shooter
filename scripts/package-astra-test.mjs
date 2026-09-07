import {readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const candidateDist=process.env.ASTRA_DIST || 'test-results/astra-candidate-dist';
if(!existsSync(path.join(candidateDist,'index.html')))throw new Error(`Missing built candidate: ${candidateDist}`);
const output=path.resolve('test-results',`astra-build-${stamp}`);
if(existsSync(output))throw new Error('Refusing to replace an existing build');
mkdirSync(output,{recursive:true});
const config=JSON.parse(readFileSync('electron-builder.json','utf8'));
config.directories.output=output;
config.files=config.files.map(entry=>entry==='dist/**/*'?{from:candidateDist,to:'dist',filter:['**/*']}:entry);
// The candidate dist above has its own file matcher. Do not recursively scan
// preserved builds and capture evidence through the repository-root matcher.
config.files.push('!test-results{,/**/*}');
const configPath=path.join(output,'builder-config.json');writeFileSync(configPath,JSON.stringify(config,null,2));
writeFileSync('test-results/astra-build-location.json',JSON.stringify({output,configPath,executable:path.join(output,'win-unpacked','Nova Swarm.exe')},null,2));
const log=openSync(path.join(output,'packaging.log'),'w');
const child=spawn(process.execPath,[path.resolve('node_modules/electron-builder/out/cli/cli.js'),'--config',configPath,'--win','dir','--x64','--publish','never'],{cwd:process.cwd(),env:{...process.env,CSC_IDENTITY_AUTO_DISCOVERY:'false'},windowsHide:true,stdio:['ignore',log,log]});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});closeSync(log);
console.log(JSON.stringify({code,output}));process.exitCode=code??1;
