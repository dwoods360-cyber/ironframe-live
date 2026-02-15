import Link from "next/link";

export default function AuditTrailPage() {
  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="text-[11px] font-bold uppercase tracking-wide text-white">Audit Trail Relocated</h1>
        <p className="mt-2 text-[10px] text-slate-300">
          The audit intelligence feed is now available at the reports sub-page.
        </p>
        <Link
          href="/reports/audit-trail"
          className="mt-3 inline-flex rounded border border-blue-500/70 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase text-blue-300"
        >
          Open Reports Audit Trail
        </Link>
      </section>
    </div>
  );
}
