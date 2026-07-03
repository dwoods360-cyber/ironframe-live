import {
  isAuthPublicPath,
  isPublicProspectOnboardingPath,
} from "@/app/utils/grcRouteMatch";

/** Guest + prospect routes that must stay dark under system-light / Executive Light. */
export function isPublicDarkShellPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  /** `/` is guest marketing OR authenticated Command Post — resolved in ConditionalAppShell. */
  if (normalized === "/") return false;
  if (isAuthPublicPath(normalized)) return true;
  if (isPublicProspectOnboardingPath(normalized)) return true;
  if (normalized === "/governance-frame" || normalized.startsWith("/governance-frame/")) {
    return true;
  }
  if (normalized === "/legal/accept") return true;
  if (
    normalized === "/register/contact" ||
    normalized === "/register/setup" ||
    normalized === "/register/demo"
  ) {
    return true;
  }
  return false;
}

export function isInviteTokenRegistrationPath(pathname: string): boolean {
  return (
    pathname.startsWith("/register/") &&
    pathname !== "/register/contact" &&
    pathname !== "/register/setup" &&
    pathname !== "/register/demo"
  );
}

export function isDocsPathname(pathname: string): boolean {
  return pathname === "/docs" || pathname.startsWith("/docs/");
}

export function isMarketingPathname(pathname: string): boolean {
  return pathname === "/marketing" || pathname.startsWith("/marketing/");
}

export type PublicDarkShellSurface = "public-landing" | "docs-reader" | "invite-registration" | "public-funnel";

export function resolvePublicDarkShellSurface(pathname: string): PublicDarkShellSurface {
  if (isMarketingPathname(pathname)) return "public-landing";
  if (isDocsPathname(pathname)) return "docs-reader";
  if (isInviteTokenRegistrationPath(pathname)) return "invite-registration";
  return "public-funnel";
}

export const PUBLIC_DARK_SHELL_CLASS =
  "ironframe-public-scroll-shell relative z-0 min-h-[100dvh] w-full overflow-y-auto bg-[#020617] text-slate-100";
