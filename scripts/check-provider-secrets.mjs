#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVIDER_SECRET_NAMES, providerSecretStatus } from '../workers/intelligence-provider-secrets.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workersDir=path.join(root,'workers');
const args=process.argv.slice(2);
const valueAfter=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:'';};

function files(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?files(full):entry.isFile()&&entry.name.endsWith('.mjs')?[full]:[];
  });
}
function referencedSecretNames(){
  const names=new Set();
  const re=/env\.([A-Z][A-Z0-9_]*(?:API_KEY|_TOKEN|_SECRET))(?![A-Z0-9_])/g;
  for(const file of files(workersDir)){
    const text=fs.readFileSync(file,'utf8');
    for(const match of text.matchAll(re))names.add(match[1]);
  }
  return [...names].sort();
}
function productionVars(){
  const text=fs.readFileSync(path.join(workersDir,'wrangler.production.toml'),'utf8');
  const out={};let inVars=false;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();
    if(/^\[vars\]$/.test(line)){inVars=true;continue;}
    if(/^\[/.test(line)&&line!=='[vars]'){if(inVars)break;continue;}
    if(!inVars||!line||line.startsWith('#'))continue;
    const match=line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}
function configuredNamesFromFile(file){
  const parsed=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
  const rows=Array.isArray(parsed)?parsed:Array.isArray(parsed?.result)?parsed.result:[];
  return [...new Set(rows.map(row=>String(row?.name||row?.key||'').trim()).filter(Boolean))].sort();
}
function assertManifestCoverage(){
  const referenced=referencedSecretNames();
  const known=new Set(PROVIDER_SECRET_NAMES);
  const uncovered=referenced.filter(name=>!known.has(name));
  console.log(`Provider-secret references (${referenced.length}): ${referenced.join(', ')}`);
  if(uncovered.length)throw new Error(`Provider secret requirement manifest is missing: ${uncovered.join(', ')}`);
  return referenced;
}
function report(status){
  for(const row of status.requirements){
    const state=row.configured?'configured':row.required?'MISSING REQUIRED':'not configured (inactive/optional)';
    console.log(`[provider-secret] ${row.id}: ${state}; accepts ${row.anyOf.join(' | ')}`);
  }
  if(status.missingRequired.length)throw new Error(`Missing required production provider secret groups: ${status.missingRequired.join(', ')}`);
  console.log('Provider secret requirements are satisfied for the enabled production features.');
}

async function endpointMode(){
  const base=(valueAfter('--url')||process.env.PROVIDER_DIAGNOSTICS_URL||'').replace(/\/$/,'');
  const token=process.env.PROVIDER_DIAGNOSTICS_TOKEN||'';
  if(!base)throw new Error('Provider diagnostics URL is required (--url or PROVIDER_DIAGNOSTICS_URL).');
  if(!token)throw new Error('PROVIDER_DIAGNOSTICS_TOKEN is required for the internal diagnostics endpoint.');
  const response=await fetch(`${base}/api/internal/intelligence/provider-secrets`,{headers:{authorization:`Bearer ${token}`}});
  if(!response.ok)throw new Error(`Provider diagnostics endpoint returned HTTP ${response.status}.`);
  const body=await response.json();
  if(body?.valuesExposed!==false)throw new Error('Provider diagnostics response did not affirm secret values are hidden.');
  report(body);
}

try{
  assertManifestCoverage();
  const configuredFile=valueAfter('--configured-file');
  if(configuredFile){
    const env=productionVars();
    const configured=configuredNamesFromFile(configuredFile);
    for(const name of configured)env[name]='__configured__';
    console.log(`Configured Cloudflare secret names (${configured.length}): ${configured.join(', ')}`);
    report(providerSecretStatus(env));
  }else{
    await endpointMode();
  }
}catch(error){
  console.error(`[provider-secret-check] ${String(error?.message||error)}`);
  process.exit(1);
}
