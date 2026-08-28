import { ALIEN_HEAD_TEMPLATE } from './alien-head-template.mjs';

const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const hash01 = (v) => { const n = Math.sin(v * 12.9898 + 78.233) * 43758.5453123; return n - Math.floor(n); };

function hostSize(host) {
  const p = host?.parentElement;
  return {
    width: Math.max(1, host?.clientWidth || 0, p?.clientWidth || 0, globalThis.innerWidth || 1),
    height: Math.max(1, host?.clientHeight || 0, p?.clientHeight || 0, globalThis.innerHeight || 1)
  };
}

function eyeMetric(x, y, side) {
  const nx = x / 39;
  const ny = y / 50;
  const ex = side * 0.39;
  const ey = 0.20;
  const dx = nx - ex;
  const dy = ny - ey;
  const a = side * 0.16;
  const ca = Math.cos(a), sa = Math.sin(a);
  const rx = dx * ca - dy * sa;
  const ry = dx * sa + dy * ca;
  return (rx / 0.37) ** 2 + (ry / 0.225) ** 2;
}

function facialVoid(x, y, z) {
  if (z < 4.5) return false;
  if (Math.min(eyeMetric(x, y, -1), eyeMetric(x, y, 1)) < 1.0) return true;
  const nx = x / 39;
  const ny = y / 50;
  if (-0.19 < ny && ny < -0.025 && 0.020 < Math.abs(nx) && Math.abs(nx) < 0.105) return true;
  if (Math.abs(nx) < 0.225 && ny > -0.465 && ny < -0.365) return true;
  return false;
}

function radialBasis(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  const n = [x/l, y/l, z/l];
  let a = [0,1,0];
  if (Math.abs(n[1]) > 0.86) a = [1,0,0];
  let t = [a[1]*n[2]-a[2]*n[1], a[2]*n[0]-a[0]*n[2], a[0]*n[1]-a[1]*n[0]];
  const tl = Math.hypot(...t) || 1; t = t.map(v => v/tl);
  const b = [n[1]*t[2]-n[2]*t[1], n[2]*t[0]-n[0]*t[2], n[0]*t[1]-n[1]*t[0]];
  return {n,t,b};
}

function sampleTarget(i, templatePositions, templateRoles, templateCount) {
  let ti = Math.min(templateCount-1, Math.floor(hash01(i*7.917+11.31)*templateCount));
  let tj = ti*3;
  let sx = templatePositions[tj], sy = templatePositions[tj+1], sz = templatePositions[tj+2];
  let role = templateRoles[ti] || 1;
  for (let k=0;k<24 && facialVoid(sx,sy,sz);k++) {
    ti = Math.min(templateCount-1, Math.floor(hash01(i*7.917+11.31+(k+1)*31.73)*templateCount));
    tj = ti*3; sx = templatePositions[tj]; sy = templatePositions[tj+1]; sz = templatePositions[tj+2]; role = templateRoles[ti] || 1;
  }
  // Canonical whole-head 180deg Y turn once, here.
  sx = -sx; sz = -sz;
  const layerHash = hash01(i*17.133+3.17);
  const layer = layerHash < 0.80 ? 1 : layerHash < 0.97 ? 2 : 3;
  const basis = radialBasis(sx,sy,sz);
  const a = hash01(i*1.913+2.7)*Math.PI*2;
  const r = layer===1 ? 0.18 + hash01(i*3.731+9.1)*0.72 : layer===2 ? 0.35 + hash01(i*3.731+9.1)*1.0 : 0.5 + hash01(i*3.731+9.1)*1.2;
  const inward = layer===1 ? 0.12 + hash01(i*5.117+4.4)*1.75 : layer===2 ? 1.5 + hash01(i*5.117+4.4)*5.5 : 6 + hash01(i*5.117+4.4)*14;
  const ca = Math.cos(a)*r, sa = Math.sin(a)*r;
  const x = sx + basis.t[0]*ca + basis.b[0]*sa - basis.n[0]*inward;
  const y = sy + basis.t[1]*ca + basis.b[1]*sa - basis.n[1]*inward;
  const z = sz + basis.t[2]*ca + basis.b[2]*sa - basis.n[2]*inward;
  return {x,y,z,layer,role,basis};
}

