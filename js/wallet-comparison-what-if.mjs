const text=value=>String(value==null?'':value).trim();
function replayEvents(bundle={}){return Array.isArray(bundle?.replayEvents)?bundle.replayEvents:Array.isArray(bundle?.replay?.events)?bundle.replay.events:[];}
function eventReceiptId(event={}){return text(event.evidenceId||event.signature||event.id);}

export function buildWalletComparisonStoryWhatIf(bundle={}, {sourceWallet,targetWallet}={}){
  if(bundle?.storyType!=='wallet-comparison')throw new TypeError('wallet comparison story is required');
  const source=text(sourceWallet),target=text(targetWallet);if(!source||!target||source===target)throw new TypeError('distinct source and target wallets are required');
  const observed=replayEvents(bundle).filter(event=>text(event?.wallet)===source&&(event.side==='buy'||event.side==='sell'));
  const evidenceIds=Object.freeze([...new Set(observed.map(eventReceiptId).filter(Boolean))]);
  const events=Object.freeze(observed.map((event,index)=>Object.freeze({...event,id:`story-whatif-${index+1}-${event.id||event.signature||'event'}`,wallet:target,sourceWallet:source,hypothetical:true,verification:'simulation',evidenceId:eventReceiptId(event)||null,metadata:Object.freeze({...event.metadata,scenario:'mirror-source-wallet-timing'})})));
  return Object.freeze({
    scenario:'mirror-source-wallet-timing',sourceWallet:source,targetWallet:target,events,evidenceIds,
    disclosure:'Hypothetical replay using the source wallet’s observed buy/sell timing inside this indexed window. It does not claim identical execution, liquidity, fees, price impact, profitability, balances, or account outcome.'
  });
}

export function walletComparisonWhatIfClaim(bundle={}){
  const whatIf=bundle?.whatIf;if(!whatIf?.events?.length)return null;
  const available=new Set((bundle.evidence||[]).map(item=>text(item.id)).filter(Boolean));
  const evidenceIds=[...new Set((whatIf.evidenceIds||whatIf.events.map(eventReceiptId)).map(text).filter(id=>available.has(id)))];
  if(!evidenceIds.length)return null;
  return Object.freeze({
    id:'comparison-what-if-simulation',kind:'inferred',
    statement:`What If mirrors ${text(whatIf.sourceWallet)} observed buy/sell timing onto ${text(whatIf.targetWallet)} as a hypothetical replay.`,
    evidenceIds:Object.freeze(evidenceIds),disclosure:text(whatIf.disclosure)
  });
}
