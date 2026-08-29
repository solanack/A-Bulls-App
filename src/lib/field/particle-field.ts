import * as THREE from "three";
import type { CameraState, FieldParticle, UniverseSnapshot } from "./types";
import { CATEGORY_COLORS, CATEGORY_INDEX } from "./types";
import { clamp, deviceBudget } from "./hash";
import { CameraGestures } from "./gestures";
import { createStarfield } from "./synthetic-universe";
import { ALIEN_BOUNDS, parentColorForCategory } from "./anatomy";

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

const FIELD_VERT = /* glsl */ `
attribute float aSize;
attribute float aCat;
uniform float uPixelRatio;
uniform float uIntensity;
uniform float uPull;
uniform vec3 uFocus;
uniform float uFocusAmt;
uniform float uFocusCat;
varying vec3 vColor;
void main() {
  float kin = step(abs(aCat - uFocusCat), 0.45) * uFocusAmt;
  vec3 origin = vec3(0.0, 6.0, 0.0);
  float t = uPull;
  float ease = t * t * (3.0 - 2.0 * t);
  vec3 held = mix(position, uFocus, kin * 0.22);
  vec3 p = mix(held, origin, ease * 0.9);
  float ang = ease * 4.2 + position.y * 0.014;
  float c = cos(ang);
  float s = sin(ang);
  vec3 d = p - origin;
  p = origin + vec3(d.x * c - d.z * s, d.y * (1.0 - ease * 0.38), d.x * s + d.z * c);
  vColor = color * uIntensity * (1.0 + kin * 1.45);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * uPixelRatio * (210.0 / max(12.0, -mv.z)) * mix(1.0, 0.28, ease) * (1.0 + kin * 1.6);
  gl_Position = projectionMatrix * mv;
}
`;

