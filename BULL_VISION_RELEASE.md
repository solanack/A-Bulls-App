# Bull Vision v8.6.0

Pages: **8.6.0**  
Worker required: **8.0.7**

## Current architecture

Bull Vision uses the existing Cloudflare Worker as the only Helius client. The existing `HELIUS_API_KEY` remains in Cloudflare Secrets and is never copied into Vercel, GitHub, or browser code.

The free Helius plan supports **Bull Vision Lite**:
- token-specific public wallet activity
- buy-like / sell-like / transfer separation
- observed entry / exit behavior signals
- hold-span, token in/out, net token flow, active days, and fees
- current token market context from DexScreener
- Wallet vs Wallet activity comparison
- LIFE signal handoff

The following remain gated until archival Helius access is available:
- exact historical P&L
- historical candle reconstruction
- historical What If P&L simulation
- cinematic candle replay / Trade Movie

When the Helius plan is upgraded, the existing Trickshot archival engine can be re-enabled without moving the Helius secret out of Cloudflare.
