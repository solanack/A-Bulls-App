/* v7.0.1 Boss Codex — status medals only */
(function (global) {
  'use strict';
  const ROSTER = Object.freeze([
    ['rugpaw','Rugpaw'],['diamond-fang','Diamond Fang'],['candlewick','Candlewick'],['gasfee-golem','Gasfee Golem'],['whale-song','Whale Song'],
    ['ponzimouse','Ponzimouse'],['rekt-raven','Rekt Raven'],['slippage-slug','Slippage Slug'],['copium-cat','Copium Cat'],['fud-hound','FUD Hound'],
    ['paperhand-phantom','Paperhand Phantom'],['moonboy-owl','Moonboy Owl'],['dump-truck-turtle','Dump Truck Turtle'],['airdrop-vulture','Airdrop Vulture'],
    ['honeypot-wasp','Honeypot Wasp'],['gas-war-goat','Gas War Goat'],['snipe-serpent','Snipe Serpent'],['bagholder-bear','Bagholder Bear'],['exit-liquidity-eel','Exit Liquidity Eel']
  ].map(([id,name]) => ({ id, name, asset: global.BBRV7?.config?.bossAssets?.[id] || `assets/bosses-original/${id}.webp` })));

  async function render(root) {
    if (!root) return;
    let medals = {};
    try {
      medals = (await global.BBRSApi.retentionData('/api/medals'))?.medals || {};
    } catch (_) {}
    const list = ROSTER;
    let owned = 0;
    const rows = list.map(b => {
      const m = medals[b.id] || medals[b.name] || {};
      const bits = [m.no_damage && 'No-hit', m.under_time && 'Speed', m.no_continue && 'Clean'];
      const has = bits.filter(Boolean).length;
      if (has) owned++;
      return `<article class="codex-tile ${has ? 'owned' : 'unowned'}"><div class="codex-thumb"><img src="${b.asset}" alt="${b.name}" loading="lazy"/></div><div><b>${b.name}</b><small>${bits.filter(Boolean).join(' · ') || 'Unowned · earn a medal'}</small><div class="achievement-progress"><span style="width:${has / 3 * 100}%"></span></div></div></article>`;
    }).join('');
    const pct = list.length ? Math.round((owned / list.length) * 100) : 0;
    root.innerHTML = `
      <div class="panel terminal-poster">
        <div class="section-title" style="margin-top:0"><h2 style="font-size:15px">Boss Codex</h2></div>
        <p class="notice">Collection ${pct}% · medals are status only (no Ranked power)</p>
        <div class="codex-grid">${rows}</div>
      </div>`;
  }
  global.BBRCodex = { render };
})(window);
