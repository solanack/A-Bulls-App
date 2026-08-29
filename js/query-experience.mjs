function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

export class QueryExperience {
  #host;
  #root;
  #input;
  #status;
  #onSubmit;

  constructor({ host, onSubmit } = {}) {
    if (!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host = host;
    this.#onSubmit = onSubmit;
    this.#mount();
  }

  #mount() {
    if (this.#root) return;
    const root = el('div', 'query-slot');
    const form = el('form', 'query-slot__form');
    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'Wallet, tx, token, NFT, program';
    input.setAttribute('aria-label', 'QUERY address');
    const submit = el('button', 'query-slot__go', 'ASK');
    submit.type = 'submit';
    const status = el('p', 'query-slot__status', '');
    form.append(input, submit);
    root.append(form, status);
    this.#host.append(root);
    this.#root = root;
    this.#input = input;
    this.#status = status;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      this.#status.textContent = value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
      this.#onSubmit?.(value);
    });
  }

  open() {
    this.#root?.classList.add('is-active');
    this.#input?.focus();
  }

  close() {
    this.#input?.blur();
  }

  setStatus(text) {
    if (this.#status) this.#status.textContent = text || '';
  }

  destroy() {
    this.#root?.remove();
    this.#root = null;
    this.#input = null;
    this.#status = null;
  }
}
