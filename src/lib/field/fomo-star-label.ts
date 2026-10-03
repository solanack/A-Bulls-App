import { formatCompactUsd, PNL_FOMO_LABEL } from "./honest-pnl.ts";

export type FomoStarLabelInput={rank:number;handle:string;displayName:string;reportedPnlUsd:number|null};

/** Rank stays the provider rank. The figure is Fomo-reported and is never an A Bulls FIFO total. */
export function fomoStarLabel(item:FomoStarLabelInput){
  const tag=(item.handle||item.displayName).replace(/[^a-z0-9]/gi,"").slice(0,4).toUpperCase();
  const figure=formatCompactUsd(item.reportedPnlUsd).text;
  return`#${item.rank} ${figure}${tag?` ${tag}`:""} · ${PNL_FOMO_LABEL}`;
}
