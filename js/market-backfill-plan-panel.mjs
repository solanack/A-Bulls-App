import { MarketBackfillPlanClient } from './market-backfill-plan-client.mjs';

const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
const short=value=>{const text=String(value||'');return text.length>18?`${text.slice(0,8)}…${text.slice(-7)}`:text;};
const duration=seconds=>{const value=Math.max(0,Number(seconds)||0);if(value>=86400)return`${Math.round(value/8640)/10}d`;if(value>=3600)return`${Math.round(value/360)/10}h`;return`${Math.round(value/60)}m`;};

export function createMarketBackfillPlanPanel(result={}, {client=null,input=null}={}){
  const section=node('section','market-backfill-plan market-index-depth intelligence-request-notice'),plan=result?.plan||{},candidates=Array.isArray(plan.candidates)?plan.candidates:[];
  section.append(node('strong','','INDEX DEPTH PLAN'));
  const summary=candidates.length?`${plan.candidateCount||candidates.length} observed ${Number(plan.candidateCount||candidates.length)===1?'wallet may':'wallets may'} need older indexed history to span the requested start. This is a planning hint only; no history was fetched.`:`No defensible older-history backfill candidate was identified from the current observed-wallet coverage rows. This does not establish complete market coverage.`;
  section.append(node('p','',summary));
  if(Number(result?.unknownCoverageWallets||0)>0)section.append(node('p','intelligence-context-disclosure',`${result.unknownCoverageWallets} observed ${result.unknownCoverageWallets===1?'wallet has':'wallets have'} no wallet-history coverage row and therefore cannot be classified by this planner.`));
  if(candidates.length){
    const list=node('div','market-backfill-plan__list');for(const item of candidates.slice(0,12)){const row=node('div','market-backfill-plan__row');row.append(node('strong','',short(item.wallet)),node('span','',`older envelope: ${duration(item.missingOlderSeconds)}`));list.append(row);}section.append(list);
    if(client&&input){const actions=node('div','market-index-depth__actions'),button=node('button','secondary','REQUEST DEEPER INDEX'),status=node('span','market-index-depth__status','PLAN ONLY');button.type='button';button.addEventListener('click',async()=>{button.disabled=true;status.textContent='REQUESTING…';try{const result=await client.request({...input,limit:2}),queue=result?.queue||{};status.textContent=queue.queued?`${queue.queued} QUEUED${queue.reused?` · ${queue.reused} REUSED`:''}`:queue.reused?`${queue.reused} ALREADY QUEUED/RUNNING`:'NO NEW JOBS QUEUED';}catch(error){status.textContent=error?.message==='backfill_queue_disabled'?'QUEUE DISABLED':'REQUEST UNAVAILABLE';button.disabled=false;}});actions.append(button,status);section.append(actions);}
  }
  section.append(node('p','intelligence-context-disclosure',plan.disclosure||result.disclosure||'Planning only. No automatic history fetch occurs.'));
  return section;
}

export function attachMarketBackfillPlanPanel({apiBase,bundle}={}){
  if(typeof document==='undefined'||!bundle?.subject?.mint||!bundle?.window)return null;
  const workspace=document.querySelector('.token-market-workspace .intelligence-results');if(!workspace)return null;
  workspace.querySelector('.market-backfill-plan')?.remove();
  const client=new MarketBackfillPlanClient({baseUrl:apiBase}),input={mint:bundle.subject.mint,from:bundle.window.from,to:bundle.window.to};
  const placeholder=node('section','market-backfill-plan market-index-depth intelligence-request-notice');placeholder.append(node('strong','','INDEX DEPTH PLAN'),node('p','','Checking observed-wallet coverage for defensible older-history candidates…'));
  const coverage=workspace.querySelector('.intelligence-context-block');if(coverage?.parentNode===workspace)coverage.after(placeholder);else workspace.prepend(placeholder);
  client.load(input).then(result=>placeholder.replaceWith(createMarketBackfillPlanPanel(result,{client,input}))).catch(error=>{placeholder.replaceChildren(node('strong','','INDEX DEPTH UNAVAILABLE'),node('p','',error?.message==='feature_disabled'?'Index-depth planning remains disabled at the Worker.':`Index-depth planning could not be loaded: ${error?.message||'unknown error'}`));});
  return placeholder;
}
