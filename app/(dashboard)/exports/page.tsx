import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import IronqueryExportDashboard from "@/app/components/IronqueryExportDashboard";
import ExportScopeRequiredPanel from "@/app/components/IronqueryExportScopeRequiredPanel";
import { getIronqueryExportDashboardContext } from "@/app/actions/ironqueryExportActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Analyst Exports | Ironframe",
  description: "Epic 16 sealed compliance export ledger and secure analyst pack downloads.",
};

export default async function AnalystExportsPage() {
  noStore();
  const context = await getIronqueryExportDashboardContext();
  if (!context.ok) {
    if (context.code === "BILLING_HOLD") {
      const tenantQuery = context.tenantSlug
        ? `tenant=${encodeURIComponent(context.tenantSlug)}&`
        : "";
      redirect(
        `/account/billing-hold?${tenantQuery}status=${encodeURIComponent(context.billingStatus ?? "PENDING")}`,
      );
    }
    return <ExportScopeRequiredPanel message={context.error} />;
  }

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto w-full max-w-[min(100%,72rem)]">
        <IronqueryExportDashboard tenantId={context.tenantId} history={context.history} />
      </div>
    </div>
  );
}
