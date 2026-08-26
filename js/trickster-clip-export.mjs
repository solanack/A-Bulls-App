const FORMATS=Object.freeze({
  '9:16':Object.freeze({width:1080,height:1920}),
  '16:9':Object.freeze({width:1920,height:1080}),
  '1:1':Object.freeze({width:1080,height:1080})
});

export function bitrateFor(width,height,fps=30) {
  return Math.round(width*height*fps*.19);
}

export async function negotiateClipEncoding(media,size={width:1920,height:1080}) {
  if(typeof globalThis.VideoEncoder==='undefined'||!media) return null;
  try {
    const video=await media.getFirstEncodableVideoCodec(['avc'],size);
    if(video) {
      const audio=await media.getFirstEncodableAudioCodec(['aac'],{numberOfChannels:2,sampleRate:48000});
      return Object.freeze({extension:'mp4',videoCodec:video,audioCodec:audio});
    }
    const fallback=await media.getFirstEncodableVideoCodec(['vp9','vp8'],size);
    if(!fallback) return null;
    const audio=await media.getFirstEncodableAudioCodec(['opus'],{numberOfChannels:2,sampleRate:48000});
    return Object.freeze({extension:'webm',videoCodec:fallback,audioCodec:audio});
  } catch {
    return null;
  }
}

export async function encodeStoryClip({
  media,
  manifest,
  timeline,
  encoders,
  drawFrame,
  audioBuffer=null,
  cancelled=()=>false,
  onProgress=()=>{}
}) {
  if(!media||!encoders) throw new TypeError('Mediabunny and negotiated encoders are required');
  if(typeof drawFrame!=='function') throw new TypeError('drawFrame is required');
  const dimensions=FORMATS[manifest.output.aspectRatio];
  if(!dimensions) throw new RangeError('unsupported aspect ratio');
  const canvas=document.createElement('canvas');
  canvas.width=dimensions.width;
  canvas.height=dimensions.height;
  const context=canvas.getContext('2d',{alpha:false});
  if(!context) throw new Error('2d_canvas_unavailable');

  const format=encoders.extension==='mp4'
    ? new media.Mp4OutputFormat({fastStart:'in-memory'})
    : new media.WebMOutputFormat();
  const target=new media.BufferTarget();
  const output=new media.Output({format,target});
  const video=new media.CanvasSource(canvas,{
    codec:encoders.videoCodec,
    quality:new media.Quality(bitrateFor(canvas.width,canvas.height,timeline.fps)),
    keyFrameInterval:2
  });
  output.addVideoTrack(video,{frameRate:timeline.fps});

  const audio=audioBuffer&&encoders.audioCodec
    ? new media.AudioBufferSource({codec:encoders.audioCodec,quality:new media.Quality(128000)})
    : null;
  if(audio) output.addAudioTrack(audio);
  await output.start();
  try {
    if(audio&&audioBuffer) {
      await audio.add(audioBuffer);
      audio.close();
    }
    const duration=1/timeline.fps;
    for(let frame=0;frame<timeline.totalFrames;frame+=1) {
      if(cancelled()) {
        await output.cancel();
        return null;
      }
      await drawFrame(context,frame,timeline);
      await video.add(frame*duration,duration);
      onProgress(Object.freeze({frame,totalFrames:timeline.totalFrames,progress:(frame+1)/timeline.totalFrames}));
    }
    video.close();
  } catch(error) {
    if(output.state==='started') await output.cancel();
    throw error;
  }
  await output.finalize();
  if(!target.buffer) return null;
  return Object.freeze({
    blob:new Blob([target.buffer],{type:format.mimeType}),
    extension:encoders.extension,
    mimeType:format.mimeType,
    width:canvas.width,
    height:canvas.height,
    fps:timeline.fps
  });
}

export const TricksterFormats=FORMATS;
