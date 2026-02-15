import { AdhocNotificationGroup } from "@/app/store/systemConfigStore";
import { appendAuditLog } from "@/app/utils/auditLogger";

export type MailHubReadStatus = "PENDING" | "ACKNOWLEDGED";
export type MailHubPriority = "LOW" | "NORMAL" | "HIGH";
export type MailHubCadenceMilestone = "90" | "60" | "30";

export type MailHubRecord = {
  id: string;
  sentAt: string;
  recipientEmail: string;
  recipientTitle: string;
  subject: string;
  body: string;
  channel: "SOC" | "ADHOC_GROUP" | "STAKEHOLDER_BLAST" | "VENDOR_DOC_REQUEST" | "CADENCE_90_VENDOR" | "CADENCE_30_STAKEHOLDER";
  approvedSenderName: string;
  approvedSenderEmail: string;
  requireReadReceipt: boolean;
  trackingPixelUrl: string;
  priority: MailHubPriority;
  cadenceMilestone: MailHubCadenceMilestone | null;
  readStatus: MailHubReadStatus;
  readAt: string | null;
  vendorName?: string;
};

type MailHubState = {
  outbound: MailHubRecord[];
  inboundSoc: Array<{ id: string; receivedAt: string; from: string; subject: string; body: string }>;
};

type SendMailInput = {
  recipientEmail: string;
  recipientTitle: string;
  subject: string;
  body: string;
  channel: MailHubRecord["channel"];
  requireReadReceipt?: boolean;
  priority?: MailHubPriority;
  cadenceMilestone?: MailHubCadenceMilestone;
  vendorName?: string;
};

const APPROVED_SENDER = {
  name: "Dereck",
  email: "dereck@ironframe.local",
};

const listeners = new Set<() => void>();

let mailHubState: MailHubState = {
  outbound: [],
  inboundSoc: [],
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

function nextMailId() {
  return `mail-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createTrackingPixelUrl(id: string) {
  return `/api/mail/receipt/${id}.png`;
}

function sendTrackedMail(input: SendMailInput) {
  const id = nextMailId();
  const sentAt = new Date().toISOString();
  const requireReadReceipt = input.requireReadReceipt ?? true;

  const record: MailHubRecord = {
    id,
    sentAt,
    recipientEmail: input.recipientEmail,
    recipientTitle: input.recipientTitle,
    subject: input.subject,
    body: input.body,
    channel: input.channel,
    approvedSenderName: APPROVED_SENDER.name,
    approvedSenderEmail: APPROVED_SENDER.email,
    requireReadReceipt,
    trackingPixelUrl: createTrackingPixelUrl(id),
    priority: input.priority ?? "NORMAL",
    cadenceMilestone: input.cadenceMilestone ?? null,
    readStatus: "PENDING",
    readAt: null,
    vendorName: input.vendorName,
  };

  mailHubState = {
    ...mailHubState,
    outbound: [record, ...mailHubState.outbound].slice(0, 500),
  };

  appendAuditLog({
    action_type: "EMAIL_SENT",
    description: `${record.subject} -> ${record.recipientTitle} (${record.recipientEmail}) [${record.channel}]`,
  });

  emitChange();
  return record;
}

export function sendSocDepartmentEmail(input: Omit<SendMailInput, "channel">) {
  return sendTrackedMail({
    ...input,
    channel: "SOC",
    requireReadReceipt: true,
  });
}

export function receiveSocDepartmentEmail(message: { from: string; subject: string; body: string }) {
  mailHubState = {
    ...mailHubState,
    inboundSoc: [
      {
        id: nextMailId(),
        receivedAt: new Date().toISOString(),
        from: message.from,
        subject: message.subject,
        body: message.body,
      },
      ...mailHubState.inboundSoc,
    ].slice(0, 200),
  };

  const autoReceipt = sendTrackedMail({
    recipientEmail: message.from,
    recipientTitle: "SOC Sender",
    subject: `Auto-Receipt: ${message.subject}`,
    body: "SOC department received your message.",
    channel: "SOC",
    requireReadReceipt: false,
  });

  emitChange();
  return autoReceipt;
}

export function sendAdhocGroupNotification(slot: 1 | 2 | 3, group: AdhocNotificationGroup, message: string) {
  return sendTrackedMail({
    recipientEmail: group.emails,
    recipientTitle: `Ad-hoc Group Slot ${slot}`,
    subject: group.name ? `GRC Group Notification: ${group.name}` : `GRC Group Notification Slot ${slot}`,
    body: message,
    channel: "ADHOC_GROUP",
    requireReadReceipt: group.includeReadReceipt,
  });
}

export function sendStakeholderBlast(input: { recipientEmail: string; recipientTitle: string; subject: string; body: string; requireReadReceipt: boolean; }) {
  return sendTrackedMail({
    recipientEmail: input.recipientEmail,
    recipientTitle: input.recipientTitle,
    subject: input.subject,
    body: input.body,
    channel: "STAKEHOLDER_BLAST",
    requireReadReceipt: input.requireReadReceipt,
  });
}

export function sendVendorDocumentUpdateRequest(
  vendorName: string,
  vendorEmail: string,
  template: string,
  options?: { cadenceMilestone?: MailHubCadenceMilestone; priority?: MailHubPriority },
) {
  return sendTrackedMail({
    recipientEmail: vendorEmail,
    recipientTitle: "Vendor Compliance Contact",
    subject: `Document Update Request // ${vendorName}`,
    body: `${template}\n\nTracking Pixel: mandatory read receipt enabled.`,
    channel: "VENDOR_DOC_REQUEST",
    requireReadReceipt: true,
    cadenceMilestone: options?.cadenceMilestone,
    priority: options?.priority ?? "NORMAL",
    vendorName,
  });
}

