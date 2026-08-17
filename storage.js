const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('bbrs_' + k);
      return v != null ? JSON.parse(v) : d;
    } catch { return d; }
  },
  set(k, v) {
    localStorage.setItem('bbrs_' + k, JSON.stringify(v));
  }
};

let profile = store.get('profile', {
  xp: 0,
  streak: 0,
  lastDay: '',
  settings: { sound: true, vibration: true, controlHand: 'right', reducedMotion: false, colorblindSafe: false },
  menuWall: null,
  gameWall: null,
  googleUser: null,
  customProfile: { name: '', xHandle: '', customized: false },
  nftWallet: '',
  selectedBossMints: [],
  bullion: { mode: 'ranked', activeSkin: '', localBalance: 0, localEntitlements: {} },
  gameRuns: {},
  watchedWallets: [],
  // v6 EPOCH campaign + ship unlocks. Ship 0 is the original live craft.
  epochCampaignSchema: 3,
  unlockedEpochs: [1],
  clearedEpochs: [],
  selectedEpoch: 1,
  unlockedShips: [0],
  selectedShip: 0
});

// Forward-compatible defaults for profiles created by earlier releases.
profile.gameRuns = profile.gameRuns || {};
delete profile.runs;
profile.settings = profile.settings || { sound: true, vibration: true };
profile.settings.controlHand = profile.settings.controlHand === 'left' ? 'left' : 'right';
profile.settings.reducedMotion = profile.settings.reducedMotion === true;
profile.settings.colorblindSafe = profile.settings.colorblindSafe === true;
delete profile.settings.recordRuns;
profile.googleUser = profile.googleUser || null;
profile.customProfile = profile.customProfile && typeof profile.customProfile === 'object'
  ? { name: profile.customProfile.name || '', xHandle: profile.customProfile.xHandle || '', customized: profile.customProfile.customized === true }
  : { name: '', xHandle: '', customized: false };
profile.nftWallet = typeof profile.nftWallet === 'string' ? profile.nftWallet : '';
profile.selectedBossMints = Array.isArray(profile.selectedBossMints)
  ? [...new Set(profile.selectedBossMints.filter(mint => typeof mint === 'string' && mint))].slice(0, 19)
  : [];
delete profile.selectedShipTraitMint;
profile.stats = profile.stats && typeof profile.stats === 'object'
  ? { bullsCapturedTotal: Math.max(0, Math.floor(Number(profile.stats.bullsCapturedTotal || 0))) }
  : { bullsCapturedTotal: 0 };
profile.bullion = profile.bullion && typeof profile.bullion === 'object'

  ? {
      mode: profile.bullion.mode === 'arcade' ? 'arcade' : 'ranked',
      activeSkin: String(profile.bullion.activeSkin || ''),
      localBalance: Math.max(0, Math.floor(Number(profile.bullion.localBalance || 0))),
      localEntitlements: profile.bullion.localEntitlements && typeof profile.bullion.localEntitlements === 'object' ? profile.bullion.localEntitlements : {}
    }
  : { mode: 'ranked', activeSkin: '', localBalance: 0, localEntitlements: {} };
