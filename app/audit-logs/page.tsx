import Link from 'next/link';
import prismaDmz from '@/lib/prisma-dmz';
import ExportCSVButton from '@/components/ExportCSVButton';
import AuditLogsTable from './AuditLogsTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AuditLogsPage() {
  const logs = await prismaDmz.threatActivityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const serializedLogs = logs.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    action: row.action,
    threatId: row.threatId,
    details: row.details,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-400 hover:text-white"
            >
              ← Dashboard
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Master Audit Ledger
            </h1>
          </div>
          <ExportCSVButton logs={serializedLogs} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <AuditLogsTable logs={serializedLogs} />
      </div>
    </div>
  );
}
