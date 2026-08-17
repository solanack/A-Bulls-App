/* Read-only Bull Pen selection, exact NFT cutouts, and nineteen boss suits. */
(function (global) {
  'use strict';

  const MAX_BOSSES = 19;
  const cosmeticsEnabled = () => global.BBRV7?.features?.bullpenNftCosmetics === true;
  const assetsByMint = new Map();
  const cutoutsByMint = new Map();
  const cutoutPromises = new Map();
  let collectionPromise = null;

  const BOSS_SUITS = Object.freeze([
    { name: 'Stampede Core', asset: 'assets/bull-boss-suits/boss-suit-01.webp', accent: '#14f195' },
    { name: 'Void Regent', asset: 'assets/bull-boss-suits/boss-suit-02.webp', accent: '#9945ff' },
    { name: 'Arctic Cannon', asset: 'assets/bull-boss-suits/boss-suit-03.webp', accent: '#00c2ff' },
    { name: 'Golden Horn', asset: 'assets/bull-boss-suits/boss-suit-04.webp', accent: '#ffca42' },
    { name: 'Redline Siege', asset: 'assets/bull-boss-suits/boss-suit-05.webp', accent: '#ff334f' },
    { name: 'Nightwave', asset: 'assets/bull-boss-suits/boss-suit-06.webp', accent: '#23b8ff' },
    { name: 'Quantum Mint', asset: 'assets/bull-boss-suits/boss-suit-07.webp', accent: '#40f0cf' },
    { name: 'Blue Reactor', asset: 'assets/bull-boss-suits/boss-suit-08.webp', accent: '#268cff' },
    { name: 'Royal Plasma', asset: 'assets/bull-boss-suits/boss-suit-09.webp', accent: '#b95cff' },
    { name: 'Toxic Titan', asset: 'assets/bull-boss-suits/boss-suit-10.webp', accent: '#8dff22' },
    { name: 'Solar Paladin', asset: 'assets/bull-boss-suits/boss-suit-11.webp', accent: '#43a7ff' },
    { name: 'Magma Ram', asset: 'assets/bull-boss-suits/boss-suit-12.webp', accent: '#ff7026' },
    { name: 'Chrome Sentinel', asset: 'assets/bull-boss-suits/boss-suit-13.webp', accent: '#5be1ff' },
    { name: 'Nebula Bruiser', asset: 'assets/bull-boss-suits/boss-suit-14.webp', accent: '#a14fff' },
    { name: 'Cryo Colossus', asset: 'assets/bull-boss-suits/boss-suit-15.webp', accent: '#8cf4ff' },
    { name: 'Black Gold', asset: 'assets/bull-boss-suits/boss-suit-16.webp', accent: '#ffc43d' },
    { name: 'Pink Reactor', asset: 'assets/bull-boss-suits/boss-suit-17.webp', accent: '#ff3ea5' },
    { name: 'Warden Prime', asset: 'assets/bull-boss-suits/boss-suit-18.webp', accent: '#d1a538' },
    { name: 'Shadow Breaker', asset: 'assets/bull-boss-suits/boss-suit-19.webp', accent: '#ff334f' }
  ]);
  const MOVEMENTS = Object.freeze(['sweep', 'weave', 'orbit', 'rush', 'zigzag']);
  const PROJECTILES = Object.freeze(['spread', 'burst', 'spiral', 'seeker', 'cross']);

  const validMint = value => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value || ''));
  const hash = value => {
    let result = 2166136261;
    for (const char of String(value || 'bull')) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
    return result >>> 0;
  };
  const normalizeAttributes = attributes => (Array.isArray(attributes) ? attributes : []).map(attribute => ({
    trait_type: String(attribute?.trait_type || attribute?.type || '').slice(0, 80),
    value: String(attribute?.value ?? '').slice(0, 120)
  })).filter(attribute => attribute.trait_type && attribute.value);

  function rememberAsset(asset) {
    const mint = String(asset?.mint || asset?.id || '');
    if (!mint) return null;
    const prior = assetsByMint.get(mint) || {};
    const clean = {
      ...prior,
      mint,
      id: mint,
      name: String(asset?.name || prior.name || 'The Bull Pen NFT').slice(0, 140),
      image: String(asset?.image || prior.image || ''),
      imageCandidates: [...new Set([...(asset?.imageCandidates || []), ...(prior.imageCandidates || [])].filter(Boolean))].slice(0, 12),
      attributes: normalizeAttributes(asset?.attributes?.length ? asset.attributes : prior.attributes)
    };
    assetsByMint.set(mint, clean);
    return clean;
  }

  async function loadCollection() {
    if (!cosmeticsEnabled()) return [];
    if (collectionPromise) return collectionPromise;
    collectionPromise = global.BBRSApi.data('/api/nft/collection-traits')
      .then(data => {
        (data?.assets || []).forEach(rememberAsset);
        return [...assetsByMint.values()];
      })
      .catch(() => [...assetsByMint.values()]);
    return collectionPromise;
  }

  function selectedMints(profileObject = global.profile) {
    return Array.isArray(profileObject?.selectedBossMints) ? profileObject.selectedBossMints.slice(0, MAX_BOSSES) : [];
  }
  function isSelected(mint, profileObject = global.profile) { return selectedMints(profileObject).includes(String(mint || '')); }
  function toggle(asset, profileObject = global.profile) {
    const remembered = rememberAsset(asset);
    if (!remembered || !profileObject) return { selected: false, full: false };
    const selected = selectedMints(profileObject);
    const index = selected.indexOf(remembered.mint);
    if (index >= 0) selected.splice(index, 1);
    else if (selected.length >= MAX_BOSSES) return { selected: false, full: true };
    else selected.push(remembered.mint);
    profileObject.selectedBossMints = selected;
    global.save?.();
    global.dispatchEvent?.(new CustomEvent('bbrs:boss-roster-change', { detail: { mints: [...selected] } }));
    return { selected: index < 0, full: false, count: selected.length };
  }
  function clear(profileObject = global.profile) {
    if (!profileObject) return 0;
    const removed = selectedMints(profileObject).length;
    profileObject.selectedBossMints = [];
    global.save?.();
    global.dispatchEvent?.(new CustomEvent('bbrs:boss-roster-change', { detail: { mints: [] } }));
    return removed;
  }

  function traitValues(asset) {
    const result = { skin: '', head: '', eyes: '' };
    for (const attribute of asset?.attributes || []) {
      const type = String(attribute.trait_type || '').trim().toLowerCase();
      const value = String(attribute.value || '').trim();
      if (!result.skin && /skin|hide|fur|body|coat/.test(type)) result.skin = value;
      if (!result.head && /head|hat|horn|crown|hair/.test(type)) result.head = value;
      if (!result.eyes && /eye|eyewear|glasses|visor/.test(type)) result.eyes = value;
    }
    return result;
  }

  function visualFor(asset, index = 0, randomized = false) {
    const mint = String(asset?.mint || asset?.id || '');
    const seed = hash(`${mint || 'random'}:${index}`);
    const suit = BOSS_SUITS[index % BOSS_SUITS.length];
    return {
      mint,
      name: String(asset?.name || `Random Bull ${index + 1}`),
      selected: !randomized,
      randomized,
      traits: traitValues(asset),
      image: String(asset?.image || ''),
      imageCandidates: Array.isArray(asset?.imageCandidates) ? asset.imageCandidates.slice(0, 12) : [],
      imageProxy: validMint(mint) ? global.BBRSApi.url(`/api/nft/image?asset=${encodeURIComponent(mint)}`) : '',
      suitIndex: index % BOSS_SUITS.length,
      suit,
      accent: suit.accent,
      movement: MOVEMENTS[(seed + index) % MOVEMENTS.length],
      projectile: PROJECTILES[(seed + index * 3) % PROJECTILES.length]
    };
  }

  function syntheticAsset(index) {
    return rememberAsset({ id: `random-bull-${index + 1}`, name: `Random Bull ${index + 1}`, attributes: [] });
  }

  async function buildRoster(profileObject = global.profile) {
    if (!cosmeticsEnabled()) return [];
    await loadCollection();
    const chosen = selectedMints(profileObject).map(mint => assetsByMint.get(mint) || rememberAsset({ id: mint })).filter(Boolean);
    const chosenMints = new Set(chosen.map(asset => asset.mint));
    const unused = [...assetsByMint.values()].filter(asset => validMint(asset.mint) && !chosenMints.has(asset.mint));
    const roster = chosen.map((asset, index) => visualFor(asset, index, false));
    for (let index = roster.length; index < MAX_BOSSES; index++) {
      const asset = unused.length ? unused[(hash(`${index}:${unused.length}`) + index) % unused.length] : syntheticAsset(index);
      roster.push(visualFor(asset, index, true));
    }
    preloadRoster(roster);
    return roster;
  }

  function averagePatch(data, size, centerX, centerY, radius = 3) {
    let red = 0, green = 0, blue = 0, count = 0;
    const samples = [];
    for (let y = Math.max(0, centerY - radius); y <= Math.min(size - 1, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(size - 1, centerX + radius); x++) {
        const offset = (y * size + x) * 4;
        const r = data[offset], g = data[offset + 1], b = data[offset + 2];
        red += r; green += g; blue += b; count++;
        samples.push([r, g, b]);
      }
    }
    const mean = [red / count, green / count, blue / count];
    let variance = 0;
    for (const s of samples) {
      variance += (s[0] - mean[0]) ** 2 + (s[1] - mean[1]) ** 2 + (s[2] - mean[2]) ** 2;
    }
    variance = count ? variance / count : 0;
    return { mean, variance };
  }

  function buildBackgroundPalette(pixels, size) {
    // Prefer true corners (less likely to hit horns/headwear) over fixed top mid-strip.
    const candidates = [
      averagePatch(pixels, size, 2, 2, 4),
      averagePatch(pixels, size, size - 3, 2, 4),
      averagePatch(pixels, size, 2, size - 3, 4),
      averagePatch(pixels, size, size - 3, size - 3, 4),
      averagePatch(pixels, size, Math.round(size * 0.08), Math.round(size * 0.08), 4),
      averagePatch(pixels, size, Math.round(size * 0.92), Math.round(size * 0.08), 4),
      averagePatch(pixels, size, 4, Math.round(size * 0.3), 3),
      averagePatch(pixels, size, size - 5, Math.round(size * 0.3), 3)
    ];
    // Drop high-variance patches (edge straddling character silhouette).
    const VARIANCE_MAX = 1800;
    let kept = candidates.filter(c => c.variance <= VARIANCE_MAX);
    if (!kept.length) kept = candidates.slice().sort((a, b) => a.variance - b.variance).slice(0, 3);
    // Drop color outliers vs median of kept means.
    const means = kept.map(c => c.mean);
    const med = [0, 1, 2].map(i => {
      const vals = means.map(m => m[i]).sort((a, b) => a - b);
      return vals[Math.floor(vals.length / 2)];
    });
    const OUTLIER = 48;
    const filtered = kept.filter(c => {
      const d = Math.abs(c.mean[0] - med[0]) + Math.abs(c.mean[1] - med[1]) + Math.abs(c.mean[2] - med[2]);
      return d <= OUTLIER * 3;
    });
    const final = (filtered.length ? filtered : kept).map(c => c.mean);
    return final.length ? final : [med];
  }

  function makeCleanCutout(image) {
    const size = 384;
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const sourceWidth = Math.max(1, Number(image.naturalWidth || image.width || size));
    const sourceHeight = Math.max(1, Number(image.naturalHeight || image.height || size));
    let sourceX = 0, sourceY = 0, sourceSize = Math.min(sourceWidth, sourceHeight);
    if (sourceWidth > sourceHeight) sourceX = (sourceWidth - sourceSize) / 2;
    else if (sourceHeight > sourceWidth) sourceY = (sourceHeight - sourceSize) / 2;
    // Cover-crop to the square working canvas before background removal. This
    // preserves the NFT's native aspect ratio; overflow is cropped, never stretched.
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    const frame = context.getImageData(0, 0, size, size), pixels = frame.data;
    const palette = buildBackgroundPalette(pixels, size);
    const background = new Uint8Array(size * size);
    const queue = new Int32Array(size * size);
    let read = 0, write = 0;
    const matchesBackground = pixel => {
      const offset = pixel * 4, red = pixels[offset], green = pixels[offset + 1], blue = pixels[offset + 2];
      return palette.some(color => {
        const dr = red - color[0], dg = green - color[1], db = blue - color[2];
        return dr * dr + dg * dg + db * db < 58 * 58;
      });
    };
    const enqueue = pixel => {
      if (pixel < 0 || pixel >= background.length || background[pixel] || !matchesBackground(pixel)) return;
      background[pixel] = 1; queue[write++] = pixel;
    };
    for (let x = 0; x < size; x++) enqueue(x);
    for (let y = 0; y < size; y++) { enqueue(y * size); enqueue(y * size + size - 1); }
    while (read < write) {
      const pixel = queue[read++], x = pixel % size;
      if (x) enqueue(pixel - 1);
      if (x < size - 1) enqueue(pixel + 1);
      enqueue(pixel - size); enqueue(pixel + size);
    }
    for (let pixel = 0; pixel < background.length; pixel++) {
      const alpha = pixel * 4 + 3;
      if (background[pixel]) { pixels[alpha] = 0; continue; }
      const x = pixel % size, y = Math.floor(pixel / size);
      const touchesBackground = (x && background[pixel - 1]) || (x < size - 1 && background[pixel + 1]) || background[pixel - size] || background[pixel + size];
      if (touchesBackground) pixels[alpha] = Math.min(pixels[alpha], 170);
      // Below the face, taper toward the center so the NFT's original outfit
      // and square shoulders do not cover the generated boss suit.
      if (y > size * .66) {
        const progress = Math.min(1, (y / size - .66) / .24);
        const halfWidth = .49 - progress * .27;
        const outside = Math.abs(x / size - .5) - halfWidth;
        if (outside > 0) pixels[alpha] = Math.round(pixels[alpha] * Math.max(0, 1 - outside * size / 12));
        if (y > size * .84) pixels[alpha] = Math.round(pixels[alpha] * Math.max(0, 1 - (y / size - .84) / .08));
      }
    }
    context.clearRect(0, 0, size, size); context.putImageData(frame, 0, 0);
    return canvas;
  }

  function loadCutout(visual) {
    if (!cosmeticsEnabled()) return Promise.resolve(null);
    const mint = String(visual?.mint || '');
    if (!validMint(mint)) return Promise.resolve(null);
    if (cutoutsByMint.has(mint)) return Promise.resolve(cutoutsByMint.get(mint));
    if (cutoutPromises.has(mint)) return cutoutPromises.get(mint);
    const sources = [...new Set([visual.imageProxy, visual.image, ...(visual.imageCandidates || [])].filter(Boolean))];
    const promise = new Promise(resolve => {
      let sourceIndex = 0;
      const tryNext = () => {
        const source = sources[sourceIndex++];
        if (!source) { resolve(null); return; }
        const image = new Image(); image.crossOrigin = 'anonymous'; image.decoding = 'async';
        image.onload = () => {
          try {
            const cutout = makeCleanCutout(image); cutoutsByMint.set(mint, cutout); resolve(cutout);
          } catch (_) { tryNext(); }
        };
        image.onerror = tryNext;
        image.src = source;
      };
      tryNext();
    }).finally(() => cutoutPromises.delete(mint));
    cutoutPromises.set(mint, promise);
    return promise;
  }

  function preloadRoster(roster) {
    if (!cosmeticsEnabled()) return Promise.resolve([]);
    // The image proxy verifies collection membership. This is still public,
    // read-only NFT data: no wallet connection, signature, or transaction.
    return Promise.allSettled((roster || []).map(loadCutout));
  }
  function cutoutFor(mint) { return cutoutsByMint.get(String(mint || '')) || null; }

  // Spoofing is possible because anyone can paste any public address. That is
  // an accepted cosmetic-only tradeoff: no transferable value or custodial
  // asset is at risk, so signatures must not be added to this flow.
  global.BullBossRoster = {
    MAX_BOSSES, suits: BOSS_SUITS, rememberAsset, loadCollection, selectedMints,
    isSelected, toggle, clear, visualFor, buildRoster, loadCutout, preloadRoster, cutoutFor
  };
})(window);
