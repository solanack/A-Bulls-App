const SOL='So11111111111111111111111111111111111111112';
const EVM_RE=/^0x[a-fA-F0-9]{40}$/;
const TRANSIENT_HTTP=new Set([408,425,429]);

const text=value=>String(value==null?'':value).trim();

export function normalizeDiagnosticChain(value){
  const raw=text(value).toLowerCase().replace(/[ _]/g,'-');
  if(!raw)return'';
  if(raw==='solana'||raw==='101')return'solana';
  if(raw==='base'||raw==='8453')return'base';
  if(['bsc','bnb','bnb-chain','binance-smart-chain','56'].includes(raw))return'bsc';
  if(['ethereum','eth','1'].includes(raw))return'ethereum';
  if(raw==='monad'||raw==='143')return'monad';
  if(['robinhood','robinhood-chain','robinhoodchain','hood','4663'].includes(raw))return'robinhood';
  return raw;
}

export function buildReplayDiagnosticRequest(trade={}){
  const wallet=text(trade.wallet),mint=text(trade.mint),chain=normalizeDiagnosticChain(trade.chain??trade.chainKey??trade.network);
  const from=Math.floor(Number(trade.fromTs)/1000),to=Math.ceil(Number(trade.toTs)/1000);
  if(!wallet||!mint||!Number.isSafeInteger(from)||from<=0||!Number.isSafeInteger(to)||to<from)throw new TypeError('diagnostic_trade_window_invalid');
  if(EVM_RE.test(wallet)&&EVM_RE.test(mint)&&!chain)throw new TypeError('diagnostic_chain_missing_for_evm_subject');
  const resolvedChain=chain||'solana';
  return Object.freeze({
    chain:resolvedChain,
    request:Object.freeze({
      wallet,
      mint,
      chain:resolvedChain,
      ...(resolvedChain==='solana'?{quoteMint:SOL}:{}),
      from,
      to,
      bucketSeconds:60,
      limit:500,
    }),
  });
}

export function terminalReplayDiagnosticFailure(state={}){
  const http=Number(state.http)||0;
  if(http<400||http>=500||TRANSIENT_HTTP.has(http))return false;
  return state.ok!==true;
}

export const __replayProductionDiagnosticContract=Object.freeze({
  chainQualifiedRequests:true,
  solQuoteOnlyForSolana:true,
  terminalClientErrorsFailRelease:true,
});
