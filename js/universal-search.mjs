const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const SIGNATURE_MIN = 64;
const SIGNATURE_MAX = 90;
const ADDRESS_MIN = 32;
const ADDRESS_MAX = 50;

export function classifyPublicChainQuery(value) {
  const query = String(value ?? '').trim();
  if (!query) return Object.freeze({ kind: 'empty', query: '' });

  if (BASE58.test(query) && query.length >= SIGNATURE_MIN && query.length <= SIGNATURE_MAX) {
    return Object.freeze({
      kind: 'transaction-signature',
      query,
      destination: 'transaction'
    });
  }

  if (BASE58.test(query) && query.length >= ADDRESS_MIN && query.length <= ADDRESS_MAX) {
    return Object.freeze({
      kind: 'solana-address',
      query,
      destination: 'resolve-address',
      explanation: 'Resolve as wallet, mint, token account, program, or asset before labeling.'
    });
  }

  return Object.freeze({
    kind: 'search-text',
    query,
    destination: 'search',
    explanation: 'Search known labels without treating the text as an on-chain identifier.'
  });
}

export function searchRequest(value) {
  const classified = classifyPublicChainQuery(value);
  return Object.freeze({
    ...classified,
    readOnly: true,
    permitsSigning: false,
    permitsSubmission: false
  });
}
