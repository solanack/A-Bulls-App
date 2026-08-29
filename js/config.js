const CONFIG = {
  appName: 'A Bulls App',
  // Public fallback only. Provider secrets remain server-side in the Worker.
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  apiBase: 'https://black-bull-run-sol.ckdsigns1.workers.dev'
};

globalThis.BBRConfig = CONFIG;
globalThis.BBR_EXPERIENCE_FLAGS = Object.freeze({
  nextProductShellEnabled: true,
  universeEnabled: true,
  tricksterStudioEnabled: true
});
