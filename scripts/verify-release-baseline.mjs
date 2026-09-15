import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/components/app-shell.tsx",import.meta.url),"utf8");
const fieldOS=readFileSync(new URL("../src/lib/field/field-os.ts",import.meta.url),"utf8");
const socialPolicy=readFileSync(new URL("../workers/socialfi-policy.mjs",import.meta.url),"utf8");
const masterPlan=readFileSync(new URL("../MASTER_PLAN.md",import.meta.url),"utf8");
const agentRules=readFileSync(new URL("../AGENTS.md",import.meta.url),"utf8");
const universeVision=readFileSync(new URL("../UNIVERSE_VISION.md",import.meta.url),"utf8");
const tokenSystemWorker=readFileSync(new URL("../workers/intelligence-token-system.mjs",import.meta.url),"utf8");
const fomoWorker=readFileSync(new URL("../workers/intelligence-fomo-galaxy.mjs",import.meta.url),"utf8");
const fomoLiveWorker=readFileSync(new URL("../workers/intelligence-fomo-live.mjs",import.meta.url),"utf8");
const ponsFamilyWorker=readFileSync(new URL("../workers/intelligence-ponsfamily-ranking.mjs",import.meta.url),"utf8");
const ponsFamilyLiveWorker=readFileSync(new URL("../workers/intelligence-ponsfamily-live.mjs",import.meta.url),"utf8");
const ponsBlockscoutWorker=readFileSync(new URL("../workers/intelligence-pons-blockscout.mjs",import.meta.url),"utf8");
const voiceServer=readFileSync(new URL("../src/lib/alien-voice.ts",import.meta.url),"utf8");

const normalizedMaster=masterPlan.replace(/\s+/g," ");
const masterPlanLocks=[
  "A Bulls App is an **evidence-native Solana research operating system rendered as an explorable universe**.",
  "**Study the trader. Replay the trade. Verify the story.**",
  "**Universe → Galaxy → Planet → Holder Sky → Star → Holdings → Matched Rounds → Chosen Trade → Tools → Trickster Cut**",
  "## 14. INDEX — the permanent research archive",
  "## 19. Indexing architecture and coverage",
  "## 25. Build priority / roadmap",
  "Bind My Star",
  "Mediabunny",
  "DuckDB-Wasm",
  "Graphology",
  "Carbon",
  "Yellowstone gRPC"
];
const missingMasterPlanLocks=masterPlanLocks.filter(marker=>!normalizedMaster.includes(marker));
if(missingMasterPlanLocks.length){console.error("RELEASE BLOCKED: MASTER_PLAN.md lost locked product/architecture direction.");console.error(`Missing: ${missingMasterPlanLocks.join(" | ")}`);process.exit(1);}
if(!agentRules.includes("MASTER_PLAN.md")||!agentRules.includes("highest-level product and architecture contract")){console.error("RELEASE BLOCKED: AGENTS.md no longer routes AI contributors through MASTER_PLAN.md.");process.exit(1);}

const required=['const MENU_ITEMS','className="gz-menu-button"','className="gz-search"','className="gz-bottom"','aria-label="Galaxy Zero modes"','id:"watchlist"','label:"WATCHLIST"'];
const forbidden=['className="field-shell__brand"','className="field-shell__galaxy-trigger"','className="field-shell__mode-tools"','className="field-shell__commands"','>A BULLS APP<','label:"TOP 50 TRADERS"','PONS TEACHING'];
const compactSource=source.replace(/\s+/g,"");const missing=required.filter(marker=>!compactSource.includes(marker.replace(/\s+/g,""))),restored=forbidden.filter(marker=>source.includes(marker));
if(missing.length||restored.length){console.error("RELEASE BLOCKED: the approved simplified Field interface has changed.");if(missing.length)console.error(`Missing: ${missing.join(", ")}`);if(restored.length)console.error(`Forbidden/restored: ${restored.join(", ")}`);process.exit(1);}

const walletExecutionLocks=["walletConnectionEnabled: false","walletSigningEnabled: false","tradingEnabled: false","tokenLaunchEnabled: false","nativeTokenEnabled: false","enabled: false",'adapter: "disabled"'];
const missingExecutionLocks=walletExecutionLocks.filter(marker=>!socialPolicy.includes(marker));if(missingExecutionLocks.length){console.error("RELEASE BLOCKED: wallet execution or native-token locks have changed.");console.error(`Missing locks: ${missingExecutionLocks.join(", ")}`);process.exit(1);}

const normalizedVision=universeVision.replace(/\s+/g," ");
const cosmologyLocks=["**token = PLANET** and **public wallet/holder/trader = STAR**","Missing holder/wallet evidence produces an honest empty sky.","A research lens never rewrites launch origin.","PonsFamily","Research Thread","Index"];
const missingCosmologyLocks=cosmologyLocks.filter(marker=>!normalizedVision.includes(marker));if(missingCosmologyLocks.length){console.error("RELEASE BLOCKED: the approved Living Universe contract has changed.");console.error(`Missing: ${missingCosmologyLocks.join(" | ")}`);process.exit(1);}

