const CONFIG = {
  appName: 'A Bulls App',
  // Helius key must NEVER be in browser code.
  // It remains only in the Cloudflare Worker secret store.
  rpcUrl: 'https://api.mainnet-beta.solana.com', // public fallback only
  ansemMint: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
  feedWallet: '95DemfJx5nHkuQmLyKhCjaJ5iZERHFfQH8Lu4UorEqWS',
  apiBase: 'https://black-bull-run-sol.ckdsigns1.workers.dev',
  // Bull Vision free-plan mode is served by the same Worker so the existing
  // HELIUS_API_KEY never needs to be copied into Vercel or browser code.
  bullVisionBase: 'https://black-bull-run-sol.ckdsigns1.workers.dev'
};
