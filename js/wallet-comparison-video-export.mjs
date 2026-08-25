import { loadMediabunny } from './experience-dependencies.mjs';
import { encodeStoryClip, negotiateClipEncoding, TricksterFormats } from './trickster-clip-export.mjs';
import { createWalletComparisonCinematicFrameDrawer } from './wallet-comparison-frame-drawer.mjs';

function fallback(reason){return Object.freeze({videoReady:false,renderRequired:'server',reason:String(reason||'on_device_render_unavailable')});}

export async function renderWalletComparisonVideo(detail={}, {
  mediaLoader=loadMediabunny,
  negotiate=negotiateClipEncoding,
  encode=encodeStoryClip,
  drawerFactory=createWalletComparisonCinematicFrameDrawer,
  cancelled=()=>false,
  onProgress=()=>{}
}={}){
  const manifest=detail.manifest,timeline=detail.timeline,renderPlan=detail.renderPlan;
  if(!manifest?.storyType||!timeline?.scenes)throw new TypeError('validated comparison manifest and timeline are required');
  if(manifest.storyType!=='wallet-comparison'||!Array.isArray(renderPlan)||!renderPlan.length)return fallback('wallet_comparison_render_plan_unavailable');
  if(detail.plan?.mode!=='on-device-webcodecs')return fallback('device_requires_server_render');
  const dimensions=TricksterFormats[manifest.output?.aspectRatio];if(!dimensions)return fallback('unsupported_aspect_ratio');
  const media=await mediaLoader();if(!media)return fallback('mediabunny_unavailable');
  const encoders=await negotiate(media,dimensions);if(!encoders)return fallback('encoder_unavailable');
  const bundle={storyType:manifest.storyType,replayEvents:detail.replayEvents||[],candles:detail.candles||[],comparison:detail.comparison||null,whatIf:detail.whatIf||null};
  const drawFrame=drawerFactory({bundle,manifest,renderPlan});
  const clip=await encode({media,manifest,timeline,encoders,drawFrame,cancelled,onProgress});
  if(!clip)return Object.freeze({videoReady:false,cancelled:Boolean(cancelled()),renderRequired:cancelled()?null:'server',reason:cancelled()?'cancelled':'encode_failed'});
  return Object.freeze({videoReady:true,renderRequired:null,blob:clip.blob,extension:clip.extension,mimeType:clip.mimeType,width:clip.width,height:clip.height,fps:clip.fps,encoder:Object.freeze({videoCodec:String(encoders.videoCodec||''),audioCodec:encoders.audioCodec?String(encoders.audioCodec):null})});
}
