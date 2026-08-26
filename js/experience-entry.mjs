import { bootstrapNextExperience } from './experience-bootstrap.mjs';
import { ProductAdapterRegistry } from './product-adapters.mjs';
import { UniverseExperience } from './universe-experience.mjs';
import { IntelligenceWorkspace } from './intelligence-workspace-vnext.mjs';
import { TokenMarketWorkspace } from './token-market-workspace.mjs';
import { TricksterStudio } from './trickster-studio.mjs';
import { validateStoryForExport } from './trickster-validation-client.mjs';
import { renderEventStoryVideo } from './event-story-video-export.mjs';
import { renderWalletComparisonVideo } from './wallet-comparison-video-export.mjs';
import { buildTricksterNarrationPlan } from './trickster-narration-plan.mjs';
import { applyExplicitEventStoryPriceSelection } from './event-story-price-selection.mjs';
import { loadThree } from './experience-dependencies.mjs';
import { createBullInvadersHost, installBullInvadersNavigationBridge } from './bull-invaders-host.mjs';

function node(tag,className,text) {const item=document.createElement(tag);if(className)item.className=className;if(text!=null)item.textContent=text;return item;}
function productPage(title,description) {const page=node('section','product-home'),intro=node('div','product-home__intro'),copy=node('div');copy.append(node('small','','PRODUCT'),node('h1','',title));intro.append(copy,node('p','',description));const body=node('div','product-grid');page.append(intro,body);return {page,body};}
function unavailablePage(title,description) {const {page,body}=productPage(title,description),card=node('article','product-card product-card--featured');card.append(node('span','product-card__index','FOUNDATION READY'),node('h2','','Data gate is not enabled'),node('p','','This surface fails closed rather than falling back to retired or unverified data.'));body.append(card);return page;}
function gamesPage(onOpen) {const {page,body}=productPage('Games','Bull Invaders is the single arcade experience inside the full-chain intelligence platform.'),invaders=node('button','product-card product-card--featured');invaders.type='button';invaders.append(node('span','product-card__index','ONLY GAME'),node('h2','','Bull Invaders'),node('p','','Ranked and 10-EPOCH campaign play with preserved scoring, hitboxes, physics, replay validation, ships, power-ups and boss behavior.'),node('span','product-card__action','OPEN LOADOUT →'));invaders.addEventListener('click',()=>onOpen?.());body.append(invaders);return page;}

