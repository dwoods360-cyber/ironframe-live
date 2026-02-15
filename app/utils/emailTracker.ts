export type TrackedEmailRecord = {
  id: string;
  sentTime: string;
  recipientEmail: string;
  recipientTitle: string;
  subject: string;
  readStatus: "PENDING";
};

type SendEmailInput = {
  recipientEmail: string;
  recipientTitle: string;
  subject: string;
  body: string;
};

const trackingLog: TrackedEmailRecord[] = [];

export function sendEmailWithTracking(input: SendEmailInput): TrackedEmailRecord {
  const record: TrackedEmailRecord = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sentTime: new Date().toISOString(),
    recipientEmail: input.recipientEmail,
    recipientTitle: input.recipientTitle,
    subject: input.subject,
    readStatus: "PENDING",
  };

  trackingLog.unshift(record);

  console.log("EMAIL_TRACKER_LOG", {
    sentTime: record.sentTime,
    recipientTitle: record.recipientTitle,
    readStatus: record.readStatus,
    recipientEmail: record.recipientEmail,
    subject: record.subject,
    bodyLength: input.body.length,
  });

  return record;
}

export function getEmailTrackingLog() {
  return trackingLog.slice(0, 200);
}
