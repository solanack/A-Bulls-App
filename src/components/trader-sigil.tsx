import { traderSigil } from "@/lib/field/trader-sigil";

export function TraderSigil({ wallet, size = 34, className = "", title }: { wallet: string; size?: number; className?: string; title?: string }) {
  const sigil = traderSigil(wallet);
  return (
    <svg
      className={`trader-sigil ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 5 5"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {sigil.cells.map((on, index) => on ? <rect key={index} x={index % 5 + 0.08} y={Math.floor(index / 5) + 0.08} width=".84" height=".84" rx=".11" /> : null)}
    </svg>
  );
}
