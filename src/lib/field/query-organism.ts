import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  buildCoreBuffers,
  buildDermalBuffers,
  buildLivingSkin,
  ALIEN_BOUNDS,
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

const DERMAL_VERT = /* glsl */ `
attribute vec3 aNormal;
attribute float aPhase;
attribute float aFeature;
uniform float uPixelRatio;
uniform float uTime;
uniform float uMorph;
uniform float uSpeech;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vFeature;
void main() {
  vNormal = normalize(normalMatrix * aNormal);
  vLocal = position;
  vFeature = aFeature;
  float formed = smoothstep(0.34, 0.76, uMorph);
  float cellular = sin(uTime * 1.7 + aPhase) * 0.045 * formed;
  vec3 p = position + aNormal * (cellular + aFeature * uSpeech * 0.10);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float perspective = 300.0 / max(16.0, -mv.z);
  gl_PointSize = mix(0.0, 3.25 + aFeature * 0.55, formed) * uPixelRatio * perspective;
  gl_Position = projectionMatrix * mv;
}
`;

const DERMAL_FRAG = /* glsl */ `
uniform float uAlpha;
uniform float uSpeech;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vFeature;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float z = sqrt(max(0.0, 1.0 - r2));
  vec3 n = normalize(vNormal + vec3(q.x * 0.22, q.y * 0.22, z * 0.12));
  vec3 key = normalize(vec3(-0.46, 0.72, 0.55));
  vec3 fill = normalize(vec3(0.65, 0.18, 0.74));
  float keyLight = max(dot(n, key), 0.0);
  float fillLight = max(dot(n, fill), 0.0);
  float rim = pow(1.0 - max(n.z, 0.0), 2.4);
  float side = smoothstep(-34.0, 34.0, vLocal.x);
  vec3 leftColor = vec3(0.23, 0.075, 0.34);
  vec3 rightColor = vec3(0.025, 0.31, 0.29);
  vec3 identity = mix(leftColor, rightColor, side);
  vec3 tissue = vec3(0.055, 0.075, 0.088);
  vec3 color = tissue * (0.52 + keyLight * 1.28 + fillLight * 0.42);
  color += identity * (rim * 0.54 + vFeature * 0.08 + uSpeech * vFeature * 0.18);
  float edge = smoothstep(1.0, 0.46, r2);
  float pore = 0.88 + 0.12 * sin((q.x + q.y) * 18.0 + vLocal.y * 0.2);
  gl_FragColor = vec4(color * pore, edge * uAlpha);
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
  gl_FragColor = vec4(col, 0.62);
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
  dermis: THREE.Points;
  dermalMaterial: THREE.ShaderMaterial;
  head: THREE.Group;
  headMaterials: THREE.Material[] = [];
  headLoaded = false;
  eyes: THREE.Object3D[] = [];
  mouth: THREE.Group;
  mouthCavity: THREE.Mesh;
  upperLip: THREE.Mesh;
  lowerLip: THREE.Mesh;
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
  #headBaseScale = new THREE.Vector3(1, 1, 1);

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

    const dermalData = buildDermalBuffers(budget.organism > 500000 ? 18000 : 12000);
    const dermalGeometry = new THREE.BufferGeometry();
    dermalGeometry.setAttribute("position", new THREE.BufferAttribute(dermalData.positions, 3));
    dermalGeometry.setAttribute("aNormal", new THREE.BufferAttribute(dermalData.normals, 3));
    dermalGeometry.setAttribute("aPhase", new THREE.BufferAttribute(dermalData.phases, 1));
    dermalGeometry.setAttribute("aFeature", new THREE.BufferAttribute(dermalData.features, 1));
    this.dermalMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
      toneMapped: true,
      uniforms: {
        uPixelRatio: { value: field.renderer.getPixelRatio() },
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uSpeech: { value: 0 },
        uAlpha: { value: 0 },
      },
      vertexShader: DERMAL_VERT,
      fragmentShader: DERMAL_FRAG,
    });
    this.dermis = new THREE.Points(dermalGeometry, this.dermalMaterial);
    this.dermis.frustumCulled = false;
    this.dermis.renderOrder = 2;
    this.dermis.visible = false;
    this.group.add(this.dermis);

    this.#buildLighting();

    this.head = this.#buildHead();
    this.#buildEyes();
    const mouth = this.#buildMouth();
    this.mouth = mouth.group;
    this.mouthCavity = mouth.cavity;
    this.upperLip = mouth.upper;
    this.lowerLip = mouth.lower;
    this.nostrils = this.#buildNostrils();

    field.onAfterUpdate = (_elapsed, now) => this.tick(_elapsed, now);
    this.morphTarget = 1;
    this.#last = performance.now();
  }

  #buildLighting() {
    const ambient = new THREE.HemisphereLight(0xa7d6ff, 0x09050f, 0.86);
    const violet = new THREE.PointLight(0x8c35ff, 42, 205, 2);
    violet.position.set(-47, 31, 74);
    const cyan = new THREE.PointLight(0x20e3cf, 34, 195, 2);
    cyan.position.set(49, -2, 63);
    const key = new THREE.DirectionalLight(0xf2f7ff, 1.7);
    key.position.set(-0.38, 0.78, 1);
    for (const light of [ambient, violet, cyan, key]) {
      this.field.scene.add(light);
      this.lights.push(light);
    }
  }

  #buildHead() {
    const root = new THREE.Group();
    root.visible = false;
    this.group.add(root);

    new GLTFLoader().load(
      "/models/grey_alien_head_ccby.glb",
      (gltf) => {
        if (this.destroyed) {
          disposeObject(gltf.scene);
          return;
        }

        const asset = gltf.scene;
        asset.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(asset);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        asset.position.sub(center);

        this.#headBaseScale.set(
          (ALIEN_BOUNDS.size[0] * 0.9) / Math.max(0.001, size.x),
          (ALIEN_BOUNDS.size[1] * 1.02) / Math.max(0.001, size.y),
          (ALIEN_BOUNDS.size[2] * 0.96) / Math.max(0.001, size.z),
        );

        asset.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = false;
          object.receiveShadow = false;
          object.renderOrder = 2;
          const source = Array.isArray(object.material) ? object.material : [object.material];
          const materials = source.map((entry) => {
            const material = entry.clone();
            material.transparent = true;
            material.opacity = 0;
            material.depthWrite = true;
            material.depthTest = true;
            material.userData.baseOpacity = 1;
            if (material instanceof THREE.MeshStandardMaterial) {
              material.metalness = Math.min(material.metalness, 0.05);
              material.roughness = Math.max(material.roughness, 0.5);
              material.envMapIntensity = 0.72;
              material.color.multiply(new THREE.Color(0xa8b2b7));
              material.onBeforeCompile = (shader) => {
                shader.uniforms.uGreySpeech = { value: 0 };
                shader.uniforms.uGreyTime = { value: 0 };
                shader.vertexShader = shader.vertexShader
                  .replace(
                    "#include <common>",
                    `#include <common>
                    uniform float uGreySpeech;
                    uniform float uGreyTime;
                    varying vec3 vGreyLocal;
                    varying vec3 vGreyNormal;`,
                  )
                  .replace(
                    "#include <begin_vertex>",
                    `#include <begin_vertex>
                    // The source mesh faces +Y before its authored node rotation.
                    // Move only the lower, forward, central face for a restrained jaw response.
                    float greyFront = smoothstep(0.05, 0.48, position.y);
                    float greyLower = smoothstep(0.16, 0.52, position.z) * (1.0 - smoothstep(0.72, 0.92, position.z));
                    float greyCenter = 1.0 - smoothstep(0.2, 0.58, abs(position.x));
                    float greyJaw = greyFront * greyLower * greyCenter;
                    transformed.z += greyJaw * pow(clamp(uGreySpeech, 0.0, 1.0), 0.72) * 0.055;
                    transformed.y += greyJaw * uGreySpeech * 0.012;
                    vGreyLocal = position;
                    vGreyNormal = normalize(normal);`,
                  );
                shader.fragmentShader = shader.fragmentShader
                  .replace(
                    "#include <common>",
                    `#include <common>
                    uniform float uGreyTime;
                    varying vec3 vGreyLocal;
                    varying vec3 vGreyNormal;

                    vec3 greySolanaGradient(float t) {
                      vec3 purple = vec3(0.60, 0.27, 1.0);
                      vec3 cyan = vec3(0.18, 0.84, 1.0);
                      vec3 green = vec3(0.078, 0.945, 0.584);
                      return t < 0.5
                        ? mix(purple, cyan, t * 2.0)
                        : mix(cyan, green, (t - 0.5) * 2.0);
                    }`,
                  )
                  .replace(
                    "#include <color_fragment>",
                    `#include <color_fragment>
                    // Original at 0s, full Solana iridescence at 5s, original again at 10s.
                    float skinCycle = 0.5 - 0.5 * cos(uGreyTime * 0.6283185307);
                    skinCycle = smoothstep(0.06, 0.94, skinCycle);

                    // Staggered overlapping cells create curved fish-scale highlights.
                    float scaleY = vGreyLocal.z * 5.2;
                    float scaleRow = floor(scaleY);
                    vec2 scaleCell = fract(vec2(
                      vGreyLocal.x * 5.2 + mod(scaleRow, 2.0) * 0.5,
                      scaleY
                    )) - 0.5;
                    float scaleDistance = length(vec2(scaleCell.x, scaleCell.y * 1.28));
                    float scaleBody = 1.0 - smoothstep(0.38, 0.5, scaleDistance);
                    float scaleRim = smoothstep(0.30, 0.47, scaleDistance) * scaleBody;

                    vec3 curvedNormal = normalize(vGreyNormal);
                    float iridescentShift = fract(
                      vGreyLocal.x * 0.055 +
                      vGreyLocal.z * 0.032 +
                      dot(curvedNormal, normalize(vec3(0.45, 0.72, 0.53))) * 0.34 +
                      uGreyTime * 0.018
                    );
                    vec3 solanaSkin = greySolanaGradient(iridescentShift);
                    solanaSkin *= 0.66 + scaleBody * 0.22 + scaleRim * 0.46;
                    diffuseColor.rgb = mix(diffuseColor.rgb, solanaSkin, skinCycle * 0.88);`,
                  );
                material.userData.shader = shader;
              };
              material.customProgramCacheKey = () => "a-bulls-grey-fishscale-v2";
            }
            this.headMaterials.push(material);
            return material;
          });
          object.material = Array.isArray(object.material) ? materials : materials[0];
        });

        root.add(asset);
        root.scale.copy(this.#headBaseScale);
        root.position.y = 1.1;
        this.headLoaded = true;
      },
      undefined,
      (error) => console.error("Unable to load the licensed Grey head model", error),
    );
    return root;
  }

  #buildEyes() {
    const almond = makeAlmondGeometry();
    const galaxy = new THREE.ShaderMaterial({
      vertexShader: EYE_VERT,
      fragmentShader: EYE_FRAG,
      toneMapped: false,
      transparent: true,
      opacity: 0.62,
      depthWrite: true,
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

  #buildMouth() {
    const group = new THREE.Group();
    group.position.set(MOUTH.x, MOUTH.y, MOUTH.z);
    group.visible = false;
    this.group.add(group);

    const cavityMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x010204,
      roughness: 0.84,
      metalness: 0,
      clearcoat: 0.08,
    });
    const cavity = new THREE.Mesh(new THREE.SphereGeometry(1, 44, 20), cavityMaterial);
    cavity.scale.set(MOUTH.w * 0.88, MOUTH.h * 0.9, MOUTH.d * 0.74);
    cavity.renderOrder = 2;
    group.add(cavity);

    const lipMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x384751,
      emissive: 0x09040f,
      emissiveIntensity: 0.34,
      roughness: 0.42,
      metalness: 0.04,
      clearcoat: 0.3,
      clearcoatRoughness: 0.32,
    });
    const lipGeometry = new THREE.CapsuleGeometry(0.34, 1.25, 8, 24);
    lipGeometry.rotateZ(Math.PI * 0.5);
    const upper = new THREE.Mesh(lipGeometry, lipMaterial);
    const lower = new THREE.Mesh(lipGeometry, lipMaterial.clone());
    const lipScaleX = Math.max(0.6, MOUTH.w / 1.55);
    upper.scale.set(lipScaleX, MOUTH.h * 0.45, MOUTH.d * 0.34);
    lower.scale.copy(upper.scale);
    upper.position.set(0, MOUTH.h * 0.48, MOUTH.d * 0.26);
    lower.position.set(0, -MOUTH.h * 0.48, MOUTH.d * 0.26);
    upper.renderOrder = 3;
    lower.renderOrder = 3;
    group.add(upper, lower);
    return { group, cavity, upper, lower };
  }

  #buildNostrils() {
    const dark = new THREE.MeshPhysicalMaterial({ color: 0x010203, roughness: 0.92 });
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
    const speakPulse = this.state === "speaking" ? Math.max(0.035, this.speech) : this.speech;
    const formed = clamp((this.morph - 0.3) / 0.52);
    const appear = clamp(this.morph / 0.1);
    const headArrival = clamp((this.morph - 0.34) / 0.44);
    const headEase = headArrival * headArrival * (3 - 2 * headArrival);

    this.material.uniforms.uTime.value = now * 0.001;
    this.material.uniforms.uMorph.value = this.morph;
    this.material.uniforms.uSpeech.value = this.state === "speaking" ? speakPulse : this.speech;
    this.material.uniforms.uListen.value = listen;
    this.material.uniforms.uAnalyze.value = analyze;
    this.material.uniforms.uAlpha.value =
      appear * (this.headLoaded ? 0.76 - formed * 0.64 : 0.72 + formed * 0.27);
    this.material.uniforms.uPixelRatio.value = this.field.renderer.getPixelRatio();
    this.coreMaterial.uniforms.uAlpha.value = clamp((this.morph - 0.3) / 0.42) * 0.9;
    this.coreMaterial.uniforms.uPixelRatio.value = this.field.renderer.getPixelRatio();
    this.dermalMaterial.uniforms.uPixelRatio.value = this.field.renderer.getPixelRatio();
    this.dermalMaterial.uniforms.uTime.value = now * 0.001;
    this.dermalMaterial.uniforms.uMorph.value = this.morph;
    this.dermalMaterial.uniforms.uSpeech.value = speakPulse;
    this.dermalMaterial.uniforms.uAlpha.value = formed * (this.headLoaded ? 0.075 : 0.32);
    this.head.visible = this.headLoaded && this.morph > 0.34;
    if (this.headLoaded) {
      this.head.scale.set(
        this.#headBaseScale.x * headEase,
        this.#headBaseScale.y * headEase,
        this.#headBaseScale.z * headEase,
      );
      this.head.rotation.y = (1 - headEase) * -0.09;
      for (const material of this.headMaterials) {
        material.opacity = headEase;
        const shader = material.userData.shader as
          | { uniforms: { uGreySpeech: { value: number }; uGreyTime: { value: number } } }
          | undefined;
        if (shader) {
          shader.uniforms.uGreySpeech.value = speakPulse;
          shader.uniforms.uGreyTime.value = now * 0.001;
        }
      }
    }
    const crawl = this.field.reducedMotion ? 0 : formed;
    const breath = 1 + Math.sin(now * 0.0015) * 0.008 * crawl;
    this.group.scale.setScalar(breath);
    this.group.rotation.y = Math.sin(now * 0.00038) * 0.036 * crawl;
    this.group.rotation.x = Math.sin(now * 0.00029) * 0.012 * crawl - speakPulse * 0.004;
    this.core.visible = !this.headLoaded && this.morph > 0.3;
    this.dermis.visible = this.morph > 0.3;
    this.skin.visible = this.morph > 0.01;
    const blinkWave = Math.max(0, Math.sin(now * 0.00131 + 1.7));
    const blink = Math.pow(blinkWave, 30) * formed;
    for (const eye of this.eyes) {
      eye.visible = !this.headLoaded && this.morph > 0.48;
      eye.scale.y = Math.max(0.08, 1 - blink * 0.92);
    }
    this.mouth.visible = !this.headLoaded && this.morph > 0.62;
    const jawOpen = Math.pow(clamp(speakPulse), 0.72);
    this.mouthCavity.scale.set(MOUTH.w * 0.88, MOUTH.h * (0.72 + jawOpen * 2.55), MOUTH.d * 0.74);
    this.mouthCavity.position.y = -jawOpen * MOUTH.h * 0.18;
    this.upperLip.position.y = MOUTH.h * (0.48 + jawOpen * 0.22);
    this.lowerLip.position.y = -MOUTH.h * (0.48 + jawOpen * 1.42);
    this.lowerLip.rotation.x = jawOpen * 0.08;
    const rounding = 1 - jawOpen * 0.12;
    this.upperLip.scale.x = Math.max(0.6, MOUTH.w / 1.55) * rounding;
    this.lowerLip.scale.x = this.upperLip.scale.x;
    for (const n of this.nostrils) n.visible = !this.headLoaded && this.morph > 0.6;

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
    this.dermis.geometry.dispose();
    this.dermalMaterial.dispose();
    disposeObject(this.head);
    disposeObject(this.mouth);
    for (const n of this.nostrils) {
      n.geometry.dispose();
      (n.material as THREE.Material).dispose();
    }
    this.#eyeGeo?.dispose();
    this.#eyeMat?.dispose();
    globalThis.__ABULLS_ORGANISM = undefined;
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
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
