from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'anchor missing in {path}: {old[:120]}')
    p.write_text(text.replace(old, new, 1))


replay = 'workers/intelligence-replay-bundle.mjs'
normalize_old = "function normalizeCandle(row){return Object.freeze({timestamp:Math.max(0,Math.trunc(n(row.bucket_start)))*1000,bucketSeconds:Math.max(60,Math.trunc(n(row.bucket_seconds)||60)),open:n(row.open),high:n(row.high),low:n(row.low),close:n(row.close),volumeBase:n(row.volume_base),volumeQuote:n(row.volume_quote),swapCount:Math.max(0,Math.trunc(n(row.swap_count))),walletCount:Math.max(0,Math.trunc(n(row.wallet_count))),confidence:clamp(row.confidence,0,1),sources:(()=>{try{return JSON.parse(row.source_set_json||'[]')}catch{return[]}})()});}"
normalize_new = """function normalizeCandle(row){return Object.freeze({timestamp:Math.max(0,Math.trunc(n(row.bucket_start)))*1000,bucketSeconds:Math.max(60,Math.trunc(n(row.bucket_seconds)||60)),open:n(row.open),high:n(row.high),low:n(row.low),close:n(row.close),volumeBase:n(row.volume_base),volumeQuote:n(row.volume_quote),swapCount:Math.max(0,Math.trunc(n(row.swap_count))),walletCount:Math.max(0,Math.trunc(n(row.wallet_count))),confidence:clamp(row.confidence,0,1),derivedFromBucketSeconds:nullable(row.derived_from_bucket_seconds),sources:(()=>{try{return JSON.parse(row.source_set_json||'[]')}catch{return[]}})()});}

export function aggregateReplayCandleRows(rows=[],targetBucketSeconds=60){
  const target=Math.max(60,Math.trunc(n(targetBucketSeconds)||60)),groups=new Map();
  for(const row of (Array.isArray(rows)?rows:[]).slice().sort((a,b)=>n(a.bucket_start)-n(b.bucket_start))){
    const start=Math.max(0,Math.trunc(n(row.bucket_start))),sourceBucket=Math.max(60,Math.trunc(n(row.bucket_seconds)||60)),open=nullable(row.open),high=nullable(row.high),low=nullable(row.low),close=nullable(row.close);if([open,high,low,close].some(value=>value==null))continue;
    const bucketStart=Math.floor(start/target)*target,key=String(bucketStart);let group=groups.get(key);
    let sources=[];try{sources=JSON.parse(row.source_set_json||'[]')}catch{}
    if(!group){group={bucket_start:bucketStart,bucket_seconds:target,open,high,low,close,volume_base:n(row.volume_base),volume_quote:n(row.volume_quote),swap_count:Math.max(0,Math.trunc(n(row.swap_count))),wallet_count:Math.max(0,Math.trunc(n(row.wallet_count))),confidence:clamp(row.confidence,0,1),derived_from_bucket_seconds:sourceBucket,sources:new Set(sources)};groups.set(key,group);continue;}
    group.high=Math.max(group.high,high);group.low=Math.min(group.low,low);group.close=close;group.volume_base+=n(row.volume_base);group.volume_quote+=n(row.volume_quote);group.swap_count+=Math.max(0,Math.trunc(n(row.swap_count)));group.wallet_count=Math.max(group.wallet_count,Math.max(0,Math.trunc(n(row.wallet_count))));group.confidence=Math.min(group.confidence,clamp(row.confidence,0,1));group.derived_from_bucket_seconds=Math.min(group.derived_from_bucket_seconds,sourceBucket);for(const source of sources)group.sources.add(source);
  }
  return [...groups.values()].sort((a,b)=>a.bucket_start-b.bucket_start).map(group=>({...group,source_set_json:JSON.stringify([...group.sources].filter(Boolean).sort()),sources:undefined}));
}

async function loadSolanaReplayCandleRows(db,mint,quoteMint,bucketSeconds,from,to){
  const exact=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(mint,quoteMint,bucketSeconds,from,to));if(exact.length||bucketSeconds<=60)return exact;
  const available=await all(db.prepare(`SELECT DISTINCT bucket_seconds FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds<? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_seconds DESC LIMIT 20`).bind(mint,quoteMint,bucketSeconds,from,to)),sourceBucket=available.map(row=>Math.trunc(n(row.bucket_seconds))).find(value=>value>=60&&bucketSeconds%value===0);if(!sourceBucket)return[];
  const fine=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(mint,quoteMint,sourceBucket,from,to));return aggregateReplayCandleRows(fine,bucketSeconds);
}

async function loadChainReplayCandleRows(db,chain,mint,quoteMint,bucketSeconds,from,to){
  const exact=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(chain,mint,quoteMint,bucketSeconds,from,to));if(exact.length||bucketSeconds<=60)return exact;
  const available=await all(db.prepare(`SELECT DISTINCT bucket_seconds FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds<? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_seconds DESC LIMIT 20`).bind(chain,mint,quoteMint,bucketSeconds,from,to)),sourceBucket=available.map(row=>Math.trunc(n(row.bucket_seconds))).find(value=>value>=60&&bucketSeconds%value===0);if(!sourceBucket)return[];
  const fine=await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(chain,mint,quoteMint,sourceBucket,from,to));return aggregateReplayCandleRows(fine,bucketSeconds);
}"""
replace_once(replay, normalize_old, normalize_new)

