/** Verify Header #2 nav targets return expected pages. */
const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3000";

const LINKS = [
  { label: "VENDOR LIST", path: "/vendors", expect: /vendor|Vendor/i },
  { label: "SYSTEM CONFIG", path: "/config", expect: /SYSTEM CONFIGURATION|config/i },
  { label: "SECURITY PROFILE", path: "/profile", expect: /Security Profile|security profile|MFA/i },
  { label: "EVIDENCE VAULT", path: "/vault", expect: /Evidence Vault|evidence vault|Bulk export/i },
  { label: "AUDIT TRAIL", path: "/reports/audit-trail", expect: /Audit Trail|audit trail|AUDIT/i },
  { label: "INTEGRITY HUB", path: "/integrity", expect: /Integrity Hub|integrity hub|INTEGRITY/i },
  { label: "INTEGRITY & AUDIT", path: "/audit", expect: /Integrity & Audit|Meta.?Audit|integrity ledger/i },
  { label: "BOARD REPORT", path: "/board-report", expect: /Board Report|board report|Executive/i },
  { label: "OP SUPPORT", path: "/opsupport", expect: /Op Support|Operational|Workforce Command/i },
  { label: "DMZ QUARANTINE", path: "/admin/clearance", expect: /Quarantine|DMZ|clearance/i },
  { label: "QUICK REPORTS", path: "/reports", expect: /Reports|Quick Report|report/i },
];

async function check(link) {
  const url = `${BASE}${link.path}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    const finalUrl = res.url;
    const html = await res.text();
    const signIn = /Sign in|sign in to continue/i.test(html);
    const contentOk = link.expect.test(html);
    return {
      ...link,
      status: res.status,
      finalUrl,
      signIn,
      contentOk,
      ok: res.status === 200 && contentOk && !signIn,
    };
  } catch (e) {
    return { ...link, status: 0, finalUrl: "", signIn: false, contentOk: false, ok: false, error: String(e) };
  }
}

const results = await Promise.all(LINKS.map(check));
for (const r of results) {
  const flag = r.ok ? "PASS" : r.signIn ? "AUTH" : "FAIL";
  console.log(`${flag}\t${r.label}\t${r.path}\t${r.status}\t${r.finalUrl.replace(BASE, "")}`);
  if (!r.ok && !r.signIn) console.log(`      expect=${r.expect} contentOk=${r.contentOk}${r.error ? ` err=${r.error}` : ""}`);
}
const failed = results.filter((r) => !r.ok && !r.signIn);
process.exit(failed.length ? 1 : 0);
