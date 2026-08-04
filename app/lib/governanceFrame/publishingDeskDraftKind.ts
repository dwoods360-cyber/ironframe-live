/**
 * Publishing Desk tab classification for quarantined queue filenames.
 * Keeps Briefings / Newsletters / Research papers lists mutually exclusive.
 */

export type PublishingDeskTab = "briefings" | "newsletters" | "research";

export const PUBLISHING_DESK_TAB_IDS: PublishingDeskTab[] = [
  "briefings",
  "newsletters",
  "research",
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
