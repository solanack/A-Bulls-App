import { createSyntheticUniverse } from './universe-synthetic-data.mjs';
import { UniverseClient } from './universe-client.mjs';
import { UniverseRenderer } from './universe-renderer.mjs';
import { buildFieldInvestigationHub, relationsFromSnapshot } from './field-investigation-hub.mjs';
import { FieldInvestigationTrail } from './field-investigation-trail.mjs';

const FILTERS = Object.freeze(['all', 'swap', 'transfer', 'nft', 'staking', 'program', 'failure']);
const MODE_FILTER = Object.freeze({
  explore: 'all',
  intelligence: 'all',
  replay: 'all',
  compare: 'all',
  'what-if': 'all',
  sequences: 'swap',
  trickster: 'all',
  evidence: 'all',
  games: 'all'
});

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text != null) item.textContent = text;
  return item;
}

function isPrototypeLabel(value) {
  return /synthetic|prototype|performance testing|testing/i.test(String(value || ''));
}

export class UniverseExperience {
  #host; #root; #stage; #renderer; #client; #snapshot; #filter = 'all'; #mode = 'explore';
  #unsubscribe; #onDestinationRequest; #onFieldMode; #onSearch; #onTrailBack; #onTrailForward;
  #activeHub = null; #trail = new FieldInvestigationTrail({ limit: 16 });

