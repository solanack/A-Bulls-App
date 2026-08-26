const trim=value=>String(value==null?'':value).trim();

export class MarketBackfillPlanClient{
  #baseUrl;
  constructor({baseUrl}={}){this.#baseUrl=trim(baseUrl).replace(/\/$/,'');}
  async load(input={}, {signal}={}){
    const response=await fetch(`${this.#baseUrl}/api/intelligence/market-backfill-plan`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal});
    let payload={};try{payload=await response.json();}catch{}
    if(!response.ok||payload?.ok!==true)throw Object.assign(new Error(payload?.error||`market_backfill_plan_${response.status}`),{status:response.status,payload});
    return payload.result;
  }
}
