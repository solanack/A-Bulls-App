function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}
function narrationSummary(result={}){const scenes=result.narration?.scenes||[],spoken=scenes.filter(scene=>scene?.silent!==true&&(scene?.segments||[]).length).length;return result.narration?` · NARRATION SCRIPT ${spoken} SCENES · VOICE NOT EMBEDDED`:'';}

export function describeVideoDelivery(result={}){
  if(result.videoReady===true&&result.blob){const sound=result.audio?.embedded===true?` · SOUND ${result.audio.cueCount||0} CUES`:' · SILENT FALLBACK';return Object.freeze({mode:'ready',title:'VIDEO READY',summary:`${result.width||1080}×${result.height||1920} · ${result.fps||30}fps · ${(result.extension||'video').toUpperCase()}${sound}${narrationSummary(result)}`,extension:result.extension||'mp4'});}
  if(result.renderRequired==='server')return Object.freeze({mode:'server',title:'SERVER RENDER REQUIRED',summary:`This device cannot complete the local evidence-video encode${result.reason?` · ${String(result.reason).replaceAll('_',' ')}`:''}. The story remains validated and no fake video file is produced.${result.narration?' A validated narration script is ready, but no voice track has been generated.':''}`,extension:null});
  if(result.validated===true)return Object.freeze({mode:'validated',title:'EVIDENCE VALIDATED',summary:`The story passed evidence validation. A video file has not been produced by this render path.${result.narration?' A validated narration script is ready; voice is not embedded.':''}`,extension:null});
  return Object.freeze({mode:'empty',title:'',summary:'',extension:null});
}

export function mountVideoDelivery(host,result={}, {urlApi=globalThis.URL}={}){
  if(!(host instanceof Element))throw new TypeError('video delivery host is required');
  host.replaceChildren();
  const state=describeVideoDelivery(result);let objectUrl=null;
  if(state.mode==='ready'&&urlApi?.createObjectURL){
    objectUrl=urlApi.createObjectURL(result.blob);
    const card=node('section','trickster-video-delivery trickster-video-delivery--ready');card.append(node('strong','',state.title),node('p','',state.summary));
    const save=node('a','primary','SAVE VIDEO');save.href=objectUrl;save.download=`a-bulls-app-story.${state.extension}`;save.setAttribute('role','button');card.append(save);host.append(card);
  }else if(state.mode!=='empty'){
    const card=node('section','trickster-video-delivery');card.append(node('strong','',state.title),node('p','',state.summary));host.append(card);
  }
  return()=>{if(objectUrl&&urlApi?.revokeObjectURL)urlApi.revokeObjectURL(objectUrl);host.replaceChildren();};
}
