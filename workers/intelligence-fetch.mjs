// Bound provider waits so optional enrichment cannot hold a query indefinitely.
export function providerFetch(input, init = {}) {
  const timeout = AbortSignal.timeout(6000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}
