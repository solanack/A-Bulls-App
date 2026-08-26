const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
const metric=(label,value)=>{const card=node('article','intelligence-metric');card.append(node('small','',label),node('strong','',String(value)));return card;};

export function createMarketCoveragePanel(coverage={}){
  const section=node('section','intelligence-context-block'),header=node('div','intelligence-context-block__header'),copy=node('div');
  copy.append(node('small','','INDEX COVERAGE · OBSERVED WALLETS'),node('strong','',String(coverage.status||'coverage-unknown').replaceAll('-',' ').toUpperCase()));
  header.append(copy);const metrics=node('div','intelligence-summary');metrics.append(metric('Observed wallets',coverage.observedWallets??0),metric('Coverage rows',coverage.coverageWallets??0),metric('Complete to genesis',coverage.completeHistoryWallets??0),metric('Unknown / partial',coverage.partialOrUnknownWallets??coverage.observedWallets??0));
  const statement=node('p','notice',coverage.statement||'Wallet-history coverage metadata is not available for this token window.'),caveat=node('p','intelligence-context-disclosure',coverage.caveat||'Coverage applies only to wallets already represented in the index and does not establish complete market coverage.');
  section.append(header,metrics,statement,caveat);return section;
}
