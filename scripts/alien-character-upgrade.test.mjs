import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

test("alien uses an anatomical dermal veil and articulated mouth", async () => {
  const organism = await source("src/lib/field/query-organism.ts");
  const anatomy = await source("src/lib/field/anatomy.ts");
  assert.match(anatomy, /buildDermalBuffers/);
  assert.match(organism, /DERMAL_VERT/);
  assert.match(organism, /mouthCavity/);
  assert.match(organism, /upperLip/);
  assert.match(organism, /lowerLip/);
  assert.doesNotMatch(organism, /Math\.abs\(Math\.sin\(now \* 0\.0105\)\)/);
});

test("voice is server-proxied, cached, timed, and has a browser fallback", async () => {
  const service = await source("src/lib/alien-voice.ts");
  const voice = await source("src/lib/field/voice.ts");
  assert.match(service, /ELEVENLABS_API_KEY/);
  assert.match(service, /ELEVENLABS_VOICE_ID/);
  assert.match(service, /with-timestamps/);
  assert.match(service, /cacheApi\.put/);
  assert.match(voice, /decodeAudioData/);
  assert.match(voice, /getByteTimeDomainData/);
  assert.match(voice, /playBrowserVoice/);
});
