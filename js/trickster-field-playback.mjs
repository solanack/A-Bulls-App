import { dispatchStorySceneFieldState } from './field-story-scene.mjs';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

export function parseTricksterSceneMeta({title='',meta='',index=0}={}){
  const safeTitle=String(title||`scene-${index+1}`).trim()||`scene-${index+1}`;
  const text=String(meta||'');
  const durationMatch=text.match(/([0-9]+(?:\.[0-9]+)?)s/);
  const claimMatch=text.match(/([0-9]+) evidence-backed claims?/i);
  const runtimeMatch=text.match(/evidence-backed claims\s*·\s*([^·]+?)(?:\s*·\s*frames|$)/i);
  return Object.freeze({id:`field-scene-${index+1}-${safeTitle.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`,mode:(runtimeMatch?.[1]||'evidence-close').trim().replaceAll(' ','-'),durationMs:Math.max(250,Math.round(finite(durationMatch?.[1],3)*1000)),claimCount:Math.max(0,Math.trunc(finite(claimMatch?.[1],0)))});
}

function parseSceneButton(button,index){return Object.freeze({...parseTricksterSceneMeta({title:button?.querySelector('strong')?.textContent,meta:button?.querySelector('small')?.textContent,index}),button});}
function sceneEntries(root){return [...root.querySelectorAll('.trickster-scene')].filter(button=>!button.disabled).map(parseSceneButton);}
function runtimeForEntry(entry,sceneRuntime=[]){return sceneRuntime.find(item=>String(item?.sceneId||'')===String(entry?.sceneId||''))||sceneRuntime.find(item=>String(item?.mode||'')===String(entry?.mode||''))||{sceneId:entry.id,mode:entry.mode,eventIds:[]};}
function sceneForEntry(entry,manifest={}){const scenes=Array.isArray(manifest?.scenes)?manifest.scenes:[];return scenes.find(item=>String(item?.id||'')===String(entry?.sceneId||''))||{id:entry.id,claimIds:Array.from({length:entry.claimCount},(_,index)=>`display-claim-${index+1}`)};}
function dispatchScene(entry,sceneRuntime,manifest){return dispatchStorySceneFieldState(runtimeForEntry(entry,sceneRuntime),sceneForEntry(entry,manifest));}
async function startMountedReplay(root){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const play=[...root.querySelectorAll('.trade-replay-controls .primary')].find(button=>/^(PLAY|REPLAY)$/i.test(button.textContent?.trim()||''));play?.click();}

export function installTricksterFieldPlaybackBridge({root,sceneRuntime=[],manifest={}}={}){
  if(!(root instanceof Element))throw new TypeError('Trickster root element is required');
  let runToken=0,destroyed=false,controls=null,observer=null;
  const stop=()=>{runToken+=1;if(controls){controls.querySelector('[data-field-story-play]')?.removeAttribute('disabled');const stopButton=controls.querySelector('[data-field-story-stop]');if(stopButton)stopButton.disabled=true;}};
  const selectEntry=async(entry,{autoplay=false}={})=>{if(!entry||destroyed)return;entry.button.click();dispatchScene(entry,sceneRuntime,manifest);if(autoplay)await startMountedReplay(root);};
  const playStory=async()=>{const entries=sceneEntries(root);if(!entries.length)return;const token=++runToken,playButton=controls?.querySelector('[data-field-story-play]'),stopButton=controls?.querySelector('[data-field-story-stop]');if(playButton)playButton.disabled=true;if(stopButton)stopButton.disabled=false;for(const entry of entries){if(destroyed||token!==runToken)break;await selectEntry(entry,{autoplay:true});const started=performance.now();while(!destroyed&&token===runToken&&performance.now()-started<entry.durationMs)await wait(Math.min(250,entry.durationMs));}if(token===runToken&&!destroyed){if(playButton)playButton.disabled=false;if(stopButton)stopButton.disabled=true;}};
  const wire=()=>{if(destroyed)return;for(const [index,button] of [...root.querySelectorAll('.trickster-scene')].entries()){if(button.dataset.fieldPlaybackWired==='true')continue;button.dataset.fieldPlaybackWired='true';button.addEventListener('click',()=>dispatchScene(parseSceneButton(button,index),sceneRuntime,manifest));}const sceneList=root.querySelector('.trickster-scenes');if(!sceneList||controls?.isConnected)return;controls=document.createElement('div');controls.className='trickster-field-playback';const play=document.createElement('button');play.type='button';play.className='primary';play.dataset.fieldStoryPlay='true';play.textContent='PLAY STORY IN FIELD';play.addEventListener('click',playStory);const stopButton=document.createElement('button');stopButton.type='button';stopButton.className='secondary';stopButton.dataset.fieldStoryStop='true';stopButton.textContent='STOP';stopButton.disabled=true;stopButton.addEventListener('click',stop);const note=document.createElement('small');note.textContent='Scene camera and field motion are presentation only. Evidence, timing and simulation labels remain canonical.';controls.append(play,stopButton,note);sceneList.before(controls);};
  observer=new MutationObserver(wire);observer.observe(root,{childList:true,subtree:true});wire();return()=>{destroyed=true;stop();observer?.disconnect();controls?.remove();controls=null;};
}

export const TricksterFieldPlaybackDisclosure='Field playback drives existing Trickster scenes and replay controls. It does not create new evidence, retime chain events, or convert simulation into observed history.';
