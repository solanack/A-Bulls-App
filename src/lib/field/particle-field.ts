import * as THREE from "three";
import type { CameraState, FieldParticle, UniverseSnapshot } from "./types";
import { CATEGORY_COLORS, CATEGORY_INDEX } from "./types";
import { clamp, deviceBudget } from "./hash";
import { CameraGestures } from "./gestures";
import { createStarfield, GALAXY_ZERO_CAMERA_DISTANCE } from "./synthetic-universe";
import { ALIEN_BOUNDS, parentColorForCategory } from "./anatomy";
import { isLiveSkyParticle, particleMint } from "./volume-sky";
import { mintKey } from "./watchlist";
import {
  COSMIC_KIND_INDEX,
  cosmicLabel,
  cosmicWorldSize,
  renderCosmicKind,
} from "./cosmic-visuals";

function hostSize(host: HTMLElement) {
  const p = host.parentElement;
  return {
    width: Math.max(1, host.clientWidth || 0, p?.clientWidth || 0, globalThis.innerWidth || 1),
    height: Math.max(
      1,
      host.clientHeight || 0,
      p?.clientHeight || 0,
      globalThis.innerHeight || 1,
    ),
  };
}

const _dummy = new THREE.Object3D();

const FIELD_VERT = /* glsl */ `
attribute float aCat;
attribute float aObserved;
attribute float aCosmic;
attribute float aPhase;
attribute vec3 aColor;
uniform float uIntensity;
uniform float uPull;
uniform vec3 uFocus;
uniform float uFocusAmt;
uniform float uFocusCat;
uniform float uReplayActive;
uniform float uReplayCursor;
uniform float uTime;
uniform float uMotion;
varying vec3 vColor;
varying float vReplayVisible;
varying vec2 vLocal;
varying float vCosmic;
varying float vPhase;
void main() {
  float replayVisible = 1.0 - step(uReplayCursor + 0.0005, aObserved);
  vReplayVisible = mix(1.0, replayVisible, uReplayActive);
  float kin = step(abs(aCat - uFocusCat), 0.45) * uFocusAmt;
  vec3 origin = vec3(0.0, 6.0, 0.0);
  float t = uPull;
  float ease = t * t * (3.0 - 2.0 * t);
  vec3 center = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float pSize = length(vec3(instanceMatrix[0][0], instanceMatrix[1][0], instanceMatrix[2][0]));
  vec3 held = mix(center, uFocus, kin * 0.22);
  vec3 p = mix(held, origin, ease * 0.9);
  float ang = ease * (4.2 + center.y * 0.014);
  float c = cos(ang);
  float s = sin(ang);
  vec3 d = p - origin;
  p = origin + vec3(d.x * c - d.z * s, d.y * (1.0 - ease * 0.38), d.x * s + d.z * c);
  vColor = aColor * uIntensity * (1.0 + kin * 1.45);
  vLocal = position.xy;
  vCosmic = aCosmic;
  vPhase = aPhase;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float pulse = 1.0;
  if (abs(aCosmic - 1.0) < 0.45) pulse += sin(uTime * 1.8 + aPhase * 6.28318) * 0.055 * uMotion;
  if (abs(aCosmic - 7.0) < 0.45) pulse += sin(uTime * 2.7 + aPhase * 6.28318) * 0.09 * uMotion;
  if (abs(aCosmic - 9.0) < 0.45) pulse += sin(uTime * 0.9 + aPhase * 6.28318) * 0.045 * uMotion;
  float size = pSize * pulse * mix(1.0, 0.28, ease) * (1.0 + kin * 1.6) * max(vReplayVisible, 0.04);
  vec2 displayLocal = position.xy;
  if (abs(aCosmic - 5.0) < 0.45) displayLocal.x *= 2.25;
  mv.xy += displayLocal * size;
  gl_Position = projectionMatrix * mv;
}
`;

const FIELD_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vReplayVisible;
varying vec2 vLocal;
varying float vCosmic;
varying float vPhase;
uniform float uTime;
uniform float uMotion;

float ring(float d, float radius, float width) {
  return 1.0 - smoothstep(width * 0.55, width, abs(d - radius));
}

