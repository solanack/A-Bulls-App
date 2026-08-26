import { MarketIndexDepthClient } from './market-index-depth-client.mjs';

const trim=value=>String(value==null?'':value).trim();
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function describeMarketIndexDepth(result={}){
  const plan=result?.plan||{},candidates=Math.max(0,Number(plan.candidateCount)||0),unknown=Math.max(0,Number(result?.unknownCoverageWallets)||0),observed=Math.max(0,Number(result?.observedWalletRows)||0);
  if(!observed)return Object.freeze({state:'no-observed-wallets',headline:'NO OBSERVED WALLETS TO DEEPEN',detail:'This replay has no observed-wallet rows from which to plan older-history indexing.',candidates,unknown});
  if(!candidates)return Object.freeze({state:'no-older-history-candidates',headline:'NO OLDER-HISTORY CANDIDATES',detail:unknown?`${unknown} observed ${unknown===1?'wallet has':'wallets have'} unknown coverage metadata, but the current schema does not justify guessing a backfill range for them.`:'No observed wallet currently meets the strict older-history candidate rule for this replay window.',candidates,unknown});
  return Object.freeze({state:'candidates',headline:`${candidates} OLDER-HISTORY ${candidates===1?'CANDIDATE':'CANDIDATES'}`,detail:'These are planning candidates only. They indicate that the current oldest indexed point is newer than the requested start and history is not marked complete to genesis.',candidates,unknown});
}

export function describeIndexJobProgress(result={}){
  const found=Math.max(0,Number(result.found)||0),complete=Math.max(0,Number(result.complete)||0),running=Math.max(0,Number(result.running)||0),queued=Math.max(0,Number(result.queued)||0),retrying=Math.max(0,Number(result.retrying)||0),pages=Math.max(0,Number(result.pagesCompleted)||0),signatures=Math.max(0,Number(result.signaturesSeen)||0),transactions=Math.max(0,Number(result.transactionsIngested)||0),sources=[...new Set((Array.isArray(result.sources)?result.sources:[]).map(trim).filter(Boolean))];
  const sourceText=sources.length?` · SOURCE USED ${sources.join(' + ')}`:'';
  const work=`${pages} PAGES · ${signatures} SIGNATURES · ${transactions} TX INGESTED${sourceText}`;
  if(!result.schedulerEnabled)return Object.freeze({terminal:true,reload:false,text:`QUEUED · SCHEDULER PAUSED · ${work}`});
  if(found>0&&complete===found)return Object.freeze({terminal:true,reload:true,text:`INDEX ADVANCED · ${complete}/${found} COMPLETE · ${work}`});
  if(retrying)return Object.freeze({terminal:false,reload:false,text:`RETRY SCHEDULED · ${retrying} RETRYING · ${complete} COMPLETE · ${running} RUNNING · ${work}`});
  return Object.freeze({terminal:false,reload:false,text:`INDEXING · ${complete} COMPLETE · ${running} RUNNING · ${queued} QUEUED · ${work}`});
}

function jobIdsFromQueue(queue={}){return [...new Set((queue.jobs||[]).map(job=>Number(job.jobId)).filter(id=>Number.isInteger(id)&&id>0))].slice(0,10);}

async function watchJobs({client,jobIds,root,status,reloadButton}){
  for(let attempt=0;attempt<12&&root.isConnected;attempt++){
    try{
      const result=await client.status(jobIds),progress=describeIndexJobProgress(result);
      status.textContent=progress.text;
      if(progress.reload)reloadButton.hidden=false;
      if(progress.terminal)return;
    }catch(error){status.textContent='STATUS TEMPORARILY UNAVAILABLE';}
    await wait(5000);
  }
  if(root.isConnected&&reloadButton.hidden&&(status.textContent.startsWith('INDEXING')||status.textContent.startsWith('RETRY SCHEDULED')))status.textContent+=' · CHECK AGAIN BY RELOADING';
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
      const button=node('button','secondary','REQUEST DEEPER INDEX'),status=node('span','market-index-depth__status','PLAN ONLY'),reloadButton=node('button','secondary','RELOAD MARKET');button.type=reloadButton.type='button';reloadButton.hidden=true;
      reloadButton.addEventListener('click',()=>document.querySelector('.token-market-workspace form')?.requestSubmit?.());
      button.addEventListener('click',async()=>{
        button.disabled=true;status.textContent='REQUESTING…';
        try{
          const queued=await client.request(input),queue=queued?.queue||{},jobIds=jobIdsFromQueue(queue);
          status.textContent=queue.queued?`${queue.queued} QUEUED${queue.reused?` · ${queue.reused} REUSED`:''}`:queue.reused?`${queue.reused} ALREADY QUEUED/RUNNING`:'NO NEW JOBS QUEUED';
          copy.querySelector('p').textContent='A bounded read-only history request was accepted for server-recomputed candidates. Progress reports only work performed by those returned jobs. SOURCE USED identifies the retrieval path that actually succeeded; it is not a completeness or quality rating. The replay changes only after the market is reloaded.';
          if(jobIds.length)watchJobs({client,jobIds,root,status,reloadButton});
        }catch(error){status.textContent=error?.message==='backfill_queue_disabled'?'QUEUE DISABLED':'REQUEST UNAVAILABLE';button.disabled=false;}
      });
      const actions=node('div','market-index-depth__actions');actions.append(button,status,reloadButton);root.append(actions);
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
