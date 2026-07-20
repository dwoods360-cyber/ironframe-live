import "server-only";

import { resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";

/** Delegated Graph scopes for workflow-review Teams meetings + transcripts. */
export const TEAMS_GRAPH_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "OnlineMeetings.ReadWrite",
  "OnlineMeetingTranscript.Read.All",
] as const;

export type TeamsGraphEnv = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  tokenFile: string;
};

export function readTeamsGraphEnv(): TeamsGraphEnv | { error: string } {
  const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET?.trim() ?? "";
  const tenantId =
    process.env.MICROSOFT_GRAPH_TENANT_ID?.trim() || "organizations";
  const tokenFile =
    process.env.MICROSOFT_GRAPH_TOKEN_FILE?.trim() ||
    "./secrets/teams-graph-token.json";

  if (!clientId || !clientSecret) {
    return {
      error:
        "Microsoft Graph is not configured. Set MICROSOFT_GRAPH_CLIENT_ID and MICROSOFT_GRAPH_CLIENT_SECRET (Azure app registration).",
    };
  }

  const redirectUri =
    process.env.MICROSOFT_GRAPH_REDIRECT_URI?.trim() ||
    `${resolvePublicAppUrl().replace(/\/$/, "")}/api/admin/operations-hub/teams/callback`;

  return { clientId, clientSecret, tenantId, redirectUri, tokenFile };
}

export function teamsGraphAuthorizeUrl(env: TeamsGraphEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.clientId,
    response_type: "code",
    redirect_uri: env.redirectUri,
    response_mode: "query",
    scope: TEAMS_GRAPH_SCOPES.join(" "),
    state,
    prompt: "consent",
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(env.tenantId)}/oauth2/v2.0/authorize?${params}`;
}

export function teamsGraphTokenUrl(env: TeamsGraphEnv): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(env.tenantId)}/oauth2/v2.0/token`;
}
