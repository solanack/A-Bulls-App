import { ParticleFieldRenderer } from "./particle-field";
import { LivingAlienOrganism } from "./query-organism";
import { createGalaxySnapshot } from "./synthetic-universe";
import { deviceBudget } from "./hash";
import type {
  CameraState,
  FieldMode,
  FocusedParticle,
  GalaxyDefinition,
  GalaxyId,
  EvidenceRecord,
  IntelligenceResult,
  OrganismState,
  ReplayState,
  UniverseSnapshot,
} from "./types";
import { DEFAULT_GALAXY_ID, GALAXIES, getGalaxy, isPopulatedGalaxy } from "./galaxies";
import { speakText, unlockSpeech, type VoiceHandle } from "./voice";
import { resolvePublicIdentifier } from "@/lib/intelligence";
import { getIndexedGalaxySnapshot } from "@/lib/universe-data/service";
import {
  shouldReplacePrototypeField,
  sparseHydrateDisclosure,
  visibilityFloor,
} from "./hydrate-gate";
import type { UniverseDataStatus } from "@/lib/universe-data/contracts";
import {
  createReplayState,
  evidenceForParticle,
  stepReplayCursor,
  visibleReplayCount,
} from "./replay";
import { composeVolumeSky, countLiveStars, particleMint } from "./volume-sky";
import { isWatched, loadWatchlist, saveWatchlist, toggleWatchItem, type WatchItem } from "./watchlist";
import { speakObservedParticle } from "./observed-speech";
import { ponsTeachingSnapshot, PONS_TEACHING_TOKEN } from "@/lib/universe-data/pons-client";

export type FieldOSListener = (event: {
  mode: FieldMode;
  queryActive: boolean;
  organismState: OrganismState;
  result: IntelligenceResult | null;
  speaking: boolean;
  muted: boolean;
  focus: FocusedParticle | null;
  galaxy: GalaxyDefinition;
  galaxies: readonly GalaxyDefinition[];
  replay: ReplayState;
  evidence: EvidenceRecord | null;
  dataStatus: UniverseDataStatus;
  askPrefill: string;
  watchlist: readonly WatchItem[];
  liveStarCount: number;
}) => void;

export class FieldOS {
  host: HTMLElement;
  field: ParticleFieldRenderer;
  organism: LivingAlienOrganism | null = null;
  mode: FieldMode = "explore";
  queryActive = false;
  organismState: OrganismState = "idle";
  result: IntelligenceResult | null = null;
  muted = false;
  volume = 0.92;
  focus: FocusedParticle | null = null;
  galaxy: GalaxyDefinition = getGalaxy(DEFAULT_GALAXY_ID);
  replay: ReplayState;
  evidence: EvidenceRecord | null = null;
  dataStatus: UniverseDataStatus = {
    store: "memory-fallback",
    coverage: "degraded",
    circuitBreaker: null,
    disclosure: "Checking indexed universe coverage.",
  };
  askPrefill = "";
  watchlist: WatchItem[] = [];
  liveStarCount = 0;
  #cameraSnapshot: CameraState | null = null;
  #voice: VoiceHandle | null = null;
  #listener: FieldOSListener | null = null;
  #querySeq = 0;
  #snapshotSeq = 0;
  #prototype = createGalaxySnapshot(getGalaxy(DEFAULT_GALAXY_ID), deviceBudget().field);
  #live: UniverseSnapshot | null = null;
  #hydrateTimer = 0;
  #lastSpokenId: string | null = null;
  #pendingFocusMint: string | null = null;

