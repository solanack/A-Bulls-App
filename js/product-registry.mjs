const PRODUCTS = Object.freeze([
  Object.freeze({
    id: 'universe',
    label: 'Universe',
    description: 'Explore a truthful live window into Solana activity.',
    tier: 'primary',
    order: 1,
    icon: 'orbit'
  }),
  Object.freeze({
    id: 'intelligence',
    label: 'Intelligence',
    description: 'Investigate wallets, transactions, tokens, NFTs, and markets with evidence.',
    tier: 'primary',
    order: 2,
    icon: 'lens'
  }),
  Object.freeze({
    id: 'trickster',
    label: 'Trickster',
    description: 'Turn verified blockchain data into cinematic stories and video.',
    tier: 'primary',
    order: 3,
    icon: 'story'
  }),
  Object.freeze({
    id: 'games',
    label: 'Games',
    description: 'Enter Bull Invaders and other interactive experiences.',
    tier: 'primary',
    order: 4,
    icon: 'games'
  }),
  Object.freeze({
    id: 'media',
    label: 'Media Workspace',
    description: 'Arrange and control simultaneous media panels.',
    tier: 'secondary',
    order: 5,
    icon: 'media'
  }),
  Object.freeze({
    id: 'communities',
    label: 'Community Integrations',
    description: 'Open optional Bullpen, Ansem, Ansem.io, and future community tools.',
    tier: 'secondary',
    order: 6,
    icon: 'community'
  }),
  Object.freeze({
    id: 'profile',
    label: 'Profile',
    description: 'Manage local presentation and preferences.',
    tier: 'utility',
    order: 7,
    icon: 'profile'
  })
]);

export function productRegistry({ includeSecondary = true, includeUtility = true } = {}) {
  return PRODUCTS.filter((product) => {
    if (product.tier === 'secondary') return includeSecondary;
    if (product.tier === 'utility') return includeUtility;
    return true;
  });
}

export function primaryProducts() {
  return productRegistry({ includeSecondary: false, includeUtility: false });
}

export function productById(id) {
  return PRODUCTS.find((product) => product.id === id) ?? null;
}
