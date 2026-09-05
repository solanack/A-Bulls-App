import { createServerFn } from "@tanstack/react-start";

export type AlienVoiceAlignment = {
  characters: string[];
  starts: number[];
  ends: number[];
};

export type AlienVoiceDelivery = {
  ok: boolean;
  provider: "elevenlabs" | "browser-fallback";
  audioBase64: string | null;
  mimeType: string | null;
  alignment: AlienVoiceAlignment | null;
};

type ElevenAlignment = {
  characters?: string[];
  character_start_times_seconds?: number[];
  character_end_times_seconds?: number[];
};

type ElevenResponse = {
  audio_base64?: string;
  alignment?: ElevenAlignment | null;
  normalized_alignment?: ElevenAlignment | null;
};

function safeAlignment(value?: ElevenAlignment | null): AlienVoiceAlignment | null {
  if (!value?.characters?.length) return null;
  const starts = value.character_start_times_seconds ?? [];
  const ends = value.character_end_times_seconds ?? [];
  if (starts.length !== value.characters.length || ends.length !== value.characters.length)
    return null;
  return { characters: value.characters, starts, ends };
}

async function runtimeBindings(): Promise<Record<string, string | undefined>> {
  try {
    const mod = await import("cloudflare:workers");
    return mod.env as Record<string, string | undefined>;
  } catch {
    return typeof process !== "undefined"
      ? (process.env as Record<string, string | undefined>)
      : {};
  }
}

async function digest(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const synthesizeAlienVoice = createServerFn({ method: "POST" })
  .validator((value: { text: string }) => value)
  .handler(async ({ data }): Promise<AlienVoiceDelivery> => {
    const text = String(data.text ?? "")
      .trim()
      .slice(0, 2400);
    const bindings = await runtimeBindings();
    const apiKey = bindings.ELEVENLABS_API_KEY?.trim();
    const voiceId = bindings.ELEVENLABS_VOICE_ID?.trim();
    if (!text || !apiKey || !voiceId) {
      return {
        ok: false,
        provider: "browser-fallback",
        audioBase64: null,
        mimeType: null,
        alignment: null,
      };
    }

    const modelId = bindings.ELEVENLABS_MODEL_ID?.trim() || "eleven_v3";
    const cacheApi = (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)
      ?.default;
    const cacheKey = new Request(
      `https://voice-cache.abulls.internal/${voiceId}/${modelId}/${await digest(text)}`,
    );
    const cached = await cacheApi?.match(cacheKey);
    if (cached) return (await cached.json()) as AlienVoiceDelivery;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.34,
              similarity_boost: 0.72,
              style: 0.62,
              use_speaker_boost: true,
            },
          }),
        },
      );
      if (!response.ok) {
        return {
          ok: false,
          provider: "browser-fallback",
          audioBase64: null,
          mimeType: null,
          alignment: null,
        };
      }
      const payload = (await response.json()) as ElevenResponse;
      if (!payload.audio_base64) {
        return {
          ok: false,
          provider: "browser-fallback",
          audioBase64: null,
          mimeType: null,
          alignment: null,
        };
      }
      const delivery: AlienVoiceDelivery = {
        ok: true,
        provider: "elevenlabs",
        audioBase64: payload.audio_base64,
        mimeType: "audio/mpeg",
        alignment: safeAlignment(payload.normalized_alignment) ?? safeAlignment(payload.alignment),
      };
      if (cacheApi) {
        await cacheApi.put(
          cacheKey,
          new Response(JSON.stringify(delivery), {
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=2592000",
            },
          }),
        );
      }
      return delivery;
    } catch {
      return {
        ok: false,
        provider: "browser-fallback",
        audioBase64: null,
        mimeType: null,
        alignment: null,
      };
    }
  });
