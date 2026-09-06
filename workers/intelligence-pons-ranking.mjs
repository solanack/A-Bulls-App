/* Stable, read-only ranking for the top PONS-minted tokens on Robinhood Chain.
 * Market discovery is server-side. Origin is independently verified from an
 * allowlisted PONS factory receipt before a token can enter the galaxy.
 */
const BITQUERY_ENDPOINT='https://streaming.bitquery.io/graphql';
const ADDRESS_RE=/^0x[0-9a-f]{40}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>s(value).toLowerCase()==='true';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const unix=value=>Math.floor(new Date(value).getTime()/1000);
const bounded=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));
const PONS_FACTORIES=Object.freeze([
  Object.freeze({version:'v1',address:'0xa5aab3f0c6eeadf30ef1d3eb997108e976351feb',topic:'0xdb51ea9ad51ab453a65a4cb7e60c3cb378c9501bb002609f8f97778fb6c4235a'}),
  Object.freeze({version:'v2',address:'0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e',topic:'0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607'}),
]);

export const PONS_TOP25_CONTRACT=Object.freeze({
  chainId:4663,
  maximumMembers:25,
  marketCapFloorUsd:500000,
  entryCycles:2,
  exitCycles:2,
  minimumCycleSeconds:900,
  fdvFallback:false,
  readOnly:true,
  internalPath:'/api/intelligence/pons/rank',
});

export function buildPonsCandidateQuery(limit=1000){
  const safeLimit=bounded(limit,1000,25,1000);
  return `query PonsProtocolCandidates {\n  Trading {\n    Tokens(\n      limit: {count: ${safeLimit}}\n      limitBy: {count: 1, by: Token_Id}\n      orderBy: {descending: Block_Time}\n      where: {\n        Block: {Time: {since_relative: {days_ago: 30}}}\n        Interval: {Time: {Duration: {eq: 1}}}\n        Token: {Network: {is: \\"Robinhood\\"}}\n        Market: {Protocol: {is: \\"pons_v2\\"}}\n      }\n    ) {\n      Token { Address }\n    }\n  }\n}`;
}

export function buildPonsMarketRankQuery(limit=500,floor=500000,tokens=[]){
  const safeLimit=bounded(limit,500,25,1000);
  const safeFloor=Math.max(PONS_TOP25_CONTRACT.marketCapFloorUsd,n(floor));
  const addresses=[...new Set((Array.isArray(tokens)?tokens:[]).map(value=>s(value).toLowerCase()).filter(value=>ADDRESS_RE.test(value)))].slice(0,1000);
  if(!addresses.length)throw new Error('pons_candidate_tokens_empty');
  const addressFilter=addresses.map(value=>`\\"${value}\\"`).join(', ');
  return `query PonsMarketCapRank {\n  Trading {\n    Tokens(\n      limit: {count: ${safeLimit}}\n      limitBy: {count: 1, by: Token_Id}\n      orderBy: {descending: Supply_MarketCap}\n      where: {\n        Block: {Time: {since_relative: {hours_ago: 24}}}\n        Interval: {Time: {Duration: {eq: 1}}}\n        Token: {Network: {is: \\"Robinhood\\"}, Address: {in: [${addressFilter}]}}\n        Supply: {MarketCap: {ge: ${safeFloor}}}\n      }\n    ) {\n      Block { Time }\n      Token { Address Symbol Name }\n      Supply { MarketCap FullyDilutedValuationUsd CirculatingSupply TotalSupply }\n      Price { Ohlc { Close } }\n    }\n  }\n}`;
}

async function bitquery(env,query){
  const token=s(env.PONS_BITQUERY_TOKEN||env.BITQUERY_API_TOKEN);
  if(!token)throw new Error('pons_bitquery_unconfigured');
  const response=await fetch(BITQUERY_ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({query})});
  if(!response.ok)throw new Error(`pons_bitquery_http_${response.status}`);
  const body=await response.json();
  if(body?.errors?.length)throw new Error(`pons_bitquery_graphql_${s(body.errors[0]?.message)||'error'}`);
  return body?.data;
}

