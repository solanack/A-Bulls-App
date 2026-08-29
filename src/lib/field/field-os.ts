import { ParticleFieldRenderer } from "./particle-field";
import { LivingAlienOrganism } from "./query-organism";
import { createSyntheticUniverse } from "./synthetic-universe";
import { deviceBudget } from "./hash";
import type {
  CameraState,
  FieldMode,
  FocusedParticle,
  IntelligenceResult,
  OrganismState,
} from "./types";
import { speakText, unlockSpeech, type VoiceHandle } from "./voice";
import { resolvePublicIdentifier } from "@/lib/intelligence";

export type FieldOSListener = (event: {
  mode: FieldMode;
  queryActive: boolean;
  organismState: OrganismState;
  result: IntelligenceResult | null;
  speaking: boolean;
  muted: boolean;
  focus: FocusedParticle | null;
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
  #cameraSnapshot: CameraState | null = null;
  #voice: VoiceHandle | null = null;
  #listener: FieldOSListener | null = null;
  #querySeq = 0;

  constructor(host: HTMLElement, listener: FieldOSListener) {
    this.host = host;
    this.#listener = listener;
    const budget = deviceBudget();
    const snapshot = createSyntheticUniverse(budget.field);
    this.field = new ParticleFieldRenderer(host, snapshot);
    this.field.onFocus = (particle) => {
      this.focus = particle
        ? { id: particle.id, kind: particle.kind, category: particle.category }
        : null;
      this.#emit();
    };
    this.muted = globalThis.localStorage?.getItem("abulls-mute") === "1";
    this.#emit();
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
    });
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
    this.mode = mode;
    this.#emit();
  }

  async enterQuery() {
    if (this.queryActive && this.organism) return;
    this.mode = "query";
    this.queryActive = true;
    this.organismState = "idle";
    this.focus = null;
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
        this.organism?.setSpeech(0.72);
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
    this.#stopVoice();
    this.organism?.destroy();
    this.field.destroy();
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
