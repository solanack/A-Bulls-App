import { useEffect, useRef } from "react";
import type { GalaxyId } from "@/lib/field/types";

const PALETTES: Record<GalaxyId, readonly string[]> = {
  "galaxy-zero": ["#c85cff", "#66d9ff", "#4dffc3"],
  "solana-core": ["#9945ff", "#14f195", "#7dd3fc"],
  "pump-fun": ["#65ff8f", "#d8ff65", "#ffffff"],
  pons: ["#ff62c7", "#a86dff", "#44f0de"],
};

type Star = { arm: number; radius: number; phase: number; size: number; speed: number; color: string };

export function FallbackParticleField({ galaxyId }: { galaxyId: GalaxyId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;
    let frame = 0;
    let width = 1;
    let height = 1;
    let pointer: { x: number; y: number; born: number } | null = null;
    const palette = PALETTES[galaxyId];
    const count = galaxyId === "galaxy-zero" ? 420 : 520;
    const stars: Star[] = Array.from({ length: count }, (_, index) => ({
      arm: index % (galaxyId === "galaxy-zero" ? 3 : 5),
      radius: ((index * 47) % 997) / 997,
      phase: ((index * 83) % 628) / 100,
      size: 0.65 + ((index * 29) % 17) / 10,
      speed: 0.000025 + ((index * 13) % 9) * 0.000004,
      color: palette[index % palette.length],
    }));
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const tap = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, born: performance.now() };
    };
    const draw = (now: number) => {
      context.fillStyle = "#030307";
      context.fillRect(0, 0, width, height);
      const centers = galaxyId === "galaxy-zero"
        ? [[width * 0.28, height * 0.42], [width * 0.7, height * 0.36], [width * 0.52, height * 0.68]]
        : [[width * 0.5, height * 0.51]];
      const maxRadius = Math.min(width, height) * (galaxyId === "galaxy-zero" ? 0.2 : 0.42);
      for (const star of stars) {
        const center = centers[star.arm % centers.length];
        const angle = star.phase + star.radius * 11 + now * star.speed;
        const flatten = galaxyId === "galaxy-zero" ? 0.48 : 0.62;
        const x = center[0] + Math.cos(angle) * star.radius * maxRadius;
        const y = center[1] + Math.sin(angle) * star.radius * maxRadius * flatten;
        const pulseAge = pointer ? now - pointer.born : 9999;
        const distance = pointer ? Math.hypot(x - pointer.x, y - pointer.y) : 9999;
        const lit = pulseAge < 900 && Math.abs(distance - pulseAge * 0.22) < 30;
        context.globalAlpha = lit ? 1 : 0.42 + star.radius * 0.48;
        context.fillStyle = lit ? "#ffffff" : star.color;
        context.shadowColor = lit ? star.color : "transparent";
        context.shadowBlur = lit ? 12 : 0;
        context.beginPath();
        context.arc(x, y, star.size * (lit ? 2.2 : 1), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      if (pointer && now - pointer.born > 900) pointer = null;
      frame = requestAnimationFrame(draw);
    };
    resize();
    canvas.addEventListener("pointerdown", tap);
    addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", tap);
      removeEventListener("resize", resize);
    };
  }, [galaxyId]);

  return <canvas ref={canvasRef} className="universe-canvas fallback-particle-field" aria-label="Interactive compatibility particle field" />;
}
