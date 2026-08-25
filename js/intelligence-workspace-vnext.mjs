import { ReplayBundleClient } from './replay-bundle-client.mjs';
import { TradeReplayPlayer } from './trade-replay-player.mjs';

const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
const trim=value=>String(value==null?'':value).trim();

function ensureStyles(){
  if(document.querySelector('link[data-intelligence-vnext]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='css/intelligence-workspace-vnext.css?v=1';link.dataset.intelligenceVnext='true';document.head.append(link);
}

function field(labelText,input){
  const label=node('label','intelligence-field');
  label.append(node('span','',labelText),input);
  return label;
}

function metric(label,value){
  const card=node('article','intelligence-metric');
  card.append(node('small','',label),node('strong','',String(value)));
  return card;
}

function coveragePercent(bundle){
  const total=bundle?.eventCount||0;
  const verified=bundle?.verification?.verified||0;
  return total?Math.round((verified/total)*1000)/10:0;
}

function storyBundle(bundle){
  const evidence=(bundle.events||[]).slice(0,250).map((event,index)=>({
    id:`replay-evidence-${index+1}`,
    signature:event.signature||undefined,
    slot:event.slot||undefined,
    blockTime:Math.trunc((event.timestamp||0)/1000),
    source:(event.sources||[])[0]||'intelligence-store'
  }));
  const claims=[];
  if(bundle.subject.wallets.length===2){
    claims.push({
      id:'comparison-observed',kind:'observed',
      statement:`The replay contains ${bundle.eventCount} indexed events for two public wallets on the selected token and time window.`,
      evidenceIds:evidence.slice(0,Math.min(20,evidence.length)).map(item=>item.id)
    });
  }else{
    claims.push({
      id:'timeline-observed',kind:'observed',
      statement:`The replay contains ${bundle.eventCount} indexed events for the selected public wallet and token.`,
      evidenceIds:evidence.slice(0,Math.min(20,evidence.length)).map(item=>item.id)
    });
  }
  return {
    id:`story-${Date.now()}`,
    storyType:bundle.subject.wallets.length===2?'wallet-comparison':'wallet-timeline',
    subject:{kind:bundle.subject.wallets.length===2?'wallet-comparison':'wallet',id:bundle.subject.wallets.join(':')},
    coverage:{from:bundle.window.from,to:bundle.window.to,verifiedPercent:coveragePercent(bundle),statement:bundle.coverage.statement},
    evidence:evidence.length?evidence:[{id:'coverage-only',blockTime:bundle.window.to,source:'intelligence-store'}],
    claims,
    replay:{events:bundle.events,candles:bundle.candles,startTime:bundle.window.startTime,endTime:bundle.window.endTime},
    output:{aspectRatio:'9:16',theme:'hyperspace',rendererVersion:'trickster-v1'}
  };
}

export class IntelligenceWorkspace {
  #host;#root;#client;#player=null;#abort=null;#onCreateStory;#status;#results;#walletA;#walletB;#mint;#quote;#range;
  constructor({host,apiBase,onCreateStory}={}){
    if(!(host instanceof Element))throw new TypeError('host element is required');
    ensureStyles();
    this.#host=host;this.#client=new ReplayBundleClient({baseUrl:apiBase});this.#onCreateStory=onCreateStory;
    this.#root=node('section','intelligence-workspace');
    const intro=node('header','intelligence-workspace__header');
    const copy=node('div');copy.append(node('small','','FULL-CHAIN INTELLIGENCE'),node('h1','','Make Solana playable.'),node('p','','Enter any public wallet and token. Replay how it traded, compare another wallet on the same market, inspect evidence, then turn the sequence into a verifiable story.'));
    this.#status=node('span','status-pill','READY');intro.append(copy,this.#status);

    const form=document.createElement('form');form.className='intelligence-query';
    this.#walletA=document.createElement('input');this.#walletA.required=true;this.#walletA.autocomplete='off';this.#walletA.placeholder='Public wallet A';this.#walletA.setAttribute('aria-label','Public wallet A');
    this.#walletB=document.createElement('input');this.#walletB.autocomplete='off';this.#walletB.placeholder='Optional comparison wallet';this.#walletB.setAttribute('aria-label','Comparison wallet');
    this.#mint=document.createElement('input');this.#mint.required=true;this.#mint.autocomplete='off';this.#mint.placeholder='Token mint';this.#mint.setAttribute('aria-label','Token mint');
    this.#quote=document.createElement('input');this.#quote.autocomplete='off';this.#quote.placeholder='Optional quote mint for exact execution price';this.#quote.setAttribute('aria-label','Quote mint');
    this.#range=document.createElement('select');this.#range.setAttribute('aria-label','Replay range');
    for(const [value,label] of [['86400','24 hours'],['604800','7 days'],['2592000','30 days'],['7776000','90 days'],['31536000','1 year']]){const option=document.createElement('option');option.value=value;option.textContent=label;if(value==='2592000')option.selected=true;this.#range.append(option);}
    const submit=node('button','primary','BUILD REPLAY');submit.type='submit';
    form.append(field('Wallet',this.#walletA),field('Compare',this.#walletB),field('Token',this.#mint),field('Quote',this.#quote),field('Window',this.#range),submit);
    form.addEventListener('submit',event=>{event.preventDefault();this.load();});

    const explainer=node('div','intelligence-capabilities');
    for(const [title,body] of [
      ['REPLAY','Play, pause, rewind, fast-forward and jump event-to-event.'],
      ['COMPARE','Synchronize two public wallets against the same token timeline.'],
      ['WHAT IF','Overlay historical counterfactuals without presenting them as predictions.'],
      ['CREATE','Send any evidence-backed replay directly into Trickster for video/story creation.']
    ]){const card=node('article');card.append(node('strong','',title),node('p','',body));explainer.append(card);}
    this.#results=node('section','intelligence-results');this.#results.hidden=true;
    this.#root.append(intro,form,explainer,this.#results);this.#host.replaceChildren(this.#root);
  }

  setRequest(request={}){
    const query=trim(request.query||request.wallet||request.address);
    if(WALLET_RE.test(query))this.#walletA.value=query;
  }

  async load(){
    const wallet=trim(this.#walletA.value),compareWallet=trim(this.#walletB.value),mint=trim(this.#mint.value),quoteMint=trim(this.#quote.value);
    if(!WALLET_RE.test(wallet)){this.#status.textContent='INVALID WALLET';this.#walletA.focus();return;}
    if(compareWallet&&!WALLET_RE.test(compareWallet)){this.#status.textContent='INVALID COMPARISON';this.#walletB.focus();return;}
    if(!WALLET_RE.test(mint)){this.#status.textContent='INVALID TOKEN';this.#mint.focus();return;}
    if(quoteMint&&!WALLET_RE.test(quoteMint)){this.#status.textContent='INVALID QUOTE';this.#quote.focus();return;}
    this.#abort?.abort();this.#abort=new AbortController();this.#player?.destroy();this.#player=null;
    this.#status.textContent='BUILDING REPLAY';this.#results.hidden=false;this.#results.replaceChildren(node('p','notice','Reading normalized indexed evidence…'));
    const to=Math.floor(Date.now()/1000),from=to-Number(this.#range.value||2592000);
    try{
      const bundle=await this.#client.load({wallet,compareWallet:compareWallet||undefined,mint,quoteMint:quoteMint||undefined,from,to,bucketSeconds:60,limit:750},{signal:this.#abort.signal});
      this.#render(bundle);this.#status.textContent=bundle.coverage.complete?'INDEXED · READY':'PARTIAL · PLAYABLE';
    }catch(error){
      if(error.name==='AbortError')return;
      this.#status.textContent='REPLAY UNAVAILABLE';
      const message=error.message==='feature_disabled'?'Playable Data is built but disabled at the Worker until the new backend is enabled.':`Replay could not be built: ${error.message}`;
      this.#results.replaceChildren(node('p','notice',message));
    }
  }

  #render(bundle){
    this.#results.replaceChildren();
    const summary=node('div','intelligence-summary');
    summary.append(metric('Observed events',bundle.eventCount),metric('Indexed candles',bundle.candles.length),metric('Verified events',bundle.verification.verified||0),metric('Sources',bundle.sources.length));
    const truth=node('div','intelligence-truth');truth.append(node('strong','',bundle.subject.wallets.length===2?'WALLET VS WALLET':'WALLET REPLAY'),node('p','',bundle.coverage.statement));
    const stage=node('div','intelligence-replay-stage');
    this.#player=new TradeReplayPlayer({host:stage,events:bundle.events,candles:bundle.candles,startTime:bundle.window.startTime,endTime:bundle.window.endTime,label:'Indexed Solana trade replay'});
    const caveats=node('ul','intelligence-caveats');for(const caveat of bundle.caveats)caveats.append(node('li','',caveat));
    const actions=node('div','intelligence-result-actions');
    const story=node('button','primary','CREATE STORY / VIDEO');story.type='button';story.addEventListener('click',()=>this.#onCreateStory?.(storyBundle(bundle)));
    actions.append(story);
    this.#results.append(summary,truth,stage,caveats,actions);
  }

  destroy(){this.#abort?.abort();this.#player?.destroy();this.#root.remove();}
}
