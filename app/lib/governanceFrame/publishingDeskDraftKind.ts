/**
 * Publishing Desk tab classification for quarantined queue filenames.
 * Keeps Briefings / Newsletters / Research papers lists mutually exclusive.
 */

export type PublishingDeskTab = "briefings" | "newsletters" | "research" | "video";

export const PUBLISHING_DESK_TAB_IDS: PublishingDeskTab[] = [
  "briefings",
  "newsletters",
  "research",
  "video",
];

export function parsePublishingDeskTab(raw: string | null | undefined): PublishingDeskTab {
  return raw && PUBLISHING_DESK_TAB_IDS.includes(raw as PublishingDeskTab)
    ? (raw as PublishingDeskTab)
    : "briefings";
}

export function isStrictNewsletterQueueDraft(filename: string): boolean {
  return /newsletter/i.test(filename) || /ironcast/i.test(filename);
}

/** Ironcast + market series that syndicate as newsletter editions after Approve. */
export function isNewslettersDeskDraft(filename: string): boolean {
  return (
    isStrictNewsletterQueueDraft(filename) ||
    /market-grc/i.test(filename) ||
    /-draft-market-/i.test(filename)
  );
}

/** Industry research / research-paper queue drafts (`*-draft-research-*`). */
export function isResearchDeskDraft(filename: string): boolean {
  return /-draft-research-/i.test(filename) || /^draft-research-/i.test(filename);
}

export function publishingDeskTabForQueueDraft(filename: string): PublishingDeskTab {
  if (isNewslettersDeskDraft(filename)) return "newsletters";
  if (isResearchDeskDraft(filename)) return "research";
  return "briefings";
}

export function publishingDeskHref(
  desk: PublishingDeskTab,
  draftFilename?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("desk", desk);
  const draft = draftFilename?.trim();
  if (draft) params.set("draft", draft);
  return `/dashboard/operations/publishing?${params.toString()}`;
}

/** Canonical Videos page (When Risk Enters the Room campaign hub). */
export const PUBLISHING_VIDEOS_PAGE_HREF =
  "/docs/marketing-strategy/video-series/when-risk-enters-the-room";

const VIDEO_SERIES_DOCS_PREFIX = "/docs/marketing-strategy/video-series";

/** Narrative files under the Videos hub — same folder as the campaign plan. */
export const PUBLISHING_VIDEO_NARRATIVE_LINKS: Array<{
  group: string;
  items: Array<{ label: string; href: string }>;
}> = [
  {
    group: "Hub & budget",
    items: [
      { label: "Campaign hub (plan + index)", href: PUBLISHING_VIDEOS_PAGE_HREF },
      {
        label: "Budget and production",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/budget-and-production`,
      },
    ],
  },
  {
    group: "Episode scripts",
    items: [
      { label: "V1 — The Risk Register", href: `${VIDEO_SERIES_DOCS_PREFIX}/v1-the-risk-register` },
      { label: "V2 — The Audit Request", href: `${VIDEO_SERIES_DOCS_PREFIX}/v2-the-audit-request` },
      { label: "V3 — The Wrong Client", href: `${VIDEO_SERIES_DOCS_PREFIX}/v3-the-wrong-client` },
      {
        label: "V4 — The AI-Generated Board Report",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/v4-the-ai-generated-board-report`,
      },
      { label: "V5 — The Connector", href: `${VIDEO_SERIES_DOCS_PREFIX}/v5-the-connector` },
      {
        label: "V6 — The Complete Ironframe Story",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/v6-the-complete-ironframe-story`,
      },
    ],
  },
  {
    group: "Persona vignettes",
    items: [
      {
        label: "The CISO and the Red Square",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-ciso-red-square`,
      },
      {
        label: "The CISO and the Missing Evidence",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-ciso-missing-evidence`,
      },
      {
        label: "The CRO and the Risk That Would Not Fit",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-cro-risk-that-would-not-fit`,
      },
      {
        label: "The Data Protection Officer and the Open Door",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-dpo-open-door`,
      },
      {
        label: "The CFO and the Word “Material”",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-cfo-word-material`,
      },
      {
        label: "General Counsel and the Draft That Almost Escaped",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-gc-draft-that-almost-escaped`,
      },
      {
        label: "The Head of ITSM and the Emergency Change",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-itsm-emergency-change`,
      },
      {
        label: "The Head of Product Security and the Helpful Agent",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/vignette-product-security-helpful-agent`,
      },
    ],
  },
  {
    group: "When the Evidence Breaks",
    items: [
      {
        label: "1. Security — The Binder",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-01-security-the-binder`,
      },
      {
        label: "2. Risk — The Two Reds",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-02-risk-the-two-reds`,
      },
      {
        label: "3. Privacy — The Wrong Hospital",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-03-privacy-the-wrong-hospital`,
      },
      {
        label: "4. Finance — Final_v7",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-04-finance-final-v7`,
      },
      {
        label: "5. Legal — The Shared Search",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-05-legal-the-shared-search`,
      },
      {
        label: "6. IT Operations — The Helpful Connector",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-06-it-operations-the-helpful-connector`,
      },
      {
        label: "7. Product Security — The Answer That Sent Itself",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-07-product-security-the-answer-that-sent-itself`,
      },
      {
        label: "8. Internal Audit — The Perfect Control",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-08-internal-audit-the-perfect-control`,
      },
      {
        label: "9. The Audit Director — The Question Behind the Question",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-09-audit-director-the-question-behind-the-question`,
      },
      {
        label: "10. The Command Center",
        href: `${VIDEO_SERIES_DOCS_PREFIX}/evidence-breaks-10-the-command-center`,
      },
    ],
  },
];

