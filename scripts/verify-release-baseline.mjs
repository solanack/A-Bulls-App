import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/components/app-shell.tsx",import.meta.url),"utf8");
const fieldOS=readFileSync(new URL("../src/lib/field/field-os.ts",import.meta.url),"utf8");
const socialPolicy=readFileSync(new URL("../workers/socialfi-policy.mjs",import.meta.url),"utf8");
const universeVision=readFileSync(new URL("../UNIVERSE_VISION.md",import.meta.url),"utf8");
const tokenSystemWorker=readFileSync(new URL("../workers/intelligence-token-system.mjs",import.meta.url),"utf8");
const fomoWorker=readFileSync(new URL("../workers/intelligence-fomo-galaxy.mjs",import.meta.url),"utf8");
const ponsFamilyWorker=readFileSync(new URL("../workers/intelligence-ponsfamily-ranking.mjs",import.meta.url),"utf8");
const voiceServer=readFileSync(new URL("../src/lib/alien-voice.ts",import.meta.url),"utf8");

const required=['const MENU_ITEMS','className="gz-menu-button"','className="gz-search"','className="gz-bottom"','aria-label="Galaxy Zero modes"','id:"watchlist"','label:"WATCHLIST"'];
const forbidden=['className="field-shell__brand"','className="field-shell__galaxy-trigger"','className="field-shell__mode-tools"','className="field-shell__commands"','>A BULLS APP<','label:"TOP 50 TRADERS"','PONS TEACHING'];
const compactSource=source.replace(/\s+/g,"");const missing=required.filter(marker=>!compactSource.includes(marker.replace(/\s+/g,""))),restored=forbidden.filter(marker=>source.includes(marker));
if(missing.length||restored.length){console.error("RELEASE BLOCKED: the approved simplified Field interface has changed.");if(missing.length)console.error(`Missing: ${missing.join(", ")}`);if(restored.length)console.error(`Forbidden/restored: ${restored.join(", ")}`);process.exit(1);}

const walletExecutionLocks=["walletConnectionEnabled: false","walletSigningEnabled: false","tradingEnabled: false","tokenLaunchEnabled: false","nativeTokenEnabled: false","enabled: false",'adapter: "disabled"'];
const missingExecutionLocks=walletExecutionLocks.filter(marker=>!socialPolicy.includes(marker));if(missingExecutionLocks.length){console.error("RELEASE BLOCKED: wallet execution or native-token locks have changed.");console.error(`Missing locks: ${missingExecutionLocks.join(", ")}`);process.exit(1);}

const normalizedVision=universeVision.replace(/\s+/g," ");
const cosmologyLocks=["**token = PLANET** and **public wallet/holder/trader = STAR**","Missing holder/wallet evidence produces an honest empty sky.","Fomo Galaxy is a research lens, not a launch origin.","PonsFamily"];
const missingCosmologyLocks=cosmologyLocks.filter(marker=>!normalizedVision.includes(marker));if(missingCosmologyLocks.length){console.error("RELEASE BLOCKED: the approved Living Universe contract has changed.");console.error(`Missing: ${missingCosmologyLocks.join(" | ")}`);process.exit(1);}

if(/\bfetch\s*\(/.test(tokenSystemWorker)){console.error("RELEASE BLOCKED: token-planet entry must remain D1-only and cannot issue passive provider fetches.");process.exit(1);}
if(!tokenSystemWorker.includes("No provider lookup")||!tokenSystemWorker.includes("No wallet stars were invented")){console.error("RELEASE BLOCKED: token-system honest-empty disclosures are missing.");process.exit(1);}
const tokenSystemNavigation=fieldOS.match(/async enterTokenSystem[\s\S]*?\n\s*exitTokenSystem/)?.[0]??"";if(!tokenSystemNavigation||tokenSystemNavigation.includes("#narrateResolvedMarket")||tokenSystemNavigation.includes("resolvePublicIdentifier")){console.error("RELEASE BLOCKED: entering a token planet must not silently invoke the live QUERY/provider path.");process.exit(1);}if(!tokenSystemNavigation.includes("getTokenSystem")||!tokenSystemNavigation.includes("speakObservedParticle")){console.error("RELEASE BLOCKED: token-planet entry must use retained system evidence and local observed narration.");process.exit(1);}

const fomoLocks=["/leaderboard/all?limit=50","fomoapi.io","Fomo-reported","maximumTraders:50","maximumPositions:10","latestTrades:3","No copy-trade or execution action exists","reserveProviderCredits"];
const missingFomo=fomoLocks.filter(marker=>!fomoWorker.includes(marker));if(missingFomo.length){console.error("RELEASE BLOCKED: Fomo Galaxy provider/evidence boundaries changed.");console.error(`Missing: ${missingFomo.join(" | ")}`);process.exit(1);}
const ponsLocks=["maximumMembers:50","marketCapFloorUsd:75000","minimumHolders:750","volume-h24-usd-desc","verified PONS-origin","holder count above"];
const missingPons=ponsLocks.filter(marker=>!ponsFamilyWorker.includes(marker));if(missingPons.length){console.error("RELEASE BLOCKED: PonsFamily trend qualification changed.");console.error(`Missing: ${missingPons.join(" | ")}`);process.exit(1);}
if(!voiceServer.includes("ELEVENLABS_GREY_VOICE_ID")||!voiceServer.includes("ELEVENLABS_API_KEY")||!voiceServer.includes("grey-v2-natural-unknown")){console.error("RELEASE BLOCKED: Grey's server-side ElevenLabs voice profile is missing.");process.exit(1);}

console.log("Release baseline verified: simplified Field, Fomo trader research, PonsFamily trend filters, D1-only planet systems, Grey voice isolation, watchlists, and execution locks are active.");
