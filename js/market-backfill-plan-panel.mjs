const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
const short=value=>{const text=String(value||'');return text.length>18?`${text.slice(0,8)}…${text.slice(-7)}`:text;};
const duration=seconds=>{const value=Math.max(0,Number(seconds)||0);if(value>=86400)return`${Math.round(value/8640)/10}d`;if(value>=3600)return`${Math.round(value/360)/10}h`;return`${Math.round(value/60)}m`;};

export function createMarketBackfillPlanPanel(result={}){
  const section=node('section','market-backfill-plan intelligence-request-notice'),plan=result?.plan||{},candidates=Array.isArray(plan.candidates)?plan.candidates:[];
  section.append(node('strong','','INDEX DEPTH PLAN'));
  const summary=candidates.length?`${plan.candidateCount||candidates.length} observed ${Number(plan.candidateCount||candidates.length)===1?'wallet may':'wallets may'} need older indexed history to span the requested start. This is a planning hint only; no history was fetched.`:`No defensible older-history backfill candidate was identified from the current observed-wallet coverage rows. This does not establish complete market coverage.`;
  section.append(node('p','',summary));
  if(Number(result?.unknownCoverageWallets||0)>0)section.append(node('p','intelligence-context-disclosure',`${result.unknownCoverageWallets} observed ${result.unknownCoverageWallets===1?'wallet has':'wallets have'} no wallet-history coverage row and therefore cannot be classified by this planner.`));
  if(candidates.length){const list=node('div','market-backfill-plan__list');for(const item of candidates.slice(0,12)){const row=node('div','market-backfill-plan__row');row.append(node('strong','',short(item.wallet)),node('span','',`older envelope: ${duration(item.missingOlderSeconds)}`));list.append(row);}section.append(list);}
  section.append(node('p','intelligence-context-disclosure',plan.disclosure||result.disclosure||'Planning only. No automatic history fetch occurs.'));
  return section;
}