const FIELD_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float core = smoothstep(0.2, 0.02, d);
  float halo = smoothstep(0.46, 0.16, d);
  float alpha = max(core, halo * 0.24);
  gl_FragColor = vec4(vColor * (0.82 + core * 0.3), alpha);
}
`;

const STAR_VERT = /* glsl */ `
uniform float uPixelRatio;
attribute float aSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio * 150.0 / max(18.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const STAR_FRAG = /* glsl */ `
uniform float uAlpha;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.08, d) * 0.62 * uAlpha;
  gl_FragColor = vec4(vec3(0.82, 0.86, 0.94), alpha);
}
`;

export class ParticleFieldRenderer {
  host: HTMLElement;
  snapshot: UniverseSnapshot;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  points: THREE.Points;
  stars: THREE.Points;
  material: THREE.ShaderMaterial;
  basePositions: Float32Array;
  colors: Float32Array;
  cameraState: CameraState = { yaw: 0.4, pitch: 0.18, distance: 125, target: [0, 0, 0] };
  queryBlend = 0;
  queryTarget = 0;
  reducedMotion: boolean;
  autoSpin = 0.00042;
  destroyed = false;
  focused: FieldParticle | null = null;
  onAfterUpdate: ((elapsed: number, now: number) => void) | null = null;
  onFocus: ((particle: FieldParticle | null) => void) | null = null;
  #raf = 0;
  #last = 0;
  #gestures: CameraGestures;
  #onResize: () => void;
  #pick = new THREE.Vector3();
  #queryFrame: CameraState | null = null;
  #queryFrameWeight = 0;

  constructor(host: HTMLElement, snapshot: UniverseSnapshot) {
    this.host = host;
    this.snapshot = snapshot;
    this.reducedMotion =
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const budget = deviceBudget();
    const canvas = document.createElement("canvas");
    canvas.className = "universe-canvas";
    canvas.setAttribute("aria-label", "Interactive Solana activity field");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      touchAction: "none",
    });
    host.append(canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, budget.dpr));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 700);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uIntensity: { value: 1 },
        uPull: { value: 0 },
        uFocus: { value: new THREE.Vector3() },
        uFocusAmt: { value: 0 },
        uFocusCat: { value: -1 },
      },
      vertexShader: FIELD_VERT,
      fragmentShader: FIELD_FRAG,
    });

    const visible = snapshot.particles.slice(0, budget.field);
    const positions = new Float32Array(visible.length * 3);
    const colors = new Float32Array(visible.length * 3);
    const sizes = new Float32Array(visible.length);
    const cats = new Float32Array(visible.length);
    visible.forEach((entity, i) => {
      positions.set(entity.position, i * 3);
      colors.set(parentColorForCategory(entity.category), i * 3);
      sizes[i] = 1.18 + entity.magnitudeBand * 3.15;
      cats[i] = CATEGORY_INDEX[entity.category] ?? 6;
    });
    this.basePositions = new Float32Array(positions);
    this.colors = colors;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aCat", new THREE.BufferAttribute(cats, 1));
    geometry.userData.entities = visible;
    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);

    const starfield = createStarfield();
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(starfield.positions, 3));
    const starSizes = new Float32Array(starfield.positions.length / 3);
    for (let i = 0; i < starSizes.length; i++) {
      starSizes[i] = 0.75 + (i % 11 === 0 ? 0.65 : 0);
    }
    sg.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));
    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uAlpha: { value: 0.62 },
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    this.stars = new THREE.Points(sg, starMat);
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
    this.resize();
    this.#last = performance.now();
    this.#raf = requestAnimationFrame(this.#frame);
    globalThis.__ABULLS_PICK = (x: number, y: number) => this.#handleTap(x, y);

  }

  getParticleCount() {
    return this.points.geometry.getAttribute("position").count;
  }

  getParentPositions() {
    return this.basePositions;
  }

  getParentColors() {
    return this.colors;
  }

  clearFocus() {
    this.focused = null;
    this.material.uniforms.uFocusAmt.value = 0;
    this.material.uniforms.uFocusCat.value = -1;
    this.onFocus?.(null);
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
  }

  resize() {
    const { width, height } = hostSize(this.host);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.material.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    const starMaterial = this.stars?.material as THREE.ShaderMaterial | undefined;
    if (starMaterial?.uniforms?.uPixelRatio) {
      starMaterial.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    }
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
    const rotY = this.points.rotation.y;
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    this.camera.updateMatrixWorld();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    let best = -1;
    let bestD = 72;
    const pos = this.basePositions;
    for (let i = 0; i < entities.length; i++) {
      const x0 = pos[i * 3];
      const y0 = pos[i * 3 + 1];
      const z0 = pos[i * 3 + 2];
      this.#pick.set(x0 * c - z0 * s, y0, x0 * s + z0 * c).project(this.camera);
      if (this.#pick.z > 1 || this.#pick.z < -1) continue;
      const sx = (this.#pick.x * 0.5 + 0.5) * w;
      const sy = (-this.#pick.y * 0.5 + 0.5) * h;
      const d = Math.hypot(sx - mx, sy - my);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best >= 0 ? entities[best] : null;
  }

  #frame = (now: number) => {
    if (this.destroyed) return;
    const elapsed = Math.min(0.1, (now - this.#last) / 1000);
    this.#last = now;
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

    this.material.uniforms.uIntensity.value = 1 - this.queryBlend * 0.96;
    this.material.uniforms.uPull.value = this.queryBlend;
    this.points.scale.setScalar(1 - this.queryBlend * 0.06);
    this.points.visible = this.queryBlend < 0.97;
    const starMaterial = this.stars.material as THREE.ShaderMaterial;
    starMaterial.uniforms.uAlpha.value = 0.54 + this.queryBlend * 0.32;

    const c = this.cameraState;
    const [tx, ty, tz] = c.target;
    const desiredX = tx + Math.sin(c.yaw) * Math.cos(c.pitch) * c.distance;
    const desiredY = ty + Math.sin(c.pitch) * c.distance;
    const desiredZ = tz + Math.cos(c.yaw) * Math.cos(c.pitch) * c.distance;
    const follow = this.#gestures.pinching
      ? 0.5
      : this.#gestures.orbiting
        ? 0.28
        : this.queryBlend > 0.02 && this.queryBlend < 0.9
          ? 0.18
          : 0.16;
    this.camera.position.x += (desiredX - this.camera.position.x) * follow;
    this.camera.position.y += (desiredY - this.camera.position.y) * follow;
    this.camera.position.z += (desiredZ - this.camera.position.z) * follow;
    this.camera.lookAt(tx, ty, tz);
    this.onAfterUpdate?.(elapsed, now);
    this.renderer.render(this.scene, this.camera);
    this.#raf = requestAnimationFrame(this.#frame);
  };

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.#raf);
    this.#gestures.destroy();
    globalThis.removeEventListener("resize", this.#onResize);
    globalThis.visualViewport?.removeEventListener("resize", this.#onResize);
    this.points.geometry.dispose();
    this.stars.geometry.dispose();
    this.material.dispose();
    (this.stars.material as THREE.Material).dispose();
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
