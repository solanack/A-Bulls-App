/* Google identity, local profile customization, and read-only collection analytics. */
(function (global) {
  'use strict';

  const SESSION_KEY = 'bbrs_google_session_v1';
  const DB_NAME = 'bbrs-profile-media-v1';
  const STORE = 'media';
  const objectUrls = new Map();
  let dbPromise;
  let googleConfig;
  let googleButtonBlocked = false;
  let googleRenderTimer = 0;

  const byId = id => document.getElementById(id);
  const session = () => localStorage.getItem(SESSION_KEY) || '';
  const cleanName = value => String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50);
  const cleanXHandle = value => String(value || '').replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '').replace(/^@+/, '').split(/[/?#]/)[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
  const isAndroidWebView = () => /Android/i.test(navigator.userAgent) && (/(; wv\)|\bwv\b|Version\/4\.0.*Chrome)/i.test(navigator.userAgent) || Boolean(global.ReactNativeWebView));
  function openInChrome() {
    const webUrl = location.href.replace(/^https?:\/\//, '');
    location.href = `intent://${webUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(location.href)};end`;
  }

  function setSession(value) {
    if (value) localStorage.setItem(SESSION_KEY, value);
    else localStorage.removeItem(SESSION_KEY);
  }
  async function api(path, options = {}) {
    return global.BBRSApi.data(path, options);
  }
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }
  async function idb(method, key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, method === 'get' ? 'readonly' : 'readwrite');
      const request = method === 'put' ? tx.objectStore(STORE).put(value, key) : tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  function applyBlob(key, blob) {
    const prior = objectUrls.get(key);
    if (prior) URL.revokeObjectURL(prior);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    objectUrls.set(key, url);
    if (key === 'avatar') byId('profileAvatar').src = url;
    if (key === 'banner') byId('profileBanner').style.backgroundImage = `linear-gradient(rgba(0,20,8,.12),rgba(0,0,0,.38)),url("${url}")`;
  }
  async function loadProfileMedia() {
    const [avatar, banner] = await Promise.all([idb('get', 'avatar'), idb('get', 'banner')]).catch(() => [null, null]);
    if (avatar) applyBlob('avatar', avatar);
    if (banner) applyBlob('banner', banner);
    renderIdentity();
  }
  async function normalizeProfileImage(file, key) {
    const target = key === 'banner' ? { width: 1600, height: 540 } : { width: 512, height: 512 };
    const bitmap = global.createImageBitmap ? await createImageBitmap(file) : await new Promise((resolve, reject) => {
      const image = new Image(), url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be decoded')); };
      image.src = url;
    });
    const sourceWidth = bitmap.width || bitmap.naturalWidth, sourceHeight = bitmap.height || bitmap.naturalHeight;
    const sourceRatio = sourceWidth / sourceHeight, targetRatio = target.width / target.height;
    let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
    if (sourceRatio > targetRatio) { sw = sourceHeight * targetRatio; sx = (sourceWidth - sw) / 2; }
    else { sh = sourceWidth / targetRatio; sy = (sourceHeight - sh) / 2; }
    const canvas = document.createElement('canvas'); canvas.width = target.width; canvas.height = target.height;
    canvas.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, target.width, target.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .88));
    if (!blob) throw new Error('This image could not be resized');
    return blob;
  }
  async function saveProfileMedia(key, file) {
    if (!file?.type.startsWith('image/')) throw new Error('Choose an image file');
    if (file.size > 6 * 1024 * 1024) throw new Error('Profile images must be 6MB or smaller');
    const normalized = await normalizeProfileImage(file, key);
    await idb('put', key, normalized);
    applyBlob(key, normalized);
    toast(key === 'avatar' ? 'Profile image updated' : 'Banner updated');
  }

  function effectiveProfile(user = profile.googleUser) {
    const custom = profile.customProfile || {};
    return {
      name: cleanName(custom.name) || cleanName(user?.name) || 'Your Bull Profile',
      xHandle: cleanXHandle(custom.xHandle),
      customized: custom.customized === true
    };
  }
  function renderPerformance() {
    const editor = byId('profileEditorCard'), card = byId('profilePerformanceCard'), grid = byId('profileStatGrid'), notice = byId('profileFirstRunNotice');
    const customized = profile.customProfile?.customized === true && Boolean(cleanName(profile.customProfile?.name)) && Boolean(cleanXHandle(profile.customProfile?.xHandle));
    if (editor) editor.hidden = customized;
    if (card) card.hidden = !customized;
    if (!customized || !grid) return;
    const runs = Object.values(profile.gameRuns || {}).flatMap(value => Array.isArray(value) ? value : []);
    const complete = runs.filter(run => Number(run.durationMs || 0) > 0 || run.ts || run.score != null);
    const bestScore = Math.max(0, ...complete.map(run => Number(run.score || 0)));
    const bullsSaved = Math.max(Number(profile.stats?.bullsCapturedTotal || 0), complete.reduce((sum, run) => sum + Number(run.bullsCaptured || 0), 0));
    const memeBosses = complete.reduce((sum, run) => sum + Number(run.bossesDefeated || run.bosses || 0), 0);
    const bearKills = complete.reduce((sum, run) => sum + Number(run.kills || 0), 0);
    const clears = complete.filter(run => run.won).length;
    const cells = [
      ['High Score', bestScore.toLocaleString(), '⌁'], ['Bulls Saved', bullsSaved.toLocaleString(), '♉'],
      ['Bosses Defeated', memeBosses.toLocaleString(), '✦'], ['Bear Ships', bearKills.toLocaleString(), '◆'],
      ['Completed Runs', complete.length.toLocaleString(), '▶'], ['Campaign Clears', clears.toLocaleString(), '✓']
    ];
    grid.replaceChildren(...cells.map(([label, value, icon]) => {
      const node = document.createElement('div'); node.className = 'profile-stat-card terminal-card';
      const glyph = document.createElement('i'); glyph.textContent = icon;
      const small = document.createElement('small'); small.textContent = label;
      const bold = document.createElement('b'); bold.textContent = value;
      node.append(glyph, small, bold); return node;
    }));
    if (notice) notice.hidden = complete.length > 0;
    grid.hidden = complete.length === 0;
  }
  function renderIdentity(user = profile.googleUser) {
    const connected = Boolean(user?.sub);
    const local = effectiveProfile(user);
    if (byId('googleUserCard')) byId('googleUserCard').hidden = !connected;
    if (byId('googleSignInButton')) byId('googleSignInButton').hidden = connected;
    if (byId('googleAuthStatus')) byId('googleAuthStatus').textContent = connected ? 'CONNECTED' : googleConfig?.configured ? 'READY' : 'SETUP NEEDED';
    const notice = byId('googleAuthNotice');
    const chromeButton = byId('googleOpenChrome');
    const unsupported = !connected && (isAndroidWebView() || googleButtonBlocked);
    if (chromeButton) chromeButton.hidden = !unsupported;
    if (notice) {
      notice.hidden = !(unsupported || !googleConfig?.configured);
      notice.textContent = unsupported
        ? "This browser is blocking Google's sign-in prompt or does not support it here. Open this secure page in Chrome to connect your account."
        : !googleConfig?.configured ? 'Google sign-in needs the matching Worker configuration.' : '';
    }
    byId('profileDisplayName').textContent = local.name;
    const xLink = byId('profileXLink');
    if (xLink) {
      xLink.hidden = !local.xHandle;
      xLink.textContent = local.xHandle ? '@' + local.xHandle : '';
      xLink.href = local.xHandle ? `https://x.com/${encodeURIComponent(local.xHandle)}` : 'https://x.com/';
    }
    if (byId('profileNameInput')) byId('profileNameInput').value = cleanName(profile.customProfile?.name) || cleanName(user?.name);
    if (byId('profileXHandleInput')) byId('profileXHandleInput').value = cleanXHandle(profile.customProfile?.xHandle);
    if (!connected) {
      if (!objectUrls.has('avatar')) byId('profileAvatar').src = 'assets/profile-fallback.svg';
      renderPerformance();
      return;
    }
    if (!objectUrls.has('avatar') && user.picture) byId('profileAvatar').src = user.picture;
    renderPerformance();
  }
  function saveProfileEditor() {
    const name = cleanName(byId('profileNameInput').value);
    const xHandle = cleanXHandle(byId('profileXHandleInput')?.value);
    if (!name) return toast('Enter a display name');
    if (!xHandle) return toast('Enter an X handle');
    profile.customProfile = { name, xHandle, customized: true };
    save();
    renderIdentity();
    AudioManager?.sfx.success();
    toast('Profile saved');
  }
  function loadGoogleScript() {
    if (global.google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const prior = document.querySelector('script[data-google-identity]');
      if (prior) { prior.addEventListener('load', resolve, { once: true }); prior.addEventListener('error', reject, { once: true }); return; }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Google Identity Services could not load'));
      document.head.appendChild(script);
    });
  }
  async function handleGoogleCredential(response) {
    const notice = byId('googleAuthNotice');
    notice.hidden = false;
    notice.textContent = 'Verifying Google identity…';
    try {
      const data = await api('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      setSession(data.sessionToken);
      profile.googleUser = data.user;
      if (!profile.customProfile?.customized) profile.customProfile = { name: data.user.name || '', xHandle: '', customized: false };
      save();
      renderIdentity();
      global.dispatchEvent(new CustomEvent('bbrs:google-session-change', { detail: { connected: true } }));
      AudioManager?.sfx.success();
      toast('Google account connected');
    } catch (error) {
      notice.textContent = error.message;
      toast(error.message);
    }
  }
  async function initGoogle() {
    try {
      googleConfig = await api('/api/auth/google/config');
      if (!googleConfig.configured) { renderIdentity(null); return; }
      await loadGoogleScript();
      global.google.accounts.id.initialize({
        client_id: googleConfig.clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'use',
        use_fedcm_for_prompt: true,
        use_fedcm_for_button: true
      });
      const host = byId('googleSignInButton');
      host.replaceChildren();
      googleButtonBlocked = false;
      global.google.accounts.id.renderButton(host, {
        type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill',
        text: 'continue_with', logo_alignment: 'left', width: Math.max(230, Math.min(340, host.clientWidth || 320))
      });
      global.clearTimeout(googleRenderTimer);
      googleRenderTimer = global.setTimeout(() => {
        if (profile.googleUser?.sub || host.querySelector?.('iframe')) return;
        googleButtonBlocked = true;
        renderIdentity();
      }, 2500);
      renderIdentity();
      if (session()) {
        try {
          const user = await api('/api/auth/google/session', { headers: { Authorization: 'Bearer ' + session() } });
          profile.googleUser = user;
          save();
          renderIdentity(user);
          global.dispatchEvent(new CustomEvent('bbrs:google-session-change', { detail: { connected: true } }));
        } catch (_) {
          setSession('');
          profile.googleUser = null;
          save();
          renderIdentity(null);
          global.dispatchEvent(new CustomEvent('bbrs:google-session-change', { detail: { connected: false } }));
        }
      }
    } catch (error) {
      googleConfig = { configured: false };
      renderIdentity(null);
      byId('googleAuthNotice').hidden = false;
      byId('googleAuthNotice').textContent = error.status === 404
        ? 'Worker route missing. Deploy Worker v8.0.4 first, then deploy the matching Pages package.'
        : error.message;
    }
  }
  function signOut() {
    setSession('');
    profile.googleUser = null;
    save();
    try { global.google?.accounts?.id?.disableAutoSelect?.(); } catch (_) {}
    renderIdentity(null);
    global.dispatchEvent(new CustomEvent('bbrs:google-session-change', { detail: { connected: false } }));
    toast('Signed out on this device');
  }

  function metric(label, value) {
    const node = document.createElement('div');
    node.className = 'nft-stat';
    const small = document.createElement('small'); small.textContent = label;
    const bold = document.createElement('b'); bold.textContent = String(value ?? '—');
    node.append(small, bold);
    return node;
  }
  function fmtSol(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL` : '—';
  }
  function renderCollectionStats(data) {
    const root = byId('nftCollectionStats');
    root.replaceChildren();
    ['1d', '7d', '30d'].forEach(key => {
      const values = data.windows?.[key] || {};
      const card = document.createElement('div');
      card.className = 'nft-window-card';
      const heading = document.createElement('b'); heading.textContent = key.toUpperCase();
      const sales = document.createElement('strong'); sales.textContent = `${Number(values.sales || 0).toLocaleString()} sales`;
      const volume = document.createElement('span'); volume.textContent = fmtSol(values.volumeSol);
      const average = document.createElement('small'); average.textContent = `Avg ${fmtSol(values.averagePriceSol)}`;
      card.append(heading, sales, volume, average);
      root.append(card);
    });
    const snapshot = document.createElement('div');
    snapshot.className = 'nft-window-market';
    snapshot.append(metric('Floor', fmtSol(data.floorPriceSol)), metric('Listed', Number(data.listedCount || 0).toLocaleString()), metric('30D Window', `${data.complete30d ? 'Complete' : 'Partial'}${data.stale ? ' · Stale' : ''}`));
    root.append(snapshot);
  }
  async function loadCollectionStats() {
    const button = byId('refreshNftCollection');
    if (button) { button.disabled = true; button.textContent = 'Loading…'; }
    try {
      const data = await api('/api/nft/collection-stats');
      renderCollectionStats(data);
    } catch (error) {
      const root = byId('nftCollectionStats');
      root.replaceChildren();
      const notice = document.createElement('p');
      notice.className = 'notice';
      notice.textContent = error.status === 404 ? 'Collection stats route missing. Deploy Worker v8.0.4.' : error.message;
      root.append(notice);
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Refresh'; }
    }
  }
  function fmtCompact(value, maximumFractionDigits = 1) {
    if (value == null || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return new Intl.NumberFormat(undefined, { notation: Math.abs(number) >= 10_000 ? 'compact' : 'standard', maximumFractionDigits }).format(number);
  }
  function fmtUpdated(value) {
    const time = Date.parse(String(value || ''));
    return Number.isFinite(time) ? `Updated ${new Date(time).toLocaleString()}` : 'Update unavailable';
  }
  function renderEcosystemStats(data) {
    const kimji = data?.kimji;
    const buybacks = data?.buybacks;
    const set = (id, value) => { const node = byId(id); if (node) node.textContent = value; };
    set('kimjiStakedTotal', kimji ? Math.max(0, Number(kimji.totalStaked || 0)).toLocaleString() : '—');
    const stalePrefix = data?.stale ? 'STALE · ' : '';
    set('kimjiStakedUpdated', kimji ? stalePrefix + fmtUpdated(kimji.updatedAt) : 'Kimji data unavailable');
    set('buybackAnsemTotal', buybacks ? fmtCompact(buybacks.ansemBought) : '—');
    set('buybackCurrentUsd', buybacks?.currentUsdValue != null ? '$' + Number(buybacks.currentUsdValue).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');
    set('buybackTotalToDate', buybacks ? fmtCompact(buybacks.totalBuybacksToDate, 0) : '—');
    set('buybackUpdated', buybacks ? stalePrefix + fmtUpdated(buybacks.updatedAt) : 'Buyback data unavailable');
  }
  async function loadEcosystemStats() {
    const button = byId('refreshNftEcosystem');
    if (button) { button.disabled = true; button.textContent = 'Syncing…'; }
    try {
      renderEcosystemStats(await api('/api/nft/ecosystem-stats'));
    } catch (error) {
      const updated = byId('buybackUpdated');
      if (updated) updated.textContent = error.status === 404 ? 'Ecosystem route unavailable.' : 'Showing the last displayed values.';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Refresh Buybacks'; }
    }
  }
  function init() {
    byId('uploadProfileAvatar')?.addEventListener('click', () => byId('profileAvatarFile').click());
    byId('uploadProfileBanner')?.addEventListener('click', () => byId('profileBannerFile').click());
    byId('profileAvatarFile')?.addEventListener('change', event => saveProfileMedia('avatar', event.target.files?.[0]).catch(error => toast(error.message)));
    byId('profileBannerFile')?.addEventListener('change', event => saveProfileMedia('banner', event.target.files?.[0]).catch(error => toast(error.message)));
    byId('googleSignOut')?.addEventListener('click', signOut);
    byId('googleOpenChrome')?.addEventListener('click', openInChrome);
    byId('saveProfile')?.addEventListener('click', saveProfileEditor);
    byId('editProfileAgain')?.addEventListener('click', () => {
      const editor = byId('profileEditorCard'), card = byId('profilePerformanceCard');
      if (editor) editor.hidden = false;
      if (card) card.hidden = true;
      byId('profileNameInput')?.focus();
    });
    byId('refreshNftCollection')?.addEventListener('click', loadCollectionStats);
    byId('refreshNftEcosystem')?.addEventListener('click', loadEcosystemStats);
    if (byId('walletInput') && !byId('walletInput').value) byId('walletInput').value = profile.publicWallet || '';
    renderIdentity();
    loadProfileMedia();
    initGoogle();
    loadCollectionStats();
    loadEcosystemStats();
  }

  global.ProfileManager = { init, render: renderIdentity, loadCollectionStats, loadEcosystemStats, sessionToken: session };
})(window);
