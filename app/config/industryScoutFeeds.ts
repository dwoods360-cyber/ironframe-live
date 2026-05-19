/** Ironsight Industry Scout — authoritative regulatory feed registry. */
export type IndustryScoutFeed = {
  id: string;
  name: string;
  url: string;
  authority: string;
  topics: string[];
  pdfDiscovery: boolean;
};

export const INDUSTRY_SCOUT_FEEDS: readonly IndustryScoutFeed[] = [
  {
    id: "sec_press",
    name: "SEC.gov — Press & Safeguards / Reg S-P",
    url: "https://www.sec.gov/news/pressreleases.rss",
    authority: "SEC",
    topics: ["safeguards rule", "regulation s-p", "reg s-p", "breach notification", "customer information"],
    pdfDiscovery: true,
  },
  {
    id: "sec_rules",
    name: "SEC.gov — Final Rules RSS",
    url: "https://www.sec.gov/rss/news/press.xml",
    authority: "SEC",
    topics: ["safeguards", "cybersecurity", "incident response"],
    pdfDiscovery: true,
  },
  {
    id: "nist_csrc",
    name: "NIST CSRC — Publications",
    url: "https://csrc.nist.gov/CSRC/media/rss/nist-cybersecurity-rss.xml",
    authority: "NIST",
    topics: ["sp 800", "800-137", "800-53", "continuous monitoring", "csf"],
    pdfDiscovery: true,
  },
  {
    id: "nist_cyber_news",
    name: "NIST.gov — Cybersecurity News",
    url: "https://www.nist.gov/news-events/cybersecurity/rss.xml",
    authority: "NIST",
    topics: ["sp 800", "cybersecurity framework", "incident"],
    pdfDiscovery: false,
  },
  {
    id: "colorado_leg",
    name: "Colorado — Legislative updates (SB24-205 / SB 189)",
    url: "https://www.colorado.gov/governor/news/rss.xml",
    authority: "Colorado",
    topics: ["sb24-205", "sb 189", "artificial intelligence", "ai act", "high-risk"],
    pdfDiscovery: false,
  },
] as const;

export const IRONSCRIBE_DRIVE_DEFAULT_FOLDER =
  process.env.IRONSCRIBE_DRIVE_FOLDER?.trim() || "/Ironframe/Governance/Regulations/";

export const IRONSCRIBE_DRIVE_MIRROR_PATH =
  process.env.IRONSCRIBE_DRIVE_MIRROR_PATH?.trim() ||
  "storage/regulatory-vault/drive-inbox";
