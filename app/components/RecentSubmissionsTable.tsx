/**
 * IRONFRAME STANDARD: Historical audit trail of vendor score fluctuations.
 */

export interface RecentSubmission {
  id: string;
  vendorName: string;
  createdAt: string;
  auditor: string;
  previousScore: number;
  score: number;
  scoreChange: number;
}

export interface RecentSubmissionsTableProps {
  recentSubmissions: RecentSubmission[];
}

export default function RecentSubmissionsTable({ recentSubmissions }: RecentSubmissionsTableProps) {
  return (
    <section className="border-b border-slate-800 bg-slate-900/35 px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">RECENT VENDOR SUBMISSIONS</h2>
        <span className="text-[9px] uppercase text-slate-400">Historical Audit Trail</span>
      </div>

      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full text-[10px] text-slate-200">
          <thead className="border-b border-slate-800 bg-slate-950/80">
            <tr>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">VENDOR</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">SUBMISSION DATE</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">AUDITOR</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">PREVIOUS SCORE</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">NEW SCORE</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-300">CHANGE</th>
            </tr>
          </thead>
          <tbody>
            {recentSubmissions.length === 0 ? (
              <tr className="border-b border-slate-800 bg-slate-900/20">
                <td colSpan={6} className="px-3 py-3 text-center text-[10px] text-slate-400">
                  No submissions recorded yet.
                </td>
              </tr>
            ) : (
              recentSubmissions.map((submission) => {
                const isPositive = submission.scoreChange >= 0;

                return (
                  <tr key={submission.id} className="border-b border-slate-800 bg-slate-900/20">
                    <td className="px-3 py-2 font-semibold text-white">{submission.vendorName}</td>
                    <td className="px-3 py-2 text-slate-300">
                      {new Date(submission.createdAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{submission.auditor}</td>
                    <td className="px-3 py-2 text-slate-300">{submission.previousScore}</td>
                    <td className="px-3 py-2 text-slate-300">{submission.score}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-bold ${
                          isPositive
                            ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                            : "border-red-500/70 bg-red-500/15 text-red-300"
                        }`}
                      >
                        {isPositive ? `+${submission.scoreChange}` : submission.scoreChange}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

