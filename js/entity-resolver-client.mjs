export class EntityResolverClient {
  constructor({baseUrl=''}={}){this.baseUrl=String(baseUrl||'').replace(/\/$/,'');}
  async resolve(query,{signal}={}){
    const value=String(query||'').trim();
    if(!value)throw new TypeError('query is required');
    const response=await fetch(`${this.baseUrl}/api/intelligence/resolve?query=${encodeURIComponent(value)}`,{method:'GET',headers:{accept:'application/json'},signal,cache:'no-store'});
    const body=await response.json().catch(()=>({ok:false,error:`http_${response.status}`}));
    if(!response.ok)throw new Error(body.error||`http_${response.status}`);
    return body;
  }
}
