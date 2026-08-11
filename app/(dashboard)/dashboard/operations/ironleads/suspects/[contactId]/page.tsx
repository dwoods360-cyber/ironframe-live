import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AccountResearchBriefPanel from "@/app/(dashboard)/dashboard/operations/ironleads/suspects/AccountResearchBriefPanel";
import SuspectOperatorEditPanel from "@/app/(dashboard)/dashboard/operations/ironleads/suspects/SuspectOperatorEditPanel";
import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { discardIronleadsSuspectContact } from "@/app/lib/server/ironleadsOsintNoisePurgeCore";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SUSPECT report | Ironleads",
  description: "Why this lead is in the SUSPECT queue and not yet PROSPECT.",
};

type PageProps = {
  params: Promise<{ contactId: string }>;
  searchParams: Promise<{ dossier?: string }>;
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

export default async function IronleadsSuspectReportPage({
  params,
  searchParams,
}: PageProps) {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  const { contactId } = await params;
  const query = await searchParams;
  const report = await buildIronleadsSuspectReport(contactId);
  if (!report) {
    notFound();
  }

  // Directive / article titles must not remain as SUSPECT accounts.
  if (looksLikeOsintTitleNoise(report.company)) {
    await discardIronleadsSuspectContact(contactId);
    redirect(
      `/dashboard/operations/ironleads?discarded=${encodeURIComponent(contactId)}&company=${encodeURIComponent(report.company)}`,
    );
  }

  // Promoted deals leave the SUSPECT intake URL unless operator explicitly asks for dossier.
  if (report.deal?.stage === "PROSPECT" && query.dossier !== "1") {
    redirect(
      `/dashboard/operations/ironleads?promoted=${encodeURIComponent(contactId)}&company=${encodeURIComponent(report.company)}`,
    );
  }

  // HOLD archive parks leave the active queue — bounce to SUSPECT list unless dossier=1 (HOLD archive open).
  if (report.operatorHold && query.dossier !== "1") {
    redirect(
      `/dashboard/operations/ironleads?held=${encodeURIComponent(contactId)}&company=${encodeURIComponent(report.company)}`,
    );
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
            {report.deal?.stage === "PROSPECT"
              ? "PROSPECT — promoted from Ironleads"
              : "SUSPECT intake report"}
          </p>
          <h1 className="text-2xl font-bold text-white">{report.company}</h1>
          <p className="text-sm text-slate-400">
            Stage {report.deal?.stage ?? "—"} · tenant {report.tenantSlug} · score{" "}
            {report.priorityScore}
            {report.detectedTrigger ? ` · ${report.detectedTrigger}` : ""}
          </p>
          {report.deal?.stage === "PROSPECT" ? (
            <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
              Promoted to PROSPECT. Next:{" "}
              <Link
                href="/dashboard/operations/salesteam"
                className="font-medium text-emerald-300 underline hover:text-emerald-200"
              >
                SalesTeam portal
              </Link>{" "}
              → poll for draft → Approvals DISPATCH. This page is the intake dossier, not the
              outbound queue.
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Flag ok={report.channelReadiness.hasRealEmail} label="real email" />
            <Flag ok={report.channelReadiness.hasPhone} label="phone" />
            <Flag ok={report.channelReadiness.reachable} label="reachable" />
            <Flag
              ok={report.deal?.stage === "PROSPECT"}
              label={report.deal?.stage === "PROSPECT" ? "prospect" : "suspect"}
            />
            {report.operatorHold ? (
              <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide bg-amber-950/60 text-amber-200 ring-1 ring-amber-800">
                hold archive
              </span>
            ) : null}
          </div>
        </header>

        {report.operatorHold ? (
          <section className="rounded-xl border border-amber-900/50 bg-amber-950/25 p-4 text-sm text-amber-100">
            <p className="font-semibold">In HOLD archive</p>
            <p className="mt-1 text-xs text-amber-200/90">
              {report.operatorHold.classification} · parked {report.operatorHold.at}
            </p>
            <p className="mt-2 text-sm text-slate-300">{report.operatorHold.reason}</p>
            <p className="mt-2 text-xs text-slate-500">
              Retrieve from Ironleads portal → HOLD archive, or restore below.
            </p>
          </section>
        ) : null}

        {report.mailFootprint ? (
          <section className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-5">
            <h2 className="text-lg font-semibold text-sky-100">Domain mail footprint</h2>
            <p className="mt-1 text-xs text-slate-400">
              Public DNS only (MX / SPF / DMARC). Decision aid — not mailbox ownership. Pattern-guess
              emails stay unverified even when MX PASS.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Flag
                ok={report.mailFootprint.mxOk === true}
                label={
                  report.mailFootprint.mxOk === true
                    ? "mx ok"
                    : report.mailFootprint.mxOk === false
                      ? "mx missing"
                      : "mx unknown"
                }
              />
              <Flag ok={report.mailFootprint.spfPresent} label="spf" />
              <Flag ok={report.mailFootprint.dmarcPresent} label="dmarc" />
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ring-1 ${
                  report.mailFootprint.catchAllRisk === "high"
                    ? "bg-rose-950/50 text-rose-300 ring-rose-900"
                    : report.mailFootprint.catchAllRisk === "elevated"
                      ? "bg-amber-950/50 text-amber-200 ring-amber-800"
                      : "bg-slate-900 text-slate-300 ring-slate-700"
                }`}
              >
                catch-all {report.mailFootprint.catchAllRisk}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Domain
                </dt>
                <dd className="mt-0.5 font-mono text-slate-200">{report.mailFootprint.domain}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Provider guess
                </dt>
                <dd className="mt-0.5 text-slate-200">{report.mailFootprint.providerLabel}</dd>
              </div>
              {report.mailFootprint.dmarcPolicy ? (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    DMARC policy
                  </dt>
                  <dd className="mt-0.5 font-mono text-slate-200">
                    p={report.mailFootprint.dmarcPolicy}
                  </dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  MX hosts
                </dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-slate-300">
                  {report.mailFootprint.mxHosts.length > 0
                    ? report.mailFootprint.mxHosts.join(", ")
                    : report.mailFootprint.mxError ?? "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-sky-100/90">{report.mailFootprint.operatorNote}</p>
            <p className="mt-2 font-mono text-[10px] text-slate-600">
              checked {report.mailFootprint.checkedAt}
            </p>
          </section>
        ) : null}

        {report.accountResearchBrief ? (
          <AccountResearchBriefPanel brief={report.accountResearchBrief} contactId={report.contactId} />
        ) : null}

        <SuspectOperatorEditPanel contactId={report.contactId} report={report} />

        {report.buyingCommittee ? (
          <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-5">
            <h2 className="text-lg font-semibold text-violet-100">
              Buying committee (raw evidence)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Supporting extract for the Account Research Brief above. LinkedIn URLs are review links
              only (not scraped). Pattern emails stay unverified until published or confirmed.
              Research runs format+MX hygiene (routability risk only — not ownership proof).
              {report.buyingCommittee.researchedAt
                ? ` · ${report.buyingCommittee.researchedAt}`
                : ""}
            </p>
            {report.buyingCommittee.socialProfiles.length > 0 ? (
              <details className="mt-3 rounded-lg border border-violet-900/30 bg-slate-950/50 px-3 py-2">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-violet-300">
                  Public social links
                  {report.buyingCommittee.socialPagesFetched > 0
                    ? ` · ${report.buyingCommittee.socialPagesFetched} about page(s) fetched`
                    : ""}
                </summary>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {report.buyingCommittee.socialProfiles.map((row) => (
                    <li key={row.url} className="text-slate-300">
                      <span className="font-mono uppercase text-violet-200/90">{row.network}</span>
                      {" · "}
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-cyan-300 hover:underline"
                      >
                        {row.url}
                      </a>
                      <span className="text-slate-500">
                        {" "}
                        ({row.kind}
                        {row.fetchable ? "" : " · link only"})
                      </span>
                      {row.note ? (
                        <div className="mt-0.5 text-[11px] text-slate-500">{row.note}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
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
                          <span className="text-amber-200/80">
                            ({[row.status, row.mailboxLabel].filter(Boolean).join(" · ")})
                          </span>
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
              {[
                report.namedBuyer.title,
                report.namedBuyer.role,
                report.namedBuyer.location,
                report.namedBuyer.announcedAt,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {report.namedBuyer.email ? (
              <p className="mt-2 font-mono text-sm text-emerald-200">
                {report.namedBuyer.email}
                {report.namedBuyer.emailStatus
                  ? ` · ${report.namedBuyer.emailStatus}`
                  : ""}
              </p>
            ) : null}
            {report.namedBuyer.linkedinUrl ? (
              <p className="mt-2 break-all font-mono text-xs">
                <a
                  href={report.namedBuyer.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 hover:underline"
                >
                  {report.namedBuyer.linkedinUrl}
                </a>
              </p>
            ) : null}
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
              Pattern guesses only — do not clear PLACEHOLDER_EMAIL until confirmed.{" "}
              <span className="text-slate-500">
                mx_ok = domain accepts mail (not proof the mailbox exists).
              </span>
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
                    {[row.status, row.confidence, row.mailboxLabel, row.role]
                      .filter(Boolean)
                      .join(" · ")}
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

        {report.deal?.stage === "PROSPECT" ? (
          <section className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5">
            <h2 className="text-lg font-semibold text-emerald-100">Next phase (PROSPECT)</h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
              {report.whyNotProspectQueue}
            </p>
            <Link
              href="/dashboard/operations/salesteam"
              className="mt-4 inline-flex rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100 hover:border-emerald-500"
            >
              Open SalesTeam portal →
            </Link>
          </section>
        ) : (
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
        )}

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
          {report.dealNotesDisplay.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Deal notes</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
                {report.dealNotesDisplay.map((line, index) => (
                  <li key={`${index}-${line.slice(0, 48)}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.qualificationDisplay ? (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Qualification signals
              </p>
              <p className="mt-2 text-sm text-slate-300">{report.qualificationDisplay.summary}</p>
              <dl className="mt-3 space-y-2 text-sm">
                {report.qualificationDisplay.rows.map((row) => (
                  <div key={row.label}>
                    <dt className="text-[10px] uppercase tracking-widest text-slate-500">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 text-slate-200">{row.value}</dd>
                  </div>
                ))}
              </dl>
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
