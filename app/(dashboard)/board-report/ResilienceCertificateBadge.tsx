"use client";

type Props = {
  tenantName: string;
  certifiedAtIso: string | null;
  certificateStatus: "VALID" | "EXPIRED" | "IN_PROGRESS";
  certificateExpiresInDays: number | null;
  certificateRenewalStreakDays: number;
};

function periodEndingDisplay(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString();
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function signatureFor(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const v = (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
  return `IRF-${v.slice(0, 4)}-${v.slice(4)}`;
}

function buildCertificateHtml(tenantName: string, ending: string, sig: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Certificate of Operational Resilience</title>
    <style>
      body { margin: 0; padding: 24px; font-family: "Times New Roman", serif; background: #f6f2e8; color: #1a1a1a; }
      .cert { border: 10px double #b88a2a; padding: 40px 44px; max-width: 980px; margin: 0 auto; background: #fffdf7; }
      .kicker { text-align: center; letter-spacing: .25em; font-size: 11px; text-transform: uppercase; color: #7a5a17; }
      h1 { text-align: center; margin: 14px 0 10px; font-size: 36px; letter-spacing: .08em; color: #5f4310; }
      .body { text-align: center; margin-top: 24px; font-size: 20px; line-height: 1.7; }
      .tenant { display: inline-block; margin-top: 10px; font-size: 34px; font-weight: 700; border-bottom: 2px solid #b88a2a; padding: 0 16px 8px; }
      .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 44px; font-size: 14px; }
      .sig-line { border-top: 1px solid #7d7d7d; width: 320px; padding-top: 8px; text-align: center; }
      .sig-code { font-family: "Courier New", monospace; color: #6d4d12; font-size: 13px; margin-top: 6px; }
    </style>
  </head>
  <body>
    <article class="cert">
      <div class="kicker">Ironframe Protocol</div>
      <h1>CERTIFICATE OF OPERATIONAL RESILIENCE</h1>
      <div class="body">
        This certifies that
        <div class="tenant">${tenantName}</div>
        maintained a Tier-1 Security Posture for the period ending <b>${ending}</b>.<br/>
        Verified by Ironframe Protocol.
      </div>
      <div class="footer">
        <div>
          <div><b>Issued:</b> ${new Date().toLocaleString()}</div>
          <div class="sig-code">Simulated Cryptographic Signature: ${sig}</div>
        </div>
        <div class="sig-line">Ironframe Verification Authority</div>
      </div>
    </article>
  </body>
</html>`;
}

export default function ResilienceCertificateBadge({
  tenantName,
  certifiedAtIso,
  certificateStatus,
  certificateExpiresInDays,
  certificateRenewalStreakDays,
}: Props) {
  const ending = periodEndingDisplay(certifiedAtIso);
  const sig = signatureFor(`${tenantName}|${ending}|CERTIFICATE_OF_RESILIENCE`);

  const downloadPdf = async () => {
    const html2pdf = (await import("html2pdf.js")).default as any;
    const container = document.createElement("div");
    container.innerHTML = buildCertificateHtml(tenantName, ending, sig);
    const node = container.firstElementChild as HTMLElement;
    if (!node) return;
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: `certificate-of-operational-resilience-${tenantName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      })
      .from(node)
      .save();
  };

  if (certificateStatus === "EXPIRED") {
    const pct = Math.max(0, Math.min(100, Math.round((certificateRenewalStreakDays / 7) * 100)));
    return (
      <section className="mb-6 rounded-xl border-2 border-rose-500/70 bg-rose-950/20 p-4 print:border-rose-700 print:bg-white">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-rose-200 print:text-rose-900">
          Re-verification required
        </h2>
        <p className="mt-2 text-[11px] text-rose-100/90 print:text-zinc-900">
          Certificate expired. Maintain a new 7-day clean streak (score ≥ 95, no VIP_BREACH) to renew.
        </p>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[9px] text-rose-200/90 print:text-rose-900">
            <span>Day {Math.min(7, certificateRenewalStreakDays)} of 7 toward renewal</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-rose-950/60 ring-1 ring-rose-700/50">
            <div className="h-full bg-rose-400/80" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>
    );
  }

  const valid = certificateStatus === "VALID";
  return (
    <section className="mb-6 rounded-xl border-2 border-amber-500/75 bg-gradient-to-b from-amber-950/35 to-zinc-950/45 p-4 print:border-amber-600 print:bg-white">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300/90 print:text-amber-800">
        {valid ? "Certificate Awarded" : "Certification In Progress"}
      </p>
      <h2 className="mt-1 text-lg font-black tracking-[0.06em] text-amber-100 print:text-amber-900">
        CERTIFICATE OF OPERATIONAL RESILIENCE
      </h2>
      <p className="mt-2 text-[11px] text-amber-50/90 print:text-zinc-900">
        {tenantName} maintained a Tier-1 Security Posture for the period ending {ending}. Verified by
        Ironframe Protocol.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-amber-500/30 pt-3">
        {valid ? (
          <p className="rounded border border-amber-400/35 bg-amber-950/40 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-100/90 print:border-amber-700 print:text-amber-900">
            Expires in: {certificateExpiresInDays ?? 0} Days
          </p>
        ) : (
          <p className="rounded border border-zinc-600/60 bg-zinc-900/40 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-zinc-200 print:border-zinc-400 print:text-zinc-900">
            Day {Math.min(7, certificateRenewalStreakDays)} of 7 toward renewal
          </p>
        )}
        <p className="font-mono text-[9px] text-amber-300/85 print:text-amber-800">
          Simulated cryptographic signature: {sig}
        </p>
        {valid ? (
          <button
            type="button"
            onClick={() => void downloadPdf()}
            className="rounded border border-amber-400/70 bg-amber-900/45 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100 hover:border-amber-300 hover:bg-amber-900/60 print:hidden"
          >
            [ Download PDF Certificate ]
          </button>
        ) : null}
      </div>
    </section>
  );
}
