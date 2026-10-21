import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const address='http://localhost:2567';
async function healthy(){
 try{const response=await fetch(`${address}/health`,{signal:AbortSignal.timeout(1000)});const value=await response.json();return value.app==='hex-mahjong';}catch{return false;}
}
function ready(){
 console.log(`\nPlay Hex Mahjong: ${address}\nChoose “Play against 3 bots”, inspect your hand, declare a missing suit, then choose your Hex card.\nAll nine Hex cards are enabled, with two selections per round.\n`);
 if(process.platform==='darwin'&&!process.argv.includes('--no-open')){
  const browser=spawn('open',[address],{stdio:'ignore'});browser.on('error',()=>{});
 }
}
if(await healthy()){ready();}else{
 const entry=fileURLToPath(new URL('../apps/server/dist/index.js',import.meta.url));
 if(!existsSync(entry))throw Error('Build the project first: pnpm build');
 const server=spawn(process.execPath,[entry],{cwd:root,stdio:'inherit',env:{...process.env,PORT:'2567'}});
 let stopped=false;
 server.on('exit',code=>{stopped=true;process.exitCode=code??1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
 let started=false;
 for(let i=0;i<50&&!stopped;i++){
  if(await healthy()){started=true;ready();console.log('Leave this terminal open while playing. Press Control+C to stop.');break;}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!started&&!stopped){server.kill();throw Error('Could not start the local server. Check whether port 2567 is already occupied.');}
}