void main() {
  if (vReplayVisible < 0.5) discard;
  float d = length(vLocal);
  float a = atan(vLocal.y, vLocal.x);
  float alpha = 0.0;
  float light = 1.0;

  if (vCosmic < 0.5) {
    // GALAXY — layered spiral body: luminous core, rotating arms, dust lanes and a faint halo.
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.035, 0.30, d);
    float spin = a * 3.0 - d * 12.5 - uTime * 0.10 * uMotion + vPhase * 2.2;
    float armsA = 1.0 - smoothstep(0.10, 0.64, abs(sin(spin)));
    float armsB = 1.0 - smoothstep(0.12, 0.72, abs(sin(a * 2.0 - d * 8.2 + uTime * 0.055 * uMotion)));
    float falloff = 1.0 - smoothstep(0.18, 1.0, d);
    float halo = (1.0 - smoothstep(0.22, 1.0, d)) * 0.14;
    float dustLane = smoothstep(0.18, 0.62, abs(sin(spin + 0.52)));
    float arms = max(armsA * 0.76, armsB * 0.38) * falloff * mix(0.66, 1.0, dustLane);
    float knots = pow(max(0.0, sin(a * 9.0 + d * 24.0 + vPhase * 6.28318)), 18.0) * arms;
    alpha = max(core, max(arms * 0.66, halo));
    light = 0.76 + core * 1.05 + arms * 0.42 + knots * 0.58;
  } else if (vCosmic < 1.5) {
    // STAR — bright token body with short rays.
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.04, 0.52, d);
    float halo = 1.0 - smoothstep(0.3, 0.94, d);
    float rays = pow(abs(cos(a * 4.0)), 12.0) * (1.0 - smoothstep(0.18, 0.92, d));
    alpha = max(core, max(halo * 0.2, rays * 0.34));
    light = 0.9 + core * 0.65 + rays * 0.5;
  } else if (vCosmic < 2.5) {
    // PLANET — solid holder body with a defined limb.
    if (d > 1.0) discard;
    float disc = 1.0 - smoothstep(0.86, 1.0, d);
    float limb = ring(d, 0.79, 0.18);
    alpha = max(disc * 0.82, limb * 0.42);
    light = 0.62 + (1.0 - d) * 0.45 + limb * 0.25;
  } else if (vCosmic < 3.5) {
    // MOON — smaller, crisp related collection.
    if (d > 1.0) discard;
    float disc = 1.0 - smoothstep(0.82, 1.0, d);
    float rim = ring(d, 0.76, 0.16);
    alpha = max(disc * 0.72, rim * 0.35);
    light = 0.58 + (1.0 - d) * 0.4;
  } else if (vCosmic < 4.5) {
    // ASTEROID BELT — liquidity is a segmented ring, not another token point.
    if (d > 1.0) discard;
    float belt = ring(d, 0.68, 0.15);
    float chunks = 0.36 + 0.64 * smoothstep(-0.28, 0.3, sin(a * 15.0 + vPhase * 6.28318));
    alpha = belt * chunks * 0.78;
    light = 0.88 + chunks * 0.38;
  } else if (vCosmic < 5.5) {
    // COMET — stretched in the vertex shader; bright head, narrow fading tail.
    float head = 1.0 - smoothstep(0.05, 0.48, length(vec2((vLocal.x - 0.52) * 1.5, vLocal.y * 1.9)));
    float tailWidth = (1.0 - smoothstep(-0.95, 0.55, vLocal.x)) * 0.42 + 0.05;
    float tail = (1.0 - smoothstep(tailWidth * 0.45, tailWidth, abs(vLocal.y))) * (1.0 - smoothstep(-0.9, 0.68, vLocal.x));
    alpha = max(head, tail * 0.62);
    if (alpha < 0.02) discard;
    light = 0.86 + head * 0.95;
  } else if (vCosmic < 6.5) {
    // BLACK HOLE — deliberately empty center with an accretion ring.
    if (d > 1.0) discard;
    float accretion = ring(d, 0.62, 0.18);
    float outer = ring(d, 0.82, 0.22) * 0.28;
    alpha = max(accretion * 0.88, outer);
    if (d < 0.34) alpha *= 0.08;
    light = 0.55 + accretion * 0.95;
  } else if (vCosmic < 7.5) {
    // SUPERNOVA — historical radial burst / permanent scar.
    if (d > 1.0) discard;
    float shell = ring(d, 0.55, 0.2);
    float rays = pow(abs(cos(a * 7.0 + vPhase * 6.28318)), 10.0) * (1.0 - smoothstep(0.16, 1.0, d));
    float core = 1.0 - smoothstep(0.02, 0.28, d);
    alpha = max(core * 0.9, max(shell * 0.58, rays * 0.68));
    light = 0.9 + core * 0.9 + rays * 0.55;
  } else if (vCosmic < 8.5) {
    // WORMHOLE — two concentric portal rings; the token itself remains a star.
    if (d > 1.0) discard;
    float inner = ring(d, 0.48, 0.13);
    float outer = ring(d, 0.76, 0.15);
    float ripple = 0.65 + 0.35 * sin(a * 6.0 + uTime * 0.7 * uMotion + vPhase * 6.28318);
    alpha = max(inner * 0.82, outer * ripple * 0.64);
    light = 0.92 + inner * 0.5;
  } else if (vCosmic < 9.5) {
    // GHOST — faint broken historical trace, never decorative wallpaper.
    if (d > 1.0) discard;
    float outline = ring(d, 0.62, 0.24);
    float breaks = 0.38 + 0.62 * smoothstep(-0.35, 0.35, sin(a * 5.0 + vPhase * 8.0));
    float haze = (1.0 - smoothstep(0.15, 0.92, d)) * 0.14;
    alpha = max(outline * breaks * 0.34, haze);
    light = 0.58 + outline * 0.25;
  } else {
    // DUST — decorative field fabric only. Tiny and intentionally subdued.
    if (d > 0.72) discard;
    float core = 1.0 - smoothstep(0.05, 0.48, d);
    alpha = core * 0.32;
    light = 0.62;
  }

  if (alpha < 0.012) discard;
  gl_FragColor = vec4(vColor * light, alpha);
}
`;

function particleHasWallet(particle: FieldParticle) {
  const wallet = typeof particle.metadata?.wallet === "string" ? particle.metadata.wallet.trim() : "";
  const solana = typeof particle.metadata?.solanaWallet === "string" ? particle.metadata.solanaWallet.trim() : "";
  return Boolean(wallet || solana);
}

type LiveLabel = { title: string; fact: string | null; tone: "fomo" | "afterbell" | "neutral" };

function labelText(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function labelTone(particle: FieldParticle): LiveLabel["tone"] {
  const target = particle.metadata?.targetGalaxyId;
  if (target === "fomo" || particle.metadata?.fomoTrader === true || particle.originGalaxyId === "fomo") return "fomo";
  if (target === "afterbell" || particle.metadata?.afterbellTrader === true || particle.metadata?.afterbellEquity === true || particle.originGalaxyId === "afterbell") return "afterbell";
  return "neutral";
}

function planetFact(particle: FieldParticle) {
  const metadata = particle.metadata;
  if (metadata?.skyRole === "watch") return "Watching";
  if (metadata?.positionBasis === "retained-holding") return "Holds";
  const prints = Number(metadata?.uniqueAfterCloseTxCount ?? metadata?.tradeCount ?? 0);
  if (Number.isFinite(prints) && prints > 0) return `${prints} ${prints === 1 ? "print" : "prints"}`;
  if (typeof metadata?.positionSource === "string" && metadata.positionSource.includes("fomo-reported")) return "Fomo-reported";
  return null;
}

/** Identity plus one fact. The cosmic kind is carried by the body itself, not a "STAR ·" prefix. */
function liveLabel(particle: FieldParticle): LiveLabel | null {
  const kind = renderCosmicKind(particle);
  if (kind === "dust") return null;
  const tone = labelTone(particle);
  if (kind === "galaxy") {
    const name = labelText(particle.metadata?.name, 18);
    const target = particle.metadata?.targetGalaxyId;
    return { title: (name ?? cosmicLabel(kind)).toUpperCase(), fact: target === "fomo" ? "Memecoin traders" : target === "afterbell" ? "After-close xStocks" : null, tone };
  }
  if (kind === "star") {
    const wallet = labelText(particle.metadata?.wallet, 64);
    const title = labelText(particle.metadata?.displayName, 18) ?? labelText(particle.metadata?.name, 18) ?? (wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Public wallet");
    return { title, fact: labelText(particle.metadata?.factLine, 28), tone };
  }
  if (kind === "comet") {
    const side = labelText(particle.metadata?.side, 8)?.toUpperCase() ?? "PRINT";
    const at = new Date(particle.observedAt);
    const when = Number.isFinite(at.getTime()) ? at.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
    return { title: side, fact: when, tone };
  }
  const symbol = labelText(particle.metadata?.symbol, 12);
  const name = labelText(particle.metadata?.name, 16);
  const address = particle.metadata?.mint ?? particle.metadata?.wallet;
  const title = symbol ?? name ?? (typeof address === "string" ? `${address.slice(0, 4)}…${address.slice(-4)}` : cosmicLabel(kind));
  return { title, fact: kind === "planet" ? planetFact(particle) : null, tone };
}

const LABEL_RIM: Record<LiveLabel["tone"], string> = {
  fomo: "rgba(190,160,255,.62)",
  afterbell: "rgba(236,218,170,.62)",
  neutral: "rgba(226,232,244,.42)",
};

function createLabelSprite(label: LiveLabel, compact: boolean) {
  const fact = compact ? null : label.fact;
  const canvas = document.createElement("canvas");
  canvas.width = 448;
  canvas.height = fact ? 96 : 72;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  const measure = (text: string, font: string) => {
    context.font = font;
    return context.measureText(text).width;
  };
  const titleWidth = measure(label.title, "650 26px system-ui, -apple-system, sans-serif");
  const factWidth = fact ? measure(fact, "500 19px system-ui, -apple-system, sans-serif") : 0;
  const boxWidth = Math.min(400, Math.max(132, Math.ceil(Math.max(titleWidth, factWidth)) + 44));
  const boxHeight = fact ? 76 : 48;
  const boxLeft = (canvas.width - boxWidth) / 2;
  context.fillStyle = "rgba(11,12,16,.74)";
  context.strokeStyle = LABEL_RIM[label.tone];
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(boxLeft, 10, boxWidth, boxHeight, 14);
  context.fill();
  context.stroke();
  context.font = "650 26px system-ui, -apple-system, sans-serif";
  context.fillStyle = "rgba(246,244,238,.97)";
  context.fillText(label.title, canvas.width / 2, fact ? 34 : 34);
  if (fact) {
    context.font = "500 19px system-ui, -apple-system, sans-serif";
    context.fillStyle = "rgba(214,212,206,.78)";
    context.fillText(fact, canvas.width / 2, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    }),
  );
  sprite.scale.set(25, fact ? 5.36 : 4.1, 1);
  sprite.renderOrder = 6;
  return sprite;
}

function disposeLabelSprite(sprite: THREE.Sprite) {
  sprite.removeFromParent();
  sprite.material.map?.dispose();
  sprite.material.dispose();
}

const FOMO_AMETHYST: [number, number, number] = [0.7, 0.5, 1.0];
const FOMO_LILAC: [number, number, number] = [0.82, 0.7, 1.0];
const AFTERBELL_ICE: [number, number, number] = [0.7, 0.84, 1.0];
const AFTERBELL_CHAMPAGNE: [number, number, number] = [0.95, 0.85, 0.62];

function buildFieldMesh(snapshot: UniverseSnapshot, material: THREE.ShaderMaterial, limit: number) {
  const visible = snapshot.particles.slice(0, limit);
  const count = visible.length;
  const positions = new Float32Array(visible.length * 3);
  const colors = new Float32Array(visible.length * 3);
  const cats = new Float32Array(visible.length);
  const cosmic = new Float32Array(visible.length);
  const phases = new Float32Array(visible.length);
  const observed = new Float32Array(visible.length);
  const duration = Math.max(1, snapshot.windowEnd - snapshot.windowStart);
  visible.forEach((entity, i) => {
    positions.set(entity.position, i * 3);
    const base = parentColorForCategory(entity.category);
    const targetGalaxy = typeof entity.metadata?.targetGalaxyId === "string" ? entity.metadata.targetGalaxyId : "";
    const color =
      targetGalaxy === "fomo" || entity.metadata?.fomoTrader === true
        ? FOMO_AMETHYST
        : targetGalaxy === "afterbell" || entity.metadata?.afterbellTrader === true
          ? AFTERBELL_ICE
          : entity.cosmicKind === "planet" && snapshot.galaxyId === "afterbell"
            ? AFTERBELL_CHAMPAGNE
            : entity.cosmicKind === "planet" && snapshot.galaxyId === "fomo"
              ? FOMO_LILAC
              : snapshot.galaxyId === "pons"
            ? ([
                base[0] * 0.58 + 0.38,
                base[1] * 0.62 + 0.34,
                base[2] * 0.48 + 0.12,
              ] as [number, number, number])
            : base;
    colors.set(color, i * 3);
    cats[i] = CATEGORY_INDEX[entity.category] ?? 6;
    cosmic[i] = COSMIC_KIND_INDEX[renderCosmicKind(entity)] ?? COSMIC_KIND_INDEX.dust;
    phases[i] = (i * 0.61803398875) % 1;
    observed[i] = clamp((entity.observedAt - snapshot.windowStart) / duration, 0, 1);
  });
  const geometry = new THREE.CircleGeometry(1, 16);
  geometry.setAttribute("aCat", new THREE.InstancedBufferAttribute(cats, 1));
  geometry.setAttribute("aObserved", new THREE.InstancedBufferAttribute(observed, 1));
  geometry.setAttribute("aCosmic", new THREE.InstancedBufferAttribute(cosmic, 1));
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.userData.entities = visible;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  visible.forEach((entity, i) => {
    _dummy.position.set(entity.position[0], entity.position[1], entity.position[2]);
    _dummy.scale.setScalar(cosmicWorldSize(entity));
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, positions, colors };
}

function buildStarMesh(material: THREE.MeshBasicMaterial) {
  const starfield = createStarfield();
  const count = starfield.count;
  const geometry = new THREE.CircleGeometry(1, 6);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  for (let i = 0; i < count; i++) {
    _dummy.position.set(
      starfield.positions[i * 3],
      starfield.positions[i * 3 + 1],
      starfield.positions[i * 3 + 2],
    );
    _dummy.scale.setScalar(0.28 + (i % 11 === 0 ? 0.55 : 0.12));
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export class ParticleFieldRenderer {
  host: HTMLElement;
  snapshot: UniverseSnapshot;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  points: THREE.InstancedMesh;
  stars: THREE.InstancedMesh;
  liveLabels: THREE.Sprite[] = [];
  material: THREE.ShaderMaterial;
  starMaterial: THREE.MeshBasicMaterial;
  basePositions: Float32Array;
  colors: Float32Array;
  cameraState: CameraState = { yaw: 0.4, pitch: 0.18, distance: 125, target: [0, 0, 0] };
  queryBlend = 0;
  queryTarget = 0;
  reducedMotion: boolean;
  autoSpin = 0.0003;
  destroyed = false;
  focused: FieldParticle | null = null;
  replayActive = false;
  replayPlaying = false;
  replayCursor = 1;
  replaySpeed = 0.12;
  onAfterUpdate: ((elapsed: number, now: number) => void) | null = null;
  onFocus: ((particle: FieldParticle | null) => void) | null = null;
  onReplayTick: ((cursor: number, playing: boolean) => void) | null = null;
  watchMints = new Set<string>();
  #raf = 0;
  #last = 0;
  #gestures: CameraGestures;
  #onResize: () => void;
  #pick = new THREE.Vector3();
  #queryFrame: CameraState | null = null;
  #queryFrameWeight = 0;
  #lastReplayEmit = 0;
  #ro: ResizeObserver | null = null;
  #contextLost = false;
  #didRender = false;
  #pageVisible = document.visibilityState !== "hidden";
  #flightUntil = 0;

  constructor(host: HTMLElement, snapshot: UniverseSnapshot) {
    this.host = host;
    this.snapshot = snapshot;
    if (snapshot.galaxyId === "galaxy-zero") this.cameraState.distance = GALAXY_ZERO_CAMERA_DISTANCE;
    this.reducedMotion =
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const budget = deviceBudget();
    const canvas = document.createElement("canvas");
    canvas.className = "universe-canvas";
    canvas.setAttribute("aria-label", `Interactive ${snapshot.galaxyId} activity field`);
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      touchAction: "none",
      background: "#0b0c10",
    });
    host.append(canvas);

    // Keep the known-good production context/lifecycle. Visual differentiation
    // happens inside the existing instanced draw path, not by adding canvases.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      depth: true,
      stencil: false,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setClearColor(0x0b0c10, 1);
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, budget.dpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    canvas.addEventListener("webglcontextlost", this.#onContextLost, false);
    canvas.addEventListener("webglcontextrestored", this.#onContextRestored, false);
    document.addEventListener("visibilitychange", this.#onVisibilityChange);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 700);
    this.#placeCamera();

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uIntensity: { value: 1.15 },
        uPull: { value: 0 },
        uFocus: { value: new THREE.Vector3() },
        uFocusAmt: { value: 0 },
        uFocusCat: { value: -1 },
        uReplayActive: { value: 0 },
        uReplayCursor: { value: 1 },
        uTime: { value: 0 },
        uMotion: { value: this.reducedMotion ? 0 : 1 },
      },
      vertexShader: FIELD_VERT,
      fragmentShader: FIELD_FRAG,
    });

    const fieldMesh = buildFieldMesh(snapshot, this.material, budget.field);
    this.basePositions = new Float32Array(fieldMesh.positions);
    this.colors = fieldMesh.colors;
    this.points = fieldMesh.mesh;
    this.scene.add(this.points);
    this.#rebuildLiveLabels();

    this.starMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4dcf0,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    this.stars = buildStarMesh(this.starMaterial);
    this.scene.add(this.stars);

    this.#gestures = new CameraGestures(canvas, {
      min: 70,
      max: 320,
      getDistance: () => this.cameraState.distance,
      setDistance: (distance) => {
        this.#queryFrameWeight = 0;
        this.cameraState.distance = distance;
        globalThis.__ABULLS_ZOOM = { field: distance, organism: distance };
      },
      onOrbit: (dx, dy) => {
        this.#queryFrameWeight = 0;
        this.cameraState.yaw += dx * 0.005;
        this.cameraState.pitch = clamp(this.cameraState.pitch + dy * 0.004, -0.9, 0.9);
      },
      onTap: (x, y) => this.#handleTap(x, y),
      enabled: () => !this.destroyed,
    });
    globalThis.__ABULLS_ZOOM = { field: this.cameraState.distance, organism: globalThis.__ABULLS_ZOOM?.organism ?? 0 };
    this.#onResize = () => this.resize();
    globalThis.addEventListener("resize", this.#onResize);
    globalThis.visualViewport?.addEventListener("resize", this.#onResize);
    if (typeof ResizeObserver !== "undefined") {
      this.#ro = new ResizeObserver(() => this.resize());
      this.#ro.observe(host);
    }
    this.resize();
    this.#last = performance.now();
    this.#raf = requestAnimationFrame(this.#frame);
    globalThis.__ABULLS_PICK = (x: number, y: number) => this.#handleTap(x, y);
  }

  #placeCamera() {
    const c = this.cameraState;
    const [tx, ty, tz] = c.target;
    this.camera.position.set(
      tx + Math.sin(c.yaw) * Math.cos(c.pitch) * c.distance,
      ty + Math.sin(c.pitch) * c.distance,
      tz + Math.cos(c.yaw) * Math.cos(c.pitch) * c.distance,
    );
    this.camera.lookAt(tx, ty, tz);
  }

  #onContextLost = (event: Event) => {
    event.preventDefault();
    this.#contextLost = true;
    this.host.dataset.fieldReady = "context-lost";
    console.warn("[field-renderer] WebGL context lost; waiting for browser restoration");
  };

  #onContextRestored = () => {
    this.#contextLost = false;
    this.#didRender = false;
    this.resize();
    console.info("[field-renderer] WebGL context restored");
  };

  #suspended = false;
  /** Replay owns the screen: detach the WebGL canvas and stop drawing until it closes. */
  setSuspended(on: boolean) {
    if (this.destroyed || on === this.#suspended) return;
    this.#suspended = on;
    const canvas = this.renderer.domElement;
    if (on) {
      canvas.remove();
      this.host.dataset.fieldSuspended = "true";
    } else {
      if (!canvas.isConnected) this.host.prepend(canvas);
      delete this.host.dataset.fieldSuspended;
      this.#last = performance.now();
      if (this.#pageVisible && !this.#contextLost) this.resize();
    }
  }

  #onVisibilityChange = () => {
    this.#pageVisible = document.visibilityState !== "hidden";
    this.#last = performance.now();
    if (this.#pageVisible && !this.#contextLost) this.resize();
  };

  getParticleCount() {
    return Math.floor(this.basePositions.length / 3);
  }

  setSnapshot(snapshot: UniverseSnapshot) {
    if (this.destroyed) return;
    const galaxyChanged = snapshot.galaxyId !== this.snapshot.galaxyId;
    const fieldMesh = buildFieldMesh(snapshot, this.material, deviceBudget().field);
    const previous = this.points;
    this.snapshot = snapshot;
    if (galaxyChanged) {
      this.cameraState = { yaw: 0.4, pitch: 0.18, distance: snapshot.galaxyId === "galaxy-zero" ? GALAXY_ZERO_CAMERA_DISTANCE : 125, target: [0, 0, 0] };
      this.#flightUntil = performance.now() + (this.reducedMotion ? 0 : 1150);
    }
    this.basePositions = new Float32Array(fieldMesh.positions);
    this.colors = fieldMesh.colors;
    this.points = fieldMesh.mesh;
    this.points.scale.set(1, snapshot.galaxyId === "pons" ? 0.72 : 1, 1);
    this.scene.add(this.points);
    previous.removeFromParent();
    previous.geometry.dispose();
    this.renderer.domElement.setAttribute(
      "aria-label",
      `Interactive ${snapshot.galaxyId} activity field`,
    );
    this.clearFocus(true);
    this.setReplay({ active: false, cursor: 1, playing: false });
    this.#rebuildLiveLabels();
  }

  setWatchlistMints(mints: readonly string[]) {
    this.watchMints = new Set(mints.map(mintKey));
    this.#rebuildLiveLabels();
  }

  focusByMint(mint: string) {
    const entities = this.points.geometry.userData.entities as FieldParticle[];
    const hit = entities.find((particle) => mintKey(particleMint(particle) ?? "") === mintKey(mint));
    if (!hit) return;
    this.focused = hit;
    this.material.uniforms.uFocus.value.set(hit.position[0], hit.position[1], hit.position[2]);
    this.material.uniforms.uFocusAmt.value = 1;
    this.material.uniforms.uFocusCat.value = CATEGORY_INDEX[hit.category] ?? 6;
    this.onFocus?.(hit);
  }

  #rebuildLiveLabels() {
    for (const sprite of this.liveLabels) disposeLabelSprite(sprite);
    this.liveLabels = [];
    const entities = this.points.geometry.userData.entities as FieldParticle[];
    const ranked = entities
      .filter((particle) => {
        const galaxyCore = typeof particle.metadata?.targetGalaxyId === "string" && particle.metadata?.galaxyRole === "core";
        return (galaxyCore || particle.metadata?.skyRole !== "wallpaper") && Boolean(liveLabel(particle));
      })
      .sort((a, b) => {
        const aMint = mintKey(particleMint(a) ?? "");
        const bMint = mintKey(particleMint(b) ?? "");
        const aGalaxy = a.metadata?.galaxyRole === "core" ? 1600 : 0;
        const bGalaxy = b.metadata?.galaxyRole === "core" ? 1600 : 0;
        const aWatch = this.watchMints.has(aMint) || a.metadata?.skyRole === "watch" ? 1000 : 0;
        const bWatch = this.watchMints.has(bMint) || b.metadata?.skyRole === "watch" ? 1000 : 0;
        const aTeach = a.metadata?.skyRole === "teaching" ? 500 : 0;
        const bTeach = b.metadata?.skyRole === "teaching" ? 500 : 0;
        const kindRank = (particle: FieldParticle) => (particle.cosmicKind === "planet" ? 300 : particle.cosmicKind === "star" ? 200 : 0);
        return bGalaxy + bWatch + bTeach + kindRank(b) + b.magnitudeBand - (aGalaxy + aWatch + aTeach + kindRank(a) + a.magnitudeBand);
      });
    const candidates: FieldParticle[] = [];
    const seen = new Set<string>();
    for (const particle of ranked) {
      const target = typeof particle.metadata?.targetGalaxyId === "string" ? particle.metadata.targetGalaxyId : null;
      const mint = particleMint(particle);
      const key = target ? `galaxy:${target}` : mint ? `mint:${mintKey(mint)}` : `id:${particle.id}`;
      if (seen.has(key)) continue;
      const [x, y, z] = particle.position;
      if (candidates.some((other) => Math.abs(other.position[0] - x) < 22 && Math.abs(other.position[1] - y) < 7 && Math.abs(other.position[2] - z) < 30)) continue;
      seen.add(key);
      candidates.push(particle);
      if (candidates.length >= 6) break;
    }
    const compact = hostSize(this.host).width < 560;
    for (const particle of candidates) {
      const label = liveLabel(particle);
      if (!label) continue;
      const sprite = createLabelSprite(label, compact);
      if (!sprite) continue;
      const yOffset = Math.min(14, cosmicWorldSize(particle) + 2.4);
      sprite.position.set(particle.position[0], particle.position[1] + yOffset, particle.position[2]);
      this.points.add(sprite);
      this.liveLabels.push(sprite);
    }
  }

  setReplay({
    active = this.replayActive,
    cursor = this.replayCursor,
    playing = this.replayPlaying,
  }: {
    active?: boolean;
    cursor?: number;
    playing?: boolean;
  }) {
    this.replayActive = active;
    this.replayCursor = clamp(cursor, 0, 1);
    this.replayPlaying = active && playing && this.replayCursor < 1;
    this.material.uniforms.uReplayActive.value = active ? 1 : 0;
    this.material.uniforms.uReplayCursor.value = this.replayCursor;
  }

  getParentPositions() {
    return this.basePositions;
  }

  getParentColors() {
    return this.colors;
  }

  clearFocus(silent = false) {
    this.focused = null;
    this.material.uniforms.uFocusAmt.value = 0;
    this.material.uniforms.uFocusCat.value = -1;
    if (!silent) this.onFocus?.(null);
  }

  setQueryActive(active: boolean) {
    this.queryTarget = active ? 1 : 0;
    if (active) {
      this.clearFocus();
      this.#queryFrame = this.#queryCameraState();
      this.#queryFrameWeight = 1;
    } else {
      this.#queryFrame = null;
      this.#queryFrameWeight = 0;
    }
  }

  #queryCameraState(): CameraState {
    const { width, height } = hostSize(this.host);
    const aspect = Math.max(0.35, width / Math.max(1, height));
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * aspect);
    const verticalDistance =
      (ALIEN_BOUNDS.size[1] * 0.5) /
      (Math.tan(verticalFov * 0.5) * (aspect < 0.8 ? 0.62 : 0.7));
    const horizontalDistance =
      (ALIEN_BOUNDS.size[0] * 0.5) /
      (Math.tan(horizontalFov * 0.5) * (aspect < 0.8 ? 0.86 : 0.78));
    return {
      yaw: 0,
      pitch: 0.018,
      distance: clamp(Math.max(verticalDistance, horizontalDistance) * 1.04, 104, 205),
      target: [0, 3.5, 0],
    };
  }

  /** Ease the camera toward the current cameraState instead of cutting to it. */
  beginFlight(ms = 820) {
    this.#flightUntil = performance.now() + (this.reducedMotion ? 0 : ms);
  }

  snapshotCamera(): CameraState {
    return {
      yaw: this.cameraState.yaw,
      pitch: this.cameraState.pitch,
      distance: this.cameraState.distance,
      target: [...this.cameraState.target],
    };
  }

  restoreCamera(state: CameraState) {
    this.cameraState = {
      yaw: state.yaw,
      pitch: state.pitch,
      distance: state.distance,
      target: [...state.target],
    };
    this.#placeCamera();
  }

  resize() {
    const { width, height } = hostSize(this.host);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.material.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    if (this.queryTarget > 0.5 && this.queryBlend < 0.9) {
      this.#queryFrame = this.#queryCameraState();
      this.#queryFrameWeight = Math.max(this.#queryFrameWeight, 0.65);
    }
  }

  #handleTap(clientX: number, clientY: number) {
    if (this.queryBlend > 0.04) return;
    const hit = this.#pickParticle(clientX, clientY);
    if (!hit) {
      this.clearFocus();
      return;
    }
    this.focused = hit;
    this.material.uniforms.uFocus.value.set(hit.position[0], hit.position[1], hit.position[2]);
    this.material.uniforms.uFocusAmt.value = 1;
    this.material.uniforms.uFocusCat.value = CATEGORY_INDEX[hit.category] ?? 6;
    this.onFocus?.(hit);
  }

  #pickParticle(clientX: number, clientY: number): FieldParticle | null {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const entities = this.points.geometry.userData.entities as FieldParticle[];
    this.points.updateWorldMatrix(true, false);
    this.camera.updateMatrixWorld();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    let bestLive = -1;
    let bestLiveD = 84;
    let bestHolder = -1;
    let bestHolderD = 84;
    let bestAny = -1;
    let bestAnyD = 72;
    const pos = this.basePositions;
    for (let i = 0; i < entities.length; i++) {
      const metadata = entities[i].metadata;
      const targetGalaxy = typeof metadata?.targetGalaxyId === "string";
      const liveIdentity = Boolean(particleMint(entities[i]) || entities[i].eventId || particleHasWallet(entities[i]));
      if (metadata?.interactive === false || renderCosmicKind(entities[i]) === "dust" || (metadata?.skyRole === "wallpaper" && !targetGalaxy && !liveIdentity)) continue;
      if (this.replayActive) {
        const duration = Math.max(1, this.snapshot.windowEnd - this.snapshot.windowStart);
        const observed = (entities[i].observedAt - this.snapshot.windowStart) / duration;
        if (observed > this.replayCursor + 0.0005) continue;
      }
      const x0 = pos[i * 3];
      const y0 = pos[i * 3 + 1];
      const z0 = pos[i * 3 + 2];
      this.#pick.set(x0, y0, z0);
      const focusCat = this.material.uniforms.uFocusCat.value;
      if (this.focused && (CATEGORY_INDEX[entities[i].category] ?? 6) === focusCat) {
        this.#pick.lerp(this.material.uniforms.uFocus.value, this.material.uniforms.uFocusAmt.value * 0.22);
      }
      this.#pick.applyMatrix4(this.points.matrixWorld).project(this.camera);
      if (this.#pick.z > 1 || this.#pick.z < -1) continue;
      const sx = (this.#pick.x * 0.5 + 0.5) * w;
      const sy = (-this.#pick.y * 0.5 + 0.5) * h;
      const d = Math.hypot(sx - mx, sy - my);
      if (d < bestAnyD) {
        bestAnyD = d;
        bestAny = i;
      }
      if (isLiveSkyParticle(entities[i]) && d < bestLiveD) {
        bestLiveD = d;
        bestLive = i;
      }
      if (metadata?.systemRole === "holder-star" && particleHasWallet(entities[i]) && d < bestHolderD) {
        bestHolderD = d;
        bestHolder = i;
      }
    }
    if (bestHolder >= 0 && (bestLive < 0 || entities[bestLive].metadata?.systemRole === "token-planet-core")) return entities[bestHolder];
    if (bestLive >= 0) return entities[bestLive];
    return bestAny >= 0 ? entities[bestAny] : null;
  }

  #frame = (now: number) => {
    if (this.destroyed) return;
    if (!this.#pageVisible || this.#contextLost || this.#suspended) {
      this.#last = now;
      this.#raf = requestAnimationFrame(this.#frame);
      return;
    }
    const elapsed = Math.min(0.1, (now - this.#last) / 1000);
    this.#last = now;
    if (this.replayActive && this.replayPlaying) {
      this.replayCursor = Math.min(1, this.replayCursor + elapsed * this.replaySpeed);
      if (this.replayCursor >= 1) this.replayPlaying = false;
      this.material.uniforms.uReplayCursor.value = this.replayCursor;
      if (now - this.#lastReplayEmit > 70 || !this.replayPlaying) {
        this.#lastReplayEmit = now;
        this.onReplayTick?.(this.replayCursor, this.replayPlaying);
      }
    }
    const blendSpeed = 1 - Math.exp(-elapsed * 1.05);
    this.queryBlend += (this.queryTarget - this.queryBlend) * blendSpeed;
    if (this.queryTarget < 0.5 && this.queryBlend < 0.0005) this.queryBlend = 0;

    if (this.#queryFrame && this.#queryFrameWeight > 0 && !this.#gestures.interacting) {
      const frameEase = 1 - Math.exp(-elapsed * 2.6);
      this.cameraState.yaw += (this.#queryFrame.yaw - this.cameraState.yaw) * frameEase;
      this.cameraState.pitch += (this.#queryFrame.pitch - this.cameraState.pitch) * frameEase;
      this.cameraState.distance += (this.#queryFrame.distance - this.cameraState.distance) * frameEase;
      for (let axis = 0; axis < 3; axis++) {
        this.cameraState.target[axis] +=
          (this.#queryFrame.target[axis] - this.cameraState.target[axis]) * frameEase;
      }
      globalThis.__ABULLS_ZOOM = {
        field: this.cameraState.distance,
        organism: this.cameraState.distance,
      };
    }

    if (!this.reducedMotion && !this.#gestures.interacting && this.queryBlend < 0.02) {
      this.cameraState.yaw += elapsed * this.autoSpin * 60;
      this.points.rotation.y += elapsed * 0.09;
      this.stars.rotation.y += elapsed * 0.05;
    }

    this.material.uniforms.uTime.value = now / 1000;
    this.material.uniforms.uIntensity.value = 1.15 - this.queryBlend * 0.96;
    this.material.uniforms.uPull.value = this.queryBlend;
    const fieldScale = 1 - this.queryBlend * 0.06;
    this.points.scale.set(fieldScale, fieldScale * (this.snapshot.galaxyId === "pons" ? 0.72 : 1), fieldScale);
    this.points.visible = this.queryBlend < 0.97;
    this.starMaterial.opacity = 0.54 + this.queryBlend * 0.32;

    const c = this.cameraState;
    const [tx, ty, tz] = c.target;
    const desiredX = tx + Math.sin(c.yaw) * Math.cos(c.pitch) * c.distance;
    const desiredY = ty + Math.sin(c.pitch) * c.distance;
    const desiredZ = tz + Math.cos(c.yaw) * Math.cos(c.pitch) * c.distance;
    const cinematicFlight = now < this.#flightUntil && !this.reducedMotion && !this.#gestures.interacting;
    const follow = this.#gestures.pinching
      ? 0.5
      : this.#gestures.orbiting
        ? 0.28
        : cinematicFlight
          ? 0.065
          : this.queryBlend > 0.02 && this.queryBlend < 0.9
            ? 0.18
            : 0.16;
    this.camera.position.x += (desiredX - this.camera.position.x) * follow;
    this.camera.position.y += (desiredY - this.camera.position.y) * follow;
    this.camera.position.z += (desiredZ - this.camera.position.z) * follow;
    this.camera.lookAt(tx, ty, tz);
    this.onAfterUpdate?.(elapsed, now);
    if (!this.#contextLost) {
      this.renderer.render(this.scene, this.camera);
      if (!this.#didRender) {
        this.#didRender = true;
        this.host.dataset.fieldReady = "true";
      }
    }
    this.#raf = requestAnimationFrame(this.#frame);
  };

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.#raf);
    this.#gestures.destroy();
    this.#ro?.disconnect();
    this.#ro = null;
    globalThis.removeEventListener("resize", this.#onResize);
    globalThis.visualViewport?.removeEventListener("resize", this.#onResize);
    document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    this.points.geometry.dispose();
    for (const sprite of this.liveLabels) disposeLabelSprite(sprite);
    this.liveLabels = [];
    this.stars.geometry.dispose();
    this.material.dispose();
    this.starMaterial.dispose();
    this.renderer.domElement.removeEventListener("webglcontextlost", this.#onContextLost, false);
    this.renderer.domElement.removeEventListener("webglcontextrestored", this.#onContextRestored, false);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export { CATEGORY_COLORS };

declare global {
  // eslint-disable-next-line no-var
  var __ABULLS_ZOOM: { field: number; organism: number; camZ?: number } | undefined;
  // eslint-disable-next-line no-var
  var __ABULLS_PICK: ((x: number, y: number) => void) | undefined;
}
