export class WalletTokenIndexClient {
  constructor({baseUrl=''}={}){this.baseUrl=String(baseUrl||'').replace(/\/$/,'');}
  async load(wallet,{compareWallet='',limit=100,signal}={}){
    const value=String(wallet||'').trim();
    if(!value)throw new TypeError('wallet is required');
    const params=new URLSearchParams({wallet:value,limit:String(limit)});
    const compare=String(compareWallet||'').trim();
    if(compare)params.set('compareWallet',compare);
    const response=await fetch(`${this.baseUrl}/api/intelligence/wallet-tokens?${params}`,{method:'GET',headers:{accept:'application/json'},signal,cache:'no-store'});
    const body=await response.json().catch(()=>({ok:false,error:`http_${response.status}`}));
    if(!response.ok)throw new Error(body.error||`http_${response.status}`);
    return compare?body.comparison:body.index;
  }
}
