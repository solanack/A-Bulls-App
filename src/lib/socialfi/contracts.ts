export type SocialFeedScope = "discover" | "following" | "watchlist" | "creators";

export type SocialCapabilities = {
  socialEnabled: boolean;
  writesEnabled: boolean;
  identityRequired: boolean;
  walletConnectionEnabled: false;
  walletSigningEnabled: false;
  tradingEnabled: false;
  tokenLaunchEnabled: false;
  nativeTokenEnabled: false;
  available: readonly string[];
  unavailable: readonly string[];
  releasePolicy: string;
};

export type SocialActor = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  reputation: number;
  evidenceAccuracy: number | null;
};

export type SocialFeedItem = {
  id: string;
  kind: "post" | "observation" | "alert" | "creator-note";
  body: string;
  createdAt: number;
  galaxyId: string | null;
  tokenId: string | null;
  evidenceId: string | null;
  actor: SocialActor;
  reactions: number;
  replies: number;
  coverage: string | null;
};

export type SocialFeedResponse = {
  ok: boolean;
  scope: SocialFeedScope;
  items: readonly SocialFeedItem[];
  nextCursor: string | null;
  disclosure: string;
};

export const SOCIAL_RELEASE_POLICY =
  "Account-based SocialFi only. Public-chain observation is enabled; wallet connection, wallet signing, trading, token launch, custody, and the A Bulls App token are disabled.";
