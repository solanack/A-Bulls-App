import { fetchStoryShare } from './trickster-share-client.mjs';
const node=(tag,className,text)=>{const item=document.createElement(tag);if(className)item.className=className;if(text!=null)item.textContent=text;return item;};
const short=value=>{const t=String(value||'');return t.length>24?`${t.slice(0,10)}…${t.slice(-9)}`:t;};
function renderError(root,message){root.replaceChildren(node('section','share-card'),node('h1','','Share unavailable'),node('p','',message));}
function claimText(claim={}){return String(claim.text||claim.label||claim.claim||claim.description||'Evidence-backed claim');}
function evidenceId(item={}){return String(item.id||item.evidenceId||item.signature||item.transactionId||'evidence');}
export async function mountTricksterShare({root=document.getElementById('shareRoot'),shareId=new URLSearchParams(location.search).get('id'),apiBase=location.origin}={}){
  if(!(root instanceof Element))throw new TypeError('share root is required');
  root.replaceChildren(node('div','share-loading','VERIFYING FROZEN MANIFEST…'));
  try{
    const share=await fetchStoryShare(shareId,{apiBase}),manifest=share.manifest||{},coverage=manifest.coverage||{},subject=manifest.subject||{};
    const header=node('header','share-header'),brand=node('a','share-brand','A BULLS APP');brand.href='/';const badge=node('span','share-badge',share.frozen?'FROZEN VERIFICATION MANIFEST':'VERIFICATION MANIFEST');header.append(brand,badge);
    const hero=node('section','share-hero');hero.append(node('small','','TRICKSTER · READ ONLY SHARE'),node('h1','',String(manifest.title||manifest.storyType||'Data Story').replaceAll('-',' ')),node('p','',coverage.statement||'Coverage statement unavailable.'));
    const meta=node('dl','share-meta');for(const [label,value] of [['Story ID',manifest.id],['Type',manifest.storyType],['Subject',subject.wallet||subject.signature||subject.mint||subject.address||subject.id||'public-chain evidence'],['Created',share.createdAt?new Date(share.createdAt*1000).toLocaleString():'unknown'],['Expires',share.expiresAt?new Date(share.expiresAt*1000).toLocaleDateString():'unknown']])meta.append(node('dt','',label),node('dd','',short(value)));
    hero.append(meta);
    const claims=node('section','share-card');claims.append(node('h2','','Claims'));const claimList=node('ol','share-list');for(const claim of (Array.isArray(manifest.claims)?manifest.claims:[])){const li=node('li','');li.append(node('strong','',claimText(claim)));if(Array.isArray(claim.evidenceIds)&&claim.evidenceIds.length)li.append(node('small','',`Evidence: ${claim.evidenceIds.map(short).join(', ')}`));claimList.append(li);}if(!claimList.children.length)claimList.append(node('li','', 'No narrative claims were included in this manifest.'));claims.append(claimList);
    const evidence=node('section','share-card');evidence.append(node('h2','','Evidence receipts'));const evidenceList=node('ul','share-list');for(const item of (Array.isArray(manifest.evidence)?manifest.evidence:[]))evidenceList.append(node('li','',short(evidenceId(item))));if(!evidenceList.children.length)evidenceList.append(node('li','','No evidence receipts were included.'));evidence.append(evidenceList);
    const disclosures=node('section','share-card');disclosures.append(node('h2','','Disclosures'));const disclosureList=node('ul','share-list');for(const item of share.disclosures)disclosureList.append(node('li','',String(item)));if(!disclosureList.children.length)disclosureList.append(node('li','','This page is a read-only representation of a frozen public-chain data story manifest.'));disclosures.append(disclosureList);
    const footer=node('footer','share-footer','Spatial presentation, simulation, estimates, and creator effects do not create evidence. Verify claims against the evidence receipts and stated coverage.');
    root.replaceChildren(header,hero,claims,evidence,disclosures,footer);return share;
  }catch(error){renderError(root,error?.message==='share_not_found'?'This share has expired or does not exist.':`This frozen manifest could not be loaded (${String(error?.message||error)}).`);return null;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountTricksterShare(),{once:true});else mountTricksterShare();
