import type {
  AccountResearchBrief,
  AccountResearchBriefBuyer,
  BriefPurchaseRole,
} from "@/app/lib/server/ironleadsAccountResearchBrief";

function coercePurchaseRole(raw: unknown): BriefPurchaseRole {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "economic_buyer" || s === "economic") return "economic_buyer";
  if (
    s === "operational_buyer" ||
    s === "ops" ||
    s === "operational" ||
    s === "technical" ||
    s === "delivery" ||
    s === "sales"
  ) {
    return "operational_buyer";
  }
  if (s === "influencer") return "influencer";
  return "influencer";
}

function coerceBuyerConfidence(
  raw: unknown,
): AccountResearchBriefBuyer["confidence"] {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "low";
}

function GateBadge({ result }: { result: "PASS" | "FAIL" | "UNKNOWN" }) {
  const cls =
    result === "PASS"
      ? "bg-emerald-950/60 text-emerald-300 ring-emerald-800"
      : result === "FAIL"
        ? "bg-rose-950/50 text-rose-300 ring-rose-900"
        : "bg-amber-950/40 text-amber-200 ring-amber-900";
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ring-1 ${cls}`}>
      {result}
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const label = String(status ?? "unknown");
  const hot = label === "HOLD" || label === "DROP" || label === "hold" || label === "drop";
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ring-1 ${
        hot
          ? "bg-rose-950/50 text-rose-200 ring-rose-800"
          : "bg-cyan-950/50 text-cyan-200 ring-cyan-800"
      }`}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

const DEFAULT_COMPETITIVE_CONFLICT: AccountResearchBrief["competitiveConflict"] = {
  proprietaryPlatform: null,
  preferredPartners: [],
  classification: "research_relationship",
  finding: "Competitive / partner conflict not yet assessed for this brief.",
  relationshipNote:
    "Re-run Account Research Brief or rebuild from harvest to populate this block.",
};

/** Operator dossier patches may omit builder-only arrays — never throw on .length. */
function normalizeBriefForPanel(brief: AccountResearchBrief): AccountResearchBrief {
  return {
    ...brief,
    triggerEvidence: Array.isArray(brief.triggerEvidence) ? brief.triggerEvidence : [],
    sourceLedger: Array.isArray(brief.sourceLedger) ? brief.sourceLedger : [],
    buyerMap: Array.isArray(brief.buyerMap)
      ? brief.buyerMap.map((person) => {
          const row = person as AccountResearchBriefBuyer & {
            role?: string;
            purchaseRole?: string;
          };
          return {
            ...person,
            name: row.name ?? "Unknown",
            title: row.title ?? "",
            purchaseRole: coercePurchaseRole(row.purchaseRole ?? row.role),
            confidence: coerceBuyerConfidence(row.confidence),
            whyOwnsWorkflow: row.whyOwnsWorkflow ?? "",
            linkedInUrl: row.linkedInUrl ?? null,
            biographyUrl: row.biographyUrl ?? null,
            email: row.email ?? null,
            emailStatus: row.emailStatus ?? null,
            phone: row.phone ?? null,
          } satisfies AccountResearchBriefBuyer;
        })
      : [],
    linkedInIntelligence: brief.linkedInIntelligence ?? {
      urls: [],
      operatorPrompt:
        "Open company LinkedIn in a browser (link-only). Note hiring/posts for Path B timing — do not scrape.",
    },
    youtubeIntelligence: brief.youtubeIntelligence ?? {
      urls: [],
      operatorPrompt: "No YouTube channel URL found yet.",
    },
    outreach: {
      ...brief.outreach,
      claimsToAvoid: Array.isArray(brief.outreach?.claimsToAvoid)
        ? brief.outreach.claimsToAvoid
        : [],
    },
    snapshot: {
      ...(brief.snapshot ?? {}),
      company: brief.snapshot?.company ?? "Unknown",
      websiteUrl: brief.snapshot?.websiteUrl ?? null,
      practiceType: brief.snapshot?.practiceType ?? null,
      status: brief.snapshot?.status ?? "UNKNOWN",
      relevantServices: Array.isArray(brief.snapshot?.relevantServices)
        ? brief.snapshot.relevantServices
        : [],
      existingGrcProducts: Array.isArray(brief.snapshot?.existingGrcProducts)
        ? brief.snapshot.existingGrcProducts
        : [],
    },
    gates: {
      ...(brief.gates ?? {}),
      fit: brief.gates?.fit ?? { result: "UNKNOWN", finding: "Not assessed." },
      pain: brief.gates?.pain ?? { result: "UNKNOWN", finding: "Not assessed." },
      buyer: brief.gates?.buyer ?? { result: "UNKNOWN", finding: "Not assessed." },
      email: brief.gates?.email,
    },
    competitiveConflict: {
      ...DEFAULT_COMPETITIVE_CONFLICT,
      ...(brief.competitiveConflict ?? {}),
      preferredPartners: Array.isArray(brief.competitiveConflict?.preferredPartners)
        ? brief.competitiveConflict.preferredPartners
        : DEFAULT_COMPETITIVE_CONFLICT.preferredPartners,
      classification:
        brief.competitiveConflict?.classification ??
        DEFAULT_COMPETITIVE_CONFLICT.classification,
      finding:
        brief.competitiveConflict?.finding ?? DEFAULT_COMPETITIVE_CONFLICT.finding,
      relationshipNote:
        brief.competitiveConflict?.relationshipNote ??
        DEFAULT_COMPETITIVE_CONFLICT.relationshipNote,
    },
  };
}

