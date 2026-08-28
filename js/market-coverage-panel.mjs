const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
const metric=(label,value)=>{const card=node('article','intelligence-metric');card.append(node('small','',label),node('strong','',String(value)));return card;};

export function createMarketCoveragePanel(coverage={}){
  const section=node('section','intelligence-context-block'),header=node('div','intelligence-context-block__header'),copy=node('div'),bounded=coverage?.boundedSearch||{};
  copy.append(node('small','','INDEX COVERAGE · OBSERVED WALLETS'),node('strong','',String(coverage.status||'coverage-unknown').replaceAll('-',' ').toUpperCase()));
  header.append(copy);const metrics=node('div','intelligence-summary');metrics.append(metric('Observed wallets',coverage.observedWallets??0),metric('Coverage rows',coverage.coverageWallets??0),metric('Complete to genesis',coverage.completeHistoryWallets??0),metric('Verified bounded search',bounded.verifiedWindowWallets??0),metric('Unknown / partial',coverage.partialOrUnknownWallets??coverage.observedWallets??0));
  const statement=node('p','notice',coverage.statement||'Wallet-history coverage metadata is not available for this token window.'),boundedStatement=node('p','notice',bounded.statement||'No verified external bounded-search receipts currently cover the full selected window for wallets already observed here.'),caveat=node('p','intelligence-context-disclosure',`${coverage.caveat||'Coverage applies only to wallets already represented in the index and does not establish complete market coverage.'} ${bounded.caveat||'A verified bounded search is a separate interval-level receipt and does not mark a wallet complete to genesis.'}`);
  section.append(header,metrics,statement,boundedStatement,caveat);return section;
}
