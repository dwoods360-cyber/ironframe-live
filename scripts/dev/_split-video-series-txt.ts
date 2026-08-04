/**
 * One-shot: split Documents/SaaS/Videos/Series.txt into video-series markdown files.
 */
import fs from "fs";
import path from "path";

const srcPath = "C:/Users/Dereck/Documents/SaaS/Videos/Series.txt";
const outDir = path.join("docs", "marketing-strategy", "video-series");
const src = fs.readFileSync(srcPath, "utf8");

function fixCta(text: string): string {
  return text
    .replace(
      /Request a design-partner pilot\.?/gi,
      "Request a 10–15 minute workflow review → `/register/contact`",
    )
    .replace(
      /Request a pilot\.?/gi,
      "Request a 10–15 minute workflow review → `/register/contact`",
    );
}

function frontmatter(title: string, kind: string): string {
  return [
    "---",
    "Document Type: Video Narrative",
    "Status: ACTIVE",
    "Security Classification: INTERNAL ONLY",
    "Series: When Risk Enters the Room",
    "Last Updated: 2026-08-04",
    `Kind: ${kind}`,
    "Source: Documents/SaaS/Videos/Series.txt (2026-07-18 ChatGPT export)",
    "Canonical hub: ./when-risk-enters-the-room.md",
    `title: ${JSON.stringify(title)}`,
    "---",
    "",
  ].join("\n");
}

function write(file: string, title: string, kind: string, body: string) {
  const content =
    frontmatter(title, kind) + `# ${title}\n\n` + fixCta(body).trim() + "\n";
  fs.writeFileSync(path.join(outDir, file), content, "utf8");
  console.log("wrote", file);
}

const budgetEnd = src.indexOf("\n=====\n# WHEN RISK ENTERS THE ROOM");
write(
  "budget-and-production.md",
  "Budget and production options",
  "budget",
  src.slice(0, budgetEnd).trim(),
);

const videoStart = src.indexOf("# WHEN RISK ENTERS THE ROOM");
const videoEnd = src.indexOf("\n=========\n");
const videoBlock = src.slice(videoStart, videoEnd);

const videos = [
  {
    id: "v1-the-risk-register.md",
    marker: "# VIDEO 1 — THE RISK REGISTER",
    title: "V1 — The Risk Register (The Number)",
  },
  {
    id: "v2-the-audit-request.md",
    marker: "# VIDEO 2 — THE AUDIT REQUEST",
    title: "V2 — The Audit Request (The Evidence)",
  },
  {
    id: "v3-the-wrong-client.md",
    marker: "# VIDEO 3 — THE WRONG CLIENT",
    title: "V3 — The Wrong Client (The Boundary)",
  },
  {
    id: "v4-the-ai-generated-board-report.md",
    marker: "# VIDEO 4 — THE AI-GENERATED BOARD REPORT",
    title: "V4 — The AI-Generated Board Report (The Draft)",
  },
  {
    id: "v5-the-connector.md",
    marker: "# VIDEO 5 — THE CONNECTOR",
    title: "V5 — The Connector (The Intake)",
  },
  {
    id: "v6-the-complete-ironframe-story.md",
    marker: "# VIDEO 6 — THE COMPLETE IRONFRAME STORY",
    title: "V6 — The Complete Ironframe Story",
  },
] as const;

