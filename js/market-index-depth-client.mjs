const trim=value=>String(value==null?'':value).trim();

export class MarketIndexDepthClient{
  #baseUrl;
  constructor({baseUrl}={}){this.#baseUrl=trim(baseUrl).replace(/\/$/,'');}
  async #post(path,input,{signal}={}){
    const response=await fetch(`${this.#baseUrl}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal});
    let payload={};try{payload=await response.json();}catch{}
    if(!response.ok)throw Object.assign(new Error(payload?.error||`market_index_depth_${response.status}`),{status:response.status,payload});
    return payload;
  }
  async plan(input={},options={}){const payload=await this.#post('/api/intelligence/market-backfill-plan',input,options);return payload.result;}
  async request(input={},options={}){return this.#post('/api/intelligence/market-backfill-request',input,options);}
  async status(jobIds=[],options={}){return this.#post('/api/intelligence/index-job-status',{jobIds},options);}
}
