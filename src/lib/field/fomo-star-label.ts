import { formatCompactUsd, PNL_FOMO_LABEL } from "./honest-pnl.ts";

export type FomoStarLabelInput={rank:number;handle:string;displayName:string;reportedPnlUsd:number|null;closedTradeSampleSize?:number|null;completenessState?:string|null};

/** Rank stays the provider rank. Sample and completeness sit beside it. The figure is Fomo-reported. */
export function fomoStarLabel(item:FomoStarLabelInput){
  const tag=(item.handle||item.displayName).replace(/[^a-z0-9]/gi,"").slice(0,4).toUpperCase();
  const figure=formatCompactUsd(item.reportedPnlUsd).text;
  const sample=typeof item.closedTradeSampleSize==="number"&&Number.isFinite(item.closedTradeSampleSize)?Math.trunc(item.closedTradeSampleSize):null;
  const badge=item.completenessState==="complete"?"COMPLETE":item.completenessState==="partial"?"PARTIAL":item.completenessState==="insufficient"?"INSUFFICIENT":null;
  const sampleText=sample!=null&&badge?` · sample ${sample} · ${badge}`:"";
  return`#${item.rank} ${figure}${tag?` ${tag}`:""}${sampleText} · ${PNL_FOMO_LABEL}`;
}
