# A Bulls App — judge demo runbook

Target: 80 seconds. 20s FOMO, 20s AFTERBELL, 40s Replay + Cut. Record production only, after `/release.json` shows the release commit.

FOMO and AFTERBELL are equal rooms of one Field. Neither is "the demo room."

## Golden fixtures

Both are checked on every deploy by `scripts/check-golden-fixtures.mjs`; the release fails if either stops reopening.

| Room | Wallet | Token | Window (unix s) |
| --- | --- | --- | --- |
| FOMO (Robinhood Chain) | `0x1fce5a5d5b00c8a8cd80e8bdc608ebf8eb17cd7e` | `0xfe7e19cbce2f896c6c528bc355baf5a768291e18` | 1784685328 → 1788228875 |
| AFTERBELL (Solana) | `G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy` | CRCLx `XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1` | 1790107200 → 1790170200 |

Direct Replay links:

- FOMO: `https://www.abullsapp.com/?mode=replay&wallet=0x1fce5a5d5b00c8a8cd80e8bdc608ebf8eb17cd7e&mint=0xfe7e19cbce2f896c6c528bc355baf5a768291e18&chain=robinhood&from=1784685328&to=1788228875&room=fomo`
- AFTERBELL: `https://www.abullsapp.com/?mode=replay&wallet=G39wywquKbHK8F2wZZZFX3fcsyG91VCCbbr6WEVp5axy&mint=XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1&chain=solana&from=1790107200&to=1790170200&room=afterbell&symbol=CRCLx`

## Shot order

A first visit with no query string shows **TOUCH A STAR** and, after about 3.6 seconds, opens the CRCLx Afterbell demo Replay unless the visitor taps **I’LL EXPLORE**. That hint is stored in `localStorage` as `abulls:onboarded:v2`. Dismiss it before the FOMO shot, or Replay replaces the opening.

1. **0:00–0:20 — FOMO.** Open `abullsapp.com`, tap **FOMO** in the dock. Tap a trader star; the sheet shows the trader's name, rank chip, fact line, and latest print. Tap **WATCH** (subtitle "Save this trader"; it becomes **WATCHING**). Say: "FOMO is memecoin traders. Figures here are provider-reported, and labelled that way."
2. **0:20–0:40 — AFTERBELL.** Tap **AFTERBELL**. Tap a trader star, descend to a stock planet, tap **WATCH** (the subtitle is the token symbol). Open **MY SKY** to show both shelves, TRADERS and TOKENS. Say: "Same grammar, tokenized stocks. Every star is a real wallet seen on chain."
3. **0:40–1:20 — Replay + Cut.** Back in AFTERBELL, pick the CRCLx trader and tap **REPLAY**. The chart fills the frame; lime bolts are buys, rose bolts are sells, each one a real print. Tap a bolt: that print's evidence opens with the signature and an explorer link when one is retained. Tap **SHARE**, then **CUT**, choose **9:16 Social · 1080 × 1920**, render, and show the last frame: VERIFY plus the replay URL. Say: "No invented candles. If candles are missing, it says so. Every bolt opens its receipt, and every Cut ends on the link that reopens this exact Replay."

## Narration

"A Bulls App is a research sky for public traders. Two equal rooms: FOMO for memecoin traders, AFTERBELL for tokenized stocks. Pick a trader, watch them, replay the trade. Every bolt on the tape is a retained buy or sell. Open it for the receipt when one is attached. Cut it to video, and the last frame is the link that reopens the exact Replay. Research only. We never execute trades."

## Recording rules

- Verify the release SHA live before recording.
- Sound: room tone is near silent, each bolt ticks softly. Grey's observed-fact caption is on unless you turn it off in the Cut dialog. Keep the mute control visible.
- Never say "smart money", "alpha", or anything that implies returns or execution.
- Do not show empty or loading states unless you are explaining coverage honestly.
- No debugging panels, terminals, or GitHub in the final cut.
- Capture 1080p. Export H.264, 30 fps.
