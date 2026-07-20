import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";

import {
  readTeamsGraphEnv,
  teamsGraphAuthorizeUrl,
  teamsGraphTokenUrl,
  type TeamsGraphEnv,
} from "@/app/lib/server/teamsGraphConfig";

export type TeamsGraphTokenBundle = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
  account_email?: string | null;
  account_name?: string | null;
  connected_at?: string;
  connected_by_user_id?: string;
};

export type TeamsGraphConnectionStatus = {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  expiresAt: string | null;
  tokenFile: string | null;
  redirectUri: string | null;
  error: string | null;
  /** Graph transcripts land after the meeting (or shortly after transcription finishes) — not true live captions. */
  ingestMode: "post_meeting_transcript" | "not_configured";
};

function oauthStateSecret(): string {
  return (
    process.env.MICROSOFT_GRAPH_OAUTH_STATE_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim() ||
    process.env.MICROSOFT_GRAPH_CLIENT_SECRET?.trim() ||
    "ironframe-teams-oauth-dev"
  );
}

export function createTeamsOAuthState(userId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${userId}.${Date.now()}.${nonce}`;
  const sig = createHmac("sha256", oauthStateSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyTeamsOAuthState(
  state: string,
  userId: string,
  maxAgeMs = 15 * 60 * 1000,
): boolean {
  const parts = state.split(".");
  if (parts.length !== 4) return false;
  const [uid, tsRaw, nonce, sig] = parts;
  if (!uid || !tsRaw || !nonce || !sig) return false;
  if (uid !== userId) return false;
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || Date.now() - ts > maxAgeMs) return false;
  const payload = `${uid}.${tsRaw}.${nonce}`;
  const expected = createHmac("sha256", oauthStateSecret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function saveTokenFile(tokenFile: string, tokens: TeamsGraphTokenBundle): void {
  const dir = path.dirname(tokenFile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2), { encoding: "utf8" });
  try {
    fs.chmodSync(tokenFile, 0o600);
  } catch {
    // Windows may not honor chmod.
  }
}

function readTokenFile(tokenFile: string): TeamsGraphTokenBundle | null {
  if (!fs.existsSync(tokenFile)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(tokenFile, "utf8")) as TeamsGraphTokenBundle;
    if (!raw?.access_token && !raw?.refresh_token) return null;
    return raw;
  } catch {
    return null;
  }
}

function envTokenOverride(): TeamsGraphTokenBundle | null {
  const refresh = process.env.MICROSOFT_GRAPH_REFRESH_TOKEN?.trim();
  const access = process.env.MICROSOFT_GRAPH_ACCESS_TOKEN?.trim();
  if (!refresh && !access) return null;
  return {
    access_token: access ?? "",
    refresh_token: refresh,
    expires_at: access ? Date.now() + 5 * 60 * 1000 : 0,
    account_email: process.env.MICROSOFT_GRAPH_ACCOUNT_EMAIL?.trim() || null,
  };
}

export function getTeamsGraphConnectionStatus(): TeamsGraphConnectionStatus {
  const env = readTeamsGraphEnv();
  if ("error" in env) {
    return {
      configured: false,
      connected: false,
      accountEmail: null,
      accountName: null,
      expiresAt: null,
      tokenFile: null,
      redirectUri: null,
      error: env.error,
      ingestMode: "not_configured",
    };
  }

  const tokens = envTokenOverride() ?? readTokenFile(env.tokenFile);
  return {
    configured: true,
    connected: Boolean(tokens?.refresh_token || tokens?.access_token),
    accountEmail: tokens?.account_email ?? null,
    accountName: tokens?.account_name ?? null,
    expiresAt: tokens?.expires_at ? new Date(tokens.expires_at).toISOString() : null,
    tokenFile: env.tokenFile,
    redirectUri: env.redirectUri,
    error: null,
    ingestMode: "post_meeting_transcript",
  };
}

export function buildTeamsConnectUrl(userId: string): { url: string } | { error: string } {
  const env = readTeamsGraphEnv();
  if ("error" in env) return { error: env.error };
  const state = createTeamsOAuthState(userId);
  return { url: teamsGraphAuthorizeUrl(env, state) };
}

async function exchangeToken(
  env: TeamsGraphEnv,
  body: Record<string, string>,
): Promise<TeamsGraphTokenBundle> {
  const res = await fetch(teamsGraphTokenUrl(env), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || `Token exchange failed (${res.status}).`,
    );
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + Math.max(60, Number(json.expires_in ?? 3600) - 120) * 1000,
    scope: json.scope,
    token_type: json.token_type,
  };
}

export async function completeTeamsOAuth(input: {
  code: string;
  state: string;
  userId: string;
}): Promise<{ ok: true; accountEmail: string | null } | { error: string }> {
  const env = readTeamsGraphEnv();
  if ("error" in env) return { error: env.error };
  if (!verifyTeamsOAuthState(input.state, input.userId)) {
    return { error: "Invalid or expired OAuth state. Start Connect Teams again." };
  }

  try {
    const tokens = await exchangeToken(env, {
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: env.redirectUri,
      scope: [
        "openid",
        "profile",
        "offline_access",
        "User.Read",
        "OnlineMeetings.ReadWrite",
        "OnlineMeetingTranscript.Read.All",
      ].join(" "),
    });

    const me = await graphGetJson<{ mail?: string; userPrincipalName?: string; displayName?: string }>(
      tokens.access_token,
      "/me?$select=displayName,mail,userPrincipalName",
    );

    const bundle: TeamsGraphTokenBundle = {
      ...tokens,
      account_email: me.mail || me.userPrincipalName || null,
      account_name: me.displayName || null,
      connected_at: new Date().toISOString(),
      connected_by_user_id: input.userId,
    };
    saveTokenFile(env.tokenFile, bundle);
    return { ok: true, accountEmail: bundle.account_email ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Teams OAuth failed." };
  }
}

async function graphGetJson<T>(accessToken: string, pathAndQuery: string): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph GET ${pathAndQuery} failed (${res.status}): ${text.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

export async function getTeamsGraphAccessToken(): Promise<
  { accessToken: string; accountEmail: string | null } | { error: string }
> {
  const env = readTeamsGraphEnv();
  if ("error" in env) return { error: env.error };

  let tokens = envTokenOverride() ?? readTokenFile(env.tokenFile);
  if (!tokens) {
    return {
      error: "Teams is not connected. Use Connect Microsoft Teams on the workflow review page.",
    };
  }

  if (tokens.access_token && tokens.expires_at > Date.now() + 30_000) {
    return { accessToken: tokens.access_token, accountEmail: tokens.account_email ?? null };
  }

  if (!tokens.refresh_token) {
    return { error: "Teams token expired and no refresh_token is stored. Reconnect Teams." };
  }

  try {
    const refreshed = await exchangeToken(env, {
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      scope: [
        "openid",
        "profile",
        "offline_access",
        "User.Read",
        "OnlineMeetings.ReadWrite",
        "OnlineMeetingTranscript.Read.All",
      ].join(" "),
    });
    const bundle: TeamsGraphTokenBundle = {
      ...tokens,
      ...refreshed,
      refresh_token: refreshed.refresh_token || tokens.refresh_token,
    };
    if (!envTokenOverride()) {
      saveTokenFile(env.tokenFile, bundle);
    }
    return { accessToken: bundle.access_token, accountEmail: bundle.account_email ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to refresh Teams Graph token.",
    };
  }
}
