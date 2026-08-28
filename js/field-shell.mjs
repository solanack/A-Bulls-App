const COMMANDS = Object.freeze([
  ['explore', 'EXPLORE'],
  ['intelligence', 'INTELLIGENCE'],
  ['replay', 'REPLAY'],
  ['compare', 'COMPARE'],
  ['what-if', 'WHAT IF'],
  ['sequences', 'SEQUENCES'],
  ['trickster', 'CREATE'],
  ['evidence', 'EVIDENCE'],
  ['query', 'QUERY'],
  ['games', 'GAMES']
]);
const DOCK = Object.freeze(['explore', 'intelligence', 'query', 'trickster', 'games']);
const MODE_HINTS = Object.freeze({
  explore: 'Search the chain. Select a node for replay, compare, and story.',
  intelligence: 'Inspect verified activity and follow evidence.',
  replay: 'Play, pause, and step through chain time.',
  compare: 'Compare evidence side by side.',
  'what-if': 'Simulate from observed evidence. Estimates stay labeled.',
  sequences: 'Discover bounded market sequences.',
  trickster: 'Compose a data story. Every published claim keeps its receipt.',
  evidence: 'Verify sources, coverage, and original chain time.',
  query: 'Ask the living blockchain.',
  games: 'Enter game.'
});

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function publicEntityLabel(id, kind) {
  const raw = String(id || '').trim();
  const type = String(kind || 'entity').toUpperCase();
  if (!raw) return type;
  if (/synthetic|prototype|testing/i.test(raw)) {
    const token = raw.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || 'NODE';
    return `${type} ${token}`;
  }
  return raw.length > 12 ? `${raw.slice(0, 4)}…${raw.slice(-4)}` : raw;
}

