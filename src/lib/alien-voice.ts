import { createServerFn } from "@tanstack/react-start";

export type AlienVoiceAlignment={characters:string[];starts:number[];ends:number[]};
export type AlienVoiceDelivery={ok:boolean;provider:"elevenlabs"|"browser-fallback";audioBase64:string|null;mimeType:string|null;alignment:AlienVoiceAlignment|null;voiceProfile?:string};
type ElevenAlignment={characters?:string[];character_start_times_seconds?:number[];character_end_times_seconds?:number[]};
type ElevenResponse={audio_base64?:string;alignment?:ElevenAlignment|null;normalized_alignment?:ElevenAlignment|null};
const GREY_PROFILE_VERSION="grey-v3-human-rachel";
// ElevenLabs' documented premade Rachel voice: warm, expressive, natural American English.
const DEFAULT_GREY_VOICE_ID="21m00Tcm4TlvDq8ikWAM";
function safeAlignment(value?:ElevenAlignment|null):AlienVoiceAlignment|null{if(!value?.characters?.length)return null;const starts=value.character_start_times_seconds??[],ends=value.character_end_times_seconds??[];if(starts.length!==value.characters.length||ends.length!==value.characters.length)return null;return{characters:value.characters,starts,ends};}
async function runtimeBindings():Promise<Record<string,string|undefined>>{try{const mod=await import("cloudflare:workers");return mod.env as Record<string,string|undefined>;}catch{return typeof process!=="undefined"?process.env as Record<string,string|undefined>:{};}}
async function digest(text:string){const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,"0")).join("");}
const fallback=():AlienVoiceDelivery=>({ok:false,provider:"browser-fallback",audioBase64:null,mimeType:null,alignment:null,voiceProfile:GREY_PROFILE_VERSION});
export const synthesizeAlienVoice=createServerFn({method:"POST"}).validator((value:{text:string})=>value).handler(async({data}):Promise<AlienVoiceDelivery>=>{
  const text=String(data.text??"").trim().slice(0,2400),bindings=await runtimeBindings(),apiKey=bindings.ELEVENLABS_API_KEY?.trim();if(!text||!apiKey)return fallback();
  const voiceId=bindings.ELEVENLABS_GREY_VOICE_ID?.trim()||DEFAULT_GREY_VOICE_ID,modelId=bindings.ELEVENLABS_MODEL_ID?.trim()||"eleven_multilingual_v2",cacheApi=(globalThis.caches as(CacheStorage&{default?:Cache})|undefined)?.default,cacheKey=new Request(`https://voice-cache.abulls.internal/${GREY_PROFILE_VERSION}/${voiceId}/${modelId}/${await digest(text)}`),cached=await cacheApi?.match(cacheKey);if(cached)return await cached.json() as AlienVoiceDelivery;
  try{const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,{method:"POST",headers:{accept:"application/json","content-type":"application/json","xi-api-key":apiKey},body:JSON.stringify({text,model_id:modelId,voice_settings:{stability:.7,similarity_boost:.72,style:0,use_speaker_boost:true,speed:1}})});if(!response.ok)return fallback();const payload=await response.json() as ElevenResponse;if(!payload.audio_base64)return fallback();const delivery:AlienVoiceDelivery={ok:true,provider:"elevenlabs",audioBase64:payload.audio_base64,mimeType:"audio/mpeg",alignment:safeAlignment(payload.normalized_alignment)??safeAlignment(payload.alignment),voiceProfile:GREY_PROFILE_VERSION};if(cacheApi)await cacheApi.put(cacheKey,new Response(JSON.stringify(delivery),{headers:{"content-type":"application/json","cache-control":"public, max-age=2592000"}}));return delivery;}catch{return fallback();}
});