async function setup() {
  const flags=globalThis.BBR_EXPERIENCE_FLAGS||{};if(flags.nextProductShellEnabled!==true&&String(flags.NEXT_PRODUCT_SHELL_ENABLED||'').toLowerCase()!=='true')return;
  const universeRequested=flags.universeEnabled===true||String(flags.UNIVERSE_ENABLED||'').toLowerCase()==='true',tricksterRequested=flags.tricksterStudioEnabled===true||String(flags.TRICKSTER_STUDIO_ENABLED||'').toLowerCase()==='true',THREE=globalThis.THREE||(universeRequested?await loadThree():null),legacyApp=document.getElementById('app');
  let app=null;const host=node('div');host.id='nextProductShell';document.body.append(host);const instances=new Map(),adapters=new ProductAdapterRegistry();let gameHost=null,gameInitialized=false,removeGameBridge=null;
  function openStory(bundle){const sanitized=applyExplicitEventStoryPriceSelection(bundle);globalThis.BBR_TRICKSTER_EVIDENCE=sanitized;const content=adapters.activate('trickster',{source:'create-story'});if(content instanceof Element)app?.shell.mountProduct(content);app?.shell.setActiveProduct('trickster');instances.get('trickster')?.loadEvidence(sanitized);}
  function showGamesLanding(){const content=gamesPage(openBullInvaders);app?.shell.mountProduct(content);app?.shell.setActiveProduct('games');}
  function ensureBullInvadersHost(){if(gameHost)return gameHost;gameHost=createBullInvadersHost();removeGameBridge=installBullInvadersNavigationBridge({onExit:showGamesLanding});const start=gameHost.querySelector('#startInvaders');start?.addEventListener('click',async()=>{gameHost.classList.add('active');try{await globalThis.BBRPlatform?.launch?.('bull-invaders');}catch(error){console.error('[Bull Invaders launch]',error);globalThis.toast?.('Bull Invaders could not start');}});if(!gameInitialized){globalThis.BBRRunMode?.init?.();globalThis.BullInvaders?.init?.();gameInitialized=true;}return gameHost;}
  function openBullInvaders(){const view=ensureBullInvadersHost();app?.shell.mountProduct(view);app?.shell.setActiveProduct('games');requestAnimationFrame(()=>globalThis.dispatchEvent(new Event('resize')));}
  function intelligenceProduct(context={}){
    const mount=node('div','intelligence-product-vnext'),switcher=node('div','intelligence-mode-switcher'),surface=node('div','intelligence-mode-surface');let active=null;
    const walletButton=node('button','secondary intelligence-mode-switcher__button','WALLET / TRANSACTION'),marketButton=node('button','secondary intelligence-mode-switcher__button','TOKEN MARKET');walletButton.type=marketButton.type='button';switcher.append(walletButton,marketButton);mount.append(switcher,surface);
    const setActive=mode=>{walletButton.classList.toggle('active',mode==='wallet');marketButton.classList.toggle('active',mode==='market');walletButton.setAttribute('aria-pressed',String(mode==='wallet'));marketButton.setAttribute('aria-pressed',String(mode==='market'));};
    const destroyActive=()=>{active?.destroy?.();active=null;surface.replaceChildren();};
    const showWallet=()=>{destroyActive();setActive('wallet');active=new IntelligenceWorkspace({host:surface,apiBase:globalThis.BBRConfig?.apiBase||location.origin,onCreateStory:openStory});if(context.request)active.setRequest(context.request);};
    const showMarket=()=>{const prefill=context.request?.token||context.request?.mint||context.request?.entityId||'';destroyActive();setActive('market');active=new TokenMarketWorkspace({host:surface,apiBase:globalThis.BBRConfig?.apiBase||location.origin,prefillMint:prefill});};
    walletButton.addEventListener('click',showWallet);marketButton.addEventListener('click',showMarket);showWallet();
    return{element:mount,destroy(){destroyActive();mount.remove();}};
  }
  adapters.register('universe',{activate(){if(!universeRequested)return unavailablePage('Universe','The cinematic full-chain discovery layer is feature-gated until its verified live data path is enabled.');const mount=node('div'),experience=new UniverseExperience({host:mount,apiBase:globalThis.BBRConfig?.apiBase||location.origin,THREE,onDestinationRequest:async(destination,entity)=>{globalThis.dispatchEvent(new CustomEvent('abulls:universe-selection',{detail:{destination,entity}}));const content=adapters.activate('intelligence',{source:'universe',request:{...destination,query:destination.entityId}});if(content instanceof Element)app?.shell.mountProduct(content);app?.shell.setActiveProduct('intelligence');}});instances.set('universe',experience);experience.start();return mount;},deactivate(){instances.get('universe')?.destroy();instances.delete('universe');}});
  adapters.register('intelligence',{activate(context={}){instances.get('intelligence')?.destroy();const product=intelligenceProduct(context);instances.set('intelligence',product);return product.element;},deactivate(){instances.get('intelligence')?.destroy();instances.delete('intelligence');}});
  adapters.register('trickster',{activate(){if(!tricksterRequested)return unavailablePage('Trickster','The evidence-backed creator is feature-gated until its validation/export path is enabled.');instances.get('trickster')?.destroy();const mount=node('div'),studio=new TricksterStudio({host:mount,onOpenEvidence:()=>{const content=adapters.activate('intelligence',{source:'trickster'});if(content instanceof Element)app?.shell.mountProduct(content);app?.shell.setActiveProduct('intelligence');},onExport:async(detail)=>{
    const validation=await validateStoryForExport(detail.manifest,{apiBase:globalThis.BBRConfig?.apiBase||location.origin});let rendering=null;
    const narration=validation.validated===true?buildTricksterNarrationPlan(validation.manifest,detail.timeline):null;
    const progress={onProgress:item=>globalThis.dispatchEvent(new CustomEvent('abulls:trickster-render-progress',{detail:item}))};
    if(validation.validated===true&&detail.renderPlan?.length){
      if(detail.manifest?.storyType==='transaction-replay')rendering=await renderEventStoryVideo({...detail,manifest:validation.manifest},progress);
      else if(detail.manifest?.storyType==='wallet-comparison')rendering=await renderWalletComparisonVideo({...detail,manifest:validation.manifest},progress);
    }
    const result=rendering?Object.freeze({...validation,...rendering,manifest:validation.manifest,narration}):Object.freeze({...validation,narration}),exportDetail=Object.freeze({...detail,manifest:validation.manifest,validation,narration,rendering,result});globalThis.dispatchEvent(new CustomEvent('abulls:trickster-export',{detail:exportDetail}));return result;
  }});instances.set('trickster',studio);const pending=globalThis.BBR_TRICKSTER_EVIDENCE;if(pending)studio.loadEvidence(pending);return mount;},deactivate(){instances.get('trickster')?.destroy();instances.delete('trickster');}});
  adapters.register('games',{activate(){return gamesPage(openBullInvaders);},deactivate(){const leaving=globalThis.BBRPlatform?.leaveGame?.();leaving?.catch?.(()=>{});}});
  app=bootstrapNextExperience({flags,host,adapters,serviceState:navigator.onLine===false?'degraded':'ready',initialProduct:universeRequested?'universe':'intelligence',onSearchRequest:request=>globalThis.dispatchEvent(new CustomEvent('abulls:universal-search',{detail:request}))});
  if(!app.mounted){host.remove();return;}legacyApp?.remove();globalThis.BBRNextExperience=Object.freeze({...app,loadStory:openStory,openBullInvaders,destroy(){removeGameBridge?.();app?.destroy?.();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
