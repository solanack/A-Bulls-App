import { searchRequest } from './universal-search.mjs';

function shortId(value) {
  const text = String(value || '');
  return text.length > 12 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text;
}

export async function askFieldQuery(raw) {
  const request = searchRequest(raw);
  if (request.kind === 'empty') {
    return Object.freeze({ ok: false, line: 'Enter a wallet, tx, token, NFT, or program.', request });
  }

  const base = String(globalThis.BBRConfig?.apiBase || '').replace(/\/$/, '');
  if (!base) {
    return Object.freeze({ ok: false, line: 'Worker is not configured.', request });
  }

  if (request.kind === 'search-text') {
    return Object.freeze({
      ok: true,
      line: `Unlabeled text · ${request.query}`,
      request
    });
  }

  try {
    const response = await fetch(`${base}/api/intelligence/resolve?query=${encodeURIComponent(request.query)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.ok === false) {
      return Object.freeze({
        ok: false,
        line: String(body?.error || 'Chain did not resolve that.'),
        request
      });
    }
    const label = body.label || body.parsedType || body.kind || 'resolved';
    return Object.freeze({
      ok: true,
      line: `${label} · ${shortId(body.address || request.query)}`,
      request,
      data: body
    });
  } catch {
    return Object.freeze({
      ok: false,
      line: 'Worker could not be reached.',
      request
    });
  }
}
