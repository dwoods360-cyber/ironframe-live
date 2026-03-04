'use client';

import { useState, useMemo } from 'react';

export type AuditLogRow = {
  id: string;
  createdAt: string;
  action: string;
  threatId: string;
  details: string;
};

export default function AuditLogsTable({ logs }: { logs: AuditLogRow[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter(
      (row) =>
        row.threatId.toLowerCase().includes(term) ||
        row.action.toLowerCase().includes(term) ||
        row.details.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Threat ID, Action, or User..."
          className="w-full rounded-lg border border-slate-700 bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-0 focus:ring-offset-slate-950"
          aria-label="Search audit logs"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Timestamp</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">User</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Action</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Threat ID</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {logs.length === 0
                      ? 'No audit log entries yet.'
                      : 'No matching audit records found.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800/80 transition-colors hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400">—</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{row.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-300">{row.threatId}</td>
                    <td className="max-w-md truncate px-4 py-3 text-slate-300">{row.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
