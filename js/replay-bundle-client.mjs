const trim=value=>String(value==null?'':value).trim();

export class ReplayBundleClient {
  #baseUrl;
  #fetch;
  constructor({baseUrl='',fetchImpl=globalThis.fetch?.bind(globalThis)}={}){
    if(typeof fetchImpl!=='function')throw new TypeError('fetch implementation is required');
    this.#baseUrl=String(baseUrl||'').replace(/\/$/,'');
    this.#fetch=fetchImpl;
  }
  async load(input,{signal}={}){
    const response=await this.#fetch(`${this.#baseUrl}/api/intelligence/replay-bundle`,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal
    });
    let body={};
    try{body=await response.json();}catch{}
    if(!response.ok||body.ok!==true){
      const error=new Error(trim(body.error)||`replay_bundle_${response.status}`);
      error.status=response.status;throw error;
    }
    return body.bundle;
  }
}
