const text=value=>String(value==null?'':value).trim();
function font(ctx,size=28,weight=600){ctx.font=`${weight} ${size}px system-ui, sans-serif`;}
function linesFor(ctx,value,maxWidth){const words=text(value).split(/\s+/).filter(Boolean),lines=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}

export function drawTricksterCaption(ctx,caption,{bottom=70,maxLines=3}={}){
  if(!ctx?.canvas||!caption)return;
  const width=ctx.canvas.width,pad=36,left=54,boxWidth=width-108;
  ctx.save();font(ctx,24,650);const lines=linesFor(ctx,caption.text,boxWidth-pad*2).slice(0,maxLines),disclosure=text(caption.disclosure);const disclosureHeight=disclosure?28:0,boxHeight=62+lines.length*34+disclosureHeight,top=ctx.canvas.height-bottom-boxHeight;
  ctx.globalAlpha=.9;ctx.fillStyle='#090a0f';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(left,top,boxWidth,boxHeight,16);else ctx.rect(left,top,boxWidth,boxHeight);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=caption.label==='SIMULATION'?'#9b7cff':'#c9b994';font(ctx,18,800);ctx.fillText(text(caption.label),left+pad,top+30);
  ctx.fillStyle='#f2eee7';font(ctx,24,650);lines.forEach((line,index)=>ctx.fillText(line,left+pad,top+66+index*34));
  if(disclosure){ctx.fillStyle='#aaa4b2';font(ctx,15,500);ctx.fillText(disclosure.slice(0,145),left+pad,top+boxHeight-16);}
  ctx.restore();
}
