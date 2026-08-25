export class EventMarketContextClient{
  constructor({baseUrl}={}){this.baseUrl=String(baseUrl||location.origin).replace(/\/$/,'');}
  async load({mint,timestamp,subjectWallet,signature,windowSeconds=1800}={}, {signal}={}){
    const response=await fetch(`${this.baseUrl}/api/intelligence/event-context`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mint,timestamp,subjectWallet,signature,windowSeconds}),signal});
    let body={};try{body=await response.json();}catch{}
    if(!response.ok||!body.ok)throw new Error(body.error||`event_context_${response.status}`);
    return body.context;
  }
}