for (let i = 0; i < videos.length; i++) {
  const start = videoBlock.indexOf(videos[i].marker);
  if (start < 0) throw new Error(`Missing ${videos[i].marker}`);
  const end =
    i + 1 < videos.length
      ? videoBlock.indexOf(videos[i + 1].marker)
      : videoBlock.length;
  let body = videoBlock.slice(start, end).trim();
  body = body.replace(/^# VIDEO \d+ [^\n]+\n+/, "");
  write(videos[i].id, videos[i].title, "episode-script", body);
}

const vignetteStart = src.indexOf("Ironframe: When Risk Enters the Room");
const vignetteEnd = src.indexOf("\n==================\n");
let vignetteRest = src
  .slice(vignetteStart, vignetteEnd)
  .replace(/^Ironframe: When Risk Enters the Room\s*/, "");

const vignettes = [
  ["The CISO and the Red Square", "vignette-ciso-red-square.md"],
  ["The CISO and the Missing Evidence", "vignette-ciso-missing-evidence.md"],
  [
    "The CRO and the Risk That Would Not Fit",
    "vignette-cro-risk-that-would-not-fit.md",
  ],
  [
    "The Data Protection Officer and the Open Door",
    "vignette-dpo-open-door.md",
  ],
  ['The CFO and the Word "Material"', "vignette-cfo-word-material.md"],
  [
    "General Counsel and the Draft That Almost Escaped",
    "vignette-gc-draft-that-almost-escaped.md",
  ],
  [
    "The Head of ITSM and the Emergency Change",
    "vignette-itsm-emergency-change.md",
  ],
  [
    "The Head of Product Security and the Helpful Agent",
    "vignette-product-security-helpful-agent.md",
  ],
] as const;

// Source uses curly quotes around Material
const materialCurly = "The CFO and the Word \u201cMaterial\u201d";

for (let i = 0; i < vignettes.length; i++) {
  let title = vignettes[i][0];
  let start = vignetteRest.indexOf(title);
  if (start < 0 && title.includes("Material")) {
    title = materialCurly;
    start = vignetteRest.indexOf(title);
  }
  if (start < 0) throw new Error(`Missing vignette ${vignettes[i][0]}`);
  let end = vignetteRest.length;
  for (let j = i + 1; j < vignettes.length; j++) {
    let nextTitle = vignettes[j][0];
    let idx = vignetteRest.indexOf(nextTitle, start + title.length);
    if (idx < 0 && nextTitle.includes("Material")) {
      idx = vignetteRest.indexOf(materialCurly, start + title.length);
      nextTitle = materialCurly;
    }
    if (idx >= 0) {
      end = idx;
      break;
    }
  }
  const displayTitle = vignettes[i][0].includes("Material")
    ? materialCurly
    : vignettes[i][0];
  const body = vignetteRest.slice(start + title.length, end).trim();
  write(vignettes[i][1], displayTitle, "persona-vignette", body);
}

const ebStart = src.indexOf("\nWhen the Evidence Breaks\n");
const ebEnd = src.lastIndexOf("\n=====\n");
const ebBlock = src.slice(ebStart + 1, ebEnd).trim();

const scenes = [
  [
    "1. Security — The Binder",
    "evidence-breaks-01-security-the-binder.md",
    "Security — The Binder",
  ],
  [
    "2. Risk — The Two Reds",
    "evidence-breaks-02-risk-the-two-reds.md",
    "Risk — The Two Reds",
  ],
  [
    "3. Privacy — The Wrong Hospital",
    "evidence-breaks-03-privacy-the-wrong-hospital.md",
    "Privacy — The Wrong Hospital",
  ],
  [
    "4. Finance — Final_v7",
    "evidence-breaks-04-finance-final-v7.md",
    "Finance — Final_v7",
  ],
  [
    "5. Legal — The Shared Search",
    "evidence-breaks-05-legal-the-shared-search.md",
    "Legal — The Shared Search",
  ],
  [
    "6. IT Operations — The Helpful Connector",
    "evidence-breaks-06-it-operations-the-helpful-connector.md",
    "IT Operations — The Helpful Connector",
  ],
  [
    "7. Product Security — The Answer That Sent Itself",
    "evidence-breaks-07-product-security-the-answer-that-sent-itself.md",
    "Product Security — The Answer That Sent Itself",
  ],
  [
    "8. Internal Audit — The Perfect Control",
    "evidence-breaks-08-internal-audit-the-perfect-control.md",
    "Internal Audit — The Perfect Control",
  ],
  [
    "9. The Audit Director — The Question Behind the Question",
    "evidence-breaks-09-audit-director-the-question-behind-the-question.md",
    "The Audit Director — The Question Behind the Question",
  ],
  [
    "10. The Command Center",
    "evidence-breaks-10-the-command-center.md",
    "The Command Center",
  ],
] as const;

for (let i = 0; i < scenes.length; i++) {
  const start = ebBlock.indexOf(scenes[i][0]);
  if (start < 0) throw new Error(`Missing scene ${scenes[i][0]}`);
  const end =
    i + 1 < scenes.length
      ? ebBlock.indexOf(scenes[i + 1][0])
      : ebBlock.length;
  let body = ebBlock.slice(start + scenes[i][0].length, end).trim();
  body = body.replace(
    /Management assertion: OperatingAudit status:/g,
    "Management assertion: Operating\n\nAudit status:",
  );
  const title = `When the Evidence Breaks — ${scenes[i][2]}`;
  const preface = `_Series: When the Evidence Breaks · Scene ${i + 1} of 10_\n\n`;
  write(scenes[i][1], title, "evidence-breaks-scene", preface + body);
}

console.log("done");
