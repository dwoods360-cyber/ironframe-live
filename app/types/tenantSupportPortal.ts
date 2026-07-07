export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "DISPATCHED"
  | "PURGED";

/** Tenant-visible support ticket wire — no worker drafts or CRM summary blobs. */
export type TenantSafeSupportTicket = {
  id: string;
  status: SupportTicketStatus;
  subject: string;
  urgency: string;
  objective: string;
  objectiveLabel: string;
  userNotes: string;
  path: string | null;
  surface: string | null;
  frameworkContext: string | null;
  contactName: string;
  contactEmail: string;
  company: string;
  occurredAt: string;
  resolutionText: string | null;
};
