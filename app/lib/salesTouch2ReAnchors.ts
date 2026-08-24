/**
 * Target-specific Touch 2 re-anchors from investigation (Aug 24 cohort+).
 * Keyed by CRM email (preferred) or company needle. Keep in sync with
 * docs/sales/design-partner-touch2-queue-live-by-sent-date.md when refreshing.
 */

export type Touch2ReAnchorEntry = {
  email?: string;
  companyNeedle?: string;
  motion: string;
  reAnchor: string;
};

export const TOUCH2_RE_ANCHORS: readonly Touch2ReAnchorEntry[] = [
  {
    email: "jbohrer@abacusgroupllc.com",
    motion: "MSP/MSSP for financial services & healthcare (AbacusFlex / Gotham Security)",
    reAnchor:
      "When AbacusFlex stacks financial-services and healthcare clients onto the same delivery stack, how do you keep each client’s compliance evidence and board reporting isolated today — without shared-stack register risk?",
  },
  {
    email: "ruppert.vernon@absolutelogic.com",
    companyNeedle: "absolute logic",
    motion: "Managed IT + cyber compliance (HIPAA / GLBA / NYDFS)",
    reAnchor:
      "When Absolute Logic runs HIPAA, GLBA, and NYDFS compliance across managed client environments, how do you keep each client’s evidence registers isolated today — without shared-stack register risk?",
  },
  {
    email: "mark.clayman@netrio.com",
    companyNeedle: "netrio",
    motion: "Netrio + Agio consolidation; multi-client GRC / vCISO",
    reAnchor:
      "As Netrio brings Agio financial-services environments onto the stack, how do you keep each client’s GRC and board reporting isolated today — without shared-stack register risk?",
  },
  {
    email: "lalvarez@alvareztg.com",
    companyNeedle: "alvarez",
    motion: "CMMC RPO + MSP/MSSP for DIB / regulated SMBs",
    reAnchor:
      "When Alvarez runs CMMC readiness across DIB and regulated SMB engagements, how do you keep each client’s evidence registers isolated today — without shared-stack register risk?",
  },
  {
    email: "kparekh@amsysis.com",
    companyNeedle: "amsys",
    motion: "Managed IT + cybersecurity across multi-vertical SMB/enterprise clients",
    reAnchor:
      "When AMSYS delivers managed IT and cybersecurity across multi-vertical client environments, how do you keep each client’s compliance evidence and board reporting isolated today — without shared-stack register risk?",
  },
  {
    email: "mike.williams@appalachiatech.com",
    companyNeedle: "appalachia",
    motion: "CMMC RPO readiness for DIB contractors",
    reAnchor:
      "Still thinking about how Appalachia keeps each DIB client’s CMMC control evidence isolated across readiness engagements?",
  },
  {
    email: "paul.kerr@dyntek.com",
    companyNeedle: "arctiq",
    motion: "Arctiq ManagedIQ MXDR / multi-SOC North America",
    reAnchor:
      "Still thinking about how Arctiq keeps each ManagedIQ / MXDR client’s evidence isolated across your North American SOC delivery?",
  },
  {
    email: "apatel@teamascend.com",
    companyNeedle: "ascend",
    motion: "24/7 SOC MDR with SOC 2 / HIPAA / CMMC support",
    reAnchor:
      "Still thinking about how Ascend keeps each MDR/SOC client’s compliance evidence isolated across tenants?",
  },
  {
    email: "karen.cole@assuraconsulting.com",
    companyNeedle: "assura",
    motion: "Fractional CISO / multi-framework compliance advisory",
    reAnchor:
      "Still thinking about how Assura keeps each advisory client’s evidence packs isolated across Virtual ISO retainers?",
  },
  {
    email: "jeffrey.king@expertip.net",
    companyNeedle: "at-net",
    motion: "NIST-aligned managed IT with HIPAA / CMMC / PCI",
    reAnchor:
      "Still thinking about how AT-NET keeps each client’s HIPAA / CMMC / PCI evidence isolated across managed environments?",
  },
  {
    email: "royrichardson@aurora-infotech.com",
    companyNeedle: "aurora",
    motion: "MSSP / vCSO with HIPAA and PCI + SOC/NOC",
    reAnchor:
      "Still thinking about how Aurora keeps each HIPAA / PCI client’s evidence isolated across MSSP tenants?",
  },
  {
    email: "karchibald@ballastservices.com",
    companyNeedle: "ballast",
    motion: "Co-managed cyber / vCISO (SOC 2, HIPAA, PCI, CMMC)",
    reAnchor:
      "Still thinking about how Ballast keeps each co-managed / vCISO client’s control evidence isolated?",
  },
  {
    email: "carlos@banyax.com",
    companyNeedle: "banyax",
    motion: "AI-led 24/7 MXDR Cyber Defense Center (Quest)",
    reAnchor:
      "Still thinking about how Banyax keeps each Quest MXDR client’s detection and response evidence isolated?",
  },
  {
    email: "drew.danner@bdemerson.com",
    companyNeedle: "emerson",
    motion: "SOC 2 / ISO / HIPAA readiness-to-attest advisory",
    reAnchor:
      "Still thinking about how BD Emerson keeps each attest client’s evidence library isolated across SOC / ISO / HIPAA engagements?",
  },
  {
    email: "jason.miller@bitlyft.com",
    companyNeedle: "bitlyft",
    motion: "True MDR / autonomous SOC (CMMC-capable)",
    reAnchor:
      "Still thinking about how BitLyft keeps each True MDR client’s monitoring evidence isolated across SOC tenants?",
  },
  {
    email: "brad@blueshiftcyber.com",
    companyNeedle: "blueshift",
    motion: "Multi-tenant XDR/SOC platform for MSP/MSSP partners",
    reAnchor:
      "Still thinking about how Blueshift keeps each end-client’s evidence isolated across partner XDR/SOC tenants?",
  },
  {
    email: "jamesr@byteteksolutions.com",
    companyNeedle: "byte tek",
    motion: "Crestline managed IT / cyber compliance (East TN)",
    reAnchor:
      "Still thinking about how Crestline / Byte Tek keeps each managed client’s compliance evidence isolated?",
  },
  {
    email: "rhowes@certified-nets.com",
    companyNeedle: "certified",
    motion: "St. Louis MSP with regulatory cyber compliance",
    reAnchor:
      "Still thinking about how Certified NETS keeps each client’s regulatory compliance evidence isolated?",
  },
  {
    email: "fbrumm@cetechno.com",
    companyNeedle: "cetech",
    motion: "Manufacturing / DoD-oriented MSSP (CMMC track)",
    reAnchor:
      "Still thinking about how CETech keeps each DoD manufacturer client’s CMMC evidence isolated?",
  },
  {
    email: "fpinillo@cinetixgroup.com",
    companyNeedle: "cinetix",
    motion: "24/7 SOC / managed cyber MSSP",
    reAnchor:
      "Still thinking about how Cinetix keeps each SOC client’s detection evidence and board reporting isolated?",
  },
  {
    email: "david.jemmett@ciso.inc",
    companyNeedle: "ciso",
    motion: "Managed compliance + SOC / pentest MSSP",
    reAnchor:
      "Still thinking about how CISO Global keeps each managed-compliance client’s evidence isolated across SOC and advisory tenants?",
  },
  {
    email: "carl@clearedsystems.com",
    companyNeedle: "cleared",
    motion: "CMMC / NIST / ITAR for cleared / federal contractors",
    reAnchor:
      "Still thinking about how Cleared Systems keeps each contractor’s CUI / CMMC evidence isolated across engagements?",
  },
  {
    email: "baxter.lee@clearwatercompliance.com",
    companyNeedle: "clearwater",
    motion: "Healthcare HIPAA / HITRUST security & compliance",
    reAnchor:
      "Still thinking about how Clearwater keeps each healthcare client’s HIPAA / HITRUST evidence isolated across covered-entity environments?",
  },
  {
    email: "jeffg@csiomaha.com",
    companyNeedle: "computer systems",
    motion: "Cyber Sentry MDR (HIPAA / PCI / CMMC support)",
    reAnchor:
      "Still thinking about how CSI Omaha keeps each Cyber Sentry MDR client’s monitoring and compliance evidence isolated?",
  },
  {
    email: "ron.lisch@coretekservices.com",
    companyNeedle: "coretek",
    motion: "CoreDefend / Azure Expert MSP security & compliance",
    reAnchor:
      "Still thinking about how CoreTek keeps each CoreDefend client’s compliance evidence isolated across Azure Expert MSP tenants?",
  },
  {
    email: "bharmison@corsicatech.com",
    companyNeedle: "corsica",
    motion: "Corsica Secure MSP/MSSP mid-market",
    reAnchor:
      "Still thinking about how Corsica Secure keeps each mid-market client’s compliance evidence isolated?",
  },
  {
    email: "martin.jakobsen@cybanetix.com",
    companyNeedle: "cybanetix",
    motion: "UK enterprise MDR / 24×7 SOC",
    reAnchor:
      "Still thinking about how Cybanetix keeps each MDR/SOC client’s evidence isolated across Exabeam + SentinelOne delivery?",
  },
  {
    email: "hmaysonet@securedbycss.com",
    companyNeedle: "cyber security solutions",
    motion: "CMMC Enclave/Net for defense contractors",
    reAnchor:
      "Still thinking about how CSS keeps each defense client’s CMMC enclave evidence isolated?",
  },
  {
    email: "kt@cyberduo.com",
    companyNeedle: "cyberduo",
    motion: "Cybersecurity-first MSP / in-house SOC for regulated industries",
    reAnchor:
      "Still thinking about how CyberDuo keeps each regulated client’s SOC and compliance evidence isolated?",
  },
  {
    email: "harmeet.singh@cgcompliance.com",
    companyNeedle: "cyberguard",
    motion: "400+ audits/yr SOC / PCI / ISO / HITRUST attestation",
    reAnchor:
      "Still thinking about how CyberGuard keeps each client’s evidence packs isolated across 400+ SOC / PCI / ISO audit tracks a year?",
  },
  {
    email: "emil.sayegh@cybersheath.com",
    companyNeedle: "cybersheath",
    motion: "CMMC managed services for DIB",
    reAnchor:
      "Still thinking about how CyberSheath keeps each DIB client’s CMMC / CUI evidence isolated across managed enclaves?",
  },
  {
    email: "kevin.kelly@cycurion.com",
    companyNeedle: "cycurion",
    motion: "Cyber for government / healthcare / corporate",
    reAnchor:
      "Still thinking about how Cycurion keeps each government, healthcare, and corporate client’s evidence isolated across delivery environments?",
  },
  {
    email: "joel@cyturity.com",
    companyNeedle: "cyturity",
    motion: "CMMC / NIST 800-171 governance education for DIB",
    reAnchor:
      "Still thinking about how Cyturity keeps each DIB client’s CMMC / NIST 800-171 evidence isolated across governance programs?",
  },
  {
    email: "kevin@darkrhinosecurity.com",
    companyNeedle: "dark rhino",
    motion: "Defense-in-Depth MDR/SOC (CMMC / HIPAA / HITRUST / SOC 2)",
    reAnchor:
      "Still thinking about how Dark Rhino keeps each client’s CMMC / HIPAA / SOC 2 evidence isolated across Defense-in-Depth MDR tenants?",
  },
];

export function touch2ReAnchorFor(input: {
  email: string;
  company: string;
  buyer?: string;
}): Touch2ReAnchorEntry | null {
  const email = input.email.trim().toLowerCase();
  const company = input.company.trim().toLowerCase();
  if (email) {
    const byEmail = TOUCH2_RE_ANCHORS.find((e) => (e.email ?? "").toLowerCase() === email);
    if (byEmail) return byEmail;
  }
  if (company) {
    const byCompany = TOUCH2_RE_ANCHORS.find(
      (e) => e.companyNeedle && company.includes(e.companyNeedle.toLowerCase()),
    );
    if (byCompany) return byCompany;
  }
  return null;
}