export function normalizePonsMarketRows(rows=[],now=Math.floor(Date.now()/1000),options={}){
  const floor=Math.max(PONS_TOP25_CONTRACT.marketCapFloorUsd,n(options.floor));
  const maxAge=bounded(options.maxAgeSeconds,900,60,3600);
  const normalized=(Array.isArray(rows)?rows:[]).flatMap(row=>{
    const token=s(row?.Token?.Address).toLowerCase();
    const marketCap=Number(row?.Supply?.MarketCap);
    const observedAt=unix(row?.Block?.Time);
    if(!ADDRESS_RE.test(token)||!Number.isFinite(marketCap)||marketCap<floor)return[];
    if(!Number.isFinite(observedAt)||observedAt<now-maxAge||observedAt>now+120)return[];
    const finite=value=>Number.isFinite(Number(value))?Number(value):null;
    return [{token,symbol:s(row?.Token?.Symbol).slice(0,32)||null,name:s(row?.Token?.Name).slice(0,120)||null,marketCapUsd:marketCap,fdvUsd:finite(row?.Supply?.FullyDilutedValuationUsd),circulatingSupply:finite(row?.Supply?.CirculatingSupply),totalSupply:finite(row?.Supply?.TotalSupply),priceUsd:finite(row?.Price?.Ohlc?.Close),observedAt,source:'bitquery-trading-tokens',confidence:'provider-reported'}];
  }).sort((a,b)=>b.marketCapUsd-a.marketCapUsd);
  const seen=new Set();
  return normalized.filter(item=>seen.has(item.token)?false:(seen.add(item.token),true));
}

export function selectStablePonsTop25(markets=[],previous=[],options={}){
  const maximum=bounded(options.maximumMembers,25,1,25);
  const floor=Math.max(PONS_TOP25_CONTRACT.marketCapFloorUsd,n(options.floor));
  const entryCycles=bounded(options.entryCycles,2,1,10);
  const exitCycles=bounded(options.exitCycles,2,1,10);
  const now=bounded(options.now,Math.floor(Date.now()/1000),1,Number.MAX_SAFE_INTEGER);
  const minimumCycleSeconds=bounded(options.minimumCycleSeconds,900,60,3600);
  const marketByToken=new Map(markets.filter(item=>item.marketCapUsd>=floor).map(item=>[item.token,item]));
  const previousByToken=new Map(previous.map(item=>[s(item.token).toLowerCase(),item]));
  const tokens=new Set([...previousByToken.keys(),...marketByToken.keys()]);
  const candidates=[];
  for(const token of tokens){
    const prior=previousByToken.get(token)||{};
    const market=marketByToken.get(token);
    const canAdvance=!n(prior.updated_at)||now-n(prior.updated_at)>=minimumCycleSeconds;
    const qualifyingCycles=market?(canAdvance?Math.max(0,n(prior.qualifying_cycles))+1:Math.max(0,n(prior.qualifying_cycles))):0;
    const disqualifyingCycles=market?0:(canAdvance?Math.max(0,n(prior.disqualifying_cycles))+1:Math.max(0,n(prior.disqualifying_cycles)));
    const wasActive=n(prior.active)===1;
    const eligible=(wasActive&&disqualifyingCycles<exitCycles)||Boolean(market&&qualifyingCycles>=entryCycles);
    const cap=market?.marketCapUsd??n(prior.market_cap_usd);
    candidates.push({token,market,prior,qualifyingCycles,disqualifyingCycles,eligible,marketCapUsd:cap});
  }
  const byCap=(a,b)=>b.marketCapUsd-a.marketCapUsd||a.token.localeCompare(b.token);
  const survivors=candidates.filter(item=>n(item.prior.active)===1&&item.eligible).sort(byCap).slice(0,maximum);
  const remaining=Math.max(0,maximum-survivors.length);
  const entrants=candidates.filter(item=>n(item.prior.active)!==1&&item.eligible).sort(byCap).slice(0,remaining);
  const selected=[...survivors,...entrants].sort(byCap);
  const active=new Set(selected.map(item=>item.token));
  const ranked=new Map(selected.map((item,index)=>[item.token,index+1]));
  return candidates.map(item=>({...item,active:active.has(item.token),rank:ranked.get(item.token)||null}));
}

