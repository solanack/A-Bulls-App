/* Minimal standards-correct QR encoder for Replay verification links.
 * Fixed at QR version 10, error correction L, mask 0. Version 10-L carries
 * 274 data codewords (up to 271 UTF-8 bytes in byte mode), enough for Replay URLs.
 * No network service or tracking pixel is involved.
 */
const VERSION = 10;
const SIZE = 21 + 4 * (VERSION - 1);
const DATA_CODEWORDS = 274;
const ECC_PER_BLOCK = 18;
const BLOCK_DATA = [68,68,69,69] as const;
const TOTAL_CODEWORDS = 346;

function utf8(value:string){return new TextEncoder().encode(value);}
function bitsOf(value:number,count:number){const out:number[]=[];for(let i=count-1;i>=0;i--)out.push((value>>>i)&1);return out;}
function appendBits(target:number[],value:number,count:number){target.push(...bitsOf(value,count));}

function makeData(value:string){
  const bytes=utf8(value);if(bytes.length>271)throw new Error("verify_url_too_long_for_qr");
  const bits:number[]=[];appendBits(bits,0b0100,4);appendBits(bits,bytes.length,16);
  for(const byte of bytes)appendBits(bits,byte,8);
  const cap=DATA_CODEWORDS*8;
  for(let i=0;i<Math.min(4,cap-bits.length);i++)bits.push(0);
  while(bits.length%8)bits.push(0);
  const out:number[]=[];
  for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|(bits[i+j]??0);out.push(b);}
  let pad=0;while(out.length<DATA_CODEWORDS){out.push(pad++%2===0?0xec:0x11);}
  return out;
}

const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
(function initGf(){let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&0x100)x^=0x11d;}for(let i=255;i<512;i++)EXP[i]=EXP[i-255];})();
function mul(a:number,b:number){return a&&b?EXP[LOG[a]+LOG[b]]:0;}
function generator(degree:number){let poly=[1];for(let i=0;i<degree;i++){const next=new Array(poly.length+1).fill(0);for(let j=0;j<poly.length;j++){next[j]^=poly[j];next[j+1]^=mul(poly[j],EXP[i]);}poly=next;}return poly;}
const GEN=generator(ECC_PER_BLOCK);
function ecc(data:number[]){const rem=new Array(ECC_PER_BLOCK).fill(0);for(const byte of data){const factor=byte^rem[0];rem.shift();rem.push(0);for(let j=0;j<ECC_PER_BLOCK;j++)rem[j]^=mul(GEN[j+1],factor);}return rem;}
function codewords(value:string){
  const data=makeData(value),blocks:number[][]=[];let at=0;
  for(const len of BLOCK_DATA){blocks.push(data.slice(at,at+len));at+=len;}
  const parity=blocks.map(ecc),out:number[]=[];
  const max=Math.max(...BLOCK_DATA);
  for(let i=0;i<max;i++)for(const block of blocks)if(i<block.length)out.push(block[i]);
  for(let i=0;i<ECC_PER_BLOCK;i++)for(const block of parity)out.push(block[i]);
  if(out.length!==TOTAL_CODEWORDS)throw new Error("qr_codeword_count");
  return out;
}

function bch(value:number,poly:number,polyDegree:number){let data=value;const degree=()=>31-Math.clz32(data);while(data&&degree()>=polyDegree)data^=poly<<(degree()-polyDegree);return data;}
function formatBits(mask=0){const data=(1<<3)|mask;return ((data<<10)|bch(data<<10,0x537,10))^0x5412;}
function versionBits(){return (VERSION<<12)|bch(VERSION<<12,0x1f25,12);}

export type QrMatrix = readonly (readonly boolean[])[];

export function verifyQrMatrix(value:string):QrMatrix{
  const words=codewords(value),bits=words.flatMap(byte=>bitsOf(byte,8));
  const modules=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
  const fixed=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
  const set=(r:number,c:number,on:boolean,isFixed=true)=>{if(r<0||c<0||r>=SIZE||c>=SIZE)return;modules[r][c]=on;if(isFixed)fixed[r][c]=true;};
  const finder=(row:number,col:number)=>{
    for(let r=-1;r<=7;r++)for(let c=-1;c<=7;c++){
      const rr=row+r,cc=col+c;if(rr<0||cc<0||rr>=SIZE||cc>=SIZE)continue;
      const on=r>=0&&r<=6&&c>=0&&c<=6&&(r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4));
      set(rr,cc,on,true);
    }
  };
  finder(0,0);finder(0,SIZE-7);finder(SIZE-7,0);
  for(let i=8;i<SIZE-8;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
  for(const cy of [6,28,50])for(const cx of [6,28,50]){
    if(fixed[cy][cx])continue;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy));set(cy+dy,cx+dx,d!==1);}
  }
  // Reserve format information zones.
  for(let i=0;i<9;i++){if(i!==6){set(8,i,false);set(i,8,false);}}
  for(let i=0;i<8;i++){set(8,SIZE-1-i,false);set(SIZE-1-i,8,false);}
  // Version information zones.
  for(let i=0;i<6;i++)for(let j=0;j<3;j++){set(i,SIZE-11+j,false);set(SIZE-11+j,i,false);}
  set(SIZE-8,8,true);
  // Data placement, mask 0.
  let bit=0,up=true;
  for(let right=SIZE-1;right>=1;right-=2){
    if(right===6)right--;
    for(let step=0;step<SIZE;step++){
      const row=up?SIZE-1-step:step;
      for(let d=0;d<2;d++){
        const col=right-d;if(fixed[row][col])continue;
        const raw=bit<bits.length?bits[bit++]:0,masked=raw^(((row+col)&1)===0?1:0);
        modules[row][col]=Boolean(masked);
      }
    }
    up=!up;
  }
  const format=formatBits(0);
  const fb=(i:number)=>Boolean((format>>>i)&1);
  for(let i=0;i<=5;i++)set(i,8,fb(i));
  set(7,8,fb(6));set(8,8,fb(7));set(8,7,fb(8));
  for(let i=9;i<15;i++)set(8,14-i,fb(i));
  for(let i=0;i<8;i++)set(8,SIZE-1-i,fb(i));
  for(let i=8;i<15;i++)set(SIZE-15+i,8,fb(i));
  set(SIZE-8,8,true);
  const version=versionBits();
  for(let i=0;i<18;i++){const on=Boolean((version>>>i)&1),a=SIZE-11+(i%3),b=Math.floor(i/3);set(b,a,on);set(a,b,on);}
  return Object.freeze(modules.map(row=>Object.freeze([...row])));
}

export function drawVerifyQr(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number){
  const matrix=verifyQrMatrix(value),quiet=4,total=SIZE+quiet*2,cell=size/total;
  ctx.save();ctx.fillStyle="#fff";ctx.fillRect(x,y,size,size);ctx.fillStyle="#111";
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(matrix[r][c])ctx.fillRect(x+(c+quiet)*cell,y+(r+quiet)*cell,Math.ceil(cell),Math.ceil(cell));
  ctx.restore();
}
