export type AfterbellPair = {
  mint:string; symbol:string; priceUsd:number; change24h:number|null; volume24h:number|null; liquidityUsd:number|null;
};
export type AfterbellPlanetRecord = AfterbellPair & { name:string; cashSymbol:string; issuer:string; source:"DexScreener venue-reported"; observedAt:number; };
export type AfterbellGalaxyData = { ok:boolean; coverage:"fresh"|"degraded"|"empty"; planets:readonly AfterbellPlanetRecord[]; disclosure:string; source:"DexScreener venue-reported"; };

export type CatalogItem={symbol:string;name:string;cashSymbol:string;issuer:string;mintHint?:string};
export const XSTOCK_REGISTRY:readonly CatalogItem[]=[
  {symbol:"AAPLx",name:"Apple",cashSymbol:"AAPL",issuer:"xStocks"},
  {symbol:"NVDAx",name:"NVIDIA",cashSymbol:"NVDA",issuer:"xStocks",mintHint:"Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh"},
  {symbol:"TSLAx",name:"Tesla",cashSymbol:"TSLA",issuer:"xStocks",mintHint:"XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"},
  {symbol:"MSFTx",name:"Microsoft",cashSymbol:"MSFT",issuer:"xStocks",mintHint:"XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX"},
  {symbol:"AMZNx",name:"Amazon",cashSymbol:"AMZN",issuer:"xStocks"},
  {symbol:"SPYx",name:"S&P 500",cashSymbol:"SPY",issuer:"xStocks"},
  {symbol:"QQQx",name:"Nasdaq-100",cashSymbol:"QQQ",issuer:"xStocks"},
  {symbol:"CRCLx",name:"Circle",cashSymbol:"CRCL",issuer:"xStocks"},
];
const SOURCE="DexScreener venue-reported" as const,CACHE_MS=60_000;
let cached:{at:number;value:AfterbellGalaxyData}|null=null;
const finite=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;
const record=(value:unknown)=>value&&typeof value==="object"?value as Record<string,unknown>:{};

export function selectAfterbellPair(symbol:string,pairs:readonly unknown[]):AfterbellPair|null{
  const candidates=pairs.map(pair=>record(pair)).filter(pair=>String(pair.chainId??"").toLowerCase()==="solana"&&String(record(pair.baseToken).symbol??"").toLowerCase()===symbol.toLowerCase()).map(pair=>{
    const base=record(pair.baseToken),mint=String(base.address??"").trim(),priceUsd=finite(pair.priceUsd),change24h=finite(record(pair.priceChange).h24),volume24h=finite(record(pair.volume).h24),liquidityUsd=finite(record(pair.liquidity).usd);
    return mint&&priceUsd!=null&&priceUsd>0?{mint,symbol:String(base.symbol??symbol),priceUsd,change24h,volume24h,liquidityUsd}:null;
  }).filter((item):item is AfterbellPair=>Boolean(item));
  candidates.sort((a,b)=>(b.liquidityUsd??0)-(a.liquidityUsd??0)||(b.volume24h??0)-(a.volume24h??0));return candidates[0]??null;
}
async function loadPairs(item:CatalogItem,fetchImpl:typeof fetch){
  const urls:string[]=[];if(item.mintHint)urls.push(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(item.mintHint)}`);urls.push(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(item.symbol)}`);
  for(const url of urls){try{const response=await fetchImpl(url,{headers:{accept:"application/json"}});if(!response.ok)continue;const body=record(await response.json()),pairs=Array.isArray(body.pairs)?body.pairs:[],selected=selectAfterbellPair(item.symbol,pairs);if(selected)return selected;}catch{} }return null;
}
export async function getAfterbellGalaxy(fetchImpl:typeof fetch=fetch):Promise<AfterbellGalaxyData>{
  const now=Date.now();if(cached&&now-cached.at<CACHE_MS)return cached.value;
  const settled=await Promise.allSettled(XSTOCK_REGISTRY.map(async item=>{const pair=await loadPairs(item,fetchImpl);return pair?{...pair,name:item.name,cashSymbol:item.cashSymbol,issuer:item.issuer,source:SOURCE,observedAt:Date.now()}:null;})),planets=settled.flatMap(result=>result.status==="fulfilled"&&result.value?[result.value]:[]),failures=settled.filter(result=>result.status==="rejected").length,coverage=planets.length===XSTOCK_REGISTRY.length?"fresh":planets.length?"degraded":"empty",value:AfterbellGalaxyData={ok:planets.length>0,coverage,planets,source:SOURCE,disclosure:planets.length?`${planets.length} of ${XSTOCK_REGISTRY.length} Afterbell xStock PLANETS currently have finite Solana venue prices. Values are DexScreener venue-reported; missing coverage is not zero, and token provenance remains Solana.`:failures?"Afterbell venue reads are temporarily unavailable. No token or price was fabricated.":"No qualifying Solana xStock venue pairs are currently available. Missing coverage is not zero."};
  cached={at:now,value};return value;
}
export const __afterbellClientContract=Object.freeze({readOnly:true,execution:false,custody:false,source:SOURCE,catalogSize:XSTOCK_REGISTRY.length,cacheMs:CACHE_MS});
