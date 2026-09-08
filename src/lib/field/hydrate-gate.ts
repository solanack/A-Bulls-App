/**
 * Hydrate gate — keep a dense visible prototype when an indexed snapshot
 * would make the Field look empty (galaxy-zero flash-then-vanish).
 *
 * Extends 6c9808e (retain on count === 0) to also retain when legacy
 * coverage is below a visibility floor. Field v0 evidence snapshots may
 * replace even when sparse (real indexed signal > synthetic wallpaper).
 */

import type { UniverseSnapshot } from "./types";

/** Minimum indexed particles before a legacy snapshot may replace the prototype. */
export function visibilityFloor(budgetField: number): number {
  const budget = Number.isFinite(budgetField) ? Math.max(0, Math.trunc(budgetField)) : 0;
  return Math.max(200, Math.floor(budget * 0.08));
}

export function isFieldV0EvidenceSnapshot(snapshot: UniverseSnapshot): boolean {
  if (snapshot.sources?.some((source) => source.includes("indexer-field-v0"))) return true;
  return String(snapshot.samplingPolicy ?? "").includes("indexer-field-v0");
}

/**
 * Whether hydrate should call setSnapshot(indexed) and drop the prototype.
 * Returns false for null/empty (6c9808e) and for sparse legacy snapshots.
 */
export function shouldReplacePrototypeField(
  snapshot: UniverseSnapshot | null | undefined,
  budgetField: number,
): boolean {
  const count = snapshot?.particles?.length ?? 0;
  if (!snapshot || count === 0) return false;
  if (isFieldV0EvidenceSnapshot(snapshot)) return true;
  return count >= visibilityFloor(budgetField);
}

export function sparseHydrateDisclosure(
  deliveryDisclosure: string,
  particleCount: number,
  floor: number,
): string {
  const base = String(deliveryDisclosure ?? "").trim();
  const note = `Indexed snapshot has only ${particleCount} particles (visibility floor ${floor}); keeping the background field visible while live coverage fills in.`;
  return base ? `${base} ${note}` : note;
}
