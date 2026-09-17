from pathlib import Path

p=Path('workers/intelligence-replay-bundle.mjs')
t=p.read_text()
old="""export function adaptiveReplayBucketSeconds(from,to,requested=0){
  const span=Math.max(0,Math.trunc(n(to))-Math.trunc(n(from))),asked=Math.max(0,Math.trunc(n(requested))),target=Math.max(60,Math.ceil(span/TARGET_REPLAY_CANDLES));
  const densityBucket=REPLAY_BUCKETS.find(value=>value>=target)??86400,requestedFloor=asked?(REPLAY_BUCKETS.find(value=>value>=asked)??86400):60;
  return Math.max(densityBucket,requestedFloor);
}"""
new="""export function adaptiveReplayBucketSeconds(from,to,requested=0){
  const span=Math.max(0,Math.trunc(n(to))-Math.trunc(n(from))),asked=Math.max(0,Math.trunc(n(requested))),requestedFloor=asked?(REPLAY_BUCKETS.find(value=>value>=asked)??86400):60;
  const eligible=REPLAY_BUCKETS.filter(value=>value>=requestedFloor);if(!span)return requestedFloor;
  return eligible.reduce((best,value)=>Math.abs(span/value-TARGET_REPLAY_CANDLES)<Math.abs(span/best-TARGET_REPLAY_CANDLES)?value:best,eligible[0]??86400);
}"""
if old not in t and new not in t: raise SystemExit('density selector anchor missing')
if old in t: t=t.replace(old,new,1)
p.write_text(t)

p=Path('workers/intelligence-replay-bundle.test.mjs')
t=p.read_text()
t=t.replace('assert.equal(adaptiveReplayBucketSeconds(0,86400,60),60);','assert.equal(adaptiveReplayBucketSeconds(0,86400,60),300);')
p.write_text(t)

print('Replay density selector tuned')