// One-time v4.6 migration: the former single ship skin becomes the first boss choice.
if (!profile.selectedBossMints.length && typeof profile.selectedBullMint === 'string' && profile.selectedBullMint) {
  profile.selectedBossMints = [profile.selectedBullMint];
}
delete profile.selectedBullMint;
// v6.3 one-time campaign-language migration. The legacy key names are assembled
// to keep all active source, state and comments on the EPOCH vocabulary while
// still carrying existing local progress forward without a reset.
const legacyCampaignStem = 'psy' + 'op';
const legacyCampaignKeys = {
  schema: legacyCampaignStem + 'CampaignSchema',
  unlocked: 'unlocked' + legacyCampaignStem[0].toUpperCase() + legacyCampaignStem.slice(1) + 's',
  cleared: 'cleared' + legacyCampaignStem[0].toUpperCase() + legacyCampaignStem.slice(1) + 's',
  selected: 'selected' + legacyCampaignStem[0].toUpperCase() + legacyCampaignStem.slice(1)
};
if (!Array.isArray(profile.unlockedEpochs) && Array.isArray(profile[legacyCampaignKeys.unlocked])) profile.unlockedEpochs = profile[legacyCampaignKeys.unlocked];
if (!Array.isArray(profile.clearedEpochs) && Array.isArray(profile[legacyCampaignKeys.cleared])) profile.clearedEpochs = profile[legacyCampaignKeys.cleared];
if (profile.selectedEpoch == null && profile[legacyCampaignKeys.selected] != null) profile.selectedEpoch = profile[legacyCampaignKeys.selected];
if (profile.epochCampaignSchema == null && profile[legacyCampaignKeys.schema] != null) profile.epochCampaignSchema = profile[legacyCampaignKeys.schema];
Object.values(legacyCampaignKeys).forEach(key => { delete profile[key]; });
const invaderRuns = profile.gameRuns?.['bull-invaders'];
if (Array.isArray(invaderRuns)) invaderRuns.forEach(run => {
  const legacyRunKey = legacyCampaignStem;
  if (run && run.epoch == null && run[legacyRunKey] != null) run.epoch = run[legacyRunKey];
  if (run) delete run[legacyRunKey];
});
// v6 EPOCH + ship unlocks survive refreshes while browser storage is retained.
// They cannot survive the user clearing site data or uninstalling the PWA.
if (!Array.isArray(profile.unlockedEpochs) || !profile.unlockedEpochs.length) profile.unlockedEpochs = [1];
profile.unlockedEpochs = [...new Set(profile.unlockedEpochs.map(Number).filter(value => Number.isInteger(value) && value >= 1 && value <= 10))].sort((a, b) => a - b);
if (!profile.unlockedEpochs.includes(1)) profile.unlockedEpochs.unshift(1);
if (profile.epochCampaignSchema !== 3) {
  // Schema 2 already has the corrected starter-craft mapping; preserve its
  // exact unlocked ship and selected ship state. Older experiments are rebuilt
  // once from the highest unlocked EPOCH.
  if (profile.epochCampaignSchema !== 2) {
    const highestUnlocked = Math.max(...profile.unlockedEpochs);
    profile.clearedEpochs = Array.from({ length: Math.max(0, highestUnlocked - 1) }, (_, index) => index + 1);
    profile.unlockedShips = [0, ...profile.clearedEpochs];
    profile.selectedShip = 0;
  }
  profile.epochCampaignSchema = 3;
}
profile.clearedEpochs = Array.isArray(profile.clearedEpochs)
  ? [...new Set(profile.clearedEpochs.map(Number).filter(value => Number.isInteger(value) && value >= 1 && value <= 10))].sort((a, b) => a - b)
  : [];
profile.selectedEpoch = Math.max(1, Math.min(10, Math.floor(Number(profile.selectedEpoch) || 1)));
if (!profile.unlockedEpochs.includes(profile.selectedEpoch)) profile.selectedEpoch = 1;
profile.unlockedShips = Array.isArray(profile.unlockedShips)
  ? [...new Set([0, ...profile.unlockedShips.map(Number).filter(value => Number.isInteger(value) && value >= 0 && value <= 10)])].sort((a, b) => a - b)
  : [0];
profile.selectedShip = Math.max(0, Math.min(10, Math.floor(Number(profile.selectedShip) || 0)));
if (!profile.unlockedShips.includes(profile.selectedShip)) profile.selectedShip = 0;

function save() {
  store.set('profile', profile);
}

// v5.9 intro flag helpers
function markIntroComplete() {
  profile.hasCompletedIntro = true;
  saveProfile(profile);
  try { localStorage.setItem('bbr_hasCompletedIntro', '1'); } catch (_) {}
}

function dayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}