solana_old = "const candleRows=window.startResolved&&quoteMint?await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(mint,quoteMint,bucketSeconds,from,to)):[],candles=candleRows.map(normalizeCandle);"
solana_new = "const candleRows=window.startResolved&&quoteMint?await loadSolanaReplayCandleRows(db,mint,quoteMint,bucketSeconds,from,to):[],candles=candleRows.map(normalizeCandle);"
replace_once(replay, solana_old, solana_new)

chain_old = "const candleRows=window.startResolved&&effectiveQuote?await all(db.prepare(`SELECT bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ? ORDER BY bucket_start ASC LIMIT 10000`).bind(chain,mint,effectiveQuote,bucketSeconds,from,to)):[],candles=candleRows.map(normalizeCandle);"
chain_new = "const candleRows=window.startResolved&&effectiveQuote?await loadChainReplayCandleRows(db,chain,mint,effectiveQuote,bucketSeconds,from,to):[],candles=candleRows.map(normalizeCandle);"
replace_once(replay, chain_old, chain_new)

replay_test = 'workers/intelligence-replay-bundle.test.mjs'
replace_once(replay_test, "import { adaptiveReplayBucketSeconds, buildReplayBundle, handleReplayBundleRequest } from './intelligence-replay-bundle.mjs';", "import { adaptiveReplayBucketSeconds, aggregateReplayCandleRows, buildReplayBundle, handleReplayBundleRequest } from './intelligence-replay-bundle.mjs';")
p = Path(replay_test)
text = p.read_text()
anchor = "test('adaptive Replay buckets preserve detail for short windows and bound long histories',()=>{"
if "aggregates retained finer candles" not in text:
    insert = """test('aggregates retained finer candles into the adaptive Replay bucket without inventing OHLC',()=>{\n  const rows=[\n    {bucket_start:0,bucket_seconds:60,open:1,high:2,low:.8,close:1.5,volume_base:10,volume_quote:20,swap_count:2,wallet_count:2,confidence:.9,source_set_json:'[\"rpc-a\"]'},\n    {bucket_start:60,bucket_seconds:60,open:1.5,high:3,low:1.4,close:2.5,volume_base:15,volume_quote:30,swap_count:3,wallet_count:3,confidence:.8,source_set_json:'[\"rpc-b\"]'}\n  ];\n  const candles=aggregateReplayCandleRows(rows,300);\n  assert.equal(candles.length,1);\n  assert.equal(candles[0].bucket_seconds,300);\n  assert.equal(candles[0].open,1);\n  assert.equal(candles[0].high,3);\n  assert.equal(candles[0].low,.8);\n  assert.equal(candles[0].close,2.5);\n  assert.equal(candles[0].volume_base,25);\n  assert.equal(candles[0].swap_count,5);\n  assert.deepEqual(JSON.parse(candles[0].source_set_json),['rpc-a','rpc-b']);\n});\n\n"""
    if anchor not in text: raise SystemExit('replay test insertion anchor missing')
    p.write_text(text.replace(anchor, insert+anchor, 1))

registry = 'workers/intelligence-chain-registry.mjs'
p = Path(registry); text = p.read_text()
if "export function isValidSolanaAddress" not in text:
    slug_line = "const slug=value=>s(value).toLowerCase().replace(/[_\\s:]+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,48);"
    addition = """\nconst BASE58_ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';\nconst BASE58_INDEX=new Map([...BASE58_ALPHABET].map((char,index)=>[char,index]));\n\nexport function isValidSolanaAddress(address=''){\n  const value=s(address);if(!SOLANA_ADDRESS.test(value))return false;const bytes=[0];\n  for(const char of value){let carry=BASE58_INDEX.get(char);if(carry==null)return false;for(let i=0;i<bytes.length;i++){const next=bytes[i]*58+carry;bytes[i]=next&255;carry=next>>8;}while(carry>0){bytes.push(carry&255);carry>>=8;}}\n  let leading=0;while(leading<value.length&&value[leading]==='1')leading++;const significant=bytes.length===1&&bytes[0]===0?0:bytes.length;return leading+significant===32;\n}\n"""
    if slug_line not in text: raise SystemExit('registry slug anchor missing')
    text = text.replace(slug_line, slug_line+addition, 1)
    text = text.replace("const kind=EVM_ADDRESS.test(s(address))?'evm':SOLANA_ADDRESS.test(s(address))?'svm':'evm';", "const kind=EVM_ADDRESS.test(s(address))?'evm':isValidSolanaAddress(address)?'svm':'evm';", 1)
    text = text.replace("return definition.kind==='svm'?SOLANA_ADDRESS.test(s(address)):EVM_ADDRESS.test(s(address));", "return definition.kind==='svm'?isValidSolanaAddress(address):EVM_ADDRESS.test(s(address));", 1)
    p.write_text(text)

