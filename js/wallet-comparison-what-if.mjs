const text=value=>String(value==null?'':value).trim();
function replayEvents(bundle={}){return Array.isArray(bundle?.replayEvents)?bundle.replayEvents:Array.isArray(bundle?.replay?.events)?bundle.replay.events:[];}

export function buildWalletComparisonStoryWhatIf(bundle={}, {sourceWallet,targetWallet}={}){
  if(bundle?.storyType!=='wallet-comparison')throw new TypeError('wallet comparison story is required');
  const source=text(sourceWallet),target=text(targetWallet);if(!source||!target||source===target)throw new TypeError('distinct source and target wallets are required');
  const observed=replayEvents(bundle).filter(event=>text(event?.wallet)===source&&(event.side==='buy'||event.side==='sell'));
  const events=Object.freeze(observed.map((event,index)=>Object.freeze({...event,id:`story-whatif-${index+1}-${event.id||event.signature||'event'}`,wallet:target,sourceWallet:source,hypothetical:true,verification:'simulation',metadata:Object.freeze({...event.metadata,scenario:'mirror-source-wallet-timing'})})));
  return Object.freeze({
    scenario:'mirror-source-wallet-timing',sourceWallet:source,targetWallet:target,events,
    disclosure:'Hypothetical replay using the source wallet’s observed buy/sell timing inside this indexed window. It does not claim identical execution, liquidity, fees, price impact, profitability, balances, or account outcome.'
  });
}
