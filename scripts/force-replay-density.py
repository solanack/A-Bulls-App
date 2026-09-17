import re
from pathlib import Path

backend = Path('workers/intelligence-replay-bundle.mjs')
text = backend.read_text()
replacement = '''export function adaptiveReplayBucketSeconds(from,to,requested=0){
  const span=Math.max(0,Math.trunc(n(to))-Math.trunc(n(from))),asked=Math.max(0,Math.trunc(n(requested))),requestedFloor=asked?(REPLAY_BUCKETS.find(value=>value>=asked)??86400):60;
  const eligible=REPLAY_BUCKETS.filter(value=>value>=requestedFloor);if(!span)return requestedFloor;
  return eligible.reduce((best,value)=>Math.abs(span/value-TARGET_REPLAY_CANDLES)<Math.abs(span/best-TARGET_REPLAY_CANDLES)?value:best,eligible[0]??86400);
}'''
pattern = r"export function adaptiveReplayBucketSeconds\(from,to,requested=0\)\{.*?\n\}"
text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'expected exactly one adaptive bucket function, replaced {count}')
backend.write_text(text)

test_path = Path('workers/intelligence-replay-bundle.test.mjs')
test = test_path.read_text()
expectations = {
    r"assert\.equal\(adaptiveReplayBucketSeconds\(0,2\*86400,0\),\d+\);": "assert.equal(adaptiveReplayBucketSeconds(0,2*86400,0),900);",
    r"assert\.equal\(adaptiveReplayBucketSeconds\(0,10\*86400,60\),\d+\);": "assert.equal(adaptiveReplayBucketSeconds(0,10*86400,60),3600);",
    r"assert\.equal\(adaptiveReplayBucketSeconds\(0,90\*86400,60\),\d+\);": "assert.equal(adaptiveReplayBucketSeconds(0,90*86400,60),43200);",
}
for pattern, value in expectations.items():
    test, count = re.subn(pattern, value, test, count=1)
    if count != 1:
        raise SystemExit(f'failed to force Replay expectation: {pattern}')
test_path.write_text(test)

assert 'adaptiveReplayBucketSeconds(0,2*86400,0),900' in test
assert 'adaptiveReplayBucketSeconds(0,10*86400,60),3600' in test
assert 'adaptiveReplayBucketSeconds(0,90*86400,60),43200' in test
print('Replay density function and tests forced to the 240-candle target contract')
