import { clamp } from "./hash";

type GestureEventLike = Event & { scale: number };

type ZoomOrbitOptions = {
  min: number;
  max: number;
  getDistance: () => number;
  setDistance: (distance: number) => void;
  onOrbit: (dx: number, dy: number) => void;
  onTap?: (x: number, y: number) => void;
  enabled?: () => boolean;
};

export class CameraGestures {
  pinching = false;
  orbiting = false;
  #el: HTMLElement;
  #min: number;
  #max: number;
  #getDistance: () => number;
  #setDistance: (distance: number) => void;
  #onOrbit: (dx: number, dy: number) => void;
  #onTap: ((x: number, y: number) => void) | null;
  #enabled: () => boolean;
  #pointers = new Map<number, { x: number; y: number }>();
  #pinch0 = 1;
  #distance0 = 0;
  #lastX = 0;
  #lastY = 0;
  #startX = 0;
  #startY = 0;
  #dragged = false;
  #gestureDistance0 = 0;

  constructor(el: HTMLElement, options: ZoomOrbitOptions) {
    this.#el = el;
    this.#min = options.min;
    this.#max = options.max;
    this.#getDistance = options.getDistance;
    this.#setDistance = options.setDistance;
    this.#onOrbit = options.onOrbit;
    this.#onTap = options.onTap ?? null;
    this.#enabled = options.enabled ?? (() => true);

    el.addEventListener("pointerdown", this.#down, { passive: false });
    el.addEventListener("pointermove", this.#move, { passive: false });
    el.addEventListener("pointerup", this.#up);
    el.addEventListener("pointercancel", this.#up);
    el.addEventListener("wheel", this.#wheel, { passive: false });
    el.addEventListener("gesturestart", this.#gestureStart, { passive: false });
    el.addEventListener("gesturechange", this.#gestureChange, { passive: false });
    el.addEventListener("gestureend", this.#gestureEnd, { passive: false });
    globalThis.addEventListener("keydown", this.#key);
  }

  get interacting() {
    return this.pinching || this.orbiting;
  }

  #active() {
    return this.#enabled();
  }

  #zoomTo(next: number) {
    this.#setDistance(clamp(next, this.#min, this.#max));
  }

  #down = (e: PointerEvent) => {
    if (!this.#active()) return;
    if (e.pointerType === "touch") e.preventDefault();
    this.#pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      this.#el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events and some touch paths reject capture */
    }
    if (this.#pointers.size >= 2) {
      this.pinching = true;
      this.orbiting = false;
      this.#dragged = true;
      const pts = [...this.#pointers.values()];
      this.#pinch0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      this.#distance0 = this.#getDistance();
      return;
    }
    this.orbiting = false;
    this.#dragged = false;
    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#lastX = e.clientX;
    this.#lastY = e.clientY;
  };

  #move = (e: PointerEvent) => {
    if (!this.#pointers.has(e.pointerId)) return;
    this.#pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.#pointers.size >= 2) {
      const pts = [...this.#pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      this.pinching = true;
      this.orbiting = false;
      this.#dragged = true;
      this.#zoomTo(this.#distance0 * (this.#pinch0 / dist));
      return;
    }
    if (!this.#active()) return;
    if (!this.#dragged) {
      const travel = Math.hypot(e.clientX - this.#startX, e.clientY - this.#startY);
      if (travel < 9) return;
      this.#dragged = true;
      this.orbiting = true;
    }
    if (!this.orbiting) return;
    const dx = e.clientX - this.#lastX;
    const dy = e.clientY - this.#lastY;
    this.#lastX = e.clientX;
    this.#lastY = e.clientY;
    this.#onOrbit(dx, dy);
  };

  #up = (e: PointerEvent) => {
    this.#pointers.delete(e.pointerId);
    try {
      this.#el.releasePointerCapture(e.pointerId);
    } catch {
      /* already released or synthetic */
    }
    if (this.#pointers.size >= 2) {
      const pts = [...this.#pointers.values()];
      this.#pinch0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      this.#distance0 = this.#getDistance();
      return;
    }
    this.pinching = false;
    if (this.#pointers.size === 1) {
      const remaining = [...this.#pointers.values()][0];
      this.orbiting = true;
      this.#lastX = remaining.x;
      this.#lastY = remaining.y;
      return;
    }
    if (!this.#dragged && this.#active()) {
      this.#onTap?.(e.clientX, e.clientY);
    }
    this.orbiting = false;
    this.#dragged = false;
  };

  #wheel = (e: WheelEvent) => {
    if (!this.#active()) return;
    e.preventDefault();
    const pixel =
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 120 : e.deltaY;
    const intensity = e.ctrlKey || e.metaKey ? 0.012 : 0.00185;
    this.#zoomTo(this.#getDistance() * Math.exp(pixel * intensity));
  };

  #gestureStart = (e: Event) => {
    if (!this.#active()) return;
    e.preventDefault();
    this.#gestureDistance0 = this.#getDistance();
  };

  #gestureChange = (e: Event) => {
    if (!this.#active()) return;
    e.preventDefault();
    const scale = (e as GestureEventLike).scale || 1;
    this.#zoomTo(this.#gestureDistance0 / scale);
  };

  #gestureEnd = (e: Event) => {
    e.preventDefault();
  };

  #key = (e: KeyboardEvent) => {
    if (!this.#active()) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }
    if (e.code === "Equal" || e.code === "NumpadAdd") {
      e.preventDefault();
      this.#zoomTo(this.#getDistance() * 0.9);
    } else if (e.code === "Minus" || e.code === "NumpadSubtract") {
      e.preventDefault();
      this.#zoomTo(this.#getDistance() * 1.12);
    }
  };

  destroy() {
    this.#el.removeEventListener("pointerdown", this.#down);
    this.#el.removeEventListener("pointermove", this.#move);
    this.#el.removeEventListener("pointerup", this.#up);
    this.#el.removeEventListener("pointercancel", this.#up);
    this.#el.removeEventListener("wheel", this.#wheel);
    this.#el.removeEventListener("gesturestart", this.#gestureStart);
    this.#el.removeEventListener("gesturechange", this.#gestureChange);
    this.#el.removeEventListener("gestureend", this.#gestureEnd);
    globalThis.removeEventListener("keydown", this.#key);
    this.#pointers.clear();
    this.pinching = false;
    this.orbiting = false;
  }
}
