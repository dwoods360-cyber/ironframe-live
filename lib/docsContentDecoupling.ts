/**
 * Documentation corpus decoupling — strip SaaS hosting URLs and app-route hyperlinks
 * from markdown served in the in-app docs viewer (v0.1.0-ga-epic17).
 */

const HOSTING_URL_IN_TEXT =
  /https?:\/\/[^\s)`\]]*(?:vercel\.app|ironframegrc\.com|localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?|[\w-]+\.lvh\.me(?::\d+)?)[^\s)`\]]*/gi;

const HOSTING_URL_HOST =
  /(?:^|\/\/)(?:[\w.-]+\.)?(vercel\.app|ironframegrc\.com|localhost|127\.0\.0\.1|lvh\.me)/i;

/** Replace bare hosting URLs in markdown prose/code spans with neutral placeholder text. */
export function stripHostingUrlsInMarkdown(source: string): string {
  return source.replace(HOSTING_URL_IN_TEXT, "your provisioned workspace URL");
}

export function isDocsHostingUrl(href: string | undefined): boolean {
  if (!href?.trim()) return false;
  const trimmed = href.trim();
  if (!/^https?:/i.test(trimmed)) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return (
      host.endsWith(".vercel.app") ||
      host === "vercel.app" ||
      host.includes("ironframegrc.com") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".lvh.me") ||
      host.endsWith(".localtest.me")
    );
  } catch {
    return HOSTING_URL_HOST.test(trimmed);
  }
}

/**
 * App-router paths outside the documentation tree (login, API, dashboard, etc.).
 * `/docs/...` and relative doc slugs are allowed.
 */
export function isDecoupledAppRouteHref(href: string | undefined): boolean {
  if (!href?.trim()) return false;
  const pathOnly = href.trim().split("#")[0]?.split("?")[0] ?? "";
  if (!pathOnly.startsWith("/")) return false;
  if (pathOnly.startsWith("/docs/") || pathOnly === "/docs") return false;
  return true;
}

/** Only hosting URLs render as plain text — workspace and /docs/ links stay clickable. */
export function shouldRenderDocHrefAsText(href: string | undefined): boolean {
  return isDocsHostingUrl(href);
}

export function decoupleDocsMarkdownContent(source: string): string {
  return stripHostingUrlsInMarkdown(source);
}

export const OPERATOR_DOC_READING_LEVELS = ["LEVEL_1", "TRAINING"] as const;

export function isOperatorFacingReadingLevel(level: string): boolean {
  return (OPERATOR_DOC_READING_LEVELS as readonly string[]).includes(level);
}

/** Strip internal suffixes like "(Level 1)" and grade bands from titles shown to operators. */
export function formatOperatorDocTitle(title: string): string {
  return title
    .replace(/\s*\(11th\s*[–-]\s*12th\s+grade\)\s*$/i, "")
    .replace(/\s*\(level\s*[12]\)\s*$/i, "")
    .trim();
}

/**
 * Remove duplicate H1 and publisher metadata lines from Level 1 / training markdown.
 * Reading level is an internal corpus tag — operators never see it in the rendered view.
 */
export function stripOperatorFacingDocMarkdown(source: string, pageTitle: string): string {
  let content = source.trimStart();

  const h1Match = content.match(/^#\s+(.+)\r?\n+/);
  if (h1Match) {
    const h1Text = h1Match[1]?.trim() ?? "";
    const normalizedH1 = formatOperatorDocTitle(h1Text).toLowerCase();
    const normalizedPage = formatOperatorDocTitle(pageTitle).toLowerCase();
    if (normalizedH1 === normalizedPage || h1Text.toLowerCase() === pageTitle.trim().toLowerCase()) {
      content = content.slice(h1Match[0].length);
    }
  }

  content = content.replace(/^\*\*Reading level:\*\*[^\n]*\r?\n+/im, "");
  content = content.replace(/^\s*---\s*\r?\n+/, "");

  return content.trimStart();
}

export function prepareDocContentForDisplay(
  source: string,
  options: { readingLevel: string; title: string },
): string {
  const decoupled = decoupleDocsMarkdownContent(source);
  if (!isOperatorFacingReadingLevel(options.readingLevel)) {
    return decoupled;
  }
  return stripOperatorFacingDocMarkdown(decoupled, options.title);
}
