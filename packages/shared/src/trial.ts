export const STARTER_TRIAL_DAYS = 14;

export type TrialTenantLike = {
  plan: string;
  planStatus: string;
  trialEndsAt: string;
};

export function planHasFreeTrial(plan: string): boolean {
  return plan === "STARTER";
}

export function isStarterTrialActive(tenant: TrialTenantLike, now = new Date()): boolean {
  if (tenant.plan !== "STARTER") return false;
  if (tenant.planStatus !== "TRIALING") return false;
  return now.getTime() <= new Date(tenant.trialEndsAt).getTime();
}

export function starterTrialDaysLeft(tenant: TrialTenantLike, now = new Date()): number {
  const end = new Date(tenant.trialEndsAt).getTime();
  const ms = end - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isStarterTrialExpired(tenant: TrialTenantLike, now = new Date()): boolean {
  if (tenant.plan !== "STARTER") return false;
  if (tenant.planStatus !== "TRIALING") return false;
  return now.getTime() > new Date(tenant.trialEndsAt).getTime();
}

export function effectivePlanStatus(tenant: TrialTenantLike): string {
  if (tenant.plan !== "STARTER" && tenant.planStatus === "TRIALING") return "ACTIVE";
  return tenant.planStatus;
}
