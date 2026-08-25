/* Legacy analytics compatibility shim.
 * vNext Intelligence owns all public-wallet analysis and replay. This file intentionally
 * performs no provider requests and exists only until Bull Invaders is extracted from the
 * legacy application host and index.html can be reduced to the canonical vNext shell.
 */
(function(global){
  'use strict';
  const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const isValidSolanaAddress=value=>BASE58_RE.test(String(value||'').trim());
  function openVNextIntelligence(address=''){
    const request={kind:'solana-address',destination:'resolve-address',query:String(address||'').trim(),readOnly:true,permitsSigning:false,permitsSubmission:false};
    global.dispatchEvent?.(new CustomEvent('abulls:universal-search',{detail:request}));
    return false;
  }
  global.initTrackData=()=>{};
  global.onTrackViewEnter=()=>{};
  global.onTrackViewLeave=()=>{};
  global.analyzeWallet=openVNextIntelligence;
  global.BBRWalletAnalytics={
    isValidSolanaAddress,
    restoreCachedWallet:()=>false,
    analyze:openVNextIntelligence,
    getState:()=>({retired:true,owner:'vnext-intelligence'})
  };
})(window);
