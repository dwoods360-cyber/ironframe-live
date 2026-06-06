/**
 * Resolves markdown hyperlinks to slug-compatible `/docs/...` routes (no `.md` suffix).
 * Used by the docs markdown viewer at render time.
 */

/** Strip `.md` suffixes from URL segments (e.g. `/docs/hub.md` → `hub`). */
export function sanitizeDocSlugSegments(slugSegments: string[]): string[] {
  return slugSegments
    .map((segment) => {
      const trimmed = segment.trim();
      return /\.md$/i.test(trimmed) ? trimmed.replace(/\.md$/i, "") : trimmed;
    })
    .filter((segment) => segment.length > 0);
}

export function normalizeDocMarkdownHref(
  href: string | undefined,
  currentSlug: string[],
): string | undefined {
  if (!href) return href;
  if (/^(https?:|mailto:|#|vscode:)/i.test(href)) return href;

  const hashIndex = href.indexOf("#");
  const pathPart = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";

  const stripMd = (segment: string) => segment.replace(/\.md$/i, "");

  if (pathPart.startsWith("/docs/")) {
    const cleaned = pathPart
      .split("/")
      .map((segment, index) => (index === 0 ? segment : stripMd(segment)))
      .join("/");
    return `${cleaned}${hash}`;
  }

  if (pathPart.startsWith("/")) {
    return `${stripMd(pathPart)}${hash}`;
  }

  const dirParts = currentSlug.slice(0, -1);
  const segments = pathPart.split("/");
  const resolved: string[] = [...dirParts];

  for (const segment of segments) {
    if (segment === "..") {
      resolved.pop();
    } else if (segment === "." || segment === "") {
      continue;
    } else {
      resolved.push(stripMd(segment));
    }
  }

  const upLevels = segments.filter((segment) => segment === "..").length;
  if (upLevels > dirParts.length) {
    const outside = segments
      .filter((segment) => segment !== ".." && segment !== "." && segment !== "")
      .map(stripMd);
    return `/${outside.join("/")}${hash}`;
  }

  return `/docs/${resolved.join("/")}${hash}`;
}