function topicAddress(token){return `0x${'0'.repeat(24)}${token.slice(2).toLowerCase()}`;}

export function buildPonsOriginQuery(token,factory){
  const normalized=s(token).toLowerCase();
  const definition=PONS_FACTORIES.find(item=>item.address===s(factory).toLowerCase());
  if(!ADDRESS_RE.test(normalized)||!definition)throw new Error('invalid_pons_origin_query');
  return `query PonsOriginProof {\n  EVM(network: robinhood, dataset: combined) {\n    Events(\n      limit: {count: 5}\n      orderBy: {descending: Block_Time}\n      where: {\n        LogHeader: {Address: {is: \"${definition.address}\"}}\n        Topics: {includes: [\n          {Hash: {is: \"${definition.topic}\"}},\n          {Hash: {is: \"${topicAddress(normalized)}\"}}\n        ]}\n      }\n    ) {\n      Transaction { Hash }\n    }\n  }\n}`;
}

async function rpc(env,method,params=[]){
  const endpoint=s(env.PONS_RPC_URL);
  if(!endpoint)throw new Error('pons_rpc_unconfigured');
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!response.ok)throw new Error(`pons_rpc_http_${response.status}`);
  const body=await response.json();
  if(body?.error)throw new Error(`pons_rpc_${s(body.error.code)||'error'}`);
  return body?.result;
}

async function persistVerifiedOrigin(db,launch,{blockTime,now}){
  await db.prepare(`INSERT INTO pons_launches(token,factory,factory_version,curve,deployer,dex_factory,pair_token,pool,launch_config_id,graduation_threshold,position_id,restrictions_end_block,initial_buy_amount,transaction_hash,log_index,block_number,block_hash,block_time,finality,launch_state,observed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'confirmation-buffered','launched',?,?) ON CONFLICT(token) DO UPDATE SET factory=excluded.factory,factory_version=excluded.factory_version,curve=excluded.curve,deployer=excluded.deployer,dex_factory=excluded.dex_factory,pair_token=excluded.pair_token,pool=excluded.pool,launch_config_id=excluded.launch_config_id,graduation_threshold=excluded.graduation_threshold,position_id=excluded.position_id,restrictions_end_block=excluded.restrictions_end_block,initial_buy_amount=excluded.initial_buy_amount,transaction_hash=excluded.transaction_hash,log_index=excluded.log_index,block_number=excluded.block_number,block_hash=excluded.block_hash,block_time=excluded.block_time,finality=excluded.finality,updated_at=excluded.updated_at`).bind(launch.token,launch.factory,launch.factoryVersion,launch.curve,launch.deployer,launch.dexFactory,launch.pairToken,launch.pool,launch.launchConfigId,launch.graduationThreshold,launch.positionId,launch.restrictionsEndBlock,launch.initialBuyAmount,launch.transactionHash,launch.logIndex,launch.blockNumber,launch.blockHash,blockTime,now,now).run();
}