export function sendVendorUpcomingExpirationReminder(vendorName: string, vendorEmail: string, daysUntilExpiration: number) {
  return sendTrackedMail({
    recipientEmail: vendorEmail,
    recipientTitle: "Vendor Compliance Contact",
    subject: `Upcoming Expiration (Low Priority) // ${vendorName}`,
    body: `Courtesy Reminder: your compliance evidence package expires in ${Math.max(daysUntilExpiration, 0)} days. Please prepare updated artifacts.`,
    channel: "CADENCE_90_VENDOR",
    requireReadReceipt: true,
    priority: "LOW",
    cadenceMilestone: "90",
    vendorName,
  });
}

export function sendStakeholderCadenceEscalation(input: {
  recipientEmail: string;
  recipientTitle: string;
  vendorName: string;
  daysUntilExpiration: number;
  priority: MailHubPriority;
  requireReadReceipt: boolean;
}) {
  return sendTrackedMail({
    recipientEmail: input.recipientEmail,
    recipientTitle: input.recipientTitle,
    subject: `High Priority // 30-Day Vendor Lapse Alert // ${input.vendorName}`,
    body: `Vendor ${input.vendorName} evidence expires in ${Math.max(input.daysUntilExpiration, 0)} days. This 30-day escalation is auto-routed to CISO and Legal Counsel.`,
    channel: "CADENCE_30_STAKEHOLDER",
    requireReadReceipt: input.requireReadReceipt,
    priority: input.priority,
    cadenceMilestone: "30",
    vendorName: input.vendorName,
  });
}

export function logReadReceipt(mailId: string) {
  let updated = false;

  mailHubState = {
    ...mailHubState,
    outbound: mailHubState.outbound.map((mail) => {
      if (mail.id !== mailId || mail.readStatus === "ACKNOWLEDGED") {
        return mail;
      }

      updated = true;
      return {
        ...mail,
        readStatus: "ACKNOWLEDGED",
        readAt: new Date().toISOString(),
      };
    }),
  };

  if (updated) {
    emitChange();
  }
}

export function getUnresponsiveVendorRequests(now = Date.now()) {
  const timeoutMs = 48 * 60 * 60 * 1000;

  return mailHubState.outbound.filter((mail) => {
    if (mail.channel !== "VENDOR_DOC_REQUEST" || !mail.vendorName) {
      return false;
    }

    if (mail.readStatus === "ACKNOWLEDGED") {
      return false;
    }

    const ageMs = now - new Date(mail.sentAt).getTime();
    return ageMs >= timeoutMs;
  });
}

export function subscribeMailHub(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMailHubSnapshot() {
  return mailHubState;
}

export function getOutboundMailLog() {
  return mailHubState.outbound.slice(0, 500);
}
