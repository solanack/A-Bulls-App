import type { ThesisCitation, ThesisResolution } from "@/lib/universe-data/contracts";

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

export type ThesisTargetKind = "star" | "planet";
export type ThesisStatus = "draft" | "open" | "resolved";

export type ThesisRecord = {
  id: string;
  targetKind: ThesisTargetKind;
  targetId: string;
  galaxyId: string;
  claim: string;
  body: string;
  replayWindowId: string | null;
  fromTs: number;
  toTs: number;
  status: ThesisStatus;
  createdAt: number;
  updatedAt: number;
  citations: readonly ThesisCitation[];
  resolution: ThesisResolution | null;
};

export type ThesisListResponse = {
  ok: boolean;
  coverage: "fresh" | "empty" | "degraded";
  items: readonly ThesisRecord[];
  disclosure: string;
  targetKind?: ThesisTargetKind;
  targetId?: string;
  error?: string;
};

export type PublishThesisInput = {
  targetKind: "star";
  targetId: string;
  galaxyId: string;
  claim: string;
  body: string;
  replayWindowId?: string | null;
  fromTs: number;
  toTs: number;
  citations: readonly ThesisCitation[];
};

export type PublishThesisResponse = {
  ok: boolean;
  id?: string;
  status?: "open";
  targetKind?: "star";
  targetId?: string;
  citations?: readonly ThesisCitation[];
  createdAt?: number;
  error?: string;
  coverage?: "degraded";
};

export const THESIS_ACCOUNT_POLICY = Object.freeze({
  identityRequired: true,
  walletProofStored: false,
  walletConnectionEnabled: false,
  chainExecutionEnabled: false,
});

export const SOCIAL_RELEASE_POLICY =
  "Account-based SocialFi only. Public-chain observation is enabled; wallet connection, wallet signing, trading, token launch, custody, and the A Bulls App token are disabled.";
