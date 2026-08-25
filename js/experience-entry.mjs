import { bootstrapNextExperience } from './experience-bootstrap.mjs';
import { ProductAdapterRegistry,domPortalAdapter } from './product-adapters.mjs';
import { UniverseExperience } from './universe-experience.mjs';
import { TricksterStudio } from './trickster-studio.mjs';

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

function gamesPage(onLaunch) {
  const {page,body}=productPage('Games','Arcade and interactive experiences remain a first-class product alongside Intelligence.');
  const invaders=node('button','product-card product-card--featured');
  invaders.type='button';
  invaders.append(node('span','product-card__index','01'),node('h2','','Bull Invaders'),node('p','','Ranked and campaign play with the existing deterministic scoring and replay rules.'),node('span','product-card__action','OPEN LOADOUT →'));
  invaders.addEventListener('click',()=>onLaunch?.('bull-invaders'));
  const bang=node('a','product-card');
  bang.href='games/claude-of-duty/index.html';
  bang.append(node('span','product-card__index','02'),node('h2','','Solana Bang Bang'),node('p','','Enter the existing maze experience.'),node('span','product-card__action','OPEN GAME →'));
  body.append(invaders,bang);
  return page;
}

function setup() {
  const flags=globalThis.BBR_EXPERIENCE_FLAGS||{};
  if(flags.nextProductShellEnabled!==true&&String(flags.NEXT_PRODUCT_SHELL_ENABLED||'').toLowerCase()!=='true') return;

  const existing=document.getElementById('app');
  let app=null;
  const host=node('div');
  host.id='nextProductShell';
  document.body.append(host);
  const instances=new Map();
  const adapters=new ProductAdapterRegistry();

  adapters.register('universe',{
    activate() {
      const mount=node('div');
      const experience=new UniverseExperience({
        host:mount,
        apiBase:globalThis.BBRConfig?.apiBase||location.origin,
        THREE:globalThis.THREE,
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

  adapters.register('intelligence',domPortalAdapter({
    viewId:'trackView',
    activateView(context) {
      globalThis.showView?.('intelligence');
      const request=context?.request;
      if(request?.kind==='solana-address') {
        const input=document.getElementById('walletInput');
        if(input) input.value=request.query;
      }
      globalThis.dispatchEvent(new CustomEvent('abulls:intelligence-request',{detail:request||null}));
    }
  }));

  adapters.register('trickster',{
    activate() {
      const mount=node('div');
      const studio=new TricksterStudio({
        host:mount,
        onOpenEvidence:()=>globalThis.dispatchEvent(new CustomEvent('abulls:open-intelligence')),
        onExport:(detail)=>{
          globalThis.dispatchEvent(new CustomEvent('abulls:trickster-export',{detail}));
          return null;
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

  adapters.register('life',domPortalAdapter({
    viewId:'lifeView',
    activateView() {
      globalThis.showView?.('life');
      globalThis.BBRLife?.render?.();
    }
  }));

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
    async deactivate() {
      await globalThis.BBRPlatform?.leaveGame?.();
      if(gameView&&gamePlaceholder?.parentNode) gamePlaceholder.parentNode.insertBefore(gameView,gamePlaceholder.nextSibling);
    }
  });

  app=bootstrapNextExperience({
    flags,
    host,
    adapters,
    serviceState:navigator.onLine===false?'degraded':'ready',
    initialProduct:'universe',
    onSearchRequest:(request)=>globalThis.dispatchEvent(new CustomEvent('abulls:universal-search',{detail:request}))
  });

  if(!app.mounted) {
    host.remove();
    return;
  }
  if(existing) existing.hidden=true;
  globalThis.BBRNextExperience=Object.freeze({
    ...app,
    loadStory(bundle) {
      globalThis.BBR_TRICKSTER_EVIDENCE=bundle;
      app.shell.setActiveProduct('trickster');
      const content=adapters.activate('trickster',{source:'create-story'});
      if(content instanceof Element) app.shell.mountProduct(content);
      instances.get('trickster')?.loadEvidence(bundle);
    }
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
