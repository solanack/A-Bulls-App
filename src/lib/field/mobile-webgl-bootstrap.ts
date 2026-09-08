const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Seeker/i;
const GUARD_KEY = "__abullsMobileWebGLGuards";

export function shouldUseMobileWebGLGuards({
  userAgent = globalThis.navigator?.userAgent ?? "",
  coarsePointer = globalThis.matchMedia?.("(pointer: coarse)").matches ?? false,
  width = globalThis.innerWidth || 0,
}: {
  userAgent?: string;
  coarsePointer?: boolean;
  width?: number;
} = {}) {
  return MOBILE_UA.test(userAgent) || (coarsePointer && width > 0 && width <= 900);
}

function installCompositorGuard() {
  if (typeof document === "undefined") return;
  if (document.getElementById("abulls-mobile-webgl-css")) return;
  const style = document.createElement("style");
  style.id = "abulls-mobile-webgl-css";
  style.textContent = `
    @media (pointer: coarse) {
      .gz-menu-button,
      .gz-menu,
      .gz-search {
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }
    }
  `;
  document.head.append(style);
}

/**
 * Keep the mobile boot layer deliberately non-invasive.
 *
 * Earlier builds monkey-patched HTMLCanvasElement.getContext and Three.js
 * WebGLRenderer prototypes before the Field was loaded. On Chromium/Android
 * that can alter renderer lifecycle globally and makes a recovered/second
 * module execution unsafe. The native renderer now owns its own WebGL context,
 * resize policy, render loop and context-loss handling.
 *
 * This bootstrap only removes expensive backdrop compositing above the native
 * canvas and marks the active mobile profile for physical-device diagnostics.
 */
export function installMobileWebGLGuards() {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  if (!shouldUseMobileWebGLGuards()) return false;

  const root = globalThis as typeof globalThis & { [GUARD_KEY]?: boolean };
  if (root[GUARD_KEY]) return true;
  root[GUARD_KEY] = true;

  document.documentElement.dataset.abullsWebglProfile = "native-mobile";
  installCompositorGuard();
  return true;
}

installMobileWebGLGuards();