  constructor({ host, apiBase, THREE, onDestinationRequest, client, syntheticCount = 2500 }) {
    if (!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host = host;
    this.#onDestinationRequest = onDestinationRequest;
    this.#client = client ?? new UniverseClient({ baseUrl: apiBase });
    this.#snapshot = createSyntheticUniverse({ count: syntheticCount });
    this.#root = node('section', 'universe-shell');
    this.#root.setAttribute('aria-label', 'Live Solana data field');
    this.#root.dataset.fieldMode = 'explore';
    this.#stage = node('div', 'universe-stage');
    const whiteout = node('div', 'universe-whiteout');
    this.#root.append(this.#stage, whiteout);
    this.#host.replaceChildren(this.#root);
    this.#renderer = new UniverseRenderer({
      host: this.#stage,
      snapshot: this.#snapshot,
      THREE,
      onSelect: (entity, destination) => this.#select(entity, destination)
    });
    this.#markState('prototype');
    this.#unsubscribe = this.#client.subscribe((event) => this.#handleClient(event));
    this.#onFieldMode = (event) => this.setMode(event?.detail?.mode);
    this.#onSearch = (event) => {
      const matched = this.#renderer.focusRequest(event?.detail || {});
      if (matched?.entityId) {
        const entity = this.#snapshot.particles.find((item) => item.id === matched.entityId);
        if (entity) this.#openInvestigationHub(entity);
      }
    };
    this.#onTrailBack = () => this.#navigateTrail('back');
    this.#onTrailForward = () => this.#navigateTrail('forward');
    globalThis.addEventListener('abulls:field-mode', this.#onFieldMode);
    globalThis.addEventListener('abulls:universal-search', this.#onSearch);
    globalThis.addEventListener('abulls:field-investigation-back', this.#onTrailBack);
    globalThis.addEventListener('abulls:field-investigation-forward', this.#onTrailForward);
  }

  #markState(state) {
    const live = state === 'ready' ? 'live' : state === 'degraded' ? 'partial' : 'sampled';
    this.#root.dataset.fieldState = live;
    this.#root.dataset.fieldMode = this.#mode;
    globalThis.dispatchEvent(new CustomEvent('abulls:field-state', { detail: { state: live, mode: this.#mode } }));
  }

  #filteredSnapshot() {
    if (this.#filter === 'all') return this.#snapshot;
    return Object.freeze({
      ...this.#snapshot,
      particles: Object.freeze(this.#snapshot.particles.filter(({ category }) => category === this.#filter))
    });
  }

  #openInvestigationHub(entity, { record = true } = {}) {
    const built = buildFieldInvestigationHub({
      focusEntity: entity,
      entities: this.#snapshot.particles,
      relations: relationsFromSnapshot(this.#snapshot)
    });
    if (record) this.#trail.visit(built);
    const hub = Object.freeze({ ...built, navigation: this.#trail.state() });
    this.#activeHub = hub;
    this.#renderer.setInvestigationHub?.(hub);
    globalThis.dispatchEvent(new CustomEvent('abulls:field-investigation-hub', { detail: hub }));
    this.#markState(this.#snapshot.sources.some((source) => !isPrototypeLabel(source)) ? 'ready' : 'prototype');
    return hub;
  }

  #navigateTrail(direction) {
    const target = direction === 'back' ? this.#trail.back() : this.#trail.forward();
    if (!target) return false;
    const entity = this.#snapshot.particles.find(
      (item) => String(item?.id) === target.focusId && String(item?.kind || 'entity') === target.focusKind
    );
    if (!entity) {
      if (direction === 'back') this.#trail.forward();
      else this.#trail.back();
      return false;
    }
    this.#openInvestigationHub(entity, { record: false });
    return true;
  }

  setFilter(filter) {
    if (!FILTERS.includes(filter)) return false;
    this.#filter = filter;
    this.#renderer.updateSnapshot(this.#filteredSnapshot());
    this.#markState(this.#snapshot.sources.some((source) => !isPrototypeLabel(source)) ? 'ready' : 'prototype');
    return true;
  }

  setMode(mode = 'explore') {
    const next = Object.hasOwn(MODE_FILTER, mode) ? mode : 'explore';
    this.#mode = next;
    this.#root.dataset.fieldMode = next;
    const preferred = MODE_FILTER[next];
    if (preferred && preferred !== this.#filter) this.setFilter(preferred);
    else this.#markState(this.#snapshot.sources.some((source) => !isPrototypeLabel(source)) ? 'ready' : 'prototype');
    return next;
  }

  async #select(entity, destination) {
    this.#openInvestigationHub(entity);
    try {
      await this.#onDestinationRequest?.(destination, entity, { investigationHub: this.#activeHub });
    } catch {
      this.#markState('degraded');
    }
  }

  #handleClient(event) {
    if (event.state === 'ready' && event.snapshot) {
      this.#snapshot = event.snapshot;
      this.#renderer.updateSnapshot(this.#filteredSnapshot());
      if (this.#activeHub) {
        const entity = this.#snapshot.particles.find((item) => item.id === this.#activeHub.focusId);
        if (entity) this.#openInvestigationHub(entity);
        else {
          this.#activeHub = null;
          this.#renderer.clearInvestigationHub?.();
        }
      }
      this.#markState('ready');
    } else if (event.state === 'degraded' || event.state === 'error') this.#markState('degraded');
  }

  promoteRenderer(THREE) {
    if (!THREE || typeof THREE.WebGLRenderer !== 'function') return false;
    if (this.#renderer?.backend === 'webgl') return false;
    const snapshot = this.#filteredSnapshot();
    const onSelect = (entity, destination) => this.#select(entity, destination);
    this.#renderer.destroy();
    this.#renderer = new UniverseRenderer({
      host: this.#stage,
      snapshot,
      THREE,
      onSelect
    });
    if (this.#activeHub) this.#renderer.setInvestigationHub?.(this.#activeHub);
    this.#renderer.setMode?.(this.#mode);
    this.#renderer.setQueryActive?.(Boolean(globalThis.__ABULLS_QUERY_ACTIVE));
    return true;
  }

  start(options) { this.#client.start(options); }
  stop() { this.#client.stop(); }

  destroy() {
    this.stop();
    this.#unsubscribe?.();
    globalThis.removeEventListener('abulls:field-mode', this.#onFieldMode);
    globalThis.removeEventListener('abulls:universal-search', this.#onSearch);
    globalThis.removeEventListener('abulls:field-investigation-back', this.#onTrailBack);
    globalThis.removeEventListener('abulls:field-investigation-forward', this.#onTrailForward);
    this.#trail.clear();
    this.#renderer.destroy();
    this.#root.remove();
  }
}

export const UniverseFilters = FILTERS;
