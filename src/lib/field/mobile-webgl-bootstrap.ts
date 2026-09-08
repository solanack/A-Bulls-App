import { WebGLRenderer, type Camera, type Scene } from "three";

export type MobileWebGLSignals = {
  userAgent?: string;
  coarsePointer?: boolean;
  width?: number;
  height?: number;
};

const STYLE_ID = "abulls-mobile-webgl-guard";
const GUARD_KEY = "__ABULLS_MOBILE_WEBGL_GUARDS__";
const MAX_RENDER_HZ = 60;

type GuardedGlobal = typeof globalThis & {
  [GUARD_KEY]?: boolean;
};

type RendererLike = {
  getPixelRatio(): number;
  setSize(width: number, height: number, updateStyle?: boolean): RendererLike;
  render(scene: Scene, camera: Camera): void;
};

export function shouldUseMobileWebGLGuards(signals: MobileWebGLSignals = {}) {
  const userAgent = String(signals.userAgent ?? "");
  const width = Number.isFinite(signals.width) ? Number(signals.width) : 1024;
  const height = Number.isFinite(signals.height) ? Number(signals.height) : 768;
  const minSide = Math.min(width, height);
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Seeker/i.test(userAgent)
    || Boolean(signals.coarsePointer && minSide <= 900);
}

function installCompositorGuard() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
@media (hover: none) and (pointer: coarse) {
  .gz-menu-button,
  .gz-menu,
  .gz-search {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
}`;
  document.head.append(style);
}

function installContextPreferenceGuard() {
  const Canvas = globalThis.HTMLCanvasElement;
  if (!Canvas) return;
  const prototype = Canvas.prototype as unknown as {
    getContext: (type: string, attributes?: unknown) => unknown;
  };
  const originalGetContext = prototype.getContext;
  if ((originalGetContext as { __abullsWrapped?: boolean }).__abullsWrapped) return;

  const guardedGetContext = function (this: HTMLCanvasElement, type: string, attributes?: unknown) {
    const normalized = String(type).toLowerCase();
    if (normalized === "webgl2" || normalized === "webgl" || normalized === "experimental-webgl") {
      const safeAttributes = attributes && typeof attributes === "object"
        ? { ...(attributes as Record<string, unknown>), powerPreference: "default" }
        : { powerPreference: "default" };
      return originalGetContext.call(this, type, safeAttributes);
    }
    return originalGetContext.call(this, type, attributes);
  };
  (guardedGetContext as { __abullsWrapped?: boolean }).__abullsWrapped = true;
  prototype.getContext = guardedGetContext;
}

function installRendererGuards() {
  const prototype = WebGLRenderer.prototype as unknown as RendererLike;
  const originalSetSize = prototype.setSize;
  const originalRender = prototype.render;
  const sizeState = new WeakMap<object, { width: number; height: number; dpr: number; updateStyle: boolean }>();
  const renderState = new WeakMap<object, number>();

  if (!(originalSetSize as { __abullsWrapped?: boolean }).__abullsWrapped) {
    const guardedSetSize = function (this: RendererLike, width: number, height: number, updateStyle = true) {
      const safeWidth = Math.max(1, Math.round(Number(width) || 1));
      const safeHeight = Math.max(1, Math.round(Number(height) || 1));
      const dpr = Math.max(0.1, Number(this.getPixelRatio?.() || 1));
      const previous = sizeState.get(this as object);
      if (
        previous
        && previous.width === safeWidth
        && previous.height === safeHeight
        && previous.dpr === dpr
        && previous.updateStyle === Boolean(updateStyle)
      ) {
        return this;
      }
      sizeState.set(this as object, {
        width: safeWidth,
        height: safeHeight,
        dpr,
        updateStyle: Boolean(updateStyle),
      });
      return originalSetSize.call(this, safeWidth, safeHeight, updateStyle);
    };
    (guardedSetSize as { __abullsWrapped?: boolean }).__abullsWrapped = true;
    prototype.setSize = guardedSetSize;
  }

  if (!(originalRender as { __abullsWrapped?: boolean }).__abullsWrapped) {
    const guardedRender = function (this: RendererLike, scene: Scene, camera: Camera) {
      const now = globalThis.performance?.now?.() ?? Date.now();
      const previous = renderState.get(this as object) ?? -Infinity;
      // The Seeker panel can refresh at 120 Hz. Keep animation state responsive while
      // avoiding two full GPU submissions per 60 Hz visual frame on integrated Mali.
      if (now - previous < (1000 / MAX_RENDER_HZ) * 0.8) return;
      renderState.set(this as object, now);
      originalRender.call(this, scene, camera);
    };
    (guardedRender as { __abullsWrapped?: boolean }).__abullsWrapped = true;
    prototype.render = guardedRender;
  }
}

export function installMobileWebGLGuards() {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  const root = globalThis as GuardedGlobal;
  if (root[GUARD_KEY]) return true;
  const coarsePointer = globalThis.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (!shouldUseMobileWebGLGuards({
    userAgent: navigator.userAgent,
    coarsePointer,
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  })) return false;

  root[GUARD_KEY] = true;
  document.documentElement.dataset.abullsWebglProfile = "mobile-safe";
  installContextPreferenceGuard();
  installRendererGuards();
  installCompositorGuard();
  return true;
}

installMobileWebGLGuards();
