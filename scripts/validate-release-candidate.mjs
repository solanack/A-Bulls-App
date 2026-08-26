import { readdir,readFile,access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve,relative } from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const failures=[];
const note=message=>process.stdout.write(`${message}\n`);
const fail=message=>{failures.push(message);process.stderr.write(`FAIL · ${message}\n`);};
const ok=message=>note(`PASS · ${message}`);

async function filesIn(directory,predicate=()=>true){const base=resolve(root,directory),out=[];for(const entry of await readdir(base,{withFileTypes:true}).catch(()=>[])){if(entry.isFile()&&predicate(entry.name))out.push(resolve(base,entry.name));}return out;}
async function exists(path){try{await access(resolve(root,path));return true;}catch{return false;}}
async function text(path){return readFile(resolve(root,path),'utf8');}
function run(label,command,args){const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:process.env});if(result.status!==0){fail(label);return false;}ok(label);return true;}
function expect(label,condition){condition?ok(label):fail(label);}

note(`A Bulls App release-candidate validation · Node ${process.version}`);
expect('Node 22 or newer',Number(process.versions.node.split('.')[0])>=22);

const modules=[...await filesIn('js',name=>name.endsWith('.mjs')),...await filesIn('workers',name=>name.endsWith('.mjs')),...await filesIn('services/intelligence-bridge',name=>name.endsWith('.mjs'))];
for(const file of modules){const rel=relative(root,file);const result=spawnSync(process.execPath,['--check',file],{cwd:root,stdio:'pipe',encoding:'utf8'});if(result.status!==0)fail(`syntax ${rel}: ${String(result.stderr||result.stdout).trim()}`);}
if(!failures.some(item=>item.startsWith('syntax ')))ok(`syntax checked ${modules.length} modules`);
for(const file of ['js/config.js','js/main.js','sw.js'])run(`syntax ${file}`,process.execPath,['--check',file]);

const tests=[...await filesIn('js',name=>name.endsWith('.test.mjs')),...await filesIn('workers',name=>name.endsWith('.test.mjs')),...await filesIn('services/intelligence-bridge',name=>name.endsWith('.test.mjs')),...await filesIn('tests',name=>name.endsWith('.test.mjs'))];
if(tests.length)run(`complete Node test suite (${tests.length} files)`,process.execPath,['--test',...tests]);else fail('no test files discovered');

const [config,index,entry,bootstrap,workspace,market,sw,wrangler,runbook]=await Promise.all(['js/config.js','index.html','js/experience-entry.mjs','js/experience-bootstrap.mjs','js/intelligence-workspace-vnext.mjs','js/token-market-workspace.mjs','sw.js','workers/wrangler.toml','docs/CLOUDFLARE-RELEASE-CANDIDATE.md'].map(text));
expect('replacement shell enabled',/nextProductShellEnabled:\s*true/.test(config));
expect('universe enabled in browser shell',/universeEnabled:\s*true/.test(config));
expect('Trickster enabled in browser shell',/tricksterStudioEnabled:\s*true/.test(config));
expect('replacement module loaded',/experience-entry\.mjs\?v=8/.test(index));
expect('field investigation routing present',/fieldCommandRequest/.test(bootstrap)&&/field-investigation-create/.test(bootstrap));
expect('field hub cached',/field-investigation-hub/.test(sw));
expect('field investigation trail cached',/field-investigation-trail/.test(sw));
expect('field evidence scope cached',/field-evidence-scope/.test(sw));
expect('production request guard wired',/intelligence-request-guard/.test(await text('workers/worker-vnext-entry.mjs')));
expect('Trickster project store cached',/trickster-project-store/.test(sw));
expect('Trickster share client cached',/trickster-share-client/.test(sw));
expect('vNext-70 PWA checkpoint',/8\.7\.0-vnext-70/.test(sw));
expect('NO INDEXED EVIDENCE truth state',/NO INDEXED EVIDENCE/.test(market)||/NO INDEXED EVIDENCE/.test(workspace));
expect('Worker 8.2.0 reconstruction configured',/reconstruct-worker-8\.2\.0\.mjs/.test(wrangler));
expect('Trickster shares fail closed by default',/TRICKSTER_SHARE_ENABLED\s*=\s*"false"/.test(wrangler));
expect('external retrieval fails closed by default',/INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED\s*=\s*"false"/.test(wrangler));
expect('migration 0014 exists',await exists('workers/migrations/0014_trickster_share_manifests.sql'));
expect('share page exists',await exists('share.html'));
expect('privacy page exists',await exists('privacy.html'));
expect('Cloudflare Pages headers are policy syntax',!/<html|<!doctype/i.test(await text('_headers'))&&/X-Content-Type-Options:\s*nosniff/.test(await text('_headers')));
expect('terms page exists',await exists('terms.html'));
expect('release runbook tracks 0014',/0014/.test(runbook)&&/TRICKSTER_SHARE_ENABLED/.test(runbook));

const retiredTargets=[index,config,entry,workspace,market,sw,wrangler].join('\n');
expect('retired product guard',!/Ansem|Bullpen|ansem\.io|community-integrations|Solana Bang Bang|Claude of Duty|BBRLife|lifeView/i.test(retiredTargets));
expect('removed game directory absent',!(await exists('games')));
for(const removed of ['js/ui.js','js/track.js','js/bull-intelligence.js','js/bull-vision.js'])expect(`${removed} absent`,!(await exists(removed)));

const walletSafetyFiles=[...await filesIn('workers',name=>name.startsWith('intelligence-')&&name.endsWith('.mjs')),...await filesIn('js',name=>(name.startsWith('intelligence-workspace-')||name.startsWith('trade-')||name.startsWith('temporal-')||name.startsWith('replay-'))&&name.endsWith('.mjs'))];
const walletSafety=(await Promise.all(walletSafetyFiles.map(file=>readFile(file,'utf8')))).join('\n');
expect('wallet safety guard',!/seed phrase|private key import|signTransaction|sendTransaction|secretKey/i.test(walletSafety));
expect('production origins configured',/https:\/\/abullsapp\.com/.test(wrangler)&&/https:\/\/www\.abullsapp\.com/.test(wrangler));
expect('Cloudflare observability configured',/\[observability\]/.test(wrangler));

if(failures.length){process.stderr.write(`\n${failures.length} release-candidate check(s) failed.\n`);process.exit(1);}
note('\nRELEASE-CANDIDATE LOCAL VALIDATION PASSED');
