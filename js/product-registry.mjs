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
