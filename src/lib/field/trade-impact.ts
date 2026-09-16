export type ReplayImpactSide="buy"|"sell";

export type ReplayImpactEvent={
  id:string;
  side:ReplayImpactSide;
  timestamp:number;
  price:number|null;
};

export function latestReplayTradeImpact(events:readonly Record<string,unknown>[],currentTs:number):ReplayImpactEvent|null{
  let latest:ReplayImpactEvent|null=null;
  for(const event of events){
    const timestamp=Number(event.timestamp);
    if(!Number.isFinite(timestamp)||timestamp<=0||timestamp>currentTs)continue;
    const side=String(event.side??"").toLowerCase();
    if(side!=="buy"&&side!=="sell")continue;
    const rawPrice=Number(event.price),price=Number.isFinite(rawPrice)&&rawPrice>0?rawPrice:null;
    const id=String(event.signature??event.id??`${side}:${timestamp}`);
    if(!latest||timestamp>=latest.timestamp)latest={id,side,timestamp,price};
  }
  return latest;
}
