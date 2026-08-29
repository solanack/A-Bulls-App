import { productById } from './product-registry.mjs';

const REQUIRED_PRIMARY = Object.freeze(['intelligence', 'trickster']);

function adapter(id, definition = {}) {
  if (!productById(id) && id !== 'universe') throw new RangeError(`unknown product: ${id}`);
  if (typeof definition.activate !== 'function') throw new TypeError(`${id} adapter requires activate()`);
  return Object.freeze({
    id,
    activate: definition.activate,
    deactivate: typeof definition.deactivate === 'function' ? definition.deactivate : () => {},
    status: typeof definition.status === 'function' ? definition.status : () => Object.freeze({ state: 'available' })
  });
}

export class ProductAdapterRegistry {
  #adapters = new Map();
  #active = null;
  register(id, definition) {
    if (this.#adapters.has(id)) throw new RangeError(`adapter already registered: ${id}`);
    this.#adapters.set(id, adapter(id, definition));
    return this;
  }
  has(id) {
    return this.#adapters.has(id);
  }
  activate(id, context = {}) {
    const next = this.#adapters.get(id);
    if (!next) throw new RangeError(`product unavailable: ${id}`);
    if (this.#active && this.#active.id !== id) this.#active.deactivate(context);
    const result = next.activate(context);
    this.#active = next;
    return result;
  }
  status() {
    return Object.freeze([...this.#adapters.values()].map((item) => Object.freeze({ id: item.id, ...item.status() })));
  }
  readiness() {
    const missingPrimary = REQUIRED_PRIMARY.filter((id) => !this.#adapters.has(id));
    return Object.freeze({
      ready: missingPrimary.length === 0,
      missingPrimary: Object.freeze(missingPrimary),
      registered: Object.freeze([...this.#adapters.keys()])
    });
  }
}
