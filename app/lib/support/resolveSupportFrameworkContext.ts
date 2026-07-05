/** Derive GRC framework / module context from the active viewport route. */
export function resolveSupportFrameworkContext(pathname: string): string {
  const path = pathname.trim() || "/";

  if (path.startsWith("/exports")) return "IRONQUERY_ANALYST_EXPORT";
  if (path.startsWith("/integrity")) return "INTEGRITY_HUB";
  if (path.startsWith("/get-started")) return "OPERATOR_ONBOARDING";
  if (path.startsWith("/compliance")) return "COMPLIANCE_FRAMEWORKS";
  if (path.startsWith("/evidence")) return "EVIDENCE_VAULT";
  if (path.startsWith("/dashboard/support")) return "SUPPORT_CONSOLE";
  if (path === "/" || path.startsWith("/dashboard")) return "COMMAND_POST";

  return "GLOBAL_WORKSPACE";
}
