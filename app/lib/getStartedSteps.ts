export const GET_STARTED_STEPS = [
  {
    id: "quickstart",
    title: "Workspace orientation",
    description:
      "Open the Design Partner Operator Packet for workspace orientation, Get Started gates, and the daily cockpit loop.",
    href: "/docs/user-manuals/design-partner-operator-packet",
    docLabel: "Open operator packet",
  },
  {
    id: "integrity-hub",
    title: "Integrity Hub & ALE baselines",
    description:
      "Visit the Integrity Hub to see tenant-scoped financial baselines stored as BigInt integer cents.",
    href: "/integrity",
    docLabel: "Open Integrity Hub",
  },
  {
    id: "level1-index",
    title: "Partner training track",
    description:
      "Browse the curated Level 1 chapters for design partners (excludes classroom seed labs and CLI remediation).",
    href: "/docs/training/LEVEL1-PARTNER-INDEX",
    docLabel: "Open partner training index",
  },
  {
    id: "trainer-session",
    title: "Trainer agent sandbox",
    description:
      "Ask the isolated Trainer multi-turn questions grounded on the verified training corpus (complete via panel below).",
    href: "/get-started#trainer-sandbox",
    docLabel: "Use Trainer panel",
  },
  {
    id: "export-path",
    title: "Audit export path",
    description:
      "Locate tenant-scoped CSV/PDF exports for auditor handoff at /exports.",
    href: "/exports",
    docLabel: "Open exports console",
  },
] as const;

export type GetStartedStepId = (typeof GET_STARTED_STEPS)[number]["id"];
