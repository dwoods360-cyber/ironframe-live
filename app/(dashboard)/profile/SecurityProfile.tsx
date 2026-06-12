"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, UserCircle2, ScrollText, GraduationCap, ChevronRight } from "lucide-react";
import { useUser } from "@/app/hooks/useUser";
import { usePermissions } from "@/app/hooks/usePermissions";
import DevRoleSwitcher from "@/app/components/DevRoleSwitcher";
import SystemIntegrityBadge from "@/app/components/SystemIntegrityBadge";
import { formatUserRoleLabel, GRC_ROLE_LABELS, parseWorkspaceRoleFromCookie } from "@/app/lib/grcRoles";
import { useRiskStore } from "@/app/store/riskStore";
import { useTenantContext } from "@/app/context/TenantProvider";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { computeMaturationProgress } from "@/app/utils/analystMaturation";
import type {
  SecurityProfileAssignment,
  SecurityProfileIntegrityRow,
} from "@/app/actions/profileActions";

type Props = {
  initial: {
    userId: string | null;
    email: string | null;
    displayName: string;
    assignments: SecurityProfileAssignment[];
    integrityEvents: SecurityProfileIntegrityRow[];
    cookieDevRole: string | null;
  };
};

function humanizeEventType(r: string): string {
  return r.replace(/_/g, " ");
}

function accessBadgeVisual(role: string): string {
  switch (role) {
    case "GLOBAL_ADMIN":
      return "border-amber-400/70 bg-amber-500/15 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.12)]";
    case "CISO":
    case "DIRECTOR_OF_COMPLIANCE":
      return "border-rose-500/45 bg-rose-950/35 text-rose-100";
    case "GRC_MANAGER":
      return "border-sky-400/60 bg-sky-500/15 text-sky-100";
    case "INTERNAL_AUDITOR":
    case "EXTERNAL_AUDITOR":
      return "border-violet-400/60 bg-violet-500/15 text-violet-100 shadow-[0_0_16px_rgba(167,139,250,0.12)]";
    case "JR_GRC_ANALYST":
    case "SR_GRC_ANALYST":
      return "border-emerald-400/55 bg-emerald-500/12 text-emerald-100";
    case "NO_DB_ROLE":
    default:
      return "border-slate-500/60 bg-slate-800/80 text-slate-200";
  }
}

