import { normalizeUniverseSnapshot } from './universe-contracts.mjs';

function endpoint(baseUrl, options = {}) {
  const url = new URL('/api/intelligence/universe-snapshot', baseUrl);
  url.searchParams.set('window', String(options.windowSeconds ?? 60));
  url.searchParams.set('limit', String(options.limit ?? 2500));
  return url;
}

export class UniverseClient {
  #baseUrl;
  #fetch;
  #intervalMs;
  #timer = 0;
  #abort = null;
  #running = false;
  #lastSnapshot = null;
  #listeners = new Set();

  constructor({ baseUrl, fetchImpl = globalThis.fetch, intervalMs = 5000 } = {}) {
    this.#baseUrl = new URL(baseUrl ?? globalThis.location?.origin ?? 'https://localhost/');
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
    this.#fetch = fetchImpl;
    this.#intervalMs = Math.max(2000, Number(intervalMs) || 5000);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener is required');
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(state, detail = {}) {
    const event = Object.freeze({ state, snapshot: this.#lastSnapshot, ...detail });
    for (const listener of this.#listeners) listener(event);
    return event;
  }

  async refresh(options = {}) {
    this.#abort?.abort();
    this.#abort = new AbortController();
    this.#emit(this.#lastSnapshot ? 'refreshing' : 'loading');
    try {
      const response = await this.#fetch(endpoint(this.#baseUrl, options), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: this.#abort.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const error = new Error(payload?.error || `universe_http_${response.status}`);
        error.status = response.status;
        throw error;
      }
      this.#lastSnapshot = normalizeUniverseSnapshot(payload.snapshot);
      return this.#emit('ready', {
        completeChainRepresentation: payload.completeChainRepresentation === true,
        readOnly: payload.readOnly === true
      });
    } catch (error) {
      if (error?.name === 'AbortError') return this.#emit('cancelled');
      return this.#emit(this.#lastSnapshot ? 'degraded' : 'error', { error });
    }
  }

  start(options = {}) {
    if (this.#running) return;
    this.#running = true;
    const tick = async () => {
      if (!this.#running) return;
      await this.refresh(options);
      if (this.#running) this.#timer = globalThis.setTimeout(tick, this.#intervalMs);
    };
    tick();
  }

  stop() {
    this.#running = false;
    globalThis.clearTimeout(this.#timer);
    this.#abort?.abort();
    this.#emit('stopped');
  }

  get lastSnapshot() {
    return this.#lastSnapshot;
  }
}
