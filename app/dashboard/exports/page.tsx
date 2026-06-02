import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import IronqueryExportDashboard from "@/app/components/IronqueryExportDashboard";
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
    redirect("/?exportScope=required");
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto w-full max-w-[min(100%,72rem)]">
        <IronqueryExportDashboard tenantId={context.tenantId} history={context.history} />
      </div>
    </div>
  );
}
