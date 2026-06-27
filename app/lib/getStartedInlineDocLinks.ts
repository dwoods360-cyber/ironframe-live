import { GET_STARTED_STEPS, type GetStartedStepId } from "@/app/lib/getStartedSteps";

/** Scroll container for the Get Started inline documentation reader drawer. */
export const GET_STARTED_INLINE_READER_SCROLL_ID = "get-started-inline-reader-scroll";

export function shouldInterceptGetStartedInlineDocLink(resolvedHref: string): boolean {
  const pathOnly = resolvedHref.split("#")[0]?.split("?")[0] ?? "";
  return pathOnly.startsWith("/docs/");
}

export function normalizeGetStartedInlineDocHref(resolvedHref: string): string {
  const hashIndex = resolvedHref.indexOf("#");
  const pathPart = hashIndex >= 0 ? resolvedHref.slice(0, hashIndex) : resolvedHref;
  const hash = hashIndex >= 0 ? resolvedHref.slice(hashIndex) : "";
  return `${pathPart.toLowerCase()}${hash}`;
}

export function resolveGetStartedStepIdForDocHref(href: string): GetStartedStepId | null {
  const pathOnly = href.split("#")[0]?.split("?")[0] ?? "";
  const match = GET_STARTED_STEPS.find((step) => {
    const stepPath = step.href.split("#")[0]?.split("?")[0] ?? "";
    return stepPath.toLowerCase() === pathOnly.toLowerCase();
  });
  return match?.id ?? null;
}

export function scrollGetStartedInlineReaderToAnchor(anchorId: string): void {
  if (!anchorId) return;
  const target = document.getElementById(anchorId);
  if (!target) return;
  const container = document.getElementById(GET_STARTED_INLINE_READER_SCROLL_ID);
  if (container?.contains(target)) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
