const truthy = (value) => String(value ?? "").toLowerCase() === "true";

export function socialCapabilities(env = {}) {
  const socialEnabled = truthy(env.SOCIALFI_ENABLED);
  const writesEnabled = socialEnabled && truthy(env.SOCIALFI_WRITES_ENABLED);
  return Object.freeze({
    socialEnabled,
    writesEnabled,
    identityRequired: true,
    walletConnectionEnabled: false,
    walletSigningEnabled: false,
    tradingEnabled: false,
    tokenLaunchEnabled: false,
    nativeTokenEnabled: false,
    available: Object.freeze([
      "public-discovery",
      "evidence-feed",
      "profiles",
      "follows",
      "watchlists",
      "creator-channels",
      "galaxy-communities",
      "non-transferable-reputation",
    ]),
    unavailable: Object.freeze([
      "wallet-connect",
      "wallet-ownership-claim",
      "wallet-signing",
      "swap",
      "copy-trade",
      "token-create",
      "liquidity-actions",
      "custody",
      "native-token",
    ]),
    releasePolicy:
      "Account-based SocialFi only. Public-chain observation is enabled; wallet connection, wallet signing, trading, token launch, custody, and the A Bulls App token are disabled.",
  });
}

export function walletExecutionPolicy(env = {}) {
  const requested =
    truthy(env.WALLET_CONNECTION_ENABLED) ||
    truthy(env.WALLET_SIGNING_ENABLED) ||
    truthy(env.TRADING_ENABLED) ||
    truthy(env.TOKEN_LAUNCH_ENABLED) ||
    truthy(env.NATIVE_TOKEN_ENABLED);
  return Object.freeze({
    requested,
    enabled: false,
    adapter: "disabled",
    reason: requested
      ? "Wallet execution flags cannot activate this release. A separately reviewed execution adapter is required."
      : "Wallet execution is disabled by release policy.",
  });
}

export function requireSocialWrites(env = {}) {
  const capabilities = socialCapabilities(env);
  if (!capabilities.socialEnabled) return { ok: false, status: 404, error: "feature_disabled" };
  if (!capabilities.writesEnabled)
    return { ok: false, status: 403, error: "social_writes_disabled" };
  return { ok: true, status: 200, error: null };
}