async function verifyPonsOrigin(env,db,token,now){
  const {decodePonsLaunchLog}=await import('./intelligence-pons-galaxy.mjs');
  const cached=await db.prepare('SELECT status,transaction_hash,checked_at FROM pons_origin_checks WHERE token=?').bind(token).first();
  if(cached?.status==='verified')return true;
  if(cached&&now-n(cached.checked_at)<86400&&cached.status==='not_found')return false;
  try{
    for(const factory of PONS_FACTORIES){
      const originData=await bitquery(env,buildPonsOriginQuery(token,factory.address));
      const events=originData?.EVM?.Events||[];
      for(const event of(Array.isArray(events)?events:[])){
        const receipt=await rpc(env,'eth_getTransactionReceipt',[s(event?.Transaction?.Hash)]);
        const verifiedLog=(Array.isArray(receipt?.logs)?receipt.logs:[]).find(candidate=>s(candidate.address).toLowerCase()===factory.address&&s(candidate.topics?.[0]).toLowerCase()===factory.topic&&s(candidate.topics?.[1]).toLowerCase()===topicAddress(token));
        const launch=verifiedLog?decodePonsLaunchLog(verifiedLog):null;
        if(!launch||launch.token!==token)continue;
        const block=await rpc(env,'eth_getBlockByNumber',[verifiedLog.blockNumber,false]);
        const blockTime=Math.max(0,Number.parseInt(s(block?.timestamp).replace(/^0x/,''),16)||0)||null;
        await persistVerifiedOrigin(db,launch,{blockTime,now});
        await db.prepare(`INSERT INTO pons_origin_checks(token,status,source,transaction_hash,checked_at) VALUES(?,'verified','pons-factory-receipt',?,?) ON CONFLICT(token) DO UPDATE SET status='verified',source=excluded.source,transaction_hash=excluded.transaction_hash,checked_at=excluded.checked_at`).bind(token,launch.transactionHash,now).run();
        return true;
      }
    }
    await db.prepare(`INSERT INTO pons_origin_checks(token,status,source,transaction_hash,checked_at) VALUES(?,'not_found','pons-factory-log',NULL,?) ON CONFLICT(token) DO UPDATE SET status='not_found',source=excluded.source,transaction_hash=NULL,checked_at=excluded.checked_at`).bind(token,now).run();
    return false;
  }catch(error){
    await db.prepare(`INSERT INTO pons_origin_checks(token,status,source,transaction_hash,checked_at) VALUES(?,'error','pons-factory-log',NULL,?) ON CONFLICT(token) DO UPDATE SET status='error',source=excluded.source,transaction_hash=NULL,checked_at=excluded.checked_at`).bind(token,now).run();
    throw error;
  }
}

