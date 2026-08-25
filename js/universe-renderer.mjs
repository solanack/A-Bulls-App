import { destinationForEntity } from './universe-contracts.mjs';
import { FrameBudgetController, initialUniverseQuality, qualityProfile } from './universe-quality.mjs';
import { HyperspaceTransition } from './universe-transition.mjs';

const COLORS = Object.freeze({
  swap: [0.42, 0.18, 1],
  transfer: [0.08, 0.82, 0.96],
  nft: [1, 0.34, 0.7],
  staking: [0.3, 1, 0.54],
  program: [1, 0.72, 0.2],
  failure: [1, 0.2, 0.2],
  unknown: [0.72, 0.72, 0.8]
});

function capabilitiesFromBrowser() {
  const canvas = document.createElement('canvas');
  return {
    webgl2: Boolean(canvas.getContext('webgl2')),
    webgpu: Boolean(globalThis.navigator?.gpu),
    deviceMemory: Number(globalThis.navigator?.deviceMemory ?? 0),
    saveData: Boolean(globalThis.navigator?.connection?.saveData),
    reducedMotion: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  };
}

function createFallback(host, snapshot, onSelect) {
  const list = document.createElement('div');
  list.className = 'universe-fallback';
  list.setAttribute('role', 'list');
  const title = document.createElement('p');
  title.textContent = snapshot.coverageStatement;
  list.append(title);
  for (const entity of snapshot.particles.slice(0, 250)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'listitem');
    button.textContent = `${entity.kind.toUpperCase()} · ${entity.category} · ${entity.verificationState}`;
    button.addEventListener('click', () => onSelect?.(entity, destinationForEntity(entity)));
    list.append(button);
  }
  host.append(list);
  return () => list.remove();
}

export class UniverseRenderer {
  #host;
  #snapshot;
  #three;
  #renderer;
  #scene;
  #camera;
  #points;
  #material;
  #raf = 0;
  #lastFrame = 0;
  #quality;
  #transition = new HyperspaceTransition();
  #onSelect;
  #removeFallback = null;
  #destroyed = false;
  #destinationReady = false;

