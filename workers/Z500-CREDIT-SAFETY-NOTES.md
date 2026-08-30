# Z500 / Helius credit-safety patch

- Broad Pump program IDs removed from Wrangler config.
- `PUMP_STREAM_ENABLED=false` by default so deployment cannot silently restart broad webhook spend.
- Index source labeled `ansem-z500`.
- Active token limit remains 10.
- Internal Pump budget reduced to 1,000,000 credits/month; warning 60%; hard stop 80%.
- Ranking refresh reduced from every 5 minutes to every 15 minutes.
- Helius webhook management host corrected to `api-mainnet.helius-rpc.com`.

Important: Ansem's public Z500 page is currently Cloudflare-protected and the live index service can fail. No undocumented Ansem API endpoint is hard-coded. Keep the Helius webhook disabled until a stable Z500 machine-readable source is confirmed, then enable only the bounded selected accounts/pools rather than the Pump programs.

