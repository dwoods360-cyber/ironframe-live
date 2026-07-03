import type { Resend } from "resend";

/** Resend SDK surface used by Ironboard ingress — typed until upstream exports stabilize. */
export type ResendWebhookVerifyPayload = {
  type?: string;
  data?: Record<string, unknown>;
};

export type ResendIngressClient = Resend & {
  webhooks: {
    verify: (input: {
      payload: string;
      headers: { id: string; timestamp: string; signature: string };
      webhookSecret: string;
    }) => ResendWebhookVerifyPayload;
  };
  emails: Resend["emails"] & {
    receiving: {
      get: (emailId: string) => Promise<{
        error: unknown;
        data: { text?: string; html?: string } | null;
      }>;
    };
  };
};

export function asResendIngressClient(client: Resend): ResendIngressClient {
  return client as ResendIngressClient;
}