export default function SecurityProfile({ initial }: Props) {
  const router = useRouter();
  const { displayName, loading: userLoading, userId, email, metadataRole } = useUser();
  const permissions = usePermissions();

  const [, setCookiePoll] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setCookiePoll((n) => n + 1), 1500);
    return () => window.clearInterval(id);
  }, []);

  const analystMaturationByTenant = useRiskStore((s) => s.analystMaturationByTenant);
  const hydrateAnalystMaturationForTenant = useRiskStore((s) => s.hydrateAnalystMaturationForTenant);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const { activeTenantUuid } = useTenantContext();
  const dashboardTenantUuid = useMemo(
    () => resolveDashboardTenantUuid(activeTenantUuid),
    [activeTenantUuid],
  );

  useEffect(() => {
    hydrateAnalystMaturationForTenant(dashboardTenantUuid);
  }, [dashboardTenantUuid, hydrateAnalystMaturationForTenant]);

  const maturationEvents = useMemo(() => {
    return dashboardTenantUuid
      ? (analystMaturationByTenant[dashboardTenantUuid] ?? [])
      : [];
  }, [dashboardTenantUuid, analystMaturationByTenant]);

  const { maturationPercent, masteredCount, totalThreats, isCertified } = useMemo(() => {
    const progress = computeMaturationProgress(maturationEvents, selectedIndustry);
    return {
      maturationPercent: progress.percent,
      masteredCount: progress.mastered,
      totalThreats: progress.total,
      isCertified: progress.isCertified,
    };
  }, [maturationEvents, selectedIndustry]);

  const primaryName = userLoading ? initial.displayName : displayName;
  const activePrismaRole = initial.assignments[0]?.role;
  const accessStyleKey = activePrismaRole ?? "NO_DB_ROLE";
  const accessBadgeDisplay = activePrismaRole
    ? formatUserRoleLabel(activePrismaRole)
    : `${GRC_ROLE_LABELS.JR_GRC_ANALYST} (unprovisioned)`;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 text-slate-200 sm:px-6">
      {/* Page chrome */}
      <div className="flex flex-col gap-4 border-b border-slate-800/90 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-gradient-to-br from-slate-900 to-slate-950 shadow-lg shadow-emerald-950/40">
            <Shield className="h-7 w-7 text-emerald-400" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/90">Governance</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Security profile</h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
              RBAC identity, analyst attestation progress, and integrity ledger excerpts for the signed-in practitioner.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="shrink-0 self-start rounded-lg border border-slate-700 bg-slate-900/90 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-200 transition hover:border-emerald-600/50 hover:text-emerald-200 sm:self-auto"
        >
          Sync server data
        </button>
      </div>

      <SystemIntegrityBadge />

      {/* Task 1: User identity — primary label from session (e.g. Dereck when set in Supabase metadata) */}
      <section className="overflow-hidden rounded-xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 to-slate-950/90 shadow-xl shadow-black/20">
        <div className="border-b border-slate-800/80 bg-slate-900/50 px-5 py-3">
          <div className="flex items-center gap-2 text-emerald-400/95">
            <UserCircle2 className="h-4 w-4" aria-hidden />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-emerald-400/90">User identity</h2>
          </div>
        </div>
        <div className="px-5 py-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Primary identity</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">{primaryName}</p>
            <p className="mt-2 text-xs text-slate-500">
              Sourced from the active Supabase session (display name or email), not from static UI constants.
            </p>
          </div>
          <dl className="mt-6 grid min-w-[240px] gap-3 border-t border-slate-800/80 pt-6 text-xs sm:mt-0 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">Auth user id</dt>
              <dd className="max-w-[180px] truncate font-mono text-[10px] text-slate-400" title={userId || initial.userId || ""}>
                {userId || initial.userId || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">Email</dt>
              <dd className="truncate text-right text-slate-300">{email ?? initial.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">Metadata role</dt>
              <dd className="text-slate-300">{metadataRole}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Access level — Prisma UserRole high-visibility */}
      <section className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Shield className="h-4 w-4" aria-hidden />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-cyan-300/90">Access level</h2>
          </div>
          <span className="rounded border border-slate-700/80 bg-slate-900/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
            UserRoleAssignment
          </span>
        </div>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div
            className={`inline-flex max-w-full items-center gap-2 rounded-lg border-2 px-5 py-3 text-sm font-bold tracking-tight ${accessBadgeVisual(accessStyleKey)}`}
            data-testid="security-profile-access-badge"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-90 animate-pulse" aria-hidden />
            <span className="normal-case leading-snug">{accessBadgeDisplay}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-xs text-slate-500">
            <p>
              <span className="font-semibold text-slate-400">Workspace simulation:</span>{" "}
              <span className="text-emerald-200/90">{formatUserRoleLabel(permissions.role)}</span> (cookie-based dev
              RBAC, not Prisma).
            </p>
            {initial.assignments.length > 1 ? (
              <p className="font-mono text-[10px] text-slate-600">
                +{initial.assignments.length - 1} additional tenant assignment(s) — see{" "}
                <Link href="/integrity" className="text-emerald-500/90 underline-offset-2 hover:underline">
                  integrity hub
                </Link>
                .
              </p>
            ) : null}
          </div>
        </div>

        <details className="mt-5 rounded-lg border border-dashed border-slate-700/80 bg-slate-900/30 px-3 py-2">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-400">
            Dev role switcher
          </summary>
          <div className="mt-3 pb-1">
            <label className="sr-only" htmlFor="dev-grc-role-switcher">
              Simulated workspace role
            </label>
            <DevRoleSwitcher
              value={permissions.role}
              onChange={(next) => {
                if (typeof document === "undefined") return;
                document.cookie = `ironframe-role=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
                window.dispatchEvent(
                  new CustomEvent("ironframe:workspace-role-changed", { detail: { role: next } }),
                );
                router.refresh();
              }}
            />
            {initial.cookieDevRole &&
            parseWorkspaceRoleFromCookie(initial.cookieDevRole) !== permissions.role ? (
              <p className="mt-2 text-[10px] text-slate-600">
                Server cookie snapshot:{" "}
                {formatUserRoleLabel(parseWorkspaceRoleFromCookie(initial.cookieDevRole))}
              </p>
            ) : null}
          </div>
        </details>
      </section>

      {/* Attestation mastery */}
      <section className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-amber-400">
          <GraduationCap className="h-4 w-4" aria-hidden />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-200/90">Attestation mastery</h2>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Analyst maturation — Strategic Intel deep-dives completed for{" "}
          <span className="font-semibold text-slate-400">{selectedIndustry}</span> ({totalThreats} sector threats).
        </p>
        <div className="mb-2 h-3 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-emerald-500 transition-[width] duration-500 ease-out"
            style={{ width: `${maturationPercent}%` }}
            role="progressbar"
            aria-valuenow={maturationPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Analyst maturation percent"
          />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white">
            <span className="tabular-nums text-emerald-400">{masteredCount}</span>
            <span className="text-slate-500"> / </span>
            <span className="tabular-nums text-slate-300">{totalThreats}</span>
            <span className="ml-2 text-slate-500">threats mastered</span>
          </p>
          <p className="text-lg font-bold tabular-nums text-amber-200">{maturationPercent}%</p>
        </div>
        {isCertified ? (
          <p className="mt-3 inline-flex items-center rounded border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
            [ CERTIFIED SECTOR ANALYST ]
          </p>
        ) : null}
      </section>

      {/* Audit trail — table */}
      <section className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-violet-300">
          <ScrollText className="h-4 w-4" aria-hidden />
          <h2 className="text-[11px] font-bold uppercase tracking-widest">Audit trail</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Five most recent <code className="rounded bg-slate-900 px-1 py-0.5 text-[10px] text-slate-400">IntegrityEvent</code>{" "}
          rows for this operator (session id, email, display name, and legacy keys).
        </p>

        {initial.integrityEvents.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-500">
            No integrity events attributed to this operator yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800/90">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Recorded</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Entity id</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {initial.integrityEvents.map((row) => (
                  <tr key={row.id} className="bg-slate-950/40 transition hover:bg-slate-900/50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-slate-400">
                      {new Date(row.createdAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-amber-200/95">{humanizeEventType(row.eventType)}</td>
                    <td className="px-4 py-3 text-slate-400">{row.entityType}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 font-mono text-[10px] text-slate-500" title={row.entityId}>
                      {row.entityId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.source}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{row.tenantId.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Link
          href="/integrity"
          className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-500/90 hover:text-emerald-400"
        >
          Full integrity ledger
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