export default function AccountResearchBriefPanel({
  brief,
  contactId,
}: {
  brief: AccountResearchBrief;
  contactId?: string;
}) {
  const safe = normalizeBriefForPanel(brief);
  const { snapshot, gates, outreach, competitiveConflict } = safe;
  brief = safe;
  const harvestThin =
    gates.buyer.result === "FAIL" &&
    (gates.email?.result ?? "UNKNOWN") !== "PASS" &&
    /^Public site signals:/i.test(gates.fit.finding);

  return (
    <section className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-amber-100">Account Research Brief</h2>
          <p className="mt-1 text-xs text-slate-400">
            Qualification + outreach decision · social links are evidence, not the deliverable ·{" "}
            {brief.generatedAt}
          </p>
        </div>
        <StatusBadge status={snapshot.status} />
      </div>

      <div className="mt-4 rounded-lg border border-amber-900/30 bg-slate-950/50 px-3 py-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-300/90">
          How to use this brief
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{brief.howToUse}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            1 · Account snapshot
          </p>
          <p className="mt-1 text-sm font-medium text-white">{snapshot.company}</p>
          {snapshot.websiteUrl ? (
            <a
              href={snapshot.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-xs text-cyan-300 hover:underline"
            >
              {snapshot.websiteUrl}
            </a>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No website on file</p>
          )}
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            <li>Practice: {snapshot.practiceType ?? "—"}</li>
            <li>
              Services:{" "}
              {snapshot.relevantServices.length ? snapshot.relevantServices.join(", ") : "—"}
            </li>
            <li>
              GRC products:{" "}
              {snapshot.existingGrcProducts.length
                ? snapshot.existingGrcProducts.join(", ")
                : "none detected"}
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            7 · Competitive / partner conflict
          </p>
          <p className="mt-1">
            <StatusBadge status={competitiveConflict?.classification} />
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {competitiveConflict?.finding ?? DEFAULT_COMPETITIVE_CONFLICT.finding}
          </p>
          <p className="mt-2 text-xs text-slate-500">{competitiveConflict?.relationshipNote ?? DEFAULT_COMPETITIVE_CONFLICT.relationshipNote}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
        <p className="border-b border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          2 · Fit · Pain · Buyer · Email
        </p>
        <p className="border-b border-slate-800 bg-slate-950/40 px-3 py-1.5 font-mono text-[10px] text-slate-400">
          Account: {snapshot.company}
          {contactId ? ` | id ${contactId.slice(0, 8)}` : ""}
          {harvestThin
            ? " | thin harvest brief (no promote-ready dossier on this contact)"
            : ""}
        </p>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/40 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-mono font-normal">Gate</th>
              <th className="px-3 py-2 font-mono font-normal">Finding</th>
              <th className="px-3 py-2 font-mono font-normal">Why</th>
              <th className="px-3 py-2 font-mono font-normal">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {(
              [
                ["Fit", gates.fit],
                ["Pain", gates.pain],
                ["Buyer", gates.buyer],
                [
                  "Email",
                  gates.email ?? {
                    result: "UNKNOWN" as const,
                    finding: "Email gate not on this saved brief yet.",
                    why: "Re-open or re-run Research — Email is now a separate gate from Buyer.",
                  },
                ],
              ] as const
            ).map(([label, gate]) => (
              <tr key={label}>
                <td className="px-3 py-2 font-medium text-white">{label}</td>
                <td className="px-3 py-2">{gate.finding}</td>
                <td className="px-3 py-2 text-slate-400">{gate.why}</td>
                <td className="px-3 py-2">
                  <GateBadge result={gate.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {brief.buyerMap.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            3 · Buyer map
          </p>
          <ul className="space-y-2">
            {brief.buyerMap.map((person) => (
              <li
                key={`${person.name}-${person.title}`}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{person.name ?? "Unknown"}</span>
                  <span className="font-mono text-[10px] uppercase text-violet-300">
                    {String(person.purchaseRole ?? "unknown").replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-500">confidence {person.confidence}</span>
                </div>
                {person.title ? <p className="mt-0.5 text-slate-400">{person.title}</p> : null}
                <p className="mt-1.5 text-slate-300">{person.whyOwnsWorkflow}</p>
                <div className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-500">
                  {person.email ? (
                    <div>
                      email {person.email} ({person.emailStatus ?? "unverified"})
                    </div>
                  ) : null}
                  {person.phone ? <div>phone {person.phone}</div> : null}
                  {person.biographyUrl ? (
                    <a
                      href={person.biographyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-cyan-300/80 hover:underline"
                    >
                      {person.biographyUrl}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief.triggerEvidence.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            4 · Trigger evidence
          </p>
          {brief.triggerEvidence.map((row) => (
            <div
              key={row.kind}
              className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs"
            >
              <p className="font-mono text-amber-200/90">{row.kind}</p>
              <p className="mt-1 text-slate-300">{row.finding}</p>
              <p className="mt-1 text-slate-500">Why it matters: {row.whyItMatters}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-xs">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            5 · LinkedIn intelligence
          </p>
          <p className="mt-1.5 text-slate-400">{brief.linkedInIntelligence.operatorPrompt}</p>
          {brief.linkedInIntelligence.urls.length ? (
            <ul className="mt-2 space-y-1">
              {brief.linkedInIntelligence.urls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-cyan-300 hover:underline"
                  >
                    {url}
                  </a>
                  <span className="text-slate-600"> · link only</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-slate-600">No LinkedIn company URL found yet.</p>
          )}
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-xs">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            6 · YouTube / webinar intelligence
          </p>
          <p className="mt-1.5 text-slate-400">{brief.youtubeIntelligence.operatorPrompt}</p>
          {brief.youtubeIntelligence.urls.length ? (
            <ul className="mt-2 space-y-1">
              {brief.youtubeIntelligence.urls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-cyan-300 hover:underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-slate-600">No YouTube channel URL found yet.</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">
            8 · Outreach recommendation
          </p>
          <StatusBadge status={outreach.status} />
        </div>

        <div className="mt-3 rounded border border-cyan-900/30 bg-slate-950/50 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">
            How to use this outreach
          </p>
          <p className="mt-1 text-sm text-slate-200">{outreach.howToUse}</p>
        </div>

        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Best wedge</dt>
            <dd className="text-slate-200">{outreach.bestWedge}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Best channel</dt>
            <dd className="text-slate-200">{outreach.bestChannel}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Primary buyer</dt>
            <dd className="text-slate-200">{outreach.primaryBuyer ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Secondary buyer</dt>
            <dd className="text-slate-200">{outreach.secondaryBuyer ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">Why</p>
            <p className="mt-1 leading-relaxed text-slate-200">{outreach.whyThisApproach}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">
              What to say
            </p>
            <p className="mt-1 leading-relaxed text-slate-100">{outreach.whatToSay}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">
              Personalization fact
            </p>
            <p className="mt-1 leading-relaxed text-slate-300">{outreach.personalizationFact}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">
              Question to ask
            </p>
            <p className="mt-1 leading-relaxed text-slate-300">{outreach.questionToAsk}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-rose-300/80">
              Claims to avoid
            </p>
            <ul className="mt-1 list-inside list-disc text-slate-400">
              {outreach.claimsToAvoid.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {brief.sourceLedger.length > 0 ? (
        <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-slate-500">
            9 · Source ledger ({brief.sourceLedger.length})
          </summary>
          <ul className="mt-2 space-y-2 text-xs text-slate-400">
            {brief.sourceLedger.map((row, i) => (
              <li key={`${row.title}-${row.url ?? i}`} className="border-t border-slate-800 pt-2">
                <span className="text-slate-300">{row.title}</span>
                <span className="text-slate-600"> · {row.confidence}</span>
                {row.url ? (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block break-all text-cyan-300/80 hover:underline"
                  >
                    {row.url}
                  </a>
                ) : null}
                <p className="mt-0.5">{row.excerpt}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
