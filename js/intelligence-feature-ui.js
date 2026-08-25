/* Universal Intelligence feature workspace.
 * Progressive/index-aware UI that can be mounted into the Analytics/Intelligence panel.
 */
(function (global) {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtTime=v=>v?new Date(Number(v)*1000).toLocaleString():'—';
  const wallet=()=>($('walletInput')?.value||$('lifeWalletInput')?.value||'').trim();

  function card(title,value,sub=''){
    return `<article class="signal-card"><small>${esc(title)}</small><strong>${esc(value)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</article>`;
  }

  function ensureWorkspace(){
    const host=$('intelligencePanel');
    if(!host||$('universalIntelligenceWorkspace')) return $('universalIntelligenceWorkspace');
    const section=document.createElement('section');
    section.id='universalIntelligenceWorkspace';
    section.className='panel universal-intelligence-workspace';
    section.innerHTML=`
      <div class="section-title"><div><small>PUBLIC-CHAIN INTELLIGENCE</small><h2>Explore</h2></div><span class="status-pill">READ ONLY</span></div>
      <div class="analytics-switch intelligence-feature-tabs" role="tablist" aria-label="Intelligence features">
        <button class="tab active" type="button" data-intel-feature="dna">Wallet DNA</button>
        <button class="tab" type="button" data-intel-feature="time">Time Machine</button>
        <button class="tab" type="button" data-intel-feature="museum">Museum</button>
        <button class="tab" type="button" data-intel-feature="nft">NFT Memory</button>
        <button class="tab" type="button" data-intel-feature="constellation">Constellation</button>
        <button class="tab" type="button" data-intel-feature="radar">Chain Radar</button>
        <button class="tab" type="button" data-intel-feature="weather">Chain Weather</button>
      </div>
      <div class="analytics-update-row"><span id="intelFeatureStatus">Enter a public wallet and choose a feature.</span><button class="primary" id="intelFeatureRun" type="button">RUN</button></div>
      <div id="intelFeatureResult"><p class="notice">Intelligence uses observed public-chain data and shows partial coverage when history is incomplete.</p></div>
    `;
    const mesh=$('intelligenceMeshPanel');
    if(mesh?.parentNode===host) host.insertBefore(section,mesh.nextSibling); else host.appendChild(section);
    section.querySelectorAll('[data-intel-feature]').forEach(btn=>btn.addEventListener('click',()=>{
      section.querySelectorAll('[data-intel-feature]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',b===btn?'true':'false')});
      section.dataset.feature=btn.dataset.intelFeature;
    }));
    section.dataset.feature='dna';
    $('intelFeatureRun')?.addEventListener('click',run);
    return section;
  }

  function renderDna(dna){
    if(!dna||dna.state==='not-indexed') return '<p class="notice">No indexed observations yet. Start history indexing first.</p>';
    const d=dna.dimensions||{};
    const labels=(dna.labels||[]).map(x=>`<li><b>${esc(x.label)}</b> · ${Math.round(Number(x.score||0)*100)}%</li>`).join('');
    return `<div class="metric-grid">${card('Rotation',Math.round((d.rotation||0)*100)+'%')}${card('Breadth',Math.round((d.breadth||0)*100)+'%')}${card('Cadence',Math.round((d.cadence||0)*100)+'%')}${card('Churn',Math.round((d.churn||0)*100)+'%')}</div><ul>${labels}</ul><p class="notice">${esc(dna.disclaimer||'')}</p>`;
  }
  function renderTime(result){
    const rows=(result.events||[]).slice(-80);
    if(!rows.length) return '<p class="notice">No indexed timeline events yet.</p>';
    return `<div class="wallet-timeline">${rows.map(x=>`<article><small>${esc(fmtTime(x.block_time))}</small><b>${esc(x.event_class||'event')}</b><span>${esc(x.mint||x.counterparty||'Solana activity')}</span></article>`).join('')}</div>`;
  }
  function renderMuseum(m){
    if(!m) return '<p class="notice">No museum data yet.</p>';
    return `<div class="metric-grid">${card('First observed',fmtTime(m.firstEvent?.block_time))}${card('Latest observed',fmtTime(m.latestEvent?.block_time))}${card('Top mints',(m.topObservedMints||[]).length)}${card('Largest SOL move',m.largestObservedSolMovement?.sol_delta??'—')}</div><div class="holdings-list">${(m.topObservedMints||[]).map(x=>`<article><b>${esc(x.mint)}</b><span>${Number(x.event_count||0).toLocaleString()} observed events</span></article>`).join('')}</div>`;
  }
  function renderNft(memory){
    const rows=memory?.events||[];
    return rows.length?`<div class="wallet-timeline">${rows.slice(-100).map(x=>`<article><small>${esc(fmtTime(x.block_time))}</small><b>${esc(x.event_class)}</b><span>${esc(x.collection||x.asset_id)}</span></article>`).join('')}</div><p class="notice">${esc(memory.disclaimer||'')}</p>`:'<p class="notice">No indexed NFT observations yet.</p>';
  }
  function renderConstellation(result){
    const edges=result.edges||[];
    return edges.length?`<div class="holdings-list">${edges.map(x=>{const other=x.wallet_a===wallet()?x.wallet_b:x.wallet_a;return `<article><b>${esc(other)}</b><span>${Number(x.interaction_count||0).toLocaleString()} observed interactions</span></article>`}).join('')}</div><p class="notice">${esc(result.disclaimer||'')}</p>`:'<p class="notice">No observed relationship edges yet.</p>';
  }
  function renderRadar(result){
    const rows=result.anomalies||[];
    return rows.length?`<div class="holdings-list">${rows.map(x=>`<article><b>${esc(x.scope_value||x.scope_type)}</b><span>Severity ${esc(x.severity)} · ${esc(fmtTime(x.observed_at))}</span></article>`).join('')}</div><p class="notice">${esc(result.disclaimer||'')}</p>`:'<p class="notice">No current descriptive anomalies.</p>';
  }
  function renderWeather(result){
    const w=result.weather;
    if(!w) return '<p class="notice">Chain Weather is still collecting observations.</p>';
    return `<div class="metric-grid">${card('Regime',w.regime||'collecting')}${card('Activity',w.activity_score??'—')}${card('Rotation',w.rotation_score??'—')}${card('Convergence',w.convergence_score??'—')}</div><p class="notice">${esc(result.disclaimer||'')}</p>`;
  }

  async function run(){
    ensureWorkspace();
    const api=global.IntelligenceMesh;
    if(!api) return;
    const feature=$('universalIntelligenceWorkspace')?.dataset.feature||'dna';
    const w=wallet();
    const needsWallet=!['radar','weather'].includes(feature);
    if(needsWallet&&!api.validWallet(w)){ $('intelFeatureStatus').textContent='Enter a valid public Solana wallet first.'; return; }
    const button=$('intelFeatureRun'); if(button) button.disabled=true;
    $('intelFeatureStatus').textContent='Loading observed intelligence…';
    try{
      if(needsWallet) await api.ensureProgressiveIndex(w,{pageSize:25}).catch(()=>null);
      let result,html='';
      if(feature==='dna'){result=await api.walletDna(w);html=renderDna(result.dna)}
      else if(feature==='time'){result=await api.timeMachine(w);html=renderTime(result)}
      else if(feature==='museum'){result=await api.museum(w);html=renderMuseum(result.museum)}
      else if(feature==='nft'){result=await api.nftMemory(w);html=renderNft(result.memory)}
      else if(feature==='constellation'){result=await api.constellation(w);html=renderConstellation(result)}
      else if(feature==='radar'){result=await api.chainRadar();html=renderRadar(result)}
      else {result=await api.chainWeather();html=renderWeather(result)}
      $('intelFeatureResult').innerHTML=html;
      $('intelFeatureStatus').textContent=needsWallet?'Showing indexed public-chain observations.':'Showing current indexed aggregate observations.';
    }catch(error){$('intelFeatureResult').innerHTML=`<p class="notice">${esc(error?.message||'Intelligence is temporarily unavailable.')}</p>`;$('intelFeatureStatus').textContent='Could not load this feature.'}
    finally{if(button) button.disabled=false}
  }

  document.addEventListener('DOMContentLoaded',ensureWorkspace);
  global.IntelligenceFeatureUI=Object.freeze({ensureWorkspace,run});
})(window);
