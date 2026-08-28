const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};

export function marketReplayEmptyCopy(bundle={}){
  const coverage=bundle?.coverage||{},observed=Number(bundle?.activity?.walletCount||0),status=String(coverage.status||'coverage-unknown');
  let detail='The Intelligence Store returned no indexed events for this token and time window. This must not be interpreted as proof that no on-chain activity occurred.';
  if(status==='coverage-unknown')detail+=' Wallet-history coverage is unknown for this request.';
  else if(status==='no-observed-wallets')detail+=' No indexed wallets were observed in the request, so wallet-history coverage cannot be summarized.';
  else if(observed>0)detail+=` Coverage metadata applies only to the ${observed} wallets already observed in this token window and does not establish complete market coverage.`;
  return Object.freeze({title:'NO INDEXED EVIDENCE RETURNED',detail,coverageStatus:status});
}

export function createMarketReplayEmptyState(bundle={}){
  const copy=marketReplayEmptyCopy(bundle),section=node('section','intelligence-context-block market-replay-empty-state');
  section.append(node('small','','INDEXED DATA STATE'),node('strong','',copy.title),node('p','notice',copy.detail));
  return section;
}
