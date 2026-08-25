import { bootstrapNextExperience } from './experience-bootstrap.mjs';
import { ProductAdapterRegistry } from './product-adapters.mjs';
import { UniverseExperience } from './universe-experience.mjs';
import { IntelligenceWorkspace } from './intelligence-workspace-vnext.mjs';
import { TricksterStudio } from './trickster-studio.mjs';
import { validateStoryForExport } from './trickster-validation-client.mjs';
import { loadThree } from './experience-dependencies.mjs';

function node(tag,className,text) {
  const item=document.createElement(tag);
  if(className) item.className=className;
  if(text!=null) item.textContent=text;
  return item;
}

function productPage(title,description) {
  const page=node('section','product-home');
  const intro=node('div','product-home__intro');
  const copy=node('div');
  copy.append(node('small','','PRODUCT'),node('h1','',title));
  intro.append(copy,node('p','',description));
  const body=node('div','product-grid');
  page.append(intro,body);
  return {page,body};
}

function unavailablePage(title,description) {
  const {page,body}=productPage(title,description);
  const card=node('article','product-card product-card--featured');
  card.append(node('span','product-card__index','FOUNDATION READY'),node('h2','','Disabled until its data gate is enabled'),node('p','','The product remains visible in the architecture but does not silently fall back to legacy or unverified data.'));
  body.append(card);return page;
}

function gamesPage(onLaunch) {
  const {page,body}=productPage('Games','Bull Invaders is the arcade experience, preserved alongside the Solana intelligence platform.');
  const invaders=node('button','product-card product-card--featured');
  invaders.type='button';
  invaders.append(node('span','product-card__index','01'),node('h2','','Bull Invaders'),node('p','','Ranked and campaign play with the existing deterministic scoring and replay rules.'),node('span','product-card__action','OPEN LOADOUT →'));
  invaders.addEventListener('click',()=>onLaunch?.('bull-invaders'));
  body.append(invaders);
  return page;
}

async function setup() {
  const flags=globalThis.BBR_EXPERIENCE_FLAGS||{};
  if(flags.nextProductShellEnabled!==true&&String(flags.NEXT_PRODUCT_SHELL_ENABLED||'').toLowerCase()!=='true') return;

  const universeRequested=flags.universeEnabled===true||String(flags.UNIVERSE_ENABLED||'').toLowerCase()==='true';
  const tricksterRequested=flags.tricksterStudioEnabled===true||String(flags.TRICKSTER_STUDIO_ENABLED||'').toLowerCase()==='true';
  const THREE=globalThis.THREE||(universeRequested?await loadThree():null);
  const existing=document.getElementById('app');
  let app=null;
  const host=node('div');
  host.id='nextProductShell';
  document.body.append(host);
  const instances=new Map();
  const adapters=new ProductAdapterRegistry();

  function openStory(bundle) {
    globalThis.BBR_TRICKSTER_EVIDENCE=bundle;
    const content=adapters.activate('trickster',{source:'create-story'});
    if(content instanceof Element) app?.shell.mountProduct(content);
    app?.shell.setActiveProduct('trickster');
    instances.get('trickster')?.loadEvidence(bundle);
  }

  adapters.register('universe',{
    activate() {
      if(!universeRequested)return unavailablePage('Universe','The cinematic full-chain discovery layer is feature-gated until its verified live data path is enabled.');
      const mount=node('div');
      const experience=new UniverseExperience({
        host:mount,
        apiBase:globalThis.BBRConfig?.apiBase||location.origin,
        THREE,
        onDestinationRequest:async(destination,entity)=>{
          globalThis.dispatchEvent(new CustomEvent('abulls:universe-selection',{detail:{destination,entity}}));
          const content=adapters.activate('intelligence',{source:'universe',request:{...destination,query:destination.entityId}});
          if(content instanceof Element) app?.shell.mountProduct(content);
          app?.shell.setActiveProduct('intelligence');
        }
      });
      instances.set('universe',experience);
      experience.start();
      return mount;
    },
    deactivate() {
      instances.get('universe')?.destroy();
      instances.delete('universe');
    }
  });

  adapters.register('intelligence',{
    activate(context={}) {
      instances.get('intelligence')?.destroy();
      const mount=node('div');
      const workspace=new IntelligenceWorkspace({
        host:mount,
        apiBase:globalThis.BBRConfig?.apiBase||location.origin,
        onCreateStory:openStory
      });
      if(context.request)workspace.setRequest(context.request);
      instances.set('intelligence',workspace);
      return mount;
    },
    deactivate() {
      instances.get('intelligence')?.destroy();
      instances.delete('intelligence');
    }
  });

  adapters.register('trickster',{
    activate() {
      if(!tricksterRequested)return unavailablePage('Trickster','The evidence-backed creator is feature-gated until its validation/export path is enabled.');
      instances.get('trickster')?.destroy();
      const mount=node('div');
      const studio=new TricksterStudio({
        host:mount,
        onOpenEvidence:()=>{
          const content=adapters.activate('intelligence',{source:'trickster'});
          if(content instanceof Element) app?.shell.mountProduct(content);
          app?.shell.setActiveProduct('intelligence');
        },
        onExport:async(detail)=>{
          const validation=await validateStoryForExport(detail.manifest,{
            apiBase:globalThis.BBRConfig?.apiBase||location.origin
          });
          const exportDetail=Object.freeze({...detail,validation});
          globalThis.dispatchEvent(new CustomEvent('abulls:trickster-export',{detail:exportDetail}));
          return validation;
        }
      });
      instances.set('trickster',studio);
      const pending=globalThis.BBR_TRICKSTER_EVIDENCE;
      if(pending) studio.loadEvidence(pending);
      return mount;
    },
    deactivate() {
      instances.get('trickster')?.destroy();
      instances.delete('trickster');
    }
  });

  let gameView=null;
  let gamePlaceholder=null;
  adapters.register('games',{
    activate() {
      return gamesPage(async(gameId)=>{
        gameView=document.getElementById('invadersGameView');
        if(!gameView) return;
        if(!gamePlaceholder) {
          gamePlaceholder=document.createComment('product-portal:invadersGameView');
          gameView.parentNode?.insertBefore(gamePlaceholder,gameView);
        }
        globalThis.showView?.('invadersGame');
        app?.shell.mountProduct(gameView);
        await globalThis.BBRPlatform?.launch?.(gameId);
      });
    },
    deactivate() {
      const leaving=globalThis.BBRPlatform?.leaveGame?.();
      leaving?.catch?.(()=>{});
      if(gameView&&gamePlaceholder?.parentNode) gamePlaceholder.parentNode.insertBefore(gameView,gamePlaceholder.nextSibling);
    }
  });

  app=bootstrapNextExperience({
    flags,
    host,
    adapters,
    serviceState:navigator.onLine===false?'degraded':'ready',
    initialProduct:universeRequested?'universe':'intelligence',
    onSearchRequest:(request)=>globalThis.dispatchEvent(new CustomEvent('abulls:universal-search',{detail:request}))
  });

  if(!app.mounted) {
    host.remove();
    return;
  }
  if(existing) existing.hidden=true;
  globalThis.BBRNextExperience=Object.freeze({
    ...app,
    loadStory:openStory
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
