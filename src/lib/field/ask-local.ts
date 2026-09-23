import type { FieldRoom } from "./galaxies.ts";

export type LocalTrader = { room: FieldRoom; wallet: string; handle: string | null; displayName: string };
export type LocalToken = { room: FieldRoom; mint: string; symbol: string | null; name: string | null };
export type LocalRegistryItem = { symbol: string; name: string; cashSymbol: string; mintHint?: string };
export type AskIndex = { traders: readonly LocalTrader[]; tokens: readonly LocalToken[] };

export type AskResolution =
  | { kind: "trader"; trader: LocalTrader; via: "wallet" | "handle" | "callsign" | "name" }
  | { kind: "token"; token: LocalToken; via: "mint" | "xstock" | "symbol" }
  | { kind: "identifier"; query: string }
  | { kind: "miss"; query: string };

export const ASK_MISS_LINE = "Not in the local index yet.";

const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
const EVM = /^0x[a-fA-F0-9]{40}(?:[a-fA-F0-9]{24})?$/;

export function walletCallsign(wallet: string) {
  return wallet.length >= 8 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet;
}

function fold(value: string) {
  return value.trim().toLowerCase();
}

function callsignKey(value: string) {
  return value.trim().toLowerCase().replace(/\.{2,3}|…|\s+/g, "…");
}

export function looksLikePublicIdentifier(query: string) {
  const text = query.trim();
  return SOLANA.test(text) || EVM.test(text);
}

/**
 * Resolve Ask input against data already on the device, in the locked order:
 * exact mint, xStock registry, Index token symbol, FOMO handle, Afterbell callsign.
 * Only a well-formed public identifier falls through to the provider resolver.
 */
export function resolveLocal(rawQuery: string, index: AskIndex, registry: readonly LocalRegistryItem[]): AskResolution {
  const query = rawQuery.trim();
  if (!query) return { kind: "miss", query };
  const key = fold(query);
  const bare = key.replace(/^[@$]/, "");

  const tokenByMint = index.tokens.find((token) => fold(token.mint) === key);
  if (tokenByMint) return { kind: "token", token: tokenByMint, via: "mint" };
  const registryByMint = registry.find((item) => item.mintHint && fold(item.mintHint) === key);
  if (registryByMint?.mintHint) return { kind: "token", token: { room: "afterbell", mint: registryByMint.mintHint, symbol: registryByMint.symbol, name: registryByMint.name }, via: "mint" };
  const traderByWallet = index.traders.find((trader) => fold(trader.wallet) === key);
  if (traderByWallet) return { kind: "trader", trader: traderByWallet, via: "wallet" };

  const listed = registry.find((item) => fold(item.symbol) === bare || fold(item.cashSymbol) === bare);
  if (listed) {
    const market = index.tokens.find((token) => token.room === "afterbell" && token.symbol && fold(token.symbol) === fold(listed.symbol));
    const mint = market?.mint ?? listed.mintHint ?? null;
    if (mint) return { kind: "token", token: { room: "afterbell", mint, symbol: listed.symbol, name: listed.name }, via: "xstock" };
  }

  const tokenBySymbol = index.tokens.find((token) => token.symbol && fold(token.symbol) === bare);
  if (tokenBySymbol) return { kind: "token", token: tokenBySymbol, via: "symbol" };

  const byHandle = index.traders.find((trader) => trader.room === "fomo" && trader.handle && fold(trader.handle) === bare);
  if (byHandle) return { kind: "trader", trader: byHandle, via: "handle" };

  const wanted = callsignKey(query);
  const byCallsign = index.traders.find((trader) => callsignKey(walletCallsign(trader.wallet)) === wanted);
  if (byCallsign) return { kind: "trader", trader: byCallsign, via: "callsign" };

  const byName = index.traders.find((trader) => fold(trader.displayName) === bare);
  if (byName) return { kind: "trader", trader: byName, via: "name" };

  if (looksLikePublicIdentifier(query)) return { kind: "identifier", query };
  return { kind: "miss", query };
}
