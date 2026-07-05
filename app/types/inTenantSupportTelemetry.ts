export type InTenantSupportUrgency = "ROUTINE" | "AUDIT_BLOCKER" | "DATA_INTEGRITY";

export type InTenantSupportObjective =
  | "WORKSPACE_ACTIVATION"
  | "ONBOARDING_PROFILE"
  | "INTEGRITY_REVIEW"
  | "ANALYST_EXPORT"
  | "BILLING_ENTITLEMENT"
  | "TENANT_ACCESS"
  | "COMPLIANCE_MAPPING"
  | "EVIDENCE_VAULT"
  | "TRAINING_DOCUMENTATION"
  | "OTHER";

export type InTenantSupportClientContext = {
  surface?: string;
  path?: string;
};

export type InTenantSupportTicketInput = {
  urgency: InTenantSupportUrgency;
  objective: InTenantSupportObjective;
  userNotes: string;
  attachTelemetry: boolean;
  context?: InTenantSupportClientContext;
  clientTimestamp?: string;
  clientLatencyMs?: number;
  frameworkContext?: string;
};

export type InTenantSupportTelemetry = {
  capturedAt: string;
  tenant: {
    uuid: string;
    slug: string;
    name: string;
  };
  operator: {
    userId: string | null;
    email: string | null;
    roles: string[];
  };
  billing: {
    status: string | null;
    exportEntitled: boolean;
  };
  profileScope: {
    aleBaselineCents: string;
    exportScopeReady: boolean;
    exportKey: string | null;
    companyProfilePresent: boolean;
  };
  systemState: {
    recentIronguardViolations: number;
    recentDiagnosticAborts: number;
    isUnderTargetedSiege: boolean;
  };
  client: {
    surface: string | null;
    path: string | null;
  };
};
