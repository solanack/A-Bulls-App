export type FomoStarLabelInput={rank:number;handle:string;displayName:string;reportedPnlUsd:number|null};

function compactUsd(value:number|null){
  if(value==null||!Number.isFinite(value))return"PNL N/A";
  const sign=value>=0?"+":"-",amount=Math.abs(value);
  if(amount>=1_000_000_000)return`${sign}$${(amount/1_000_000_000).toFixed(amount>=10_000_000_000?0:1)}B`;
  if(amount>=1_000_000)return`${sign}$${(amount/1_000_000).toFixed(amount>=10_000_000?0:1)}M`;
  if(amount>=1_000)return`${sign}$${(amount/1_000).toFixed(amount>=100_000?0:1)}K`;
  return`${sign}$${amount.toFixed(amount>=100?0:2)}`;
}

export function fomoStarLabel(item:FomoStarLabelInput){
  const tag=(item.handle||item.displayName).replace(/[^a-z0-9]/gi,"").slice(0,4).toUpperCase();
  return`#${item.rank} ${compactUsd(item.reportedPnlUsd)}${tag?` ${tag}`:""}`;
}
