const n=value=>Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();
const uniq=values=>[...new Set(values.map(text).filter(Boolean))];
const short=value=>{const v=text(value);return v.length>18?`${v.slice(0,8)}…${v.slice(-7)}`:v;};
const node=(tag,className,value)=>{const el=document.createElement(tag);if(className)el.className=className;if(value!=null)el.textContent=value;return el;};

export function buildLedgerRows(events=[],{wallets=[],limit=200}={}){
  const labels=new Map((wallets||[]).slice(0,2).map((wallet,index)=>[text(wallet),index===0?'Wallet A':'Wallet B']));
  return Object.freeze((events||[]).map((event,index)=>{
    const timestamp=n(event.timestamp)??(n(event.blockTime)!=null?n(event.blockTime)*1000:null);
    const amount=Math.abs(n(event.tokenDelta)??n(event.amount)??0);
    const sources=uniq([...(event.sources||[]),event.source]);
    return Object.freeze({
      id:text(event.id||event.signature||`${timestamp||0}-${index}`),signature:text(event.signature)||null,wallet:text(event.wallet)||null,
      walletLabel:labels.get(text(event.wallet))||null,token:text(event.token||event.mint)||null,side:text(event.side||event.kind||'event').toLowerCase(),
      timestamp,amount,price:n(event.price),feeLamports:n(event.feeLamports),verification:text(event.verification||event.state||'observed')||'observed',
      sources:Object.freeze(sources),sequence:index
    });
  }).filter(row=>row.timestamp!=null).sort((a,b)=>a.timestamp-b.timestamp||a.sequence-b.sequence).slice(0,Math.max(1,Math.min(500,Math.trunc(Number(limit)||200)))));
}

function amountText(value){const number=Number(value);if(!Number.isFinite(number))return'—';if(number>=1e9)return`${(number/1e9).toFixed(2)}B`;if(number>=1e6)return`${(number/1e6).toFixed(2)}M`;if(number>=1e3)return`${(number/1e3).toFixed(2)}K`;return number.toLocaleString(undefined,{maximumSignificantDigits:5});}
function sideLabel(side){return side==='buy'?'BUY':side==='sell'?'SELL':String(side||'EVENT').replaceAll('-',' ').toUpperCase();}

export function createEvidenceLedger({events=[],wallets=[],onFocus,limit=200}={}){
  const rows=buildLedgerRows(events,{wallets,limit}),section=node('section','intelligence-event-ledger'),header=node('div','intelligence-event-ledger__header');
  const copy=node('div');copy.append(node('strong','','EVIDENCE LEDGER'),node('p','',`${rows.length} indexed replay events · select any row to focus the chart.`));header.append(copy);section.append(header);
  if(!rows.length){section.append(node('p','notice','No indexed replay events are available in this selection.'));return section;}
  const list=node('div','intelligence-event-ledger__list');
  for(const row of rows){const button=node('button','intelligence-event-row');button.type='button';button.dataset.side=row.side;button.setAttribute('aria-label',`Focus ${row.walletLabel||'wallet'} ${sideLabel(row.side)} event at ${new Date(row.timestamp).toLocaleString()}`);
    const identity=node('div','intelligence-event-row__identity');identity.append(node('span','intelligence-event-row__shape',row.walletLabel==='Wallet B'?'◆':row.walletLabel==='Wallet A'?'●':'■'),node('strong','',row.walletLabel||'Observed entity'),node('code','',short(row.wallet||row.signature||row.id)));
    const action=node('div','intelligence-event-row__action');action.append(node('strong','',sideLabel(row.side)),node('span','',amountText(row.amount)));
    const time=node('div','intelligence-event-row__time');time.append(node('strong','',new Date(row.timestamp).toLocaleString()),node('span','',row.signature?short(row.signature):'No signature label'));
    const truth=node('div','intelligence-event-row__truth');truth.append(node('strong','',row.verification.toUpperCase()),node('span','',row.sources.length?row.sources.join(' · '):'Indexed store'));
    button.append(identity,action,time,truth);button.addEventListener('click',()=>onFocus?.(row.id||row.signature,row));list.append(button);
  }
  section.append(list,node('p','intelligence-context-disclosure','Ledger rows reflect indexed public-chain observations in this replay only. Wallet labels distinguish the two supplied addresses and do not imply identity, ownership, intent, or coordination.'));
  return section;
}
