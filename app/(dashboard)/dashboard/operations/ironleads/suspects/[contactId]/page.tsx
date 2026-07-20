import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import SuspectOperatorEditPanel from "@/app/(dashboard)/dashboard/operations/ironleads/suspects/SuspectOperatorEditPanel";
import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SUSPECT report | Ironleads",
  description: "Why this lead is in the SUSPECT queue and not yet PROSPECT.",
};

type PageProps = {
  params: Promise<{ contactId: string }>;
};

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
        ok
          ? "bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-800"
          : "bg-rose-950/50 text-rose-300 ring-1 ring-rose-900"
      }`}
    >
      {label}
    </span>
  );
}

export default async function IronleadsSuspectReportPage({ params }: PageProps) {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  const { contactId } = await params;
  const report = await buildIronleadsSuspectReport(contactId);
  if (!report) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/operations/ironleads"
              className="text-xs text-cyan-300 hover:underline"
            >
              ← Ironleads portal
            </Link>
            <span className="text-slate-600">·</span>
            <Link
              href="/dashboard/operations?tab=crm"
              className="text-xs text-cyan-300 hover:underline"
            >
              Ops Hub CRM
            </Link>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            SUSPECT intake report
          </p>
          <h1 className="text-2xl font-bold text-white">{report.company}</h1>
          <p className="text-sm text-slate-400">
            Stage {report.deal?.stage ?? "—"} · tenant {report.tenantSlug} · score{" "}
            {report.priorityScore}
            {report.detectedTrigger ? ` · ${report.detectedTrigger}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Flag ok={report.channelReadiness.hasRealEmail} label="real email" />
            <Flag ok={report.channelReadiness.hasPhone} label="phone" />
            <Flag ok={report.channelReadiness.reachable} label="reachable" />
            <Flag
              ok={report.deal?.stage === "PROSPECT"}
              label={report.deal?.stage === "PROSPECT" ? "prospect" : "suspect"}
            />
          </div>
        </header>

        <SuspectOperatorEditPanel contactId={report.contactId} report={report} />

        {report.buyingCommittee ? (
          <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-5">
            <h2 className="text-lg font-semibold text-violet-100">Buying committee research</h2>
            <p className="mt-1 text-xs text-slate-400">
              Lead-gen OSINT for economic buyers (CEO / CFO / CISO / …). Pattern emails stay
              unverified until published or confirmed.
              {report.buyingCommittee.researchedAt
                ? ` · ${report.buyingCommittee.researchedAt}`
                : ""}
            </p>
            {report.buyingCommittee.skipped ? (
              <p className="mt-3 text-sm text-amber-200/90">
                Skipped: {report.buyingCommittee.skipReason ?? "no researchable company signal"}
              </p>
            ) : null}
            {report.buyingCommittee.members.length === 0 && !report.buyingCommittee.skipped ? (
              <p className="mt-3 text-sm text-slate-500">No buying roles extracted yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {report.buyingCommittee.members.map((member) => (
                  <li
                    key={`${member.role}-${member.fullName ?? "unknown"}`}
                    className="rounded-lg border border-violet-900/40 bg-slate-950/40 px-3 py-3"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-widest text-violet-300">
                      {member.role}
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {member.fullName ?? "Name not extracted"}
                    </div>
                    {member.title ? (
                      <div className="mt-0.5 text-xs text-slate-400">{member.title}</div>
                    ) : null}
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      {member.emails.map((row) => (
                        <div key={row.email} className="break-all font-mono">
                          email: {row.email}{" "}
                          <span className="text-amber-200/80">({row.status})</span>
                        </div>
                      ))}
                      {member.phones.map((row) => (
                        <div key={row.phone} className="font-mono">
                          phone: {row.phone}{" "}
                          <span className="text-slate-500">
                            ({row.kind} · {row.status})
                          </span>
                        </div>
                      ))}
                    </div>
                    {member.note ? (
                      <p className="mt-2 text-xs text-slate-500">{member.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {report.namedBuyer ? (
          <section className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5">
            <h2 className="text-lg font-semibold text-emerald-100">Named buyer (public signal)</h2>
            <p className="mt-2 text-xl font-medium text-white">{report.namedBuyer.fullName}</p>
            <p className="mt-1 text-sm text-slate-300">
              {[report.namedBuyer.title, report.namedBuyer.location, report.namedBuyer.announcedAt]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {report.namedBuyer.trigger ? (
              <p className="mt-2 font-mono text-xs text-emerald-300/90">
                Trigger confirmed: {report.namedBuyer.trigger}
              </p>
            ) : null}
            {report.namedBuyer.note ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{report.namedBuyer.note}</p>
            ) : null}
            {report.namedBuyer.sourceUrls.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {report.namedBuyer.sourceUrls.map((url) => (
                  <li key={url} className="break-all font-mono text-xs">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {report.candidateEmails.length > 0 ? (
          <section className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5">
            <h2 className="text-lg font-semibold text-amber-100">
              Candidate emails (unverified)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Pattern guesses only — do not clear PLACEHOLDER_EMAIL until confirmed.
            </p>
            <ul className="mt-3 space-y-3">
              {report.candidateEmails.map((row) => (
                <li
                  key={`${row.person}-${row.email}`}
                  className="rounded-lg border border-amber-900/30 bg-slate-950/40 px-3 py-2"
                >
                  <div className="text-sm font-medium text-slate-100">{row.person}</div>
                  <div className="mt-0.5 break-all font-mono text-xs text-cyan-300">{row.email}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-amber-200/80">
                    {[row.status, row.confidence, row.role].filter(Boolean).join(" · ")}
                  </div>
                  {row.note ? (
                    <p className="mt-1 text-xs text-slate-500">{row.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {report.executiveSponsor ? (
          <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              Executive / board sponsor (context)
            </h2>
            <p className="mt-2 text-xl font-medium text-white">
              {report.executiveSponsor.fullName}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {[
                report.executiveSponsor.title,
                report.executiveSponsor.roleSince
                  ? `CEO since ${report.executiveSponsor.roleSince}`
                  : null,
                report.executiveSponsor.chairmanSince
                  ? `Chairman since ${report.executiveSponsor.chairmanSince}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {report.executiveSponsor.note ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {report.executiveSponsor.note}
              </p>
            ) : null}
            {report.executiveSponsor.sourceUrls.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {report.executiveSponsor.sourceUrls.map((url) => (
                  <li key={url} className="break-all font-mono text-xs">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-semibold text-white">Why in the SUSPECT queue</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{report.whyInSuspectQueue}</p>
        </section>

        <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-5">
          <h2 className="text-lg font-semibold text-amber-100">Why not in the PROSPECT queue</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-50/90">
            {report.whyNotProspectQueue}
          </p>
          {report.blockers.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {report.blockers.map((blocker) => (
                <li
                  key={blocker.code}
                  className="rounded-lg border border-amber-900/40 bg-slate-950/40 px-3 py-3"
                >
                  <div className="text-sm font-medium text-amber-100">{blocker.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{blocker.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-semibold text-white">Contact & deal facts</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Full name</dt>
              <dd className="mt-0.5 text-slate-200">{report.fullName}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Email</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-slate-200">{report.email}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Phone</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-200">
                {report.phone?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Website</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-slate-200">
                {report.websiteUrl ? (
                  <a
                    href={report.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-300 hover:underline"
                  >
                    {report.websiteUrl}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">
                Brick-and-mortar address
              </dt>
              <dd className="mt-0.5 text-sm text-slate-200">{report.addressLine || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Domain</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-200">
                {report.deal?.accountDomain || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Sector</dt>
              <dd className="mt-0.5 text-slate-200">{report.industrySector || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Ingestion</dt>
              <dd className="mt-0.5 text-slate-200">{report.ingestionSource}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Deal</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-400">
                {report.deal?.id ?? "none"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Updated</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-400">{report.updatedAt}</dd>
            </div>
          </dl>
          {report.websiteContact ? (
            <div className="mt-4 rounded-lg border border-cyan-900/40 bg-cyan-950/20 p-3">
              <p className="text-[10px] uppercase tracking-widest text-cyan-400">
                Contact from company website
              </p>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">
                    Website phone
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-200">
                    {report.websiteContact.phone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">
                    Website email
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs text-slate-200">
                    {report.websiteContact.email || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">
                    Contact page
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">
                    {report.websiteContact.contactPageUrl ? (
                      <a
                        href={report.websiteContact.contactPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300 hover:underline"
                      >
                        {report.websiteContact.contactPageUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                {report.websiteContact.note ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-widest text-slate-500">Note</dt>
                    <dd className="mt-0.5 text-xs text-slate-400">{report.websiteContact.note}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          {report.deal?.notes?.trim() ? (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Deal notes</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/50 p-3 font-mono text-xs text-slate-300">
                {report.deal.notes}
              </pre>
            </div>
          ) : null}
          {report.qualificationSignals &&
          typeof report.qualificationSignals === "object" &&
          Object.keys(report.qualificationSignals as object).length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Qualification signals
              </p>
              <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50 p-3 font-mono text-xs text-slate-300">
                {JSON.stringify(report.qualificationSignals, null, 2)}
              </pre>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5">
          <h2 className="text-lg font-semibold text-cyan-100">Next actions</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-200">
            {report.nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
