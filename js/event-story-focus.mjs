export function resolveEventStoryFocus(bundle={}){
  if(bundle?.storyType!=='transaction-replay')return Object.freeze({signature:'',timestamp:null,id:''});
  const signature=String(bundle?.marketContext?.subject?.signature||bundle?.subject?.id||'').trim();
  const contextTime=Number(bundle?.marketContext?.subject?.eventTime);
  const selected=(bundle?.replayEvents||[]).find(event=>String(event?.signature||'')===signature)||null;
  const eventTime=Number(selected?.timestamp);
  const timestamp=Number.isFinite(contextTime)&&contextTime>0?contextTime:Number.isFinite(eventTime)?eventTime:null;
  return Object.freeze({signature,id:String(selected?.id||signature||'').trim(),timestamp});
}
