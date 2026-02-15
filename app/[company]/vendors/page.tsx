import { notFound } from "next/navigation";
import StatusIndicator from "@/app/components/StatusIndicator";

type ClauseStatus = "COMPLIANT" | "VIOLATION" | "DUE DILIGENCE REQUIRED";

type VendorClause = {
  clause: string;
  metric: string;
  status: ClauseStatus;
};

type VendorProfile = {
  vendorName: string;
  segment: string;
  summaryStatus: "healthy" | "critical";
  summaryLabel: string;
  clauses: VendorClause[];
};

const STATUS_STYLES: Record<ClauseStatus, string> = {
  COMPLIANT: "text-emerald-500",
  VIOLATION: "text-red-500",
  "DUE DILIGENCE REQUIRED": "text-amber-500",
};

const ENTITY_NAMES: Record<string, string> = {
  medshield: "MEDSHIELD",
  vaultbank: "VAULTBANK",
  gridcore: "GRIDCORE",
};

const ENTITY_VENDOR_PROFILES: Record<string, VendorProfile> = {
  medshield: {
    vendorName: "Azure Health",
    segment: "Clinical Data Hosting",
    summaryStatus: "healthy",
    summaryLabel: "Contract Monitored",
    clauses: [
      {
        clause: "SLA 4.2 - PHI Encryption At Rest",
        metric: "AES-256 coverage: 100%",
        status: "COMPLIANT",
      },
      {
        clause: "SLA 5.1 - Incident Notification < 15 min",
        metric: "Average notification time: 22 min",
        status: "VIOLATION",
      },
      {
        clause: "SLA 7.3 - Quarterly Access Review",
        metric: "Latest attestation package pending",
        status: "DUE DILIGENCE REQUIRED",
      },
    ],
  },
  vaultbank: {
    vendorName: "SWIFT",
    segment: "Interbank Messaging Infrastructure",
    summaryStatus: "critical",
    summaryLabel: "Heightened Oversight",
    clauses: [
      {
        clause: "SLA 3.4 - Message Integrity Validation",
        metric: "Integrity pass rate: 99.98%",
        status: "COMPLIANT",
      },
      {
        clause: "SLA 6.2 - Settlement Queue Latency < 40ms",
        metric: "Current latency: 71ms",
        status: "VIOLATION",
      },
      {
        clause: "SLA 9.1 - Annual BIC Access Re-Certification",
        metric: "Vendor evidence under review",
        status: "DUE DILIGENCE REQUIRED",
      },
    ],
  },
  gridcore: {
    vendorName: "Schneider Electric",
    segment: "OT Controls & Substation Automation",
    summaryStatus: "healthy",
    summaryLabel: "Contract Monitored",
    clauses: [
      {
        clause: "SLA 2.1 - Firmware Integrity Signing",
        metric: "Signed firmware deployments: 100%",
        status: "COMPLIANT",
      },
      {
        clause: "SLA 4.6 - Remote Access Session Recording",
        metric: "3 sessions missing archival evidence",
        status: "VIOLATION",
      },
      {
        clause: "SLA 8.3 - Semiannual Hardening Certification",
        metric: "Certification pack awaiting legal review",
        status: "DUE DILIGENCE REQUIRED",
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(ENTITY_NAMES).map((company) => ({ company }));
}

export default async function EntityVendorsPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
  const entityName = ENTITY_NAMES[company];
  const vendorProfile = ENTITY_VENDOR_PROFILES[company];

  if (!entityName || !vendorProfile) {
    notFound();
  }

  return (
    <div className="min-h-full bg-slate-950 p-6">
      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h1 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white">{entityName} - VENDOR RISK</h1>
        <p className="mb-4 text-[10px] text-slate-400">Third-party risk monitor with policy-aware contractual clause compliance.</p>

        <article className="rounded border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-white">{vendorProfile.vendorName}</p>
              <p className="text-[10px] text-slate-400">{vendorProfile.segment}</p>
            </div>
            <StatusIndicator status={vendorProfile.summaryStatus} label={vendorProfile.summaryLabel} pulse={vendorProfile.summaryStatus === "healthy"} />
          </div>

          <details className="group mt-2" open>
            <summary className="mt-4 mb-2 flex cursor-pointer items-center gap-2 text-[9px] uppercase tracking-widest text-slate-500">
              CONTRACTUAL GUARDRAILS
            </summary>

            <div className="space-y-2">
              {vendorProfile.clauses.map((clause) => (
                <div
                  key={clause.clause}
                  className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-200">{clause.clause}</p>
                      <p className="mt-1 text-[9px] text-slate-400">{clause.metric}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase ${STATUS_STYLES[clause.status]}`}>
                        {clause.status}
                      </span>

                      {clause.status === "VIOLATION" && (
                        <button
                          type="button"
                          className="rounded border border-red-500 bg-slate-900 px-2.5 py-1 text-[9px] font-bold uppercase text-red-500 hover:bg-slate-800"
                        >
                          Notify Vendor
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </article>
      </section>
    </div>
  );
}
