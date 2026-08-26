function text(value){return String(value==null?'':value).trim();}
function percentText(value){const number=Number(value);return Number.isFinite(number)?`${number>=0?'+':''}${number.toFixed(2)}%`:'—';}
function short(value){const v=text(value);return v.length>18?`${v.slice(0,8)}…${v.slice(-7)}`:v;}
function isPriceClaim(claim){return /^price-after-/.test(text(claim?.id));}
function isPriceEvidence(item){return /^price-pair-/.test(text(item?.id))||text(item?.sourceReference).startsWith('price-pair:');}

export function applyExplicitEventStoryPriceSelection(bundle={}){
  if(bundle?.storyType!=='transaction-replay'||!bundle?.marketContext)return bundle;
  const output=structuredClone(bundle);
  output.claims=(output.claims||[]).filter(claim=>!isPriceClaim(claim));
  output.evidence=(output.evidence||[]).filter(item=>!isPriceEvidence(item));
  output.candles=[];

  const selected=output.marketContext?.selectedPricePair||null;
  if(!selected?.quoteMint||!Array.isArray(selected.candles)){
    output.marketContext.selectedPricePair=null;
    output.priceSelection=Object.freeze({mode:'time-only',quoteMint:null,bucketSeconds:null});
    return output;
  }

  const pair=(output.marketContext.pricePairs||[]).find(item=>String(item.quoteMint)===String(selected.quoteMint)&&Number(item.bucketSeconds)===Number(selected.bucketSeconds))||selected;
  const eventTime=Math.trunc(Number(output.marketContext?.subject?.eventTime||0)/1000)||Number(output.coverage?.from)||0;
  const token=text(output.marketContext?.subject?.mint);
  const pairId=`price-pair-${pair.quoteMint}-${pair.bucketSeconds}-${pair.from}-${pair.to}`;
  output.evidence.push({
    id:pairId,
    blockTime:eventTime,
    source:pair.sources?.[0]||'intelligence-price-candles',
    sourceReference:`price-pair:${token}:${pair.quoteMint}:${pair.bucketSeconds}:${pair.from}:${pair.to}`
  });
  for(const item of (pair.after||[]).slice(0,3)){
    output.claims.push({
      id:`price-after-${item.requestedSeconds}`,
      kind:'calculated',
      statement:`In indexed ${short(pair.quoteMint)} quote-market candles, the nearest ${Math.round(Number(item.requestedSeconds||0)/60)} minute post-event sample was actually ${Math.round(Number(item.actualSeconds||0)/60)} minutes from the anchor and the close changed ${percentText(item.changePercent)}.`,
      evidenceIds:[pairId]
    });
  }
  output.candles=[...(pair.candles||[])];
  output.marketContext.selectedPricePair=pair;
  output.priceSelection=Object.freeze({mode:'indexed-quote-pair',quoteMint:pair.quoteMint,bucketSeconds:pair.bucketSeconds});
  return output;
}
