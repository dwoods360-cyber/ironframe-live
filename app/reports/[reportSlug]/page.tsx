import { notFound } from "next/navigation";
import MetricHero, { MetricHeroItem } from "@/app/components/MetricHero";
import ReportHeader from "@/app/components/ReportHeader";
import ReportActions from "./ReportActions";

const REPORT_DETAILS: Record<
  string,
  {
    industry: string;
    reportName: string;
    summary: string;
    metrics: [MetricHeroItem, MetricHeroItem, MetricHeroItem];
    rows: Array<{ control: string; domain: string; owner: string; status: string }>;
  }
> = {
  "hipaa-audit": {
    industry: "Healthcare",
    reportName: "HIPAA Compliance",
    summary:
      "Privacy and security safeguards remain stable. Access control and transmission protections pass baseline checks with minor remediation items outstanding.",
    metrics: [
      { label: "Total Controls", value: "164" },
      { label: "Passing", value: "151" },
      { label: "Failing", value: "13" },
    ],
    rows: [
      { control: "164.308(a)(3)", domain: "Workforce Security", owner: "IAM", status: "Passing" },
      { control: "164.312(a)(1)", domain: "Access Control", owner: "Security Ops", status: "Passing" },
      { control: "164.312(e)(1)", domain: "Transmission Security", owner: "NetSec", status: "Failing" },
      { control: "164.316(b)(1)", domain: "Documentation", owner: "GRC", status: "Passing" },
    ],
  },
  "patient-data-access": {
    industry: "Healthcare",
    reportName: "Patient Data Access",
    summary:
      "Role-based access is broadly aligned. Elevated account lifecycle timing requires tighter enforcement and exception expiry cleanup.",
    metrics: [
      { label: "Total Controls", value: "98" },
      { label: "Passing", value: "86" },
      { label: "Failing", value: "12" },
    ],
    rows: [
      { control: "PDA-01", domain: "Role Mapping", owner: "Identity", status: "Passing" },
      { control: "PDA-04", domain: "Privileged Review", owner: "Security Ops", status: "Failing" },
      { control: "PDA-07", domain: "Break-Glass", owner: "ITSM", status: "Passing" },
      { control: "PDA-10", domain: "Session Revocation", owner: "IAM", status: "Passing" },
    ],
  },
  "hitech-security": {
    industry: "Healthcare",
    reportName: "HITECH Security",
    summary:
      "Breach readiness and incident notification controls are operating. Encryption attestation completeness is below target for one subsystem.",
    metrics: [
      { label: "Total Controls", value: "112" },
      { label: "Passing", value: "102" },
      { label: "Failing", value: "10" },
    ],
    rows: [
      { control: "HT-02", domain: "Breach Workflow", owner: "Legal", status: "Passing" },
      { control: "HT-08", domain: "Encryption Evidence", owner: "Platform", status: "Failing" },
      { control: "HT-11", domain: "Auditability", owner: "GRC", status: "Passing" },
      { control: "HT-14", domain: "Third-Party Notice", owner: "Vendor Mgmt", status: "Passing" },
    ],
  },
  "ehr-integrity": {
    industry: "Healthcare",
    reportName: "EHR Integrity",
    summary:
      "Record integrity checks show strong consistency. Change provenance logging remains stable with one stale ingestion job under review.",
    metrics: [
      { label: "Total Controls", value: "76" },
      { label: "Passing", value: "71" },
      { label: "Failing", value: "5" },
    ],
    rows: [
      { control: "EHR-03", domain: "Checksum Validation", owner: "Data Platform", status: "Passing" },
      { control: "EHR-06", domain: "Provenance Logging", owner: "Security Eng", status: "Passing" },
      { control: "EHR-09", domain: "Schema Drift", owner: "Data Platform", status: "Failing" },
      { control: "EHR-13", domain: "Restore Testing", owner: "Ops", status: "Passing" },
    ],
  },
  "pci-dss-level-1": {
    industry: "Financial",
    reportName: "PCI-DSS Level 1",
    summary:
      "Cardholder data environment controls are in policy. Quarterly key rotation evidence requires synchronization for one payment region.",
    metrics: [
      { label: "Total Controls", value: "242" },
      { label: "Passing", value: "226" },
      { label: "Failing", value: "16" },
    ],
    rows: [
      { control: "PCI 3.5", domain: "Key Management", owner: "Crypto", status: "Failing" },
      { control: "PCI 7.1", domain: "Least Privilege", owner: "IAM", status: "Passing" },
      { control: "PCI 10.2", domain: "Audit Trails", owner: "SOC", status: "Passing" },
      { control: "PCI 11.3", domain: "Pen Testing", owner: "AppSec", status: "Passing" },
    ],
  },
  "pci-dss-audit": {
    industry: "Financial",
    reportName: "PCI-DSS Audit",
    summary:
      "Cardholder data environment controls are in policy. Quarterly key rotation evidence requires synchronization for one payment region.",
    metrics: [
      { label: "Total Controls", value: "242" },
      { label: "Passing", value: "226" },
      { label: "Failing", value: "16" },
    ],
    rows: [
      { control: "PCI 3.5", domain: "Key Management", owner: "Crypto", status: "Failing" },
      { control: "PCI 7.1", domain: "Least Privilege", owner: "IAM", status: "Passing" },
      { control: "PCI 10.2", domain: "Audit Trails", owner: "SOC", status: "Passing" },
      { control: "PCI 11.3", domain: "Pen Testing", owner: "AppSec", status: "Passing" },
    ],
  },
  "swift-connectivity": {
    industry: "Financial",
    reportName: "SWIFT Connectivity",
    summary:
      "Network segmentation and endpoint hardening remain healthy. Message integrity verification has one alerting rule set to advisory-only.",
    metrics: [
      { label: "Total Controls", value: "58" },
      { label: "Passing", value: "53" },
      { label: "Failing", value: "5" },
    ],
    rows: [
      { control: "SW-01", domain: "Gateway Hardening", owner: "NetSec", status: "Passing" },
      { control: "SW-04", domain: "Message Integrity", owner: "Payments", status: "Failing" },
      { control: "SW-07", domain: "MFA", owner: "IAM", status: "Passing" },
      { control: "SW-10", domain: "DR Connectivity", owner: "Ops", status: "Passing" },
    ],
  },
  "sox-controls": {
    industry: "Financial",
    reportName: "SOX Controls",
    summary:
      "Change management and segregation checks are mostly effective. One evidence collector is delayed for month-end sign-off.",
    metrics: [
      { label: "Total Controls", value: "132" },
      { label: "Passing", value: "121" },
      { label: "Failing", value: "11" },
    ],
    rows: [
      { control: "SOX-12", domain: "Change Approval", owner: "ITSM", status: "Passing" },
      { control: "SOX-19", domain: "SoD", owner: "Finance IT", status: "Passing" },
      { control: "SOX-23", domain: "Evidence Capture", owner: "GRC", status: "Failing" },
      { control: "SOX-27", domain: "Quarterly Cert", owner: "Audit", status: "Passing" },
    ],
  },
  "aml-trace": {
    industry: "Financial",
    reportName: "AML Trace",
    summary:
      "Case enrichment coverage is strong and monitoring latency is stable. A subset of high-risk geographies needs updated rule tuning.",
    metrics: [
      { label: "Total Controls", value: "89" },
      { label: "Passing", value: "79" },
      { label: "Failing", value: "10" },
    ],
    rows: [
      { control: "AML-05", domain: "Alert Triage", owner: "Fraud Ops", status: "Passing" },
      { control: "AML-08", domain: "Geo Rules", owner: "Risk Analytics", status: "Failing" },
      { control: "AML-12", domain: "Case Evidence", owner: "Compliance", status: "Passing" },
      { control: "AML-15", domain: "SAR Workflow", owner: "Legal", status: "Passing" },
    ],
  },
  "nerc-cip-asset-list": {
    industry: "Energy",
    reportName: "NERC CIP Asset List",
    summary:
      "Critical cyber asset inventory remains synchronized across environments. One substation edge node is pending ownership assignment.",
    metrics: [
      { label: "Total Controls", value: "73" },
      { label: "Passing", value: "68" },
      { label: "Failing", value: "5" },
    ],
    rows: [
      { control: "CIP-002", domain: "Asset Categorization", owner: "OT Security", status: "Passing" },
      { control: "CIP-003", domain: "Policy Governance", owner: "GRC", status: "Passing" },
      { control: "CIP-010", domain: "Config Mgmt", owner: "OT Ops", status: "Failing" },
      { control: "CIP-011", domain: "Information Protection", owner: "OT Security", status: "Passing" },
    ],
  },
  "nerc-cip-assets": {
    industry: "Energy",
    reportName: "NERC CIP",
    summary:
      "Critical cyber asset inventory remains synchronized across environments. One substation edge node is pending ownership assignment.",
    metrics: [
      { label: "Total Controls", value: "73" },
      { label: "Passing", value: "68" },
      { label: "Failing", value: "5" },
    ],
    rows: [
      { control: "CIP-002", domain: "Asset Categorization", owner: "OT Security", status: "Passing" },
      { control: "CIP-003", domain: "Policy Governance", owner: "GRC", status: "Passing" },
      { control: "CIP-010", domain: "Config Mgmt", owner: "OT Ops", status: "Failing" },
      { control: "CIP-011", domain: "Information Protection", owner: "OT Security", status: "Passing" },
    ],
  },
  "scada-traffic": {
    industry: "Energy",
    reportName: "SCADA Traffic",
    summary:
      "Traffic baselines indicate expected plant-to-control center behavior. Protocol anomaly suppression is tuned but one signature is stale.",
    metrics: [
      { label: "Total Controls", value: "64" },
      { label: "Passing", value: "59" },
      { label: "Failing", value: "5" },
    ],
    rows: [
      { control: "SCADA-02", domain: "Protocol Whitelisting", owner: "NetSec", status: "Passing" },
      { control: "SCADA-06", domain: "Anomaly Detection", owner: "SOC", status: "Failing" },
      { control: "SCADA-09", domain: "Remote Access", owner: "IAM", status: "Passing" },
      { control: "SCADA-11", domain: "Logging", owner: "OT Security", status: "Passing" },
    ],
  },
  "fema-resilience": {
    industry: "Energy",
    reportName: "FEMA Resilience",
    summary:
      "Resilience exercises completed on schedule with broad pass rates. Alternate communications tabletop evidence is missing from one region.",
    metrics: [
      { label: "Total Controls", value: "51" },
      { label: "Passing", value: "46" },
      { label: "Failing", value: "5" },
    ],
    rows: [
      { control: "FEMA-01", domain: "Continuity Planning", owner: "BCP", status: "Passing" },
      { control: "FEMA-04", domain: "Exercise Evidence", owner: "Regional Ops", status: "Failing" },
      { control: "FEMA-07", domain: "Backup Power", owner: "Facilities", status: "Passing" },
      { control: "FEMA-10", domain: "Recovery Validation", owner: "Ops", status: "Passing" },
    ],
  },
  "gridex-vii": {
    industry: "Energy",
    reportName: "GridEx VII",
    summary:
      "Joint exercise controls performed within tolerance. Vendor communications simulation had one unresolved dependency.",
    metrics: [
      { label: "Total Controls", value: "47" },
      { label: "Passing", value: "42" },
      { label: "Failing", value: "5" },
    ],
    rows: [
      { control: "GX7-03", domain: "Incident Coordination", owner: "SOC", status: "Passing" },
      { control: "GX7-06", domain: "External Comms", owner: "Vendor Mgmt", status: "Failing" },
      { control: "GX7-09", domain: "Runbook Coverage", owner: "Ops", status: "Passing" },
      { control: "GX7-12", domain: "Postmortem", owner: "GRC", status: "Passing" },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(REPORT_DETAILS).map((reportSlug) => ({ reportSlug }));
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportSlug: string }>;
}) {
  const { reportSlug } = await params;
  const report = REPORT_DETAILS[reportSlug];

  if (!report) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <ReportHeader industry={report.industry} reportName={report.reportName} />

      <MetricHero metrics={report.metrics} />

      <section className="grid flex-1 grid-cols-12 gap-4 overflow-hidden px-4 py-4">
        <article className="col-span-4 min-w-0 rounded border border-slate-800 bg-slate-900/40 p-3">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white">Summary</h2>
          <p className="text-[10px] leading-relaxed text-slate-300">{report.summary}</p>
        </article>

        <article className="col-span-8 overflow-hidden rounded border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-3 py-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-white">Control Detail</h2>
          </div>
          <div className="h-full overflow-auto">
            <table className="w-full text-[10px] text-slate-200">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide">Control</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide">Domain</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide">Owner</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr
                    key={`${row.control}-${index}`}
                    className={`border-b border-slate-800 ${index % 2 === 0 ? "bg-slate-900/30" : "bg-slate-950/20"}`}
                  >
                    <td className="px-3 py-2 font-semibold text-white">{row.control}</td>
                    <td className="px-3 py-2">{row.domain}</td>
                    <td className="px-3 py-2">{row.owner}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 font-bold uppercase tracking-wide ${
                          row.status === "Passing"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <footer className="sticky bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-end gap-2">
          <ReportActions reportName={report.reportName} industry={report.industry} />
        </div>
      </footer>
    </div>
  );
}