export async function refreshPonsTop25(env={},now=Math.floor(Date.now()/1000)){
  if(!bool(env.PONS_RANK_ENABLED))return Object.freeze({enabled:false});
  const {intelligenceDb}=await import('./intelligence-indexer.mjs');
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const floor=Math.max(PONS_TOP25_CONTRACT.marketCapFloorUsd,n(env.PONS_MARKET_CAP_MIN_USD));
  const discoveryLimit=bounded(env.PONS_RANK_DISCOVERY_LIMIT,500,25,1000);
  const maximum=bounded(env.PONS_RANK_MAX_MEMBERS,25,1,25);
  const maxAge=bounded(env.PONS_RANK_PRICE_MAX_AGE_SECONDS,900,60,3600);
  const verifiedRows=(await db.prepare('SELECT token FROM pons_launches').all())?.results||[];
  const verified=new Set(verifiedRows.map(row=>s(row.token).toLowerCase()));
  const candidateData=await bitquery(env,buildPonsCandidateQuery(Math.max(discoveryLimit,500)));
  const protocolTokens=(candidateData?.Trading?.Tokens||[]).map(row=>s(row?.Token?.Address).toLowerCase()).filter(token=>ADDRESS_RE.test(token));
  const candidateTokens=[...new Set([...verified,...protocolTokens])].slice(0,1000);
  if(!candidateTokens.length)return Object.freeze({enabled:true,marketCandidates:0,verifiedCandidates:0,originChecks:0,active:0,maximum,floor,snapshotId:null});
  const data=await bitquery(env,buildPonsMarketRankQuery(discoveryLimit,floor,candidateTokens));
  const markets=normalizePonsMarketRows(data?.Trading?.Tokens||[],now,{floor,maxAgeSeconds:maxAge});
  const verifyLimit=bounded(env.PONS_ORIGIN_VERIFY_LIMIT,12,1,50);
  let originChecks=0;
  for(const market of markets){
    if(verified.has(market.token)||originChecks>=verifyLimit)continue;
    originChecks+=1;
    try{if(await verifyPonsOrigin(env,db,market.token,now))verified.add(market.token);}catch(error){console.error('[pons-origin-check]',market.token,s(error?.message||error));}
  }
  const eligibleMarkets=markets.filter(market=>verified.has(market.token));
  const previous=(await db.prepare('SELECT * FROM pons_rank_candidates').all())?.results||[];
  const decisions=selectStablePonsTop25(eligibleMarkets,previous,{maximum,floor,entryCycles:2,exitCycles:2,now,minimumCycleSeconds:900});
  const snapshotId=`pons-rank:${now}`;
  for(const decision of decisions){
    const market=decision.market;
    const prior=decision.prior||{};
    const firstQualified=decision.qualifyingCycles>=2?(n(prior.first_qualified_at)||now):null;
    const lastQualified=market?now:(prior.last_qualified_at??null);
    const lastExited=n(prior.active)===1&&!decision.active?now:(prior.last_exited_at??null);
    await db.prepare(`INSERT INTO pons_rank_candidates(token,symbol,name,market_cap_usd,fdv_usd,circulating_supply,total_supply,price_usd,market_observed_at,market_source,market_confidence,qualifying_cycles,disqualifying_cycles,active,current_rank,first_qualified_at,last_qualified_at,last_exited_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET symbol=excluded.symbol,name=excluded.name,market_cap_usd=excluded.market_cap_usd,fdv_usd=excluded.fdv_usd,circulating_supply=excluded.circulating_supply,total_supply=excluded.total_supply,price_usd=excluded.price_usd,market_observed_at=excluded.market_observed_at,market_source=excluded.market_source,market_confidence=excluded.market_confidence,qualifying_cycles=excluded.qualifying_cycles,disqualifying_cycles=excluded.disqualifying_cycles,active=excluded.active,current_rank=excluded.current_rank,first_qualified_at=COALESCE(pons_rank_candidates.first_qualified_at,excluded.first_qualified_at),last_qualified_at=excluded.last_qualified_at,last_exited_at=excluded.last_exited_at,updated_at=excluded.updated_at`).bind(decision.token,market?.symbol??prior.symbol??null,market?.name??prior.name??null,market?.marketCapUsd??n(prior.market_cap_usd),market?.fdvUsd??prior.fdv_usd??null,market?.circulatingSupply??prior.circulating_supply??null,market?.totalSupply??prior.total_supply??null,market?.priceUsd??prior.price_usd??null,market?.observedAt??n(prior.market_observed_at),market?.source??(s(prior.market_source)||'bitquery-trading-tokens'),market?.confidence??(s(prior.market_confidence)||'provider-reported'),decision.qualifyingCycles,decision.disqualifyingCycles,decision.active?1:0,decision.rank,firstQualified,lastQualified,lastExited,now).run();
    await db.prepare(`INSERT INTO intelligence_universe_membership(universe_id,entity_kind,entity_id,rank,active,qualifying_cycles,first_entered_at,last_entered_at,last_seen_at,last_exited_at,entry_count,source_snapshot_id,metadata_json) VALUES('pons','token',?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(universe_id,entity_kind,entity_id) DO UPDATE SET rank=excluded.rank,active=excluded.active,qualifying_cycles=excluded.qualifying_cycles,first_entered_at=COALESCE(intelligence_universe_membership.first_entered_at,excluded.first_entered_at),last_entered_at=CASE WHEN intelligence_universe_membership.active=0 AND excluded.active=1 THEN excluded.last_entered_at ELSE intelligence_universe_membership.last_entered_at END,last_seen_at=excluded.last_seen_at,last_exited_at=excluded.last_exited_at,entry_count=CASE WHEN intelligence_universe_membership.active=0 AND excluded.active=1 THEN intelligence_universe_membership.entry_count+1 ELSE intelligence_universe_membership.entry_count END,source_snapshot_id=excluded.source_snapshot_id,metadata_json=excluded.metadata_json`).bind(decision.token,decision.rank,decision.active?1:0,decision.qualifyingCycles,decision.active?now:null,decision.active?now:null,market?now:(n(prior.updated_at)||now),lastExited,decision.active?1:0,snapshotId,JSON.stringify({selector:'verified-market-cap-top25-v1',marketCapUsd:decision.marketCapUsd,floorUsd:floor,fdvFallback:false})).run();
    if(decision.active)await db.prepare('INSERT OR REPLACE INTO pons_rank_snapshots(snapshot_id,token,rank,market_cap_usd,price_usd,observed_at,source) VALUES(?,?,?,?,?,?,?)').bind(snapshotId,decision.token,decision.rank,decision.marketCapUsd,market?.priceUsd??prior.price_usd??null,now,market?.source??'bitquery-trading-tokens').run();
  }
  const active=decisions.filter(item=>item.active).length;
  return Object.freeze({enabled:true,marketCandidates:markets.length,verifiedCandidates:eligibleMarkets.length,originChecks,active,maximum,floor,snapshotId});
}

