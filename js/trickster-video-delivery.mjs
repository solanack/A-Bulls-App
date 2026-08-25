function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;}

export function mountVideoDelivery(host,result={}, {urlApi=globalThis.URL}={}){
  if(!(host instanceof Element))throw new TypeError('video delivery host is required');
  host.replaceChildren();
  let objectUrl=null;
  if(result.videoReady===true&&result.blob&&urlApi?.createObjectURL){
    objectUrl=urlApi.createObjectURL(result.blob);
    const card=node('section','trickster-video-delivery trickster-video-delivery--ready');
    card.append(node('strong','','VIDEO READY'),node('p','',`${result.width||1080}×${result.height||1920} · ${result.fps||30}fps · ${(result.extension||'video').toUpperCase()}`));
    const save=node('a','primary','SAVE VIDEO');save.href=objectUrl;save.download=`a-bulls-app-story.${result.extension||'mp4'}`;save.setAttribute('role','button');card.append(save);
    host.append(card);
  }else if(result.renderRequired==='server'){
    const card=node('section','trickster-video-delivery');card.append(node('strong','','SERVER RENDER REQUIRED'),node('p','',`This device cannot complete the local evidence-video encode${result.reason?` · ${String(result.reason).replaceAll('_',' ')}`:''}. The story remains validated and no fake video file is produced.`));host.append(card);
  }else if(result.validated===true){
    const card=node('section','trickster-video-delivery');card.append(node('strong','','EVIDENCE VALIDATED'),node('p','','The story passed evidence validation. A video file has not been produced by this render path.'));host.append(card);
  }
  return()=>{if(objectUrl&&urlApi?.revokeObjectURL)urlApi.revokeObjectURL(objectUrl);host.replaceChildren();};
}
