"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, ExternalLink, FlaskConical } from "lucide-react";

import {
  seedTenantBillingPendingAction,
  updateTenantBillingStatusAction,
} from "@/app/actions/admin/tenantBillingAdminActions";
import { TENANT_BILLING_STATUS, type TenantBillingStatus } from "@/app/lib/billing/constants";
import type { TenantDeploymentRow } from "@/app/lib/server/adminOnboardingDeployments";

type Props = {
  tenants: TenantDeploymentRow[];
  stripeCheckoutUrl: string | null;
};

function billingBadgeClass(status: TenantDeploymentRow["billingStatus"]): string {
  if (status === TENANT_BILLING_STATUS.ACTIVE) {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  if (status === TENANT_BILLING_STATUS.PAST_DUE) {
    return "border border-rose-500/20 bg-rose-500/10 text-rose-400";
  }
  if (status === TENANT_BILLING_STATUS.PENDING) {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-400";
  }
  return "border border-slate-700 bg-slate-900/60 text-slate-500";
}

function billingHoldPreviewUrl(slug: string, status: TenantBillingStatus | null): string {
  const params = new URLSearchParams({
    tenant: slug,
    status: status ?? TENANT_BILLING_STATUS.PENDING,
  });
  return `/account/billing-hold?${params.toString()}`;
}

export default function TenantBillingAdminClient({ tenants, stripeCheckoutUrl }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ status: "idle" | "success" | "error"; text: string }>({
    status: "idle",
    text: "",
  });
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function runMutation(
    slug: string,
    action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>,
  ) {
    if (isBusy) return;
    setIsBusy(true);
    setBusySlug(slug);
    setFeedback({ status: "idle", text: "" });

    try {
      const result = await action();
      if (result.ok) {
        setFeedback({ status: "success", text: result.message });
        router.refresh();
      } else {
        setFeedback({ status: "error", text: result.error });
      }
    } catch (error) {
      setFeedback({
        status: "error",
        text: error instanceof Error ? error.message : "Billing update failed.",
      });
    } finally {
      setIsBusy(false);
      setBusySlug(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/90">
          Commercial entitlement console
        </p>
        <h1 className="text-2xl font-semibold text-slate-50">Tenant billing & upgrade testing</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          Mark design-partner workspaces as paid, simulate billing holds, and preview the operator
          checkout surfaces. Restricted to GLOBAL_ADMIN and designated BUSINESS_ADMIN operators.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <a
          href={stripeCheckoutUrl ?? "/pricing"}
          target={stripeCheckoutUrl ? "_blank" : undefined}
          rel={stripeCheckoutUrl ? "noopener noreferrer" : undefined}
          className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-4 transition hover:bg-emerald-950/35"
        >
          <CreditCard className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
          <span>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-emerald-200">
              Stripe checkout (Command Tier)
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              {stripeCheckoutUrl
                ? "Open hosted payment link in a new tab"
                : "Configure NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL or use /pricing"}
            </span>
          </span>
          <ExternalLink className="ml-auto h-4 w-4 text-emerald-500/80" aria-hidden />
        </a>

        <Link
          href="/admin/onboarding"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4 transition hover:border-slate-700"
        >
          <FlaskConical className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
          <span>
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-cyan-200">
              Tenant onboarding
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Provision workspaces and mint invite tokens
            </span>
          </span>
        </Link>
      </section>

      {feedback.status !== "idle" ? (
        <p
          className={`rounded border px-3 py-2 font-mono text-[11px] ${
            feedback.status === "success"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
              : "border-rose-500/30 bg-rose-950/20 text-rose-200"
          }`}
          role={feedback.status === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#070e20]/40 p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            No tenant workspaces found
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-[#070e20]/40 shadow-2xl backdrop-blur-md">
          <div className="hidden grid-cols-12 gap-3 border-b border-slate-800 bg-slate-950/60 px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400 md:grid">
            <div className="col-span-3">Workspace</div>
            <div className="col-span-2">Billing</div>
            <div className="col-span-7">Actions</div>
          </div>

          <ul className="divide-y divide-slate-800/80">
            {tenants.map((tenant) => {
              const rowBusy = isBusy && busySlug === tenant.slug;
              const holdUrl = billingHoldPreviewUrl(tenant.slug, tenant.billingStatus);

              return (
                <li key={tenant.tenantUuid} className="px-4 py-4 md:px-6">
                  <div className="grid gap-4 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-3">
                      <p className="font-sans text-sm font-semibold text-slate-100">{tenant.company}</p>
                      <p className="font-mono text-[11px] text-slate-500">{tenant.slug}</p>
                      <a
                        href={tenant.workspaceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400 hover:underline"
                      >
                        Open workspace
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </div>

                    <div className="md:col-span-2">
                      <span
                        className={`inline-flex rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${billingBadgeClass(tenant.billingStatus)}`}
                      >
                        {tenant.billingStatus ?? "UNTRACKED"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 md:col-span-7">
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() =>
                          runMutation(tenant.slug, () =>
                            updateTenantBillingStatusAction(
                              tenant.slug,
                              TENANT_BILLING_STATUS.ACTIVE,
                            ),
                          )
                        }
                        className="h-9 rounded border border-emerald-600/50 bg-emerald-950/30 px-3 font-mono text-[10px] font-bold uppercase tracking-wide text-emerald-200 disabled:opacity-40"
                      >
                        Mark paid
                      </button>
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() =>
                          runMutation(tenant.slug, () => seedTenantBillingPendingAction(tenant.slug))
                        }
                        className="h-9 rounded border border-amber-600/50 bg-amber-950/30 px-3 font-mono text-[10px] font-bold uppercase tracking-wide text-amber-200 disabled:opacity-40"
                      >
                        {rowBusy ? "Updating…" : "Test hold"}
                      </button>
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() =>
                          runMutation(tenant.slug, () =>
                            updateTenantBillingStatusAction(
                              tenant.slug,
                              TENANT_BILLING_STATUS.PAST_DUE,
                            ),
                          )
                        }
                        className="h-9 rounded border border-rose-600/50 bg-rose-950/30 px-3 font-mono text-[10px] font-bold uppercase tracking-wide text-rose-200 disabled:opacity-40"
                      >
                        Past due
                      </button>
                      <Link
                        href={holdUrl}
                        target="_blank"
                        className="inline-flex h-9 items-center rounded border border-slate-700 px-3 font-mono text-[10px] uppercase tracking-wide text-slate-300 hover:border-slate-500"
                      >
                        Preview hold UI
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
