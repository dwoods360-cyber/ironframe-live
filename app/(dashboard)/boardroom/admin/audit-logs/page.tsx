import { unstable_noStore as noStore } from "next/cache";

import { getSecureAuditLogs, type SerializedAuditLog } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Security audit log | Ironframe Boardroom",
  description: "Immutable financial and orchestration event log for tenant workspaces.",
};

interface Props {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function AdminAuditLogsPage({ searchParams }: Props) {
  noStore();
  const { tenant } = await searchParams;
  const currentTenant = tenant?.trim() || "acorp";

  let logs: SerializedAuditLog[] = [];
  let errorMsg: string | null = null;

  try {
    logs = await getSecureAuditLogs(currentTenant);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Failed to load audit logs.";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Security Audit Log</h1>
          <p className="text-sm text-zinc-400">
            Immutable financial and orchestration event log for:{" "}
            <span className="font-mono text-emerald-400">{currentTenant}</span>
          </p>
        </div>
        <span className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 font-mono text-xs text-zinc-300">
          WORM Mode: Active
        </span>
      </div>

      {errorMsg ? (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">
          Security gate triggered: {errorMsg}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950">
          <table className="min-w-full divide-y divide-zinc-800 text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/50 font-mono text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action Signature</th>
                <th className="p-4 text-right">Value (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-mono text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-zinc-500">
                    No telemetry events recorded for this lifecycle node.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dollarValue = (
                    Number.parseInt(log.amountReceivedCents, 10) / 100
                  ).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  });

                  return (
                    <tr key={log.id} className="transition-colors hover:bg-zinc-900/40">
                      <td className="p-4 text-zinc-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-semibold text-emerald-400">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium text-white">{dollarValue}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
