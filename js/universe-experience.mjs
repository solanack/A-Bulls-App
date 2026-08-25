import { createSyntheticUniverse } from './universe-synthetic-data.mjs';
import { UniverseClient } from './universe-client.mjs';
import { UniverseRenderer } from './universe-renderer.mjs';

const FILTERS = Object.freeze(['all','swap','transfer','nft','staking','program','failure']);

function node(tag,className,text) {
  const item=document.createElement(tag);
  if(className) item.className=className;
  if(text!=null) item.textContent=text;
  return item;
}

export class UniverseExperience {
  #host;
  #root;
  #stage;
  #truth;
  #status;
  #renderer;
  #client;
  #snapshot;
  #filter='all';
  #unsubscribe;
  #onDestinationRequest;

  constructor({
    host,
    apiBase,
    THREE,
    onDestinationRequest,
    client,
    syntheticCount=2500
  }) {
    if(!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host=host;
    this.#onDestinationRequest=onDestinationRequest;
    this.#client=client??new UniverseClient({baseUrl:apiBase});
    this.#snapshot=createSyntheticUniverse({count:syntheticCount});

    this.#root=node('section','universe-shell');
    this.#root.setAttribute('aria-label','Solana Universe');
    this.#stage=node('div','universe-stage');
    const overlay=node('div','universe-overlay');
    const toolbar=node('div','universe-toolbar');
    toolbar.append(node('strong','','UNIVERSE'));
    for(const filter of FILTERS) {
      const button=node('button','secondary',filter.toUpperCase());
      button.type='button';
      button.dataset.universeFilter=filter;
      if(filter==='all') button.setAttribute('aria-pressed','true');
      else button.setAttribute('aria-pressed','false');
      button.addEventListener('click',()=>this.setFilter(filter));
      toolbar.append(button);
    }
    this.#truth=node('div','universe-truth-panel');
    this.#truth.setAttribute('aria-live','polite');
    this.#status=node('span','','SYNTHETIC PROTOTYPE');
    const whiteout=node('div','universe-whiteout');
    overlay.append(toolbar,node('div'),this.#truth);
    this.#root.append(this.#stage,overlay,whiteout);
    this.#host.replaceChildren(this.#root);

    this.#renderer=new UniverseRenderer({
      host:this.#stage,
      snapshot:this.#snapshot,
      THREE,
      onSelect:(entity,destination)=>this.#select(entity,destination)
    });
    this.#renderTruth('prototype');
    this.#unsubscribe=this.#client.subscribe((event)=>this.#handleClient(event));
  }

  #renderTruth(state) {
    this.#truth.replaceChildren();
    const list=node('dl');
    const values=[
      ['State',state==='ready'?'LIVE DATA':state==='degraded'?'PARTIAL SERVICE':'SYNTHETIC PROTOTYPE'],
      ['Window',`${this.#snapshot.windowStart} → ${this.#snapshot.windowEnd}`],
      ['Shown',`${this.#snapshot.particles.length.toLocaleString()} / ${this.#snapshot.observedEventCount.toLocaleString()}`],
      ['Coverage',this.#snapshot.coverageStatement],
      ['Sources',this.#snapshot.sources.join(', ')||'none'],
      ['Meaning','A bounded observation window—not the entire Solana chain']
    ];
    for(const [label,value] of values) list.append(node('dt','',label),node('dd','',value));
    this.#truth.append(list);
  }

  #filteredSnapshot() {
    if(this.#filter==='all') return this.#snapshot;
    return Object.freeze({
      ...this.#snapshot,
      particles:Object.freeze(this.#snapshot.particles.filter(({category})=>category===this.#filter))
    });
  }

  setFilter(filter) {
    if(!FILTERS.includes(filter)) return false;
    this.#filter=filter;
    this.#root.querySelectorAll('[data-universe-filter]').forEach((button)=>{
      button.setAttribute('aria-pressed',String(button.dataset.universeFilter===filter));
    });
    this.#renderer.updateSnapshot(this.#filteredSnapshot());
    return true;
  }

  async #select(entity,destination) {
    this.#root.dataset.transition='accelerating';
    try {
      await this.#onDestinationRequest?.(destination,entity);
      this.#renderer.markDestinationReady();
      this.#root.dataset.transition='revealing';
      globalThis.setTimeout(()=>{ if(this.#root) this.#root.dataset.transition='idle'; },500);
    } catch(error) {
      this.#renderer.cancelTransition();
      this.#root.dataset.transition='idle';
      this.#renderTruth('degraded');
    }
  }

  #handleClient(event) {
    if(event.state==='ready'&&event.snapshot) {
      this.#snapshot=event.snapshot;
      this.#renderer.updateSnapshot(this.#filteredSnapshot());
      this.#renderTruth('ready');
    } else if(event.state==='degraded'||event.state==='error') {
      this.#renderTruth('degraded');
    }
  }

  start(options) {
    this.#client.start(options);
  }

  stop() {
    this.#client.stop();
  }

  destroy() {
    this.stop();
    this.#unsubscribe?.();
    this.#renderer.destroy();
    this.#root.remove();
  }
}

export const UniverseFilters=FILTERS;
