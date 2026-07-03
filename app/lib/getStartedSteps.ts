export const GET_STARTED_STEPS = [
  {
    id: "quickstart",
    title: "Workspace orientation",
    description:
      "Review invite activation, legal sign-off, and Command Post layout in the Level 1 quick-start guide.",
    href: "/docs/user-manuals/quickstart",
    docLabel: "Open quick-start guide",
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
    title: "Level 1 training track",
    description:
      "Browse the 12-chapter student curriculum with screenshot-backed labs for your role.",
    href: "/docs/training/LEVEL1-STUDENT-INDEX",
    docLabel: "Open Level 1 index",
  },
  {
    id: "trainer-session",
    title: "Trainer agent sandbox",
    description:
      "Ask the isolated Trainer one question grounded on the verified training corpus (complete via panel below).",
    href: "/get-started#trainer-sandbox",
    docLabel: "Use Trainer panel",
  },
  {
    id: "export-path",
    title: "Audit export path",
    description:
      "Locate tenant-scoped CSV/PDF exports for auditor handoff from the dashboard exports surface.",
    href: "/dashboard/exports",
    docLabel: "Open exports console",
  },
] as const;

export type GetStartedStepId = (typeof GET_STARTED_STEPS)[number]["id"];
