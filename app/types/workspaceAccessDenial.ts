export type WorkspaceAccessDenialReason =
  | "never_provisioned"
  | "revoked"
  | "activation_pending"
  | "no_workspace_access";

export type AssignedWorkspaceAccess = {
  slug: string;
  name: string;
  loginUrl: string;
};

export type WorkspaceAccessDenialContext = {
  reason: WorkspaceAccessDenialReason;
  tenantSlug: string | null;
  tenantName: string | null;
  tenantUuid: string | null;
  /** Workspaces the operator can still enter (excludes the denied host scope). */
  assignedWorkspaces: AssignedWorkspaceAccess[];
};
