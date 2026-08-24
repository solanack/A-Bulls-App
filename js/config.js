const CONFIG = {
  appName: 'A Bulls App',
  // Helius key must NEVER be in browser code.
  // It belongs only as a server-side secret.
  rpcUrl: 'https://api.mainnet-beta.solana.com', // public fallback only
  ansemMint: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
  feedWallet: '95DemfJx5nHkuQmLyKhCjaJ5iZERHFfQH8Lu4UorEqWS',
  // Google ID tokens and NFT analytics are verified/proxied by the Worker.
  apiBase: 'https://black-bull-run-sol.ckdsigns1.workers.dev',
  // Set after the user-owned Trickshot/Bull Vision deployment is connected.
  // The paid Helius key remains server-side in that deployment and is never shipped to Pages.
  bullVisionBase: ''
};
