import { MarketIndexDepthClient } from './market-index-depth-client.mjs';

const trim=value=>String(value==null?'':value).trim();
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};

export function describeMarketIndexDepth(result={}){
  const plan=result?.plan||{},candidates=Math.max(0,Number(plan.candidateCount)||0),unknown=Math.max(0,Number(result?.unknownCoverageWallets)||0),observed=Math.max(0,Number(result?.observedWalletRows)||0);
  if(!observed)return Object.freeze({state:'no-observed-wallets',headline:'NO OBSERVED WALLETS TO DEEPEN',detail:'This replay has no observed-wallet rows from which to plan older-history indexing.',candidates,unknown});
  if(!candidates)return Object.freeze({state:'no-older-history-candidates',headline:'NO OLDER-HISTORY CANDIDATES',detail:unknown?`${unknown} observed ${unknown===1?'wallet has':'wallets have'} unknown coverage metadata, but the current schema does not justify guessing a backfill range for them.`:'No observed wallet currently meets the strict older-history candidate rule for this replay window.',candidates,unknown});
  return Object.freeze({state:'candidates',headline:`${candidates} OLDER-HISTORY ${candidates===1?'CANDIDATE':'CANDIDATES'}`,detail:'These are planning candidates only. They indicate that the current oldest indexed point is newer than the requested start and history is not marked complete to genesis.',candidates,unknown});
}

export function createMarketIndexDepthPanel({apiBase,mint,from,to}={}){
  const root=node('section','market-index-depth'),head=node('div','market-index-depth__head'),copy=node('div');
  copy.append(node('small','','INDEX DEPTH'),node('strong','','CHECKING INDEX DEPTH'),node('p','','Comparing the selected token window with known observed-wallet history coverage…'));head.append(copy);root.append(head);
  const client=new MarketIndexDepthClient({baseUrl:apiBase}),input={mint:trim(mint),from,to,limit:2};
  (async()=>{
    try{
      const result=await client.plan(input),view=describeMarketIndexDepth(result);copy.replaceChildren(node('small','','INDEX DEPTH'),node('strong','',view.headline),node('p','',view.detail));
      const disclosure=node('p','intelligence-context-disclosure',result?.plan?.disclosure||result?.disclosure||'Index-depth planning is read-only and does not prove missing intervals contain transactions.');root.append(disclosure);
      if(view.state!=='candidates')return;
      const button=node('button','secondary','REQUEST DEEPER INDEX'),status=node('span','market-index-depth__status','PLAN ONLY');button.type='button';
      button.addEventListener('click',async()=>{
        button.disabled=true;status.textContent='REQUESTING…';
        try{
          const queued=await client.request(input),queue=queued?.queue||{};
          status.textContent=queue.queued?`${queue.queued} QUEUED${queue.reused?` · ${queue.reused} REUSED`:''}`:queue.reused?`${queue.reused} ALREADY QUEUED/RUNNING`:'NO NEW JOBS QUEUED';
          copy.querySelector('p').textContent='A bounded read-only history request was accepted for server-recomputed candidates. The replay does not change until indexing completes and the market is loaded again.';
        }catch(error){
          status.textContent=error?.message==='backfill_queue_disabled'?'QUEUE DISABLED':'REQUEST UNAVAILABLE';
          button.disabled=false;
        }
      });
      const actions=node('div','market-index-depth__actions');actions.append(button,status);root.append(actions);
    }catch(error){copy.replaceChildren(node('small','','INDEX DEPTH'),node('strong','','INDEX DEPTH UNAVAILABLE'),node('p','',error?.message==='feature_disabled'?'Index-depth planning remains disabled at the Worker.':`Index-depth planning could not be loaded: ${error?.message||'unknown error'}`));}
  })();
  return root;
}

export function attachMarketIndexDepthPanel({apiBase,bundle}={}){
  if(typeof document==='undefined'||!bundle?.subject?.mint||!bundle?.window)return null;
  const workspace=document.querySelector('.token-market-workspace .intelligence-results');if(!workspace)return null;
  workspace.querySelector('.market-index-depth')?.remove();
  const panel=createMarketIndexDepthPanel({apiBase,mint:bundle.subject.mint,from:bundle.window.from,to:bundle.window.to});
  const coverage=workspace.querySelector('.intelligence-context-block');
  if(coverage?.parentNode===workspace)coverage.after(panel);else workspace.prepend(panel);
  return panel;
}
