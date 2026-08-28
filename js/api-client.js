/* Shared API transport for browser, installed PWA/TWA, and read-only preview shells. */
(function (global) {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 20_000;
  const serviceState = { online: navigator.onLine !== false, lastLatencyMs: null, workerVersion: '', lastStatus: null, lastErrorAt: 0 };
  const GOOGLE_SESSION_KEY = 'bbrs_google_session_v1';
  const PLAYER_SESSION_KEY = 'bbrs_player_session_v1';
  const base = () => String(typeof CONFIG !== 'undefined' ? CONFIG.apiBase : '').replace(/\/$/, '');
  const url = path => /^https?:\/\//i.test(String(path || '')) ? String(path) : base() + (String(path || '').startsWith('/') ? path : '/' + path);

  function transportError(error) {
    if (error?.name === 'AbortError') return error;
    const wrapped = new Error('A Bulls App data service could not be reached.');
    wrapped.name = 'BBRSNetworkError';
    wrapped.cause = error;
    wrapped.network = true;
    return wrapped;
  }

  async function envelope(path, options = {}) {
    const requestOptions = { ...options };
    const timeoutMs = Math.max(1_000, Number(requestOptions.timeoutMs || DEFAULT_TIMEOUT_MS));
    delete requestOptions.timeoutMs;
    const callerSignal = requestOptions.signal;
    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) onAbort();
      else callerSignal.addEventListener('abort', onAbort, { once: true });
    }
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const startedAt = performance.now();
    try {
      const response = await fetch(url(path), {
        cache: 'no-store',
        ...requestOptions,
        headers: { Accept: 'application/json', ...(requestOptions.headers || {}) },
        signal: controller.signal
      });
      serviceState.online = true;
      serviceState.lastLatencyMs = Math.max(0, performance.now() - startedAt);
      serviceState.workerVersion = response.headers.get('X-Worker-Version') || serviceState.workerVersion;
      serviceState.lastStatus = response.status;
      global.dispatchEvent(new CustomEvent('bbrs:api-status', { detail: { ...serviceState, path: String(path || '') } }));
      const body = await response.json().catch(() => null);
      if (!response.ok || !body || body.ok === false) {
        const error = new Error(body?.error?.message || `Request failed (${response.status})`);
        error.status = response.status;
        error.payload = body;
        throw error;
      }
      return body;
    } catch (error) {
      if (callerSignal?.aborted) throw error;
      if (timedOut) {
        const timeoutError = new Error('A Bulls App data service timed out.');
        timeoutError.name = 'BBRSTimeoutError';
        timeoutError.network = true;
        serviceState.lastErrorAt = Date.now();
        global.dispatchEvent(new CustomEvent('bbrs:api-status', { detail: { ...serviceState, degraded: true, path: String(path || '') } }));
        throw timeoutError;
      }
      if (error instanceof TypeError) {
        serviceState.online = navigator.onLine !== false;
        serviceState.lastErrorAt = Date.now();
        global.dispatchEvent(new CustomEvent('bbrs:api-status', { detail: { ...serviceState, degraded: true, path: String(path || '') } }));
        throw transportError(error);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener?.('abort', onAbort);
    }
  }

  async function data(path, options = {}) {
    const body = await envelope(path, options);
    return body.data;
  }

  async function post(path, payload, options = {}) {
    return data(path, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(payload)
    });
  }

  function storedSession() {
    const google = localStorage.getItem(GOOGLE_SESSION_KEY) || '';
    return google ? { token: google, kind: 'google' } : { token: localStorage.getItem(PLAYER_SESSION_KEY) || '', kind: 'player' };
  }

  async function ensurePlayerSession() {
    const current = storedSession();
    if (current.token) return current;
    const created = await post('/api/auth/player-session', {});
    if (!created?.sessionToken) throw new Error('A signed player session could not be created.');
    localStorage.setItem(PLAYER_SESSION_KEY, created.sessionToken);
    return { token: created.sessionToken, kind: 'player' };
  }

  async function authenticatedRequest(path, options = {}, retried = false) {
    const active = await ensurePlayerSession();
    try {
      return await data(path, {
        ...options,
        headers: { ...(options.headers || {}), Authorization: `Bearer ${active.token}` }
      });
    } catch (error) {
      if (!retried && active.kind === 'player' && error?.status === 401) {
        localStorage.removeItem(PLAYER_SESSION_KEY);
        return authenticatedRequest(path, options, true);
      }
      throw error;
    }
  }

  async function authenticatedData(path, options = {}) {
    return authenticatedRequest(path, options);
  }

  async function authenticatedPost(path, payload, options = {}) {
    return authenticatedRequest(path, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(payload)
    });
  }

  global.BBRSApi = Object.freeze({ base, url, envelope, data, post, authenticatedData, authenticatedPost, ensurePlayerSession, status: () => ({ ...serviceState }) });
})(window);