export class IsolatedQuantumOrganismController {
  #host; #THREE; #scene; #camera; #renderer; #group; #points; #material; #raf=0; #active=false; #blend=0; #destroyed=false; #onResize; #pointer={active:false,x:0,y:0}; #yaw=0; #pitch=0;
  constructor({ host, THREE }) {
    this.#host = host;
    this.#THREE = THREE;
    if (!host || !THREE) return;
    const T = THREE;
    this.#scene = new T.Scene();
    this.#camera = new T.PerspectiveCamera(55,1,0.1,700);
    this.#camera.position.set(0,0,125);
    this.#renderer = new T.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});
    this.#renderer.setClearColor(0x000000,0);
    this.#renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));
    this.#renderer.domElement.className = 'query-organism-canvas';
    Object.assign(this.#renderer.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'3'});
    host.append(this.#renderer.domElement);
    this.#group = new T.Group(); this.#scene.add(this.#group);
    this.#build();
    this.#onResize = () => this.#resize();
    globalThis.addEventListener('resize',this.#onResize);
    this.#resize();
    this.#raf = requestAnimationFrame(this.#frame);
  }
  #build(){
    const T=this.#THREE, template=ALIEN_HEAD_TEMPLATE;
    if(!template?.positions||!template?.roles||!template?.count) return;
    const parentColors=[[0.42,0.18,1],[0.08,0.82,0.96],[1,0.34,0.7],[0.3,1,0.54],[1,0.72,0.2],[1,0.2,0.2],[0.72,0.72,0.8]];
    const memory=Number(globalThis.navigator?.deviceMemory||4); const count=memory>=8?176000:memory>=4?132000:90000;
    const pos=new Float32Array(count*3), col=new Float32Array(count*3), size=new Float32Array(count), phase=new Float32Array(count), layer=new Float32Array(count);
    for(let i=0;i<count;i++){
      const t=sampleTarget(i,template.positions,template.roles,template.count); const j=i*3;
      pos[j]=t.x;pos[j+1]=t.y;pos[j+2]=t.z;
      const base=parentColors[Math.floor(hash01(i*9.13)*parentColors.length)%parentColors.length];
      const light=clamp(0.34 + Math.max(0,t.basis.n[0]*0.32+t.basis.n[1]*0.78+t.basis.n[2]*0.54)*0.86 - (t.layer-1)*0.09,0.18,1.15);
      col[j]=base[0]*light;col[j+1]=base[1]*light;col[j+2]=base[2]*light;
      size[i]=t.layer===1?0.18+hash01(i*2.37)*0.16:t.layer===2?0.14+hash01(i*2.37)*0.12:0.10+hash01(i*2.37)*0.10;
      phase[i]=hash01(i*5.91)*Math.PI*2; layer[i]=t.layer;
    }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('color',new T.BufferAttribute(col,3)); g.setAttribute('aSize',new T.BufferAttribute(size,1)); g.setAttribute('aPhase',new T.BufferAttribute(phase,1)); g.setAttribute('aLayer',new T.BufferAttribute(layer,1));
    this.#material=new T.ShaderMaterial({transparent:true,depthWrite:true,depthTest:true,vertexColors:true,blending:T.NormalBlending,uniforms:{uPixelRatio:{value:this.#renderer.getPixelRatio()},uAlpha:{value:0},uTime:{value:0}},vertexShader:`attribute float aSize;attribute float aPhase;attribute float aLayer;uniform float uPixelRatio;uniform float uTime;varying vec3 vColor;varying float vLayer;void main(){vColor=color;vLayer=aLayer;vec3 p=position;float motion=(aLayer<1.5?0.10:(aLayer<2.5?0.22:0.46));p+=normalize(max(abs(position),vec3(0.001)))*sin(uTime*(0.55+0.12*aLayer)+aPhase)*motion;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=aSize*uPixelRatio*(86.0/max(12.0,-mv.z));gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform float uAlpha;varying vec3 vColor;varying float vLayer;void main(){vec2 p=gl_PointCoord-vec2(0.5);float d=length(p);if(d>0.5)discard;float core=smoothstep(0.50,0.10,d);float alpha=core*uAlpha*(vLayer<1.5?1.0:(vLayer<2.5?0.78:0.52));gl_FragColor=vec4(vColor,alpha);}`});
    this.#points=new T.Points(g,this.#material); this.#points.frustumCulled=false; this.#group.add(this.#points);
  }
  setActive(active){this.#active=Boolean(active); if(this.#renderer?.domElement) this.#renderer.domElement.style.pointerEvents=this.#active?'auto':'none'; return this.#active;}
  #resize(){if(!this.#renderer||!this.#camera)return;const {width,height}=hostSize(this.#host);this.#renderer.setSize(width,height,false);this.#camera.aspect=width/height;this.#camera.updateProjectionMatrix();}
  #frame=(now)=>{if(this.#destroyed)return;this.#blend+=( (this.#active?1:0)-this.#blend)*0.08;if(this.#material){this.#material.uniforms.uAlpha.value=clamp(this.#blend*1.05);this.#material.uniforms.uTime.value=now*0.001;}if(this.#group){this.#group.visible=this.#blend>0.002;this.#group.rotation.y=this.#yaw;this.#group.rotation.x=this.#pitch;}if(this.#renderer&&this.#scene&&this.#camera)this.#renderer.render(this.#scene,this.#camera);this.#raf=requestAnimationFrame(this.#frame);};
  destroy(){this.#destroyed=true;cancelAnimationFrame(this.#raf);globalThis.removeEventListener('resize',this.#onResize);this.#points?.geometry?.dispose();this.#material?.dispose();this.#renderer?.dispose();this.#renderer?.domElement?.remove();}
}