  constructor({ host, snapshot, THREE, onSelect, capabilities = capabilitiesFromBrowser() }) {
    if (!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host = host;
    this.#snapshot = snapshot;
    this.#three = THREE;
    this.#onSelect = onSelect;
    const tier = initialUniverseQuality(capabilities);
    this.#quality = new FrameBudgetController(tier, capabilities);

    if (!THREE || qualityProfile(tier).renderer === 'list') {
      this.#removeFallback = createFallback(host, snapshot, onSelect);
      return;
    }
    this.#mountThree();
  }

  #mountThree() {
    const T = this.#three;
    const profile = this.#quality.profile;
    const canvas = document.createElement('canvas');
    canvas.className = 'universe-canvas';
    canvas.setAttribute('aria-label', 'Interactive sampled Solana activity universe');
    this.#host.append(canvas);

    this.#renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    this.#renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, profile.pixelRatio));
    this.#scene = new T.Scene();
    this.#camera = new T.PerspectiveCamera(55, 1, 0.1, 500);
    this.#camera.position.set(0, 0, 125);

    const geometry = this.#geometryForSnapshot(this.#snapshot);

    this.#material = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: T.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: this.#renderer.getPixelRatio() },
        uWarp: { value: 0 }
      },
      vertexShader: `
        attribute float aSize;
        uniform float uPixelRatio;
        uniform float uWarp;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec3 warped = position;
          float depthSign = position.z >= 0.0 ? 1.0 : -1.0;
          warped.z += depthSign * uWarp * (25.0 + abs(position.z) * 2.2);
          vec4 mvPosition = modelViewMatrix * vec4(warped, 1.0);
          gl_PointSize = aSize * uPixelRatio * (180.0 / max(10.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float d = length(p);
          float alpha = smoothstep(0.5, 0.06, d);
          gl_FragColor = vec4(vColor, alpha);
        }`
    });

    this.#points = new T.Points(geometry, this.#material);
    this.#scene.add(this.#points);
    this.#resize();
    globalThis.addEventListener('resize', this.#resize);
    canvas.addEventListener('click', this.#pick);
    this.#lastFrame = performance.now();
    this.#raf = requestAnimationFrame(this.#frame);
  }

  #geometryForSnapshot(snapshot) {
    const T = this.#three;
    const visible = snapshot.particles.slice(0, this.#quality.profile.particleLimit);
    const positions = new Float32Array(visible.length * 3);
    const colors = new Float32Array(visible.length * 3);
    const sizes = new Float32Array(visible.length);
    visible.forEach((entity, index) => {
      positions.set(entity.position, index * 3);
      colors.set(COLORS[entity.category] ?? COLORS.unknown, index * 3);
      sizes[index] = 1.4 + entity.magnitudeBand * 4;
    });
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new T.BufferAttribute(sizes, 1));
    geometry.userData.entities = visible;
    return geometry;
  }

  updateSnapshot(snapshot) {
    if (!snapshot?.particles) throw new TypeError('valid snapshot is required');
    this.#snapshot = snapshot;
    if (!this.#renderer) {
      this.#removeFallback?.();
      this.#removeFallback = createFallback(this.#host, snapshot, this.#onSelect);
      return;
    }
    const previous = this.#points.geometry;
    this.#points.geometry = this.#geometryForSnapshot(snapshot);
    previous.dispose();
  }

  #resize = () => {
    if (!this.#renderer) return;
    const width = Math.max(1, this.#host.clientWidth);
    const height = Math.max(1, this.#host.clientHeight);
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
  };

  #pick = (event) => {
    const T = this.#three;
    const rect = this.#renderer.domElement.getBoundingClientRect();
    const pointer = new T.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new T.Raycaster();
    raycaster.params.Points.threshold = 2.5;
    raycaster.setFromCamera(pointer, this.#camera);
    const hit = raycaster.intersectObject(this.#points, false)[0];
    if (!hit) return;
    const entity = this.#points.geometry.userData.entities[hit.index];
    if (!entity) return;
    this.#destinationReady = false;
    this.#transition.start(entity);
    this.#onSelect?.(entity, destinationForEntity(entity), this.#transition);
  };

  #frame = (now) => {
    if (this.#destroyed) return;
    const elapsed = now - this.#lastFrame;
    this.#lastFrame = now;
    const tierBefore = this.#quality.tier;
    const tierAfter = this.#quality.sample(elapsed);
    if (tierAfter !== tierBefore && tierAfter === 'fallback') {
      this.destroy();
      this.#removeFallback = createFallback(this.#host, this.#snapshot, this.#onSelect);
      return;
    }

    const transition = this.#transition.update(now, this.#destinationReady);
    const warp = transition.state === 'accelerating'
      ? Math.min(1, Math.max(0, (transition.elapsed - 350) / 900))
      : transition.state === 'whiteout' ? 1 : 0;
    this.#material.uniforms.uWarp.value = warp;
    this.#points.rotation.y += Math.min(0.003, elapsed * 0.00008);
    this.#renderer.render(this.#scene, this.#camera);
    this.#raf = requestAnimationFrame(this.#frame);
  };

  cancelTransition() {
    this.#destinationReady = false;
    return this.#transition.cancel(performance.now());
  }

  markDestinationReady() {
    this.#destinationReady = true;
    return this.#transition.update(performance.now(), true);
  }

  destroy() {
    this.#destroyed = true;
    cancelAnimationFrame(this.#raf);
    globalThis.removeEventListener('resize', this.#resize);
    this.#renderer?.domElement.removeEventListener('click', this.#pick);
    this.#points?.geometry.dispose();
    this.#material?.dispose();
    this.#renderer?.dispose();
    this.#renderer?.domElement.remove();
    this.#removeFallback?.();
  }
}