  constructor(host: HTMLElement, listener: FieldOSListener) {
    this.host = host;
    this.#listener = listener;
    this.watchlist = loadWatchlist();
    const budget = deviceBudget();
    this.#prototype = createGalaxySnapshot(this.galaxy, budget.field);
    const initial = composeVolumeSky({
      prototype: this.#prototype,
      live: null,
      watchlist: this.watchlist,
      wallpaperLimit: budget.field,
    });
    this.field = new ParticleFieldRenderer(host, initial);
    this.field.setWatchlistMints(this.watchlist.map((item) => item.mint));
    this.replay = createReplayState(initial);
    this.liveStarCount = countLiveStars(initial);
    this.field.onFocus = (particle) => {
      this.focus = particle
        ? {
            id: particle.id,
            kind: particle.kind,
            cosmicKind: particle.cosmicKind,
            originGalaxyId: particle.originGalaxyId,
            category: particle.category,
            observedAt: particle.observedAt,
            verificationState: particle.verificationState,
            magnitudeBand: particle.magnitudeBand,
            eventId: particle.eventId,
            source: particle.source,
            slot: particle.slot,
            metadata: particle.metadata,
          }
        : null;
      this.evidence = particle ? evidenceForParticle(this.field.snapshot, particle) : null;
      const mint = particleMint(particle);
      if (particle && mint) this.askPrefill = mint;
      this.#emit();
      if (!particle) {
        this.#lastSpokenId = null;
        return;
      }
      if (!this.queryActive && particle.id !== this.#lastSpokenId) {
        this.#lastSpokenId = particle.id;
        unlockSpeech();
        this.narrateObserved(speakObservedParticle(particle, this.field.snapshot));
      }
    };
    this.field.onReplayTick = (cursor, playing) => {
      this.replay = {
        ...this.replay,
        cursor,
        status: playing ? "playing" : cursor >= 1 ? "complete" : "paused",
        visibleEventCount: visibleReplayCount(this.field.snapshot, cursor),
      };
      this.#emit();
    };
    this.muted = globalThis.localStorage?.getItem("abulls-mute") === "1";
    this.#emit();
    void this.#hydrateGalaxy(this.galaxy.id);
    this.#hydrateTimer = globalThis.setInterval(() => {
      void this.#hydrateGalaxy(this.galaxy.id);
    }, 60_000) as unknown as number;
  }

  #emit() {
    this.#listener?.({
      mode: this.mode,
      queryActive: this.queryActive,
      organismState: this.organismState,
      result: this.result,
      speaking: Boolean(this.#voice?.speaking),
      muted: this.muted,
      focus: this.focus,
      galaxy: this.galaxy,
      galaxies: GALAXIES,
      replay: this.replay,
      evidence: this.evidence,
      dataStatus: this.dataStatus,
      askPrefill: this.askPrefill,
      watchlist: this.watchlist,
      liveStarCount: this.liveStarCount,
    });
  }

  #applySky() {
    const composed = composeVolumeSky({
      prototype: this.#prototype,
      live: this.#live,
      watchlist: this.watchlist,
      wallpaperLimit: deviceBudget().field,
    });
    this.field.setSnapshot(composed);
    this.field.setWatchlistMints(this.watchlist.map((item) => item.mint));
    this.liveStarCount = countLiveStars(composed);
    this.replay = createReplayState(composed);
    const want = particleMint(this.focus) ?? this.#pendingFocusMint;
    if (want) {
      this.field.focusByMint(want);
      if (this.field.focused) this.#pendingFocusMint = null;
    }
  }

  focusMint(mint: string) {
    const trimmed = mint.trim();
    if (!trimmed) return;
    this.#pendingFocusMint = trimmed;
    this.askPrefill = trimmed;
    if (this.queryActive) {
      void this.returnToField().then(() => this.focusMint(trimmed));
      return;
    }
    this.mode = "explore";
    const teaching = trimmed.toLowerCase() === PONS_TEACHING_TOKEN.toLowerCase();
    if (teaching && this.galaxy.id !== "pons") {
      this.setGalaxy("pons");
      return;
    }
    this.field.focusByMint(trimmed);
    this.#emit();
  }

  toggleWatch() {
    const mint = particleMint(this.focus);
    if (!mint) return false;
    const symbol = typeof this.focus?.metadata?.symbol === "string" ? this.focus.metadata.symbol : null;
    const name = typeof this.focus?.metadata?.name === "string" ? this.focus.metadata.name : null;
    this.watchlist = saveWatchlist(
      toggleWatchItem(this.watchlist, {
        mint,
        galaxyId: this.galaxy.id,
        symbol,
        name,
      }),
    );
    this.#applySky();
    this.#emit();
    return isWatched(this.watchlist, mint);
  }

  isFocusedWatched() {
    return isWatched(this.watchlist, particleMint(this.focus));
  }

  setGalaxy(id: GalaxyId) {
    if (this.queryActive || !isPopulatedGalaxy(id)) return false;
    const nextGalaxy = getGalaxy(id);
    if (nextGalaxy.id === this.galaxy.id) {
      this.#emit();
      return true;
    }
    this.galaxy = nextGalaxy;
    this.#prototype = createGalaxySnapshot(nextGalaxy, deviceBudget().field);
    this.#live = null;
    this.focus = null;
    this.evidence = null;
    this.askPrefill = this.#pendingFocusMint ?? "";
    this.result = null;
    this.mode = "explore";
    this.#applySky();
    this.#emit();
    void this.#hydrateGalaxy(id);
    return true;
  }

  async #hydrateGalaxy(id: GalaxyId) {
    const seq = ++this.#snapshotSeq;
    void unregisterStaleServiceWorkers();
    const delivery = await getIndexedGalaxySnapshot({ data: { galaxyId: id } });
    if (seq !== this.#snapshotSeq || id !== this.galaxy.id) return;
    let indexedSnapshot = delivery.snapshot;
    if (id === "pons" && (!indexedSnapshot || indexedSnapshot.particles.length === 0)) {
      indexedSnapshot = ponsTeachingSnapshot();
    }
    const indexedParticleCount = indexedSnapshot?.particles.length ?? 0;
    const budgetField = deviceBudget().field;
    this.#live = indexedSnapshot && indexedParticleCount > 0 ? indexedSnapshot : id === "pons" ? ponsTeachingSnapshot() : null;
    if (shouldReplacePrototypeField(indexedSnapshot, budgetField) || this.#live) {
      this.dataStatus = {
        ...delivery.status,
        disclosure: `${delivery.status.disclosure} Volume sky ranks 5-minute heat, cap 120. Helius membership stays 10.`,
      };
    } else {
      const floor = visibilityFloor(budgetField);
      const emptyNote =
        "The indexed snapshot contains no particles, so the visible prototype field remains active.";
      this.dataStatus = {
        ...delivery.status,
        store: "memory-fallback",
        coverage: indexedParticleCount > 0 ? "stale" : delivery.status.coverage,
        disclosure:
          indexedParticleCount > 0
            ? sparseHydrateDisclosure(delivery.status.disclosure, indexedParticleCount, floor)
            : `${delivery.status.disclosure} ${emptyNote}`.trim(),
      };
    }
    this.#applySky();
    this.#emit();
  }

  setMode(mode: FieldMode) {
    if (mode === "query") {
      if (this.queryActive) {
        this.#emit();
        return;
      }
      this.mode = "query";
      this.#emit();
      return;
    }
    if (this.queryActive) void this.returnToField();
    if (mode === "replay") {
      this.enterReplay();
      return;
    }
    if (mode === "evidence") {
      this.field.setReplay({ active: true, playing: false, cursor: this.replay.cursor });
      this.replay = { ...this.replay, active: true, status: "paused" };
      this.mode = "evidence";
      this.#emit();
      return;
    }
    if (this.replay.active) {
      this.field.setReplay({ active: false, cursor: 1, playing: false });
      this.replay = { ...this.replay, active: false, status: "paused", cursor: 1 };
    }
    this.mode = mode;
    this.#emit();
  }

  enterReplay() {
    if (this.queryActive) return;
    const cursor = this.replay.active ? this.replay.cursor : 0;
    this.mode = "replay";
    this.replay = {
      ...this.replay,
      active: true,
      status: "paused",
      cursor,
      visibleEventCount: visibleReplayCount(this.field.snapshot, cursor),
    };
    this.field.setReplay({ active: true, cursor, playing: false });
    this.field.clearFocus();
    this.#emit();
  }

  toggleReplay() {
    if (!this.replay.active) this.enterReplay();
    const restart = this.replay.cursor >= 1;
    const cursor = restart ? 0 : this.replay.cursor;
    const playing = this.replay.status !== "playing";
    this.replay = {
      ...this.replay,
      active: true,
      cursor,
      status: playing ? "playing" : "paused",
      visibleEventCount: visibleReplayCount(this.field.snapshot, cursor),
    };
    this.field.setReplay({ active: true, cursor, playing });
    this.#emit();
  }

  seekReplay(cursor: number) {
    const safeCursor = Math.min(1, Math.max(0, cursor));
    this.replay = {
      ...this.replay,
      active: true,
      status: "paused",
      cursor: safeCursor,
      visibleEventCount: visibleReplayCount(this.field.snapshot, safeCursor),
    };
    this.field.setReplay({ active: true, cursor: safeCursor, playing: false });
    this.field.clearFocus();
    this.#emit();
  }

  stepReplay(direction: -1 | 1) {
    this.seekReplay(stepReplayCursor(this.field.snapshot, this.replay.cursor, direction));
  }

  async enterQuery() {
    if (this.queryActive && this.organism) return;
    this.mode = "query";
    this.queryActive = true;
    this.organismState = "idle";
    this.focus = null;
    this.evidence = null;
    this.field.setReplay({ active: false, cursor: 1, playing: false });
    this.#cameraSnapshot = this.field.snapshotCamera();
    this.field.setQueryActive(true);
    this.organism?.destroy();
    this.organism = new LivingAlienOrganism(
      this.field,
      this.field.getParentPositions(),
      this.field.getParentColors(),
      this.field.getParticleCount(),
    );
    this.organism.setState("idle");
    this.#emit();
  }

  async returnToField() {
    this.#stopVoice();
    this.organismState = "return";
    this.#emit();
    this.organism?.setState("return");
    await this.organism?.dissolve();
    this.organism?.destroy();
    this.organism = null;
    this.field.setQueryActive(false);
    if (this.#cameraSnapshot) this.field.restoreCamera(this.#cameraSnapshot);
    this.queryActive = false;
    this.organismState = "idle";
    this.mode = "explore";
    this.result = null;
    this.#emit();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    globalThis.localStorage?.setItem("abulls-mute", muted ? "1" : "0");
    if (muted) this.#stopVoice();
    this.#emit();
  }

  narrateObserved(text: string) {
    this.#stopVoice();
    this.#voice = speakText(text, {
      muted: this.muted,
      volume: this.volume,
      onEnd: () => {
        this.#voice = null;
        this.#emit();
      },
    });
    this.#emit();
  }

  async submitQuery(value: string) {
    const query = value.trim();
    if (!query) return;
    unlockSpeech();
    this.#stopVoice();
    if (!this.queryActive || !this.organism) await this.enterQuery();
    const seq = ++this.#querySeq;
    this.organismState = "listening";
    this.organism?.setState("listening");
    this.#emit();
    await wait(280);
    if (seq !== this.#querySeq) return;
    this.organismState = "analyzing";
    this.organism?.setState("analyzing");
    this.#emit();
    const result = await resolvePublicIdentifier({ data: { query } });
    if (seq !== this.#querySeq) return;
    this.result = result;
    this.organismState = "speaking";
    this.organism?.setState("speaking");
    this.#emit();
    this.#voice = speakText(result.spokenText, {
      muted: this.muted,
      volume: this.volume,
      onStart: () => {
        this.#pulseSpeech(true);
      },
      onBoundary: () => {
        this.organism?.setSpeech(0.34);
      },
      onEnergy: (energy) => {
        this.organism?.setSpeech(energy);
      },
      onEnd: () => {
        this.#pulseSpeech(false);
        this.organism?.setSpeech(0);
        if (seq !== this.#querySeq) return;
        this.organismState = "complete";
        this.organism?.setState("complete");
        this.#voice = null;
        this.#emit();
      },
    });
    if (this.muted) {
      this.organismState = "complete";
      this.organism?.setState("complete");
      this.#emit();
    }
  }

  #pulseSpeech(on: boolean) {
    this.organism?.setSpeech(on ? 0.52 : 0);
  }

  #stopVoice() {
    this.#voice?.stop();
    this.#voice = null;
    this.#pulseSpeech(false);
  }

  destroy() {
    this.#querySeq++;
    if (this.#hydrateTimer) globalThis.clearInterval(this.#hydrateTimer);
    this.#stopVoice();
    this.organism?.destroy();
    this.field.destroy();
  }
}

async function unregisterStaleServiceWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Best-effort cache bust for leftover PWA service workers.
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

