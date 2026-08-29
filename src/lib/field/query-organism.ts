import * as THREE from "three";
import {
  buildCoreBuffers,
  buildLivingSkin,
  confirmAlienOrientation,
  EYE,
  MOUTH,
  NOSTRIL,
} from "./anatomy";
import type { ParticleFieldRenderer } from "./particle-field";
import type { OrganismState } from "./types";
import { clamp, deviceBudget } from "./hash";

const SKIN_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aAmp;
attribute float aLayer;
attribute float aSpeech;
attribute float aDelay;
attribute vec3 aParent;
attribute vec3 aTarget;
attribute vec3 aArc;
attribute vec3 aFromColor;
uniform float uPixelRatio;
uniform float uTime;
uniform float uMorph;
uniform float uSpeech;
uniform float uListen;
uniform float uAnalyze;
varying vec3 vColor;
varying float vLanded;

void main() {
  float mt = clamp((uMorph - aDelay) / max(0.14, 1.0 - aDelay), 0.0, 1.0);
  float t = mt * mt * (3.0 - 2.0 * mt);
  vLanded = t;
  vec3 origin = mix(aParent, aTarget, t);
  origin += aArc * sin(t * 3.14159);
  vec3 n = normalize(aTarget + vec3(0.0001));
  vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.02)) + vec3(0.0001));
  vec3 t2 = normalize(cross(n, t1) + vec3(0.0001));
  // Solana-speed cellular circulation: fast micro-organisms moving over stable anatomy.
  float speed = 2.15 + 0.28 * aLayer + uAnalyze * 1.35 + uListen * 0.45;
  float f1 = sin(uTime * speed + aPhase);
  float f2 = cos(uTime * (speed * 0.83) + aPhase * 1.73);
  float f3 = sin(uTime * (speed * 1.47) + aPhase * 0.61);
  float amp = aAmp * mix(1.7, 0.72, t);
  vec3 live = t1 * ((f1 + f3 * 0.36) * amp) + t2 * (f2 * amp * 0.78);
  live += vec3(0.0, -1.0, 0.42) * aSpeech * uSpeech * 3.4 * t;
  vec3 p = origin + live;
  float spark = 0.68 + 0.32 * sin(uTime * 7.6 + aPhase * 6.0);
  vColor = mix(aFromColor, color, t) * mix(1.0, spark, t);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float fieldSize = 1.55 + aSize * 0.35;
  float tissueSize = aSize * (aLayer < 1.5 ? 0.62 : aLayer < 2.5 ? 0.42 : 0.30);
  float sz = mix(fieldSize, tissueSize, t);
  gl_PointSize = sz * uPixelRatio * mix(205.0, 315.0, t) / max(14.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const SKIN_FRAG = /* glsl */ `
uniform float uAlpha;
varying vec3 vColor;
varying float vLanded;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float core = exp(-d * d * 32.0);
  float halo = exp(-d * d * 7.0);
  float spark = mix(max(core, halo * 0.55), core + halo * 0.32, vLanded);
  gl_FragColor = vec4(vColor * (0.55 + core * 1.1), spark * uAlpha);
}
`;

const CORE_VERT = /* glsl */ `
attribute float aSize;
uniform float uPixelRatio;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio * 205.0 / max(14.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const CORE_FRAG = /* glsl */ `
uniform float uAlpha;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float edge = smoothstep(0.5, 0.32, d);
  gl_FragColor = vec4(vec3(0.006, 0.011, 0.018), edge * uAlpha);
}
`;

const VISOR_VERT = /* glsl */ `
varying vec2 vUv;
varying float vCurve;
void main() {
  vUv = uv;
  vec3 p = position;
  float nx = abs(uv.x * 2.0 - 1.0);
  p.z += (1.0 - nx * nx) * 2.45;
  vCurve = 1.0 - nx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const VISOR_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
varying vec2 vUv;
varying float vCurve;
void main() {
  float x = vUv.x;
  float center = 1.0 - abs(x * 2.0 - 1.0);
  float lower = mix(0.20, 0.035, smoothstep(0.0, 0.72, center));
  lower += smoothstep(0.82, 1.0, center) * 0.25;
  if (vUv.y < lower) discard;
  vec3 magenta = vec3(0.94, 0.08, 0.82);
  vec3 violet = vec3(0.24, 0.16, 0.94);
  vec3 green = vec3(0.00, 0.94, 0.64);
  vec3 color = x < 0.52
    ? mix(magenta, violet, smoothstep(0.0, 0.52, x))
    : mix(violet, green, smoothstep(0.52, 1.0, x));
  float sweep = pow(max(0.0, 1.0 - abs(vUv.y - 0.76) * 5.5), 4.0);
  float scan = 0.035 * sin(vUv.y * 115.0 + uTime * 1.4);
  float rim = smoothstep(0.0, 0.09, vUv.y - lower) * smoothstep(1.0, 0.88, vUv.y);
  color *= 0.36 + vCurve * 0.14 + sweep * 0.42 + scan;
  color += vec3(0.12, 0.18, 0.28) * sweep;
  gl_FragColor = vec4(color, rim * uAlpha * 0.98);
}
`;

const EYE_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vLocal = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const EYE_FRAG = /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorld;
varying vec3 vNormal;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  vec3 dir = normalize(vLocal);
  vec3 n = normalize(vNormal);
  vec3 view = normalize(cameraPosition - vWorld);
  float ndv = max(dot(n, view), 0.0);
  float h1 = hash(dir.xy * 36.0 + dir.z * 8.0);
  float h2 = hash(dir.yz * 22.0 + 2.7);
  float h3 = hash(dir.zx * 54.0 + 9.1);
  // Classic Grey eyes: essentially black, with only a restrained cold specular/rim response.
  vec3 lightDir = normalize(vec3(-0.32, 0.72, 0.62));
  vec3 halfDir = normalize(lightDir + view);
  float spec = pow(max(dot(n, halfDir), 0.0), 46.0);
  float rim = pow(1.0 - ndv, 4.0);
  float micro = smoothstep(0.996, 1.0, h1) * 0.035 + pow(h3, 12.0) * 0.012;
  vec3 col = vec3(0.0015, 0.002, 0.004);
  col += vec3(0.16, 0.22, 0.32) * spec * 0.34;
  col += vec3(0.07, 0.025, 0.11) * rim * 0.10;
  col += vec3(micro);
  gl_FragColor = vec4(col, 1.0);
}
`;

function makeAlmondGeometry() {
  const geo = new THREE.SphereGeometry(1, 64, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ax = Math.abs(x);
    y *= 1 - 0.42 * ax * ax;
    x *= 1 + 0.12 * ax;
    z *= 1 - 0.14 * ax;
    if (z < 0) z *= 0.5;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export class LivingAlienOrganism {
  field: ParticleFieldRenderer;
  group: THREE.Group;
  skin: THREE.Points;
  material: THREE.ShaderMaterial;
  core: THREE.Points;
  coreMaterial: THREE.ShaderMaterial;
  visor: THREE.Group;
  visorMaterial: THREE.ShaderMaterial;
  eyes: THREE.Object3D[] = [];
  mouth: THREE.Mesh;
  nostrils: THREE.Mesh[] = [];
  lights: THREE.Light[] = [];
  morph = 0;
  morphTarget = 0;
  state: OrganismState = "idle";
  speech = 0;
  speechTarget = 0;
  destroyed = false;
  orientation = confirmAlienOrientation();
  #last = 0;
  #eyeGeo: THREE.BufferGeometry | null = null;
  #eyeMat: THREE.Material | null = null;

  constructor(
    field: ParticleFieldRenderer,
    parentPositions: Float32Array,
    parentColors: Float32Array,
    parentCount: number,
  ) {
    this.field = field;
    const budget = deviceBudget();
    this.group = new THREE.Group();
    field.scene.add(this.group);

    const skin = buildLivingSkin({
      parentPositions,
      parentColors,
      parentCount,
      childBudget: budget.organism,
    });
    this.orientation = skin.orientation;
    globalThis.__ABULLS_ORIENTATION = skin.orientation;
    globalThis.__ABULLS_ORGANISM = {
      skin: skin.count,
      facing: skin.orientation.facing,
      yawCorrection: skin.orientation.yawCorrection,
      noseZ: skin.orientation.noseZ,
      rearZ: skin.orientation.rearZ,
      distance: field.cameraState.distance,
    };

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(skin.targetPos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(skin.colors, 3));
    geometry.setAttribute("aFromColor", new THREE.BufferAttribute(skin.fromColors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(skin.sizes, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(skin.phases, 1));
    geometry.setAttribute("aAmp", new THREE.BufferAttribute(skin.amps, 1));
    geometry.setAttribute("aLayer", new THREE.BufferAttribute(skin.layers, 1));
    geometry.setAttribute("aSpeech", new THREE.BufferAttribute(skin.speech, 1));
    geometry.setAttribute("aDelay", new THREE.BufferAttribute(skin.delays, 1));
    geometry.setAttribute("aParent", new THREE.BufferAttribute(skin.parentPos, 3));
    geometry.setAttribute("aTarget", new THREE.BufferAttribute(skin.targetPos, 3));
    geometry.setAttribute("aArc", new THREE.BufferAttribute(skin.arcs, 3));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      blending: THREE.NormalBlending,
      toneMapped: false,
      uniforms: {
        uPixelRatio: { value: field.renderer.getPixelRatio() },
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uSpeech: { value: 0 },
        uListen: { value: 0 },
        uAnalyze: { value: 0 },
        uAlpha: { value: 0 },
      },
      vertexShader: SKIN_VERT,
      fragmentShader: SKIN_FRAG,
    });
    this.skin = new THREE.Points(geometry, this.material);
    this.skin.frustumCulled = false;
    this.skin.renderOrder = 3;
    this.group.add(this.skin);

    const coreData = buildCoreBuffers(budget.organism > 500000 ? 4 : 3);
    const coreGeometry = new THREE.BufferGeometry();
    coreGeometry.setAttribute("position", new THREE.BufferAttribute(coreData.positions, 3));
    coreGeometry.setAttribute("color", new THREE.BufferAttribute(coreData.colors, 3));
    coreGeometry.setAttribute("aSize", new THREE.BufferAttribute(coreData.sizes, 1));
    this.coreMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
      toneMapped: false,
      uniforms: {
        uPixelRatio: { value: field.renderer.getPixelRatio() },
        uAlpha: { value: 0 },
      },
      vertexShader: CORE_VERT,
      fragmentShader: CORE_FRAG,
    });
    this.core = new THREE.Points(coreGeometry, this.coreMaterial);
    this.core.renderOrder = 1;
    this.core.visible = false;
    this.group.add(this.core);

    this.#buildEyes();
    const visor = this.#buildVisor();
    this.visor = visor.group;
    this.visorMaterial = visor.material;
    this.mouth = this.#buildMouth();
    this.nostrils = this.#buildNostrils();

    field.onAfterUpdate = (_elapsed, now) => this.tick(_elapsed, now);
    this.morphTarget = 1;
    this.#last = performance.now();
  }

  #buildEyes() {
    const almond = makeAlmondGeometry();
    const galaxy = new THREE.ShaderMaterial({
      vertexShader: EYE_VERT,
      fragmentShader: EYE_FRAG,
      toneMapped: false,
    });
    this.#eyeGeo = almond;
    this.#eyeMat = galaxy;
    const makeEye = (side: typeof EYE.left) => {
      const group = new THREE.Group();
      group.position.set(side.x, side.y, side.z);
      group.rotation.z = side.rot;
      group.rotation.x = -0.025;
      group.rotation.y = side.x < 0 ? 0.08 : -0.08;

      const ball = new THREE.Mesh(almond, galaxy);
      ball.scale.set(side.rx, side.ry, side.rz);
      ball.renderOrder = 2;

      group.add(ball);
      group.visible = false;
      this.group.add(group);
      this.eyes.push(group);
      return group;
    };
    makeEye(EYE.left);
    makeEye(EYE.right);
  }

  #buildVisor() {
    const group = new THREE.Group();
    const outer = Math.max(
      Math.abs(EYE.left.x) + EYE.left.rx,
      Math.abs(EYE.right.x) + EYE.right.rx,
    );
    const width = outer * 2.18;
    const height = Math.max(EYE.left.ry, EYE.right.ry) * 2.18;
    const centerY = (EYE.left.y + EYE.right.y) * 0.5 + height * 0.02;
    const frontZ = Math.max(EYE.left.z + EYE.left.rz, EYE.right.z + EYE.right.rz) + 0.9;

    const geometry = new THREE.PlaneGeometry(width, height, 48, 18);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uAlpha: { value: 0 },
      },
      vertexShader: VISOR_VERT,
      fragmentShader: VISOR_FRAG,
    });
    const shield = new THREE.Mesh(geometry, material);
    shield.renderOrder = 5;
    group.add(shield);

    const black = new THREE.MeshBasicMaterial({ color: 0x020306, toneMapped: false });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 1.25, 1.35), black);
    frame.position.set(0, height * 0.47, 0.72);
    frame.renderOrder = 6;
    group.add(frame);

    const bridge = new THREE.Group();
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.75, 1.1), black);
      bar.position.set(side * 1.9, -height * 0.27, 2.55);
      bar.rotation.z = side * 0.7;
      bridge.add(bar);
    }
    bridge.renderOrder = 6;
    group.add(bridge);

    const tagGeometry = new THREE.BoxGeometry(width * 0.19, 3.25, 1.65);
    for (const side of [-1, 1]) {
      const tag = new THREE.Mesh(tagGeometry, black);
      tag.position.set(side * width * 0.405, height * 0.38, 1.25);
      tag.rotation.z = side * -0.035;
      tag.renderOrder = 7;
      group.add(tag);
      const colors = [0x9945ff, 0x14f195, 0x2dd8ff];
      for (let stripe = 0; stripe < 3; stripe++) {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.055, 0.28, 0.12),
          new THREE.MeshBasicMaterial({ color: colors[stripe], toneMapped: false }),
        );
        mark.position.set(
          side * width * 0.405 + (stripe - 1) * width * 0.035,
          height * 0.38,
          2.14,
        );
        mark.rotation.z = -0.12;
        mark.renderOrder = 8;
        group.add(mark);
      }
    }

    group.position.set(0, centerY, frontZ);
    group.visible = false;
    this.group.add(group);
    return { group, material };
  }

  #buildMouth() {
    const dark = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 16), dark);
    mouth.position.set(MOUTH.x, MOUTH.y, MOUTH.z);
    mouth.scale.set(MOUTH.w, MOUTH.h, MOUTH.d);
    mouth.renderOrder = 2;
    mouth.visible = false;
    this.group.add(mouth);
    return mouth;
  }

  #buildNostrils() {
    const dark = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const meshes: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), dark);
      n.position.set(side * NOSTRIL.spread, NOSTRIL.y, NOSTRIL.z);
      n.scale.set(NOSTRIL.r, NOSTRIL.r * 0.58, NOSTRIL.r * 0.38);
      n.renderOrder = 2;
      n.visible = false;
      this.group.add(n);
      meshes.push(n);
    }
    return meshes;
  }

  setState(state: OrganismState) {
    this.state = state;
    if (state === "return") this.morphTarget = 0;
  }

  setSpeech(amount: number) {
    this.speechTarget = clamp(amount);
  }

  tick(_elapsed: number, now: number) {
    if (this.destroyed) return;
    const dt = Math.min(0.1, (now - this.#last) / 1000 || 0.016);
    this.#last = now;
    const rate = this.morphTarget > 0.5 ? 0.72 : 1.85;
    this.morph += (this.morphTarget - this.morph) * (1 - Math.exp(-dt * rate));
    this.speech += (this.speechTarget - this.speech) * (1 - Math.exp(-dt * 10));

    const listen = this.state === "listening" ? 1 : this.state === "analyzing" ? 0.4 : 0;
    const analyze = this.state === "analyzing" ? 1 : 0;
    const speakPulse =
      this.state === "speaking" ? 0.16 + 0.54 * Math.abs(Math.sin(now * 0.0105)) : this.speech;
    const formed = clamp((this.morph - 0.3) / 0.52);
    const appear = clamp(this.morph / 0.1);

    this.material.uniforms.uTime.value = now * 0.001;
    this.material.uniforms.uMorph.value = this.morph;
    this.material.uniforms.uSpeech.value = this.state === "speaking" ? speakPulse : this.speech;
    this.material.uniforms.uListen.value = listen;
    this.material.uniforms.uAnalyze.value = analyze;
    this.material.uniforms.uAlpha.value = appear * (0.72 + formed * 0.27);
    this.material.uniforms.uPixelRatio.value = this.field.renderer.getPixelRatio();
    this.coreMaterial.uniforms.uAlpha.value = clamp((this.morph - 0.3) / 0.42) * 0.9;
    this.coreMaterial.uniforms.uPixelRatio.value = this.field.renderer.getPixelRatio();
    this.visorMaterial.uniforms.uTime.value = now * 0.001;
    this.visorMaterial.uniforms.uAlpha.value = formed;

    const crawl = this.field.reducedMotion ? 0 : formed;
    const breath = 1 + Math.sin(now * 0.0015) * 0.008 * crawl;
    this.group.scale.setScalar(breath);
    this.group.rotation.y = Math.sin(now * 0.00038) * 0.04 * crawl;
    this.group.rotation.x = Math.sin(now * 0.00029) * 0.01 * crawl;
    this.core.visible = this.morph > 0.3;
    this.skin.visible = this.morph > 0.01;
    for (const eye of this.eyes) {
      eye.visible = false;
    }
    this.visor.visible = this.morph > 0.44;
    this.visor.scale.setScalar(clamp((this.morph - 0.44) / 0.3));
    this.mouth.visible = this.morph > 0.62;
    this.mouth.scale.set(MOUTH.w, MOUTH.h * (1 + speakPulse * 0.72), MOUTH.d);
    for (const n of this.nostrils) n.visible = this.morph > 0.6;

    if (globalThis.__ABULLS_ORGANISM) {
      globalThis.__ABULLS_ORGANISM.distance = this.field.cameraState.distance;
    }
  }

  async dissolve() {
    this.setState("return");
    this.speechTarget = 0;
    await new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        if (this.morph < 0.02 || performance.now() - start > 2800) {
          resolve(null);
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  destroy() {
    this.destroyed = true;
    if (this.field.onAfterUpdate) this.field.onAfterUpdate = null;
    this.field.scene.remove(this.group);
    for (const light of this.lights) this.field.scene.remove(light);
    this.skin.geometry.dispose();
    this.material.dispose();
    this.core.geometry.dispose();
    this.coreMaterial.dispose();
    this.visor.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
    this.mouth.geometry.dispose();
    (this.mouth.material as THREE.Material).dispose();
    for (const n of this.nostrils) {
      n.geometry.dispose();
      (n.material as THREE.Material).dispose();
    }
    this.#eyeGeo?.dispose();
    this.#eyeMat?.dispose();
    globalThis.__ABULLS_ORGANISM = undefined;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __ABULLS_ORIENTATION: ReturnType<typeof confirmAlienOrientation> | undefined;
  // eslint-disable-next-line no-var
  var __ABULLS_ORGANISM:
    | {
        skin: number;
        facing: "+Z";
        yawCorrection: 0;
        noseZ: number;
        rearZ: number;
        distance: number;
      }
    | undefined;
}
