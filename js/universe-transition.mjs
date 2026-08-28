const STATES = Object.freeze(['idle','locking','accelerating','whiteout','revealing','complete','cancelled']);

export class HyperspaceTransition {
  #state = 'idle';
  #selected = null;
  #startedAt = null;
  #durations;

  constructor(durations = {}) {
    this.#durations = Object.freeze({
      locking: Math.max(0, Number(durations.locking ?? 350)),
      accelerating: Math.max(0, Number(durations.accelerating ?? 900)),
      whiteout: Math.max(0, Number(durations.whiteout ?? 120)),
      revealing: Math.max(0, Number(durations.revealing ?? 420))
    });
  }

  start(entity, now = performance.now()) {
    if (!entity?.id || !entity?.kind) throw new TypeError('selectable entity is required');
    this.#selected = Object.freeze({ id: String(entity.id), kind: String(entity.kind) });
    this.#startedAt = Number(now);
    this.#state = 'locking';
    return this.snapshot(now);
  }

  cancel(now = performance.now()) {
    this.#state = 'cancelled';
    return this.snapshot(now);
  }

  update(now = performance.now(), destinationReady = false) {
    if (this.#state === 'idle' || this.#state === 'cancelled' || this.#state === 'complete') {
      return this.snapshot(now);
    }
    const elapsed = Math.max(0, Number(now) - this.#startedAt);
    const lockingEnd = this.#durations.locking;
    const acceleratingEnd = lockingEnd + this.#durations.accelerating;
    const whiteoutEnd = acceleratingEnd + this.#durations.whiteout;
    const revealingEnd = whiteoutEnd + this.#durations.revealing;

    if (elapsed < lockingEnd) this.#state = 'locking';
    else if (elapsed < acceleratingEnd) this.#state = 'accelerating';
    else if (elapsed < whiteoutEnd || !destinationReady) this.#state = 'whiteout';
    else if (elapsed < revealingEnd) this.#state = 'revealing';
    else this.#state = 'complete';
    return this.snapshot(now);
  }

  snapshot(now = performance.now()) {
    return Object.freeze({
      state: this.#state,
      selected: this.#selected,
      elapsed: this.#startedAt == null ? 0 : Math.max(0, Number(now) - this.#startedAt),
      active: !['idle','complete','cancelled'].includes(this.#state)
    });
  }
}

export const HyperspaceStates = STATES;
