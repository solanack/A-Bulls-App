import { resolveHistoryRpc } from './intelligence-history-engine.mjs';
import { isRobinhoodContractAddress, resolveRobinhoodToken } from './intelligence-pons-token-resolver.mjs';
import { resolveSolanaToken } from './intelligence-solana-token-resolver.mjs';

const BASE58=/^[1-9A-HJ-NP-Za-km-z]+$/;
const ADDRESS_MIN=32,ADDRESS_MAX=50,SIGNATURE_MIN=64,SIGNATURE_MAX=90;
const TOKEN_PROGRAMS=new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
]);
const SYSTEM_PROGRAM='11111111111111111111111111111111';
const s=v=>String(v==null?'':v).trim();
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function classify(query){
  if(isRobinhoodContractAddress(query))return'evm-token';
  if(BASE58.test(query)&&query.length>=SIGNATURE_MIN&&query.length<=SIGNATURE_MAX)return'transaction-signature';
  if(BASE58.test(query)&&query.length>=ADDRESS_MIN&&query.length<=ADDRESS_MAX)return'solana-address';
  return'search-text';
}

async function rpc(source,method,params,fetchImpl=fetch){
  const response=await fetchImpl(source.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!response.ok)throw new Error(`${source.name}:${method}:http_${response.status}`);
  const payload=await response.json();
  if(payload?.error)throw new Error(`${source.name}:${method}:${payload.error.code||'rpc'}:${s(payload.error.message)}`);
  return payload?.result;
}

function accountResolution(address,account,source){
  if(!account)return Object.freeze({ok:true,kind:'solana-address',address,state:'not-found',label:'unresolved-address',source:source.name,readOnly:true});
  const owner=s(account.owner),parsed=account.data?.parsed||null,parsedType=s(parsed?.type),executable=account.executable===true;
  let label='account';
  if(executable)label='program';
  else if(TOKEN_PROGRAMS.has(owner)&&parsedType==='mint')label='token-mint';
  else if(TOKEN_PROGRAMS.has(owner)&&parsedType==='account')label='token-account';
  else if(owner===SYSTEM_PROGRAM)label='system-account';
  return Object.freeze({
    ok:true,kind:'solana-address',address,state:'resolved',label,owner:owner||null,executable,parsedType:parsedType||null,
    lamports:Number(account.lamports||0),source:source.name,readOnly:true,
    disclosure:label==='system-account'?'System-owned accounts may be wallets or other account forms; this resolver does not over-label them as wallets.':null
  });
}

function transactionContext(tx={}){
  const keys=Array.isArray(tx?.transaction?.message?.accountKeys)?tx.transaction.message.accountKeys:[];
  const signers=[];
  for(const key of keys){
    if(typeof key==='string')continue;
    if(key?.signer===true&&BASE58.test(s(key.pubkey)))signers.push(s(key.pubkey));
  }
  const balances=[...(tx?.meta?.preTokenBalances||[]),...(tx?.meta?.postTokenBalances||[])];
  const tokenMints=[];
  const tokenOwners=[];
  for(const row of balances){
    const mint=s(row?.mint),owner=s(row?.owner);
    if(BASE58.test(mint)&&!tokenMints.includes(mint))tokenMints.push(mint);
    if(BASE58.test(owner)&&!tokenOwners.includes(owner))tokenOwners.push(owner);
  }
  return Object.freeze({
    signers:Object.freeze(signers.slice(0,12)),
    tokenMints:Object.freeze(tokenMints.slice(0,24)),
    tokenOwners:Object.freeze(tokenOwners.slice(0,24)),
    accountCount:keys.length,
    instructionCount:Array.isArray(tx?.transaction?.message?.instructions)?tx.transaction.message.instructions.length:0
  });
}

export async function resolvePublicChainEntity(query,{env={},fetchImpl=fetch}={}){
  const value=s(query),kind=classify(value);
  if(kind==='evm-token')return resolveRobinhoodToken(value,{env,fetchImpl});
  const source=resolveHistoryRpc(env);
  if(kind==='search-text')return Object.freeze({ok:false,kind,error:'free_text_resolution_unavailable',query:value,readOnly:true});
  if(kind==='transaction-signature'){
    const tx=await rpc(source,'getTransaction',[value,{commitment:'confirmed',maxSupportedTransactionVersion:0,encoding:'jsonParsed'}],fetchImpl);
    if(!tx)return Object.freeze({ok:true,kind,signature:value,state:'not-found',label:'transaction',source:source.name,readOnly:true});
    return Object.freeze({
      ok:true,kind,signature:value,state:'resolved',label:'transaction',slot:Number(tx.slot||0)||null,blockTime:Number(tx.blockTime||0)||null,
      failed:Boolean(tx.meta?.err),feeLamports:Number(tx.meta?.fee||0),source:source.name,readOnly:true,
      context:transactionContext(tx),
      disclosure:'Detected signers and token mints are observed transaction context. They are not claims of identity, intent, ownership, or trade direction.'
    });
  }
  const account=await rpc(source,'getAccountInfo',[value,{commitment:'confirmed',encoding:'jsonParsed'}],fetchImpl);
  const resolvedAccount=account?.value??account;
  if(TOKEN_PROGRAMS.has(s(resolvedAccount?.owner))&&s(resolvedAccount?.data?.parsed?.type)==='mint')return resolveSolanaToken(value,{env,source,account:resolvedAccount,fetchImpl});
  return accountResolution(value,resolvedAccount,source);
}

export async function handleEntityResolverRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname!=='/api/intelligence/resolve')return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  const query=s(url.searchParams.get('query'));
  if(!query)return json({ok:false,error:'query_required'},400);
  try{
    const result=await resolvePublicChainEntity(query,{env});
    return json(result,result.ok===false?422:200);
  }catch(error){
    return json({ok:false,error:'resolver_unavailable',message:s(error?.message||error)},503);
  }
}

