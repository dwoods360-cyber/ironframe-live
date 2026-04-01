import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import prisma from "@/lib/prisma";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";
import { formatAuditTimestampForDisplay } from "@/app/utils/formatAuditTimestamp";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import DispositionControls from "./DispositionControls";

function ActionSourceBadge({ action, hostile }: { action: string; hostile: boolean }) {
  const upper = action.toUpperCase();
  if (upper === "QUARANTINED_BY_IRONLOCK" || upper === "EXTERNAL_INJECTION_ATTEMPT") {
    return (
      <span className="inline-block rounded bg-red-600 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white">
        {action}
      </span>
    );
  }
  if (
    upper === "KIMBOT_SIMULATION" ||
    upper === "KIMBOT_DETECTION" ||
    upper === "KIMBOT_THREAT_INGESTED" ||
    upper === "IRONBLOOM_SIMULATION" ||
    /KIMBOT/i.test(action) ||
    /IRONBLOOM/i.test(action)
  ) {
    return (
      <span className="inline-block rounded bg-blue-900 px-2 py-1 text-xs font-bold uppercase tracking-wider text-blue-200">
        {action}
      </span>
    );
  }
  if (
    upper === "GRCBOT_SIMULATION" ||
    /GRCBOT/i.test(action) ||
    upper === "AI_QUOTA_FALLBACK"
  ) {
    return (
      <span className="inline-block rounded bg-purple-900 px-2 py-1 text-xs font-bold uppercase tracking-wider text-purple-200">
        {action}
      </span>
    );
  }
  return (
    <span className={hostile ? "font-bold text-red-100" : "text-slate-300"}>{action}</span>
  );
}

function IronqueryGuidanceBlock({ insight }: { insight: string | null | undefined }) {
  const text = insight?.trim();
  const hasInsight = Boolean(text);
  return (
    <div
      className="min-w-[260px] max-w-md rounded-lg border-2 border-indigo-500/35 bg-gradient-to-b from-indigo-950/50 to-slate-950/80 px-3 py-2.5 text-xs leading-relaxed text-indigo-100 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-400/20"
      role="region"
      aria-label="Ironquery AI guidance"
    >
      <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-wide text-indigo-200">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
        <Bot className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
        <span>AI Guidance</span>
        <span className="rounded bg-indigo-900/80 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-indigo-200/95">
          Ironquery / CoreIntel
        </span>
      </div>
      <p className={`whitespace-pre-wrap ${hasInsight ? "text-indigo-50" : "italic text-indigo-300/80"}`}>
        {hasInsight
          ? text
          : "No AI guidance on this row yet. Irongate ingress and CoreIntel populate aiReport when available."}
      </p>
    </div>
  );
}

function DetailsCell({ details, hostile }: { details: string; hostile?: boolean }) {
  const trimmed = details.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return (
        <pre
          className={`max-h-40 max-w-md overflow-auto whitespace-pre-wrap break-all rounded border p-2 text-[10px] ${
            hostile
              ? "border-red-800 bg-red-950/80 text-red-100"
              : "border-slate-800 bg-slate-950/80 text-slate-300"
          }`}
        >
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      /* fall through */
    }
  }
  return (
    <p
      className={`max-h-40 max-w-md overflow-auto whitespace-pre-wrap break-words text-[11px] ${
        hostile ? "font-bold text-red-100" : "text-slate-300"
      }`}
    >
      {details}
    </p>
  );
}

export default async function ClearancePage() {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });

  const queue = company
    ? await prisma.threatEvent.findMany({
        where: {
          status: { in: CLEARANCE_QUEUE_STATUSES },
          tenantCompanyId: company.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          sourceAgent: true,
          createdAt: true,
          ingestionDetails: true,
          aiReport: true,
        },
      })
    : [];

  return (
    <div className="min-h-full bg-slate-950 px-6 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-[11px] font-semibold text-amber-100"
          role="status"
        >
          🛡️ IRONGATE SECURE VIEW: Pipeline-stage threats (primary database). Promote to the active ledger
          after verification.
        </div>

        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wide text-white">
              Quarantine Queue
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              ThreatEvent rows in PIPELINE for your tenant — pending verification and promotion.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            ← Dashboard
          </Link>
        </div>

        {queue.length === 0 ? (
          <p className="rounded border border-slate-800 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-400">
            No pending pipeline threats. Queue is clear.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40 shadow-xl">
            <table className="w-full min-w-[960px] border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90">
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-400">
                    Disposition
                  </th>
                  <th className="min-w-[280px] px-4 py-3 font-bold uppercase tracking-wider text-indigo-300/95">
                    AI Guidance (Ironquery)
                  </th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-400">Id</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-400">
                    Title
                  </th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-400">Action</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-400">
                    Created
                  </th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-400">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.map((threat) => {
                  const hostile =
                    /QUARANTINED|IRONLOCK|EXTERNAL_INJECTION/i.test(threat.sourceAgent) ||
                    /QUARANTINED|IRONLOCK/i.test(threat.title);
                  const detailsText = threat.ingestionDetails ?? threat.title;
                  return (
                  <tr
                    key={threat.id}
                    className={
                      hostile
                        ? "border-b border-red-900/80 bg-red-950/50 align-top hover:bg-red-950/60"
                        : "border-b border-slate-800/80 align-top hover:bg-slate-900/60"
                    }
                  >
                    <td className="px-4 py-3 align-top">
                      <DispositionControls
                        threatId={threat.id}
                        ingestionDetails={threat.ingestionDetails}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <IronqueryGuidanceBlock insight={threat.aiReport} />
                    </td>
                    <td className={`px-4 py-3 font-mono text-[10px] ${hostile ? "font-bold text-red-300" : "text-slate-400"}`}>{threat.id}</td>
                    <td className={`max-w-[200px] px-4 py-3 ${hostile ? "font-bold text-red-200" : "text-slate-200"}`}>{threat.title}</td>
                    <td className="px-4 py-3">
                      <ActionSourceBadge action={threat.sourceAgent} hostile={hostile} />
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 ${hostile ? "font-bold text-red-200" : "text-slate-400"}`}>
                      {formatAuditTimestampForDisplay(threat.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <DetailsCell details={detailsText} hostile={hostile} />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
