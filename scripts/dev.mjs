import { spawn } from 'node:child_process';
// Invoke pnpm through its JS entrypoint, avoiding Windows .cmd shell handling.
const cli = process.env.npm_execpath;
if (!cli) throw new Error('Run with pnpm dev');
const children = [];
const build = spawn(process.execPath,[cli,'-r','build'],{stdio:'inherit'});
build.on('exit',code => {
 if (code !== 0) {process.exitCode = code ?? 1; return;}
 for (const name of ['@hex/server','@hex/web']) {
  const child = spawn(process.execPath,[cli,'--filter',name,'dev'],{stdio:'inherit'});
  children.push(child);
  child.on('exit',code => { if (code) {process.exitCode=code; for (const other of children) other.kill();} });
 }
});
for (const sig of ['SIGINT','SIGTERM']) process.on(sig,()=>{build.kill();for(const child of children)child.kill();});
