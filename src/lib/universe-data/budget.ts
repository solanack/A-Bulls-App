import type { BudgetPolicy, ProviderUsage } from "./contracts";

export const DEFAULT_BUDGET_POLICY: BudgetPolicy = {
  provider: "helius",
  monthlyLimit: 1_000_000,
  circuitBreakerRatio: 0.75,
};

export function monthKey(timestamp = Date.now()) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

export function normalizeBudgetPolicy(policy: BudgetPolicy): BudgetPolicy {
  return {
    provider: policy.provider,
    monthlyLimit: Math.max(1, Math.trunc(policy.monthlyLimit)),
    circuitBreakerRatio: Math.min(0.95, Math.max(0.5, policy.circuitBreakerRatio)),
  };
}

export function circuitBreakerLimit(policy: BudgetPolicy) {
  const normalized = normalizeBudgetPolicy(policy);
  return Math.floor(normalized.monthlyLimit * normalized.circuitBreakerRatio);
}

export function canReserveProviderUnits(
  usage: Pick<ProviderUsage, "unitsSpent">,
  policy: BudgetPolicy,
  requestedUnits: number,
) {
  const units = Math.max(0, Math.trunc(requestedUnits));
  return usage.unitsSpent + units <= circuitBreakerLimit(policy);
}

export function usageCoverage(unitsSpent: number, policy: BudgetPolicy) {
  const limit = circuitBreakerLimit(policy);
  if (unitsSpent >= limit) return "stale" as const;
  if (unitsSpent >= limit * 0.9) return "degraded" as const;
  return "fresh" as const;
}