registry_test = 'workers/intelligence-chain-registry.test.mjs'
p = Path(registry_test); text = p.read_text()
text = text.replace("isValidChainAddress,normalizeChainKey", "isValidChainAddress,isValidSolanaAddress,normalizeChainKey", 1)
needle = "  assert.equal(isValidChainAddress('solana',EVM),false);"
if "44 zero bytes" not in text:
    text = text.replace(needle, needle+"\n  assert.equal(isValidSolanaAddress('11111111111111111111111111111111'),true);\n  assert.equal(isValidSolanaAddress('11111111111111111111111111111111111111111111'),false,'44 zero bytes is not a 32-byte Solana public key');", 1)
p.write_text(text)

history = 'workers/intelligence-history-engine.mjs'
p = Path(history); text = p.read_text()
import_anchor = "import { reserveProviderCredits } from './intelligence-provider-budget.mjs';"
if "isValidSolanaAddress" not in text:
    text = text.replace(import_anchor, import_anchor+"\nimport { isValidSolanaAddress } from './intelligence-chain-registry.mjs';", 1)
old_resolve = """export function resolveHistoryRpc(env={}){\n  const explicit=s(env.INTELLIGENCE_RPC_URL||env.SOLANA_RPC_URL);\n  if(explicit)return{name:'configured-rpc',kind:'rpc',url:explicit};\n  const key=s(env.HELIUS_API_KEY);\n  if(key)return{name:'helius-standard-rpc',kind:'rpc',url:`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`};\n  return{name:'solana-public-rpc',kind:'rpc',url:PUBLIC_RPC};\n}"""
new_resolve = """export function resolveHistoryRpc(env={}){\n  const explicit=s(env.INTELLIGENCE_RPC_URL||env.SOLANA_RPC_URL);\n  if(explicit)return{name:'configured-rpc',kind:'rpc',url:explicit};\n  const key=s(env.HELIUS_API_KEY);\n  if(key)return{name:'helius-standard-rpc',kind:'rpc',url:`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`};\n  const allowPublic=['1','true','yes','on'].includes(s(env.INTELLIGENCE_ALLOW_PUBLIC_RPC_FALLBACK).toLowerCase());\n  return allowPublic?{name:'solana-public-rpc',kind:'rpc',url:PUBLIC_RPC}:{name:'history-rpc-unavailable',kind:'unavailable',url:''};\n}"""
if old_resolve not in text: raise SystemExit('history resolve anchor missing')
text = text.replace(old_resolve, new_resolve, 1)
text = text.replace("if(!WALLET_RE.test(s(wallet)))throw new Error('invalid_public_wallet');", "if(!isValidSolanaAddress(wallet))throw new Error('invalid_public_wallet');", 1)
source_anchor = "const source=options.source||resolveHistoryRpc(env),from=finite(options.from),to=finite(options.to),timeoutMs=historyRpcTimeoutMs(env,options);"
if source_anchor not in text: raise SystemExit('history source anchor missing')
text = text.replace(source_anchor, source_anchor+"\n  if(!s(source?.url))throw new Error('history_rpc_unconfigured');", 1)
p.write_text(text)

history_test = 'workers/intelligence-history-engine.test.mjs'
p = Path(history_test); text = p.read_text()
old_test = """test('history engine prefers explicit neutral RPC then Helius standard RPC', () => {\n  assert.equal(resolveHistoryRpc({ INTELLIGENCE_RPC_URL:'https://rpc.example' }).name, 'configured-rpc');\n  assert.equal(resolveHistoryRpc({ HELIUS_API_KEY:'abc' }).name, 'helius-standard-rpc');\n  assert.equal(resolveHistoryRpc({}).name, 'solana-public-rpc');\n});"""
new_test = """test('history engine prefers configured or Helius RPC and does not silently depend on the public archival endpoint', () => {\n  assert.equal(resolveHistoryRpc({ INTELLIGENCE_RPC_URL:'https://rpc.example' }).name, 'configured-rpc');\n  assert.equal(resolveHistoryRpc({ HELIUS_API_KEY:'abc' }).name, 'helius-standard-rpc');\n  assert.equal(resolveHistoryRpc({}).name, 'history-rpc-unavailable');\n  assert.equal(resolveHistoryRpc({ INTELLIGENCE_ALLOW_PUBLIC_RPC_FALLBACK:'true' }).name, 'solana-public-rpc');\n});"""
if old_test not in text: raise SystemExit('history test anchor missing')
p.write_text(text.replace(old_test, new_test, 1))

print('Applied Replay candle fallback + Solana source-health hardening.')
