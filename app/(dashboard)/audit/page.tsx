import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import MetaAuditConsole from "@/app/components/MetaAuditConsole";
import GrcAuditSummary from "@/app/components/GrcAuditSummary";
import {
  getMetaAuditConsoleAccess,
  listIntegrityLedgerForMetaAudit,
} from "@/app/actions/auditActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Integrity & Audit | Ironframe",
  description: "Meta-audit export and manifest verification console.",
};

export default async function AuditPage() {
  noStore();
  const access = await getMetaAuditConsoleAccess();
  if (!access.canAccess || !access.tenantId) {
    redirect("/");
  }

  const integrityLedger = await listIntegrityLedgerForMetaAudit(access.tenantId, 75);

  return (
    <div className="min-h-0 bg-slate-950 px-4 pt-3 pb-4 text-slate-100 md:px-8">
      <div className="mx-auto w-full max-w-[min(100%,72rem)]">
        <MetaAuditConsole
          tenantId={access.tenantId}
          canAccess
          integrityLedger={integrityLedger}
        />
        <div className="mt-10 border-t border-slate-800/80 pt-8">
          <GrcAuditSummary embedded />
        </div>
      </div>
    </div>
  );
}
