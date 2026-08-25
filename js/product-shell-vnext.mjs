import { primaryProducts, productById, productRegistry } from './product-registry.mjs';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function productButton(product, { compact = false, current = false, onNavigate } = {}) {
  const button = element('button', 'product-nav-button');
  button.type = 'button';
  button.dataset.product = product.id;
  button.setAttribute('aria-label', `${product.label}: ${product.description}`);
  if (current) button.setAttribute('aria-current', 'page');
  const icon = element('span', 'product-nav-button__icon', compact ? product.label.slice(0, 1) : '◇');
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon, element('span', 'product-nav-button__label', product.label));
  button.addEventListener('click', () => onNavigate?.(product.id));
  return button;
}

export function createProductShell({
  host,
  activeProduct = 'universe',
  serviceState = 'ready',
  onNavigate,
  onSearch
}) {
  if (!(host instanceof Element)) throw new TypeError('host element is required');
  const shell = element('div', 'product-shell');
  shell.dataset.activeProduct = activeProduct;

  const rail = element('nav', 'product-rail');
  rail.setAttribute('aria-label', 'Primary products');
  rail.append(element('div', 'product-rail__brand', 'A·B'));
  for (const product of primaryProducts()) {
    rail.append(productButton(product, {
      current: product.id === activeProduct,
      onNavigate: selectProduct
    }));
  }
  const railSpacer = element('span');
  railSpacer.style.flex = '1';
  rail.append(railSpacer);
  for (const product of productRegistry().filter(({ tier }) => tier !== 'primary')) {
    rail.append(productButton(product, { compact: true, onNavigate: selectProduct }));
  }

  const main = element('div', 'product-shell__main');
  const topbar = element('header', 'product-topbar');
  const identity = element('div', 'product-topbar__identity');
  identity.append(element('small', '', 'A BULLS APP'), element('strong', '', productById(activeProduct)?.label ?? 'Home'));

  const command = element('form', 'product-command');
  command.setAttribute('role', 'search');
  const input = document.createElement('input');
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = 'Search a public wallet, transaction, token, NFT, or program';
  input.setAttribute('aria-label', input.placeholder);
  command.append(input, element('span', '', 'READ ONLY'));
  command.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) onSearch?.(query);
  });

  const status = element('div', 'product-status');
  status.setAttribute('role', 'status');
  status.append(element('i'));
  status.append(element('span', '', serviceState === 'ready' ? 'SYSTEMS READY' : 'PARTIAL SERVICE'));
  topbar.append(identity, command, status);

  const home = element('main', 'product-home');
  const intro = element('section', 'product-home__intro');
  const heading = element('div');
  heading.append(element('small', '', 'SOLANA INTELLIGENCE · STORIES · EXPERIENCES'));
  heading.append(element('h1', '', 'See the chain. Understand the evidence. Tell the story.'));
  intro.append(heading, element('p', '', 'Explore live activity, investigate public-chain history, build verifiable data stories, reflect privately, or enter the arcade.'));

  const grid = element('section', 'product-grid');
  grid.setAttribute('aria-label', 'Products');
  primaryProducts().forEach((product, index) => {
    const card = element('button', `product-card${index === 0 ? ' product-card--featured' : ''}`);
    card.type = 'button';
    card.dataset.product = product.id;
    card.append(
      element('span', 'product-card__index', String(index + 1).padStart(2, '0')),
      element('h2', '', product.label),
      element('p', '', product.description),
      element('span', 'product-card__action', index === 0 ? 'ENTER LIVE UNIVERSE →' : 'OPEN PRODUCT →')
    );
    card.addEventListener('click', () => selectProduct(product.id));
    grid.append(card);
  });
  home.append(intro, grid);
  main.append(topbar, home);

  const mobile = element('nav', 'product-mobile-nav');
  mobile.setAttribute('aria-label', 'Primary products');
  for (const product of primaryProducts()) {
    mobile.append(productButton(product, {
      current: product.id === activeProduct,
      onNavigate: selectProduct
    }));
  }

  function selectProduct(productId) {
    const product = productById(productId);
    if (!product) return;
    shell.dataset.activeProduct = productId;
    identity.querySelector('strong').textContent = product.label;
    shell.querySelectorAll('[data-product]').forEach((node) => {
      if (!node.classList.contains('product-nav-button')) return;
      if (node.dataset.product === productId) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
    onNavigate?.(productId);
  }

  shell.append(rail, main, mobile);
  host.replaceChildren(shell);
  return Object.freeze({
    shell,
    focusSearch: () => input.focus(),
    setActiveProduct: selectProduct,
    destroy: () => shell.remove()
  });
}
