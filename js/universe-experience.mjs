import { createSyntheticUniverse } from './universe-synthetic-data.mjs';
import { UniverseClient } from './universe-client.mjs';
import { UniverseRenderer } from './universe-renderer.mjs';
import { buildFieldInvestigationHub, relationsFromSnapshot } from './field-investigation-hub.mjs';
import { FieldInvestigationTrail } from './field-investigation-trail.mjs';

const FILTERS = Object.freeze(['all','member','swap','transfer','nft','staking','program','failure']);
const MODE_FILTER = Object.freeze({explore:'all',intelligence:'all',replay:'all',compare:'all','what-if':'all',sequences:'swap',trickster:'all',evidence:'all',games:'all'});
const RESEARCH_LABELS = Object.freeze({patterns:'PATTERN LAB',decisions:'DECISION LAB',anomalies:'ANOMALY LAB'});

function node(tag,className,text){
  const item=document.createElement(tag);
  if(className)item.className=className;
  if(text!=null)item.textContent=text;
  return item;
}

export class UniverseExperience {
  #host;#root;#stage;#truth;#renderer;#client;#snapshot;#filter='all';#mode='explore';#unsubscribe;
  #onDestinationRequest;#onFieldMode;#onSearch;#onTrailBack;#onTrailForward;#activeHub=null;
  #trail=new FieldInvestigationTrail({limit:16});#universeSelect;
  #research=null;#researchFor='';#researchMode='patterns';

