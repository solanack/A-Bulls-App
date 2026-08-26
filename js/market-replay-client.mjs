const trim=value=>String(value==null?'':value).trim();

export class MarketReplayClient{
  #baseUrl;
  constructor({baseUrl}={}){this.#baseUrl=trim(baseUrl).replace(/\/$/,'');}
  async load(input={}, {signal}={}){
    const response=await fetch(`${this.#baseUrl}/api/intelligence/market-replay`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal});
    let payload={};try{payload=await response.json();}catch{}
    if(!response.ok||payload?.ok!==true)throw Object.assign(new Error(payload?.error||`market_replay_${response.status}`),{status:response.status,payload});
    return payload.bundle;
  }
}