if(/\bfetch\s*\(/.test(tokenSystemWorker)){console.error("RELEASE BLOCKED: token-planet entry must remain D1-only and cannot issue passive provider fetches.");process.exit(1);}
if(!tokenSystemWorker.includes("No provider lookup")||!tokenSystemWorker.includes("No wallet stars were invented")){console.error("RELEASE BLOCKED: token-system honest-empty disclosures are missing.");process.exit(1);}
const tokenSystemNavigation=fieldOS.match(/async enterTokenSystem[\s\S]*?\n\s*exitTokenSystem/)?.[0]??"";if(!tokenSystemNavigation||tokenSystemNavigation.includes("#narrateResolvedMarket")||tokenSystemNavigation.includes("resolvePublicIdentifier")){console.error("RELEASE BLOCKED: entering a token planet must not silently invoke the live QUERY/provider path.");process.exit(1);}if(!tokenSystemNavigation.includes("getTokenSystem")||!tokenSystemNavigation.includes("speakObservedParticle")){console.error("RELEASE BLOCKED: token-planet entry must use retained system evidence and local observed narration.");process.exit(1);}

const fomoLocks=["/leaderboard/all?limit=50","fomoapi.io","Fomo-reported","maximumTraders:50","maximumPositions:10","latestTrades:3","No copy-trade or execution action exists","reserveProviderCredits"];
const missingFomo=fomoLocks.filter(marker=>!fomoWorker.includes(marker));if(missingFomo.length){console.error("RELEASE BLOCKED: Fomo Galaxy provider/evidence boundaries changed.");console.error(`Missing: ${missingFomo.join(" | ")}`);process.exit(1);}
const fomoLiveLocks=["payloadArray(payload,'traders'","FOMOAPI_API_KEY","fomo_trader_positions","fomo_trader_trades","pageReadsProviderFree:true","requiresApiKey:true"];
const missingFomoLive=fomoLiveLocks.filter(marker=>!fomoLiveWorker.includes(marker));if(missingFomoLive.length){console.error("RELEASE BLOCKED: Fomo self-population/cache wiring changed.");console.error(`Missing: ${missingFomoLive.join(" | ")}`);process.exit(1);}
const ponsLocks=["maximumMembers:50","marketCapFloorUsd:75000","minimumHolders:750","volume-h24-usd-desc","verified PONS-origin","holder count above"];
const missingPons=ponsLocks.filter(marker=>!ponsFamilyWorker.includes(marker));if(missingPons.length){console.error("RELEASE BLOCKED: PonsFamily trend qualification changed.");console.error(`Missing: ${missingPons.join(" | ")}`);process.exit(1);}
const ponsLiveLocks=["token_holders_count","PONS_BLOCKSCOUT_DISCOVERY_PAGES","entryCycles:1","holderSource:'robinhood-blockscout'","marketCapFloorUsd:75000","minimumHolders:750","buildPonsBlockscoutTokenCountersUrl","buildPonsBlockscoutAddressLogsUrl"];
const ponsBlockscoutLocks=["robinhoodchain.blockscout.com","api.blockscout.com","PONS_BLOCKSCOUT_API_KEY","PONS_BLOCKSCOUT_CHAIN_ID=4663","proPreferredWhenConfigured:true","publicReadsD1Only:true"];
const missingPonsLive=ponsLiveLocks.filter(marker=>!ponsFamilyLiveWorker.includes(marker));const missingPonsBlockscout=ponsBlockscoutLocks.filter(marker=>!ponsBlockscoutWorker.includes(marker));if(missingPonsLive.length||missingPonsBlockscout.length){console.error("RELEASE BLOCKED: PonsFamily self-population/Blockscout evidence routing changed.");if(missingPonsLive.length)console.error(`Missing live wiring: ${missingPonsLive.join(" | ")}`);if(missingPonsBlockscout.length)console.error(`Missing Blockscout routing: ${missingPonsBlockscout.join(" | ")}`);process.exit(1);}
if(!voiceServer.includes("ELEVENLABS_GREY_VOICE_ID")||!voiceServer.includes("ELEVENLABS_API_KEY")||!voiceServer.includes("grey-v3-human-rachel")||!voiceServer.includes("21m00Tcm4TlvDq8ikWAM")||!voiceServer.includes("eleven_multilingual_v2")){console.error("RELEASE BLOCKED: Grey's human ElevenLabs voice profile is missing.");process.exit(1);}

console.log("Release baseline verified: MASTER_PLAN + AI handoff, simplified Field, live Fomo trader research, self-populating PonsFamily filters, D1-only planet systems, human Grey voice isolation, watchlists, and execution locks are active.");
