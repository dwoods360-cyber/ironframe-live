import fs from "fs";
import path from "path";
import readline from "readline";
import { google } from "googleapis";
import type { drive_v3, docs_v1 } from "googleapis";

import { OAUTH_SCOPES } from "./types";

type InstalledClient = {
  client_id: string;
  client_secret: string;
  redirect_uris?: string[];
};

type OAuthClientFile = {
  installed?: InstalledClient;
  web?: InstalledClient;
};

export type AuthorizedClients = {
  drive: drive_v3.Drive;
  docs: docs_v1.Docs;
};

function readClientFile(clientFile: string): InstalledClient {
  if (!fs.existsSync(clientFile)) {
    throw new Error(
      `Missing OAuth client file at GOOGLE_OAUTH_CLIENT_FILE (${clientFile}).`,
    );
  }
  const raw = JSON.parse(fs.readFileSync(clientFile, "utf8")) as OAuthClientFile;
  const client = raw.installed ?? raw.web;
  if (!client?.client_id || !client?.client_secret) {
    throw new Error(
      "OAuth client file must contain installed or web client_id and client_secret.",
    );
  }
  return client;
}

function saveTokenFile(tokenFile: string, tokens: object): void {
  const dir = path.dirname(tokenFile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2), { encoding: "utf8" });
  try {
    fs.chmodSync(tokenFile, 0o600);
  } catch {
    // Windows may not honor chmod; best-effort only.
  }
}

async function promptForCode(authUrl: string): Promise<string> {
  console.log("\nAuthorize this application by visiting:\n");
  console.log(authUrl);
  console.log("\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise<string>((resolve) => {
    rl.question("Paste the authorization code here: ", (answer) => resolve(answer.trim()));
  });
  rl.close();
  if (!code) {
    throw new Error("OAuth failure — empty authorization code.");
  }
  return code;
}

/**
 * Authenticate with OAuth 2.0 Desktop credentials.
 * Never logs client secrets, refresh tokens, or access tokens.
 */
export async function authorizeGoogle(): Promise<AuthorizedClients> {
  const clientFile = process.env.GOOGLE_OAUTH_CLIENT_FILE?.trim();
  const tokenFile = process.env.GOOGLE_OAUTH_TOKEN_FILE?.trim();
  if (!clientFile) {
    throw new Error("Missing credential environment variable: GOOGLE_OAUTH_CLIENT_FILE");
  }
  if (!tokenFile) {
    throw new Error("Missing credential environment variable: GOOGLE_OAUTH_TOKEN_FILE");
  }

  const client = readClientFile(clientFile);
  const redirectUri = client.redirect_uris?.[0] ?? "http://localhost";
  const oAuth2Client = new google.auth.OAuth2(
    client.client_id,
    client.client_secret,
    redirectUri,
  );

  if (fs.existsSync(tokenFile)) {
    const tokens = JSON.parse(fs.readFileSync(tokenFile, "utf8")) as {
      refresh_token?: string;
      access_token?: string;
      expiry_date?: number;
    };
    if (!tokens.refresh_token && !tokens.access_token) {
      throw new Error("OAuth failure — token file has no usable tokens.");
    }
    oAuth2Client.setCredentials(tokens);
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [...OAUTH_SCOPES],
    });
    const code = await promptForCode(authUrl);
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      saveTokenFile(tokenFile, tokens);
      console.log(`Saved OAuth token to ${tokenFile}`);
    } catch (err) {
      throw new Error(
        `OAuth failure — could not exchange authorization code: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return {
    drive: google.drive({ version: "v3", auth: oAuth2Client }),
    docs: google.docs({ version: "v1", auth: oAuth2Client }),
  };
}
