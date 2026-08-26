const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;

export function buildActiveTimeMap(events=[], {gapThresholdMs=30000,compressedGapMs=3000}={}){
  const threshold=Math.max(1000,finite(gapThresholdMs)??30000),compressed=Math.max(250,Math.min(threshold,finite(compressedGapMs)??3000));
  const rows=events.map((event,index)=>({event,index,timestamp:finite(event?.timestamp)})).filter(row=>row.timestamp!=null).sort((a,b)=>a.timestamp-b.timestamp||a.index-b.index);
  if(!rows.length)return Object.freeze({points:Object.freeze([]),originalDurationMs:0,activeDurationMs:0,compressedGapCount:0,totalCompressedMs:0,gapThresholdMs:threshold,compressedGapMs:compressed,disclosure:'No timestamped events are available for active-time mapping.'});
  const points=[];let active=0,compressedGapCount=0,totalCompressedMs=0;
  for(let index=0;index<rows.length;index++){
    if(index>0){const gap=Math.max(0,rows[index].timestamp-rows[index-1].timestamp);const mapped=gap>threshold?compressed:gap;if(gap>threshold){compressedGapCount+=1;totalCompressedMs+=gap-mapped;}active+=mapped;}
    points.push(Object.freeze({id:String(rows[index].event?.signature||rows[index].event?.id||rows[index].index),timestamp:rows[index].timestamp,activeTimeMs:active,index:rows[index].index}));
  }
  return Object.freeze({points:Object.freeze(points),originalDurationMs:Math.max(0,rows.at(-1).timestamp-rows[0].timestamp),activeDurationMs:active,compressedGapCount,totalCompressedMs,gapThresholdMs:threshold,compressedGapMs:compressed,disclosure:compressedGapCount?`Active-time mode compresses ${compressedGapCount} inactive gap${compressedGapCount===1?'':'s'} longer than ${Math.round(threshold/1000)} seconds. Original chain timestamps remain attached to every event.`:'No inactive gaps exceeded the active-time compression threshold.'});
}

export function activeTimeForTimestamp(map={},timestamp){
  const target=finite(timestamp),points=map?.points||[];if(target==null||!points.length)return null;
  if(target<=points[0].timestamp)return points[0].activeTimeMs;
  for(let index=1;index<points.length;index++){
    const prev=points[index-1],next=points[index];if(target>next.timestamp)continue;
    const sourceGap=next.timestamp-prev.timestamp,activeGap=next.activeTimeMs-prev.activeTimeMs;if(sourceGap<=0)return next.activeTimeMs;return prev.activeTimeMs+((target-prev.timestamp)/sourceGap)*activeGap;
  }
  return points.at(-1).activeTimeMs;
}