export async function handlePonsRankingRequest(request,env={}){
  const url=new URL(request.url);
  if(url.pathname==='/api/intelligence/pons/galaxy'&&bool(env.PONS_GALAXY_ENABLED)&&bool(env.PONS_RANK_ENABLED)){
    if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
    const {intelligenceDb}=await import('./intelligence-indexer.mjs');
    const db=intelligenceDb(env);if(!db)return json({ok:false,error:'intelligence_db_unavailable'},503);
    const rows=(await db.prepare(`SELECT r.current_rank,r.symbol,r.name,r.market_cap_usd,r.fdv_usd,r.circulating_supply,r.total_supply,r.price_usd,r.market_observed_at,r.market_source,r.market_confidence,l.token,l.factory,l.factory_version,l.curve,l.deployer,l.dex_factory,l.pair_token,l.pool,l.transaction_hash,l.block_number,l.block_hash,l.block_time,l.finality,l.launch_state,l.updated_at FROM pons_rank_candidates r JOIN pons_launches l ON l.token=r.token WHERE r.active=1 AND r.market_cap_usd>=? ORDER BY r.current_rank ASC LIMIT 25`).bind(PONS_TOP25_CONTRACT.marketCapFloorUsd).all())?.results||[];
    return json({ok:true,data:{schemaVersion:'pons-top25-v1',generatedAt:Date.now(),readOnly:true,chain:{id:4663,name:'Robinhood Chain'},selector:{maximumMembers:25,marketCapFloorUsd:500000,entryCycles:2,exitCycles:2,minimumCycleSeconds:900,fdvFallback:false},coverage:{complete:false,statement:'Up to 25 tokens with verified PONS factory origin and provider-reported market cap of at least $500,000. Two qualifying cycles at least 15 minutes apart are required to enter and two misses to exit. FDV is never substituted for market cap.'},launches:rows.map(row=>({rank:n(row.current_rank),token:s(row.token),factory:s(row.factory),factoryVersion:s(row.factory_version),curve:s(row.curve)||null,deployer:s(row.deployer),dexFactory:s(row.dex_factory)||null,pairToken:s(row.pair_token),pool:s(row.pool)||null,transactionHash:s(row.transaction_hash),blockNumber:n(row.block_number),blockHash:s(row.block_hash),blockTime:row.block_time==null?null:n(row.block_time)*1000,finality:s(row.finality),state:s(row.launch_state)||'launched',market:{symbol:s(row.symbol)||null,name:s(row.name)||null,marketCapUsd:n(row.market_cap_usd),fdvUsd:row.fdv_usd==null?null:n(row.fdv_usd),circulatingSupply:row.circulating_supply==null?null:n(row.circulating_supply),totalSupply:row.total_supply==null?null:n(row.total_supply),priceUsd:row.price_usd==null?null:n(row.price_usd),observedAt:n(row.market_observed_at)*1000,source:s(row.market_source),confidence:s(row.market_confidence)},updatedAt:n(row.updated_at)*1000}))}},200);
  }
  if(url.pathname!==PONS_TOP25_CONTRACT.internalPath)return null;
  if(!bool(env.PONS_GALAXY_ENABLED)||!bool(env.PONS_RANK_ENABLED))return json({ok:false,error:'feature_disabled'},404);
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  const expected=s(env.PONS_INDEX_SECRET),provided=s(request.headers.get('authorization')).replace(/^Bearer\s+/i,'');
  if(!expected||provided!==expected)return json({ok:false,error:'unauthorized'},401);
  try{return json({ok:true,result:await refreshPonsTop25(env)},202);}catch(error){return json({ok:false,error:s(error?.message||error)},503);}
}