export function fieldInvestigationHopRequest(item = {}) {
  const entityId = String(item.id || '').trim();
  const entityKind = String(item.kind || '').trim();
  const evidenceIds = Object.freeze(
    (Array.isArray(item.evidenceIds) ? item.evidenceIds : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  );
  if (!entityId || !entityKind || !evidenceIds.length) return null;
  return Object.freeze({
    source: 'field-investigation-hop',
    query: entityId,
    entityId,
    entityKind,
    evidenceIds
  });
}

export function createFieldShell({ host, serviceState = 'ready', onCommand, onSearch }) {
  if (!(host instanceof Element)) throw new TypeError('host element is required');
  const root = el('div', 'field-shell');
  root.dataset.mode = 'explore';
  const fieldHost = el('div', 'field-shell__field');
  fieldHost.setAttribute('aria-label', 'Live Solana data field');
  const chrome = el('div', 'field-shell__chrome');
  const top = el('header', 'field-shell__top');
  const brand = el('button', 'field-shell__brand', 'A BULLS APP');
  brand.type = 'button';
  brand.addEventListener('click', () => closeWorkspace());
  const search = el('form', 'field-shell__search');
  search.setAttribute('role', 'search');
  const input = document.createElement('input');
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = 'Search wallet, transaction, token, NFT, program';
  input.setAttribute('aria-label', input.placeholder);
  const live = el('span', 'field-shell__live', serviceState === 'ready' ? 'SAMPLED' : 'PARTIAL');
  live.dataset.state = serviceState === 'ready' ? 'sampled' : 'partial';
  search.append(input, live);
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (value) onSearch?.(value);
  });
  top.append(brand, search);

  const commandDock = el('nav', 'field-shell__commands');
  commandDock.setAttribute('aria-label', 'Primary modes');
  for (const [id, label] of COMMANDS) {
    const button = el('button', 'field-shell__command', label);
    button.type = 'button';
    button.dataset.fieldCommand = id;
    button.setAttribute('aria-pressed', String(id === 'explore'));
    if (!DOCK.includes(id)) button.hidden = true;
    button.addEventListener('click', () => onCommand?.(id));
    commandDock.append(button);
  }

  const investigationDock = el('aside', 'field-shell__investigation');
  investigationDock.hidden = true;
  investigationDock.setAttribute('aria-live', 'polite');

  const workspace = el('section', 'field-shell__workspace');
  workspace.hidden = true;
  workspace.setAttribute('aria-live', 'polite');
  const workspaceHead = el('div', 'field-shell__workspace-head');
  const workspaceTitle = el('strong', '', 'INTELLIGENCE');
  const close = el('button', 'field-shell__close', 'RETURN TO FIELD');
  close.type = 'button';
  close.addEventListener('click', () => closeWorkspace());
  workspaceHead.append(workspaceTitle, close);
  const workspaceBody = el('div', 'field-shell__workspace-body');
  workspace.append(workspaceHead, workspaceBody);

  chrome.append(top, investigationDock, commandDock);
  root.append(fieldHost, chrome, workspace);
  host.replaceChildren(root);

  function setActive(command = 'explore') {
    const mode = MODE_HINTS[command] ? command : 'explore';
    root.dataset.mode = mode;
    const pressed = DOCK.includes(mode)
      ? mode
      : mode === 'games'
        ? 'games'
        : 'intelligence';
    root.querySelectorAll('[data-field-command]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.fieldCommand === pressed));
    });
    globalThis.dispatchEvent(new CustomEvent('abulls:field-mode', { detail: { mode } }));
  }

  function renderInvestigation(hub) {
    investigationDock.replaceChildren();
    if (!hub?.focusId) {
      investigationDock.hidden = true;
      root.classList.remove('field-shell--inspecting');
      return;
    }
    investigationDock.hidden = false;
    root.classList.add('field-shell--inspecting');
    const heading = el('div', 'field-shell__investigation-title', `${String(hub.focusKind || 'entity').toUpperCase()} FOCUS`);
    const identity = el('div', 'field-shell__investigation-id', publicEntityLabel(hub.focusId, hub.focusKind));
    const count = el(
      'div',
      'field-shell__investigation-count',
      hub.evidenceCount
        ? `${hub.evidenceCount} evidence-backed connection${hub.evidenceCount === 1 ? '' : 's'}`
        : 'No indexed connection evidence yet'
    );
    const trail = el('div', 'field-shell__investigation-actions');
    const connected = el('div', 'field-shell__investigation-connected');
    const actions = el('div', 'field-shell__investigation-actions');
    if (hub.navigation?.canBack) {
      const back = el('button', 'field-shell__investigation-action', 'Back');
      back.type = 'button';
      back.addEventListener('click', () => globalThis.dispatchEvent(new CustomEvent('abulls:field-investigation-back')));
      trail.append(back);
    }
    if (hub.navigation?.canForward) {
      const forward = el('button', 'field-shell__investigation-action', 'Forward');
      forward.type = 'button';
      forward.addEventListener('click', () => globalThis.dispatchEvent(new CustomEvent('abulls:field-investigation-forward')));
      trail.append(forward);
    }
    for (const item of Array.isArray(hub.nodes) ? hub.nodes : []) {
      const request = fieldInvestigationHopRequest(item);
      if (item.focused || !request) continue;
      const button = el(
        'button',
        'field-shell__investigation-action field-shell__investigation-node',
        publicEntityLabel(item.id, item.kind)
      );
      button.type = 'button';
      button.title = `Open exact loaded entity · ${request.evidenceIds.length} receipt${request.evidenceIds.length === 1 ? '' : 's'}`;
      button.addEventListener('click', () => globalThis.dispatchEvent(new CustomEvent('abulls:universal-search', { detail: request })));
      connected.append(button);
    }
    for (const action of Array.isArray(hub.actions) ? hub.actions : []) {
      const button = el('button', 'field-shell__investigation-action', action.label);
      button.type = 'button';
      button.dataset.simulation = String(Boolean(action.simulation));
      button.addEventListener('click', () =>
        onCommand?.(action.id, {
          investigationHub: hub,
          focusId: hub.focusId,
          focusKind: hub.focusKind,
          simulation: Boolean(action.simulation)
        })
      );
      actions.append(button);
    }
    investigationDock.append(heading, identity, count);
    if (trail.childElementCount) investigationDock.append(trail);
    if (connected.childElementCount) investigationDock.append(connected);
    investigationDock.append(actions);
    investigationDock.title = hub.disclosure || '';
  }

  function setLiveChip(state = 'sampled') {
    const liveState = state === 'live' ? 'live' : state === 'partial' ? 'partial' : 'sampled';
    live.textContent = liveState === 'live' ? 'LIVE' : liveState === 'partial' ? 'PARTIAL' : 'SAMPLED';
    live.dataset.state = liveState === 'live' ? 'ready' : 'partial';
  }

  const onFieldState = (event) => setLiveChip(event?.detail?.state);
  const onInvestigation = (event) => renderInvestigation(event?.detail);
  globalThis.addEventListener('abulls:field-state', onFieldState);
  globalThis.addEventListener('abulls:field-investigation-hub', onInvestigation);

  function mountWorkspace(content, { title = 'INTELLIGENCE', mode = 'intelligence' } = {}) {
    workspaceTitle.textContent = title;
    workspaceBody.replaceChildren();
    if (content instanceof Element) workspaceBody.append(content);
    workspace.hidden = false;
    root.classList.add('field-shell--workspace-open');
    setActive(mode);
    return workspaceBody;
  }

  function closeWorkspace() {
    workspaceBody.replaceChildren();
    workspace.hidden = true;
    root.classList.remove('field-shell--workspace-open');
    setActive('explore');
    globalThis.dispatchEvent(new CustomEvent('abulls:field-return'));
  }

  return Object.freeze({
    root,
    fieldHost,
    workspaceBody,
    focusSearch: () => input.focus(),
    mountWorkspace,
    closeWorkspace,
    setActive,
    renderInvestigation,
    destroy: () => {
      globalThis.removeEventListener('abulls:field-investigation-hub', onInvestigation);
      globalThis.removeEventListener('abulls:field-state', onFieldState);
      root.remove();
    }
  });
}

export const FieldCommands = COMMANDS;
