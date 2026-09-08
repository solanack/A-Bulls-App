import { spawnSync } from 'node:child_process';

const steps=[
  ['npm',['test']],
  ['npm',['run','build']],
  ['npx',['wrangler','deploy','--dry-run','--config','workers/wrangler.production.toml']],
  ['npx',['wrangler','d1','migrations','apply','INTELLIGENCE_DB','--remote','--config','workers/wrangler.production.toml']],
  ['npx',['wrangler','deploy','--config','workers/wrangler.production.toml']],
  ['npx',['wrangler','deploy']],
  [process.execPath,['scripts/check-live.mjs']],
];
for(const [command,args] of steps){
  console.log(`Running ${command} ${args.join(' ')}`);
  const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,CF_DEPLOY:'1'}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