  constructor({host,apiBase,THREE,onDestinationRequest,client,syntheticCount=2500}){
    if(!(host instanceof Element))throw new TypeError('host element is required');
    this.#host=host;
    this.#onDestinationRequest=onDestinationRequest;
    this.#client=client??new UniverseClient({baseUrl:apiBase});
    this.#snapshot=createSyntheticUniverse({count:syntheticCount});
    this.#root=node('section','universe-shell');
    this.#root.setAttribute('aria-label','Live Solana data field');
    this.#root.dataset.fieldMode='explore';
    this.#stage=node('div','universe-stage');
    const overlay=node('div','universe-overlay');
    const toolbar=node('div','universe-toolbar');
    toolbar.append(node('strong','','LIVE FIELD'));

    const portal=node('label','universe-portal');
    portal.append(node('span','','UNIVERSE'));
    this.#universeSelect=node('select','universe-portal-select');
    this.#universeSelect.setAttribute('aria-label','Choose ecosystem universe');
    this.#universeSelect.append(new Option('All Indexed Solana','solana'));
    this.#universeSelect.value=this.#client.universeId||'solana';
    this.#universeSelect.addEventListener('change',async()=>{
      const id=this.#universeSelect.value;
      this.#activeHub=null;
      this.#research=null;
      this.#researchFor='';
      this.#trail.clear();
      this.#renderer.clearInvestigationHub?.();
      this.#client.selectUniverse(id);
      this.#root.dataset.universe=id;
      this.#renderTruth('loading');
      await this.#client.refresh();
      globalThis.dispatchEvent(new CustomEvent('abulls:universe-changed',{detail:{universeId:id}}));
    });
    portal.append(this.#universeSelect);
    toolbar.append(portal);

    for(const filter of FILTERS){
      const button=node('button','secondary',filter.toUpperCase());
      button.type='button';
      button.dataset.universeFilter=filter;
      button.setAttribute('aria-pressed',String(filter==='all'));
      button.addEventListener('click',()=>this.setFilter(filter));
      toolbar.append(button);
    }
    for(const [mode,label] of Object.entries(RESEARCH_LABELS)){
      const button=node('button','secondary',label);
      button.type='button';
      button.dataset.researchMode=mode;
      button.addEventListener('click',()=>this.#loadResearch(mode,true));
      toolbar.append(button);
    }

    this.#truth=node('div','universe-truth-panel');
    this.#truth.setAttribute('aria-live','polite');
    overlay.append(toolbar,node('div'),this.#truth);
    this.#root.append(this.#stage,overlay,node('div','universe-whiteout'));
    this.#host.replaceChildren(this.#root);
    this.#renderer=new UniverseRenderer({host:this.#stage,snapshot:this.#snapshot,THREE,onSelect:(entity,destination)=>this.#select(entity,destination)});
    this.#renderTruth('prototype');
    this.#unsubscribe=this.#client.subscribe(event=>this.#handleClient(event));
    this.#loadUniversePortal();

    this.#onFieldMode=event=>this.setMode(event?.detail?.mode);
    this.#onSearch=event=>{const matched=this.#renderer.focusRequest(event?.detail||{});if(matched?.entityId){const entity=this.#snapshot.particles.find(item=>item.id===matched.entityId);if(entity)this.#openInvestigationHub(entity);}};
    this.#onTrailBack=()=>this.#navigateTrail('back');
    this.#onTrailForward=()=>this.#navigateTrail('forward');
    globalThis.addEventListener('abulls:field-mode',this.#onFieldMode);
    globalThis.addEventListener('abulls:universal-search',this.#onSearch);
    globalThis.addEventListener('abulls:field-investigation-back',this.#onTrailBack);
    globalThis.addEventListener('abulls:field-investigation-forward',this.#onTrailForward);
  }

  async #loadUniversePortal(){
    try{
      const universes=await this.#client.listUniverses();
      if(!universes.length)return;
      const selected=this.#client.universeId;
      this.#universeSelect.replaceChildren(...universes.map(item=>{
        const option=new Option(`${item.label}${item.activeMemberCount?` · ${item.activeMemberCount}`:''}`,item.universeId);
        option.title=item.description||item.source||'';
        return option;
      }));
      if([...this.#universeSelect.options].some(option=>option.value===selected))this.#universeSelect.value=selected;
    }catch(_){/* retain last-known portal */}
  }

  async #loadResearch(mode='patterns',force=false){
    const id=this.#client.universeId||'solana';
    const key=`${id}:${mode}`;
    if(!force&&this.#researchFor===key)return;
    this.#researchMode=mode;
    this.#root.dataset.researchMode=mode;
    try{
      if(mode==='decisions')this.#research=await this.#client.decisionModels({universeId:id,windowSeconds:7*86400,limit:12000,walletLimit:200});
      else if(mode==='anomalies')this.#research=await this.#client.anomalies({universeId:id,windowSeconds:7*86400,limit:12000});
      else this.#research=await this.#client.patterns({universeId:id,windowSeconds:86400,limit:12000});
      this.#researchFor=key;
      this.#renderTruth('ready');
      globalThis.dispatchEvent(new CustomEvent('abulls:universe-research',{detail:{universeId:id,mode,analysis:this.#research}}));
    }catch(_){
      if(force){
        this.#research={unavailable:true,hypotheses:[],profiles:[],findings:[],eventsAnalyzed:0,walletsAnalyzed:0};
        this.#researchFor=key;
        this.#renderTruth('degraded');
      }
    }
  }

  #renderResearch(){
    if(!this.#research)return null;
    const details=node('details','universe-pattern-lab');
    details.open=true;
    details.append(node('summary','',`${RESEARCH_LABELS[this.#researchMode]||'RESEARCH'} · ${this.#researchMode==='patterns'?'24H':'7D'}`));
    if(this.#research.unavailable){details.append(node('p','','Research service is not available for this universe yet.'));return details;}
    details.append(node('p','',`${Number(this.#research.eventsAnalyzed||0).toLocaleString()} indexed events · ${Number(this.#research.walletsAnalyzed||0).toLocaleString()} wallets`));

    if(this.#researchMode==='decisions'){
      const profiles=(this.#research.profiles||[]).filter(profile=>Array.isArray(profile.hypotheses)&&profile.hypotheses.length).slice(0,5);
      if(!profiles.length)details.append(node('p','','No wallet decision hypotheses meet the current evidence thresholds.'));
      for(const profile of profiles){
        const hypothesis=profile.hypotheses[0];
        const article=node('article','universe-pattern-hypothesis');
        article.append(
          node('strong','',`${Math.round(Number(hypothesis.confidence||0)*100)}% · ${String(hypothesis.kind||'decision pattern').replaceAll('-',' ').toUpperCase()}`),
          node('p','',hypothesis.statement||''),
          node('small','',`${Number(hypothesis.supportingCount||0)} supporting / ${Number(hypothesis.contradictingCount||0)} contradicting observations · wallet ${String(profile.wallet||'').slice(0,6)}…${String(profile.wallet||'').slice(-4)}`),
          node('small','','Model of observable conditions only — not access to the trader’s private thoughts.')
        );
        details.append(article);
      }
      return details;
    }

    if(this.#researchMode==='anomalies'){
      const findings=(this.#research.findings||[]).slice(0,7);
      if(!findings.length)details.append(node('p','','No anomaly findings meet the current thresholds.'));
      for(const item of findings){
        const article=node('article','universe-pattern-hypothesis');
        article.append(
          node('strong','',`${Math.round(Number(item.score||0)*100)}% · ${String(item.kind||'anomaly').replaceAll('-',' ').toUpperCase()}`),
          node('p','',item.statement||''),
          node('small','',`${Number(item.sampleSize||0).toLocaleString()} supporting indexed observations`),
          node('small','','Investigation lead only — not a bad-actor label or proof of manipulation.')
        );
        details.append(article);
      }
      return details;
    }

    const hypotheses=(this.#research.hypotheses||[]).slice(0,5);
    if(!hypotheses.length)details.append(node('p','','No evidence-backed recurring hypotheses meet the current sample thresholds.'));
    for(const item of hypotheses){
      const article=node('article','universe-pattern-hypothesis');
      article.append(
        node('strong','',`${Math.round(Number(item.confidence||0)*100)}% · ${String(item.kind||'pattern').replaceAll('-',' ').toUpperCase()}`),
        node('p','',item.statement||''),
        node('small','','Theory only — inspect supporting and contradicting evidence before drawing conclusions.')
      );
      details.append(article);
    }
    return details;
  }

  #renderTruth(state){
    this.#truth.replaceChildren();
    const hub=this.#activeHub;
    const hubState=hub?(hub.evidenceCount?`${hub.evidenceCount} EVIDENCE EDGE${hub.evidenceCount===1?'':'S'}`:'FOCUS ONLY'):'NONE';
    const list=node('dl');
    const values=[
      ['Universe',(this.#client.universeId||'solana').toUpperCase()],
      ['Members',String(this.#snapshot.activeMemberCount??this.#snapshot.members?.length??0)],
      ['Mode',this.#mode.toUpperCase()],
      ['State',state==='ready'?'LIVE DATA':state==='degraded'?'PARTIAL SERVICE':state==='loading'?'CHANGING UNIVERSE':'SYNTHETIC PROTOTYPE'],
      ['Window',`${this.#snapshot.windowStart} → ${this.#snapshot.windowEnd}`],
      ['Particles',this.#filteredSnapshot().particles.length.toLocaleString()],
      ['Observed events',this.#snapshot.observedEventCount.toLocaleString()],
      ['Investigation',hubState],
      ['Coverage',this.#snapshot.coverageStatement],
      ['Sources',this.#snapshot.sources.join(', ')||'none'],
      ['Meaning',hub?.disclosure||'A bounded evidence view—not proof of identity, coordination, intent, or the entire Solana chain']
    ];
    for(const [label,value] of values)list.append(node('dt','',label),node('dd','',value));
    this.#truth.append(list);
    const research=this.#renderResearch();if(research)this.#truth.append(research);
  }

  #filteredSnapshot(){if(this.#filter==='all')return this.#snapshot;return Object.freeze({...this.#snapshot,particles:Object.freeze(this.#snapshot.particles.filter(({category})=>category===this.#filter))});}
  #openInvestigationHub(entity,{record=true}={}){const built=buildFieldInvestigationHub({focusEntity:entity,entities:this.#snapshot.particles,relations:relationsFromSnapshot(this.#snapshot)});if(record)this.#trail.visit(built);const hub=Object.freeze({...built,navigation:this.#trail.state()});this.#activeHub=hub;this.#renderer.setInvestigationHub?.(hub);globalThis.dispatchEvent(new CustomEvent('abulls:field-investigation-hub',{detail:hub}));this.#renderTruth(this.#snapshot.sources.length?'ready':'prototype');return hub;}
  #navigateTrail(direction){const target=direction==='back'?this.#trail.back():this.#trail.forward();if(!target)return false;const entity=this.#snapshot.particles.find(item=>String(item?.id)===target.focusId&&String(item?.kind||'entity')===target.focusKind);if(!entity){if(direction==='back')this.#trail.forward();else this.#trail.back();return false;}this.#openInvestigationHub(entity,{record:false});return true;}
  setFilter(filter){if(!FILTERS.includes(filter))return false;this.#filter=filter;this.#root.querySelectorAll('[data-universe-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.universeFilter===filter)));this.#renderer.updateSnapshot(this.#filteredSnapshot());this.#renderTruth(this.#snapshot.sources.length?'ready':'prototype');return true;}
  setMode(mode='explore'){const next=Object.hasOwn(MODE_FILTER,mode)?mode:'explore';this.#mode=next;this.#root.dataset.fieldMode=next;const preferred=MODE_FILTER[next];if(preferred&&preferred!==this.#filter)this.setFilter(preferred);else this.#renderTruth(this.#snapshot.sources.length?'ready':'prototype');return next;}
  async #select(entity,destination){this.#root.dataset.transition='accelerating';this.#openInvestigationHub(entity);try{await this.#onDestinationRequest?.(destination,entity,{investigationHub:this.#activeHub,universeId:this.#client.universeId});this.#renderer.markDestinationReady();this.#root.dataset.transition='revealing';globalThis.setTimeout(()=>{if(this.#root)this.#root.dataset.transition='idle';},500);}catch(error){this.#renderer.cancelTransition();this.#root.dataset.transition='idle';this.#renderTruth('degraded');}}
  #handleClient(event){if(event.universeId&&this.#universeSelect&&this.#universeSelect.value!==event.universeId&&[...this.#universeSelect.options].some(option=>option.value===event.universeId))this.#universeSelect.value=event.universeId;if(event.state==='ready'&&event.snapshot){this.#snapshot=event.snapshot;this.#renderer.updateSnapshot(this.#filteredSnapshot());if(this.#activeHub){const entity=this.#snapshot.particles.find(item=>item.id===this.#activeHub.focusId);if(entity)this.#openInvestigationHub(entity);else{this.#activeHub=null;this.#renderer.clearInvestigationHub?.();}}this.#renderTruth('ready');this.#loadResearch('patterns',false);}else if(event.state==='degraded'||event.state==='error')this.#renderTruth('degraded');else if(event.state==='universe-changed')this.#renderTruth('loading');}
  start(options){this.#client.start(options);}
  stop(){this.#client.stop();}
  destroy(){this.stop();this.#unsubscribe?.();globalThis.removeEventListener('abulls:field-mode',this.#onFieldMode);globalThis.removeEventListener('abulls:universal-search',this.#onSearch);globalThis.removeEventListener('abulls:field-investigation-back',this.#onTrailBack);globalThis.removeEventListener('abulls:field-investigation-forward',this.#onTrailForward);this.#trail.clear();this.#renderer.destroy();this.#root.remove();}
}

export const UniverseFilters=FILTERS;
