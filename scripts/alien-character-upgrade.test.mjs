import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

test("alien uses the licensed continuous head with particle fallback", async () => {
  const organism = await source("src/lib/field/query-organism.ts");
  const anatomy = await source("src/lib/field/anatomy.ts");
  assert.match(anatomy, /buildDermalBuffers/);
  assert.match(organism, /DERMAL_VERT/);
  assert.match(organism, /grey_alien_head_ccby\.glb/);
  assert.match(organism, /uGreySpeech/);
  assert.match(organism, /!this\.headLoaded/);
  assert.match(organism, /mouthCavity/);
  assert.match(organism, /upperLip/);
  assert.match(organism, /lowerLip/);
  assert.doesNotMatch(organism, /Math\.abs\(Math\.sin\(now \* 0\.0105\)\)/);
});

test("licensed Grey head is optimized and attributed", async () => {
  const credits = await source("ASSET_CREDITS.md");
  const model = await readFile(new URL("public/models/grey_alien_head_ccby.glb", ROOT));
  assert.ok(model.byteLength > 500_000);
  assert.ok(model.byteLength < 3_000_000);
  assert.match(credits, /joel_shanky/);
  assert.match(credits, /CC BY 4\.0/);
  assert.match(credits, /Changes made by A Bulls App/);
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
