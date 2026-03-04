'use client';

export interface AuditLog {
  id: string;
  createdAt: Date | string;
  action: string;
  threatId: string;
  details: string;
}

export default function ExportCSVButton({ logs }: { logs: AuditLog[] }) {
  const handleExport = () => {
    const headers = ['Timestamp', 'Action', 'Threat ID', 'Details'];
    const csvRows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      `"${log.action.replace(/"/g, '""')}"`,
      `"${log.threatId.replace(/"/g, '""')}"`,
      `"${(log.details ?? '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={logs.length === 0}
      className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Download CSV
    </button>
  );
}
