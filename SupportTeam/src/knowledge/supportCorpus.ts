export type SupportPlayEntry = {
  id: string;
  title: string;
  tier: 'T1_CRITICAL' | 'T2_ELEVATED' | 'T3_ROUTINE';
  triggers: string[];
  resolutionSteps: string[];
};

export const SUPPORT_KNOWLEDGE_CORPUS: Record<string, SupportPlayEntry> = {
  'tenant-access-403': {
    id: 'tenant-access-403',
    title: 'Tenant subdomain / Ironguard 403 triage',
    tier: 'T1_CRITICAL',
    triggers: ['403', 'tenant', 'unauthorized', 'ironguard'],
    resolutionSteps: [
      'Confirm operator session email matches tenant membership row.',
      'Verify ironframe-tenant cookie UUID matches active workspace.',
      'Check Ironguard violation ledger for strike-2 / hard-ban within 7d.',
      'Re-bind tenant via workspace switcher; never bypass RLS with service role in UI.',
    ],
  },
  'auth-session-drift': {
    id: 'auth-session-drift',
    title: 'Auth session / password recovery drift',
    tier: 'T2_ELEVATED',
    triggers: ['login', 'password', 'session', 'callback'],
    resolutionSteps: [
      'Use full email (not username) at /login.',
      'Clear localhost cookies; retry /forgot-password in same browser.',
      'Confirm Supabase redirect URLs include /reset-password for active host.',
    ],
  },
  'billing-hold': {
    id: 'billing-hold',
    title: 'Billing hold / Stripe webhook lag',
    tier: 'T2_ELEVATED',
    triggers: ['billing', 'stripe', 'hold', 'subscription'],
    resolutionSteps: [
      'Check /account/billing-hold for tenant billing state.',
      'Verify Stripe webhook delivery in operator logs.',
      'Escalate to GLOBAL_ADMIN if hold persists after successful payment.',
    ],
  },
  'routine-docs': {
    id: 'routine-docs',
    title: 'LEVEL_1 documentation grounding',
    tier: 'T3_ROUTINE',
    triggers: ['how', 'where', 'docs', 'configure'],
    resolutionSteps: [
      'Ground response in LEVEL_1 app_documents only.',
      'Point operator to /docs hub for authoritative procedures.',
      'Queue human co-sign if manuals do not cover the anomaly.',
    ],
  },
};

export function resolveSupportPlayIds(input: {
  urgency: string;
  objective: string;
  userNotes: string;
  frameworkContext?: string | null;
}): string[] {
  const haystack = [input.urgency, input.objective, input.userNotes, input.frameworkContext ?? '']
    .join(' ')
    .toLowerCase();

  const matches = Object.values(SUPPORT_KNOWLEDGE_CORPUS).filter((play) =>
    play.triggers.some((trigger) => haystack.includes(trigger)),
  );

  if (matches.length > 0) {
    return matches.slice(0, 3).map((play) => play.id);
  }

  if (input.urgency === 'DATA_INTEGRITY') return ['tenant-access-403'];
  if (input.urgency === 'AUDIT_BLOCKER') return ['billing-hold', 'auth-session-drift'];
  return ['routine-docs'];
}

export function urgencyToSeverityTier(urgency: string): 'T1_CRITICAL' | 'T2_ELEVATED' | 'T3_ROUTINE' {
  if (urgency === 'DATA_INTEGRITY') return 'T1_CRITICAL';
  if (urgency === 'AUDIT_BLOCKER') return 'T2_ELEVATED';
  return 'T3_ROUTINE';
}
