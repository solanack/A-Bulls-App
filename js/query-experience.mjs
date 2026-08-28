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
  #onSubmit;

  constructor({ host, onSubmit } = {}) {
    if (!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host = host;
    this.#onSubmit = onSubmit;
  }

  open() {
    if (this.#root) return;

    const root = el('div', 'query-experience');
    const form = el('form', 'query-experience__form');

    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'Enter wallet, transaction, token, NFT, or program';
    input.setAttribute('aria-label', 'Enter your query');

    const submit = el('button', 'query-experience__submit', 'QUERY');
    submit.type = 'submit';

    const back = el('button', 'query-experience__back', 'RETURN TO FIELD');
    back.type = 'button';

    form.append(input, submit);
    root.append(form, back);
    this.#host.append(root);

    this.#root = root;
    this.#input = input;

    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      this.#onSubmit?.(value);
    });

    back.addEventListener('click', () => {
      globalThis.dispatchEvent(new CustomEvent('abulls:query-return'));
      this.close();
    });

    globalThis.__ABULLS_QUERY_ACTIVE = true;
    globalThis.dispatchEvent(new CustomEvent('abulls:query-state', {
      detail: { active: true }
    }));

    requestAnimationFrame(() => {
      root.classList.add('is-active');
      input.focus();
    });
  }

  close() {
    if (!this.#root) return;

    const root = this.#root;
    this.#root = null;
    this.#input = null;

    globalThis.__ABULLS_QUERY_ACTIVE = false;
    globalThis.dispatchEvent(new CustomEvent('abulls:query-state', {
      detail: { active: false }
    }));

    root.classList.remove('is-active');
    setTimeout(() => root.remove(), 180);
  }

  destroy() {
    this.close();
  }
}
