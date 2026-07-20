import "server-only";

import { getTeamsGraphAccessToken } from "@/app/lib/server/teamsGraphAuth";
import {
  parseTeamsTranscriptVtt,
  transcriptDelta,
} from "@/app/lib/server/teamsGraphTranscriptParse";

export type TeamsOnlineMeeting = {
  id: string;
  joinUrl: string | null;
  subject: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
};

async function graphFetch(
  accessToken: string,
  pathAndQuery: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`https://graph.microsoft.com/v1.0${pathAndQuery}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function createTeamsOnlineMeeting(input: {
  subject: string;
  startIso?: string;
  endIso?: string;
}): Promise<{ meeting: TeamsOnlineMeeting } | { error: string }> {
  const auth = await getTeamsGraphAccessToken();
  if ("error" in auth) return { error: auth.error };

  const start = input.startIso
    ? new Date(input.startIso)
    : new Date(Date.now() + 2 * 60 * 1000);
  const end = input.endIso
    ? new Date(input.endIso)
    : new Date(start.getTime() + 30 * 60 * 1000);

  const body = {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    subject: input.subject.trim() || "Ironframe workflow review",
  };

  const res = await graphFetch(auth.accessToken, "/me/onlineMeetings", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    id?: string;
    joinWebUrl?: string;
    subject?: string;
    startDateTime?: string;
    endDateTime?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    return {
      error: json.error?.message || `Create online meeting failed (${res.status}).`,
    };
  }

  return {
    meeting: {
      id: json.id,
      joinUrl: json.joinWebUrl ?? null,
      subject: json.subject ?? body.subject,
      startDateTime: json.startDateTime ?? body.startDateTime,
      endDateTime: json.endDateTime ?? body.endDateTime,
    },
  };
}

export async function resolveTeamsMeetingByJoinUrl(
  joinUrl: string,
): Promise<{ meeting: TeamsOnlineMeeting } | { error: string }> {
  const auth = await getTeamsGraphAccessToken();
  if ("error" in auth) return { error: auth.error };

  const url = joinUrl.trim();
  if (!url) return { error: "Join URL is required." };

  const filter = `JoinWebUrl eq '${url.replace(/'/g, "''")}'`;
  const res = await graphFetch(
    auth.accessToken,
    `/me/onlineMeetings?$filter=${encodeURIComponent(filter)}`,
  );
  const json = (await res.json()) as {
    value?: Array<{
      id?: string;
      joinWebUrl?: string;
      subject?: string;
      startDateTime?: string;
      endDateTime?: string;
    }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      error: json.error?.message || `Resolve meeting failed (${res.status}).`,
    };
  }
  const row = json.value?.[0];
  if (!row?.id) {
    return {
      error:
        "No online meeting found for that join URL under the connected account. Create the meeting with Create Teams meeting, or use a meeting you organized.",
    };
  }
  return {
    meeting: {
      id: row.id,
      joinUrl: row.joinWebUrl ?? url,
      subject: row.subject ?? null,
      startDateTime: row.startDateTime ?? null,
      endDateTime: row.endDateTime ?? null,
    },
  };
}

export type TeamsTranscriptPollResult = {
  meetingId: string;
  transcriptId: string | null;
  fullText: string;
  deltaText: string;
  ready: boolean;
  note: string;
};

export async function pollTeamsMeetingTranscript(input: {
  meetingId: string;
  previousText?: string;
}): Promise<TeamsTranscriptPollResult | { error: string }> {
  const auth = await getTeamsGraphAccessToken();
  if ("error" in auth) return { error: auth.error };

  const meetingId = encodeURIComponent(input.meetingId.trim());
  if (!meetingId) return { error: "meetingId is required." };

  const listRes = await graphFetch(
    auth.accessToken,
    `/me/onlineMeetings/${meetingId}/transcripts`,
  );
  const listJson = (await listRes.json()) as {
    value?: Array<{ id?: string; createdDateTime?: string }>;
    error?: { message?: string };
  };

  if (!listRes.ok) {
    return {
      error:
        listJson.error?.message ||
        `List transcripts failed (${listRes.status}). Ensure OnlineMeetingTranscript.Read.All is consented and transcription was enabled for the meeting.`,
    };
  }

  const transcripts = listJson.value ?? [];
  if (transcripts.length === 0) {
    return {
      meetingId: input.meetingId,
      transcriptId: null,
      fullText: "",
      deltaText: "",
      ready: false,
      note:
        "No Graph transcript yet. Enable transcription in Teams, keep the meeting under the connected organizer, and poll again after the call (Graph delivers post-meeting / near-end artifacts — not live captions). Use mic LIVE for in-call assist.",
    };
  }

  const newest = [...transcripts].sort((a, b) =>
    String(b.createdDateTime ?? "").localeCompare(String(a.createdDateTime ?? "")),
  )[0];
  const transcriptId = newest?.id;
  if (!transcriptId) {
    return {
      meetingId: input.meetingId,
      transcriptId: null,
      fullText: "",
      deltaText: "",
      ready: false,
      note: "Transcript metadata missing id.",
    };
  }

  const contentRes = await graphFetch(
    auth.accessToken,
    `/me/onlineMeetings/${meetingId}/transcripts/${encodeURIComponent(transcriptId)}/content?$format=text/vtt`,
    { headers: { Accept: "text/vtt" } },
  );
  if (!contentRes.ok) {
    const text = await contentRes.text();
    return {
      error: `Fetch transcript content failed (${contentRes.status}): ${text.slice(0, 240)}`,
    };
  }

  const vtt = await contentRes.text();
  const fullText = parseTeamsTranscriptVtt(vtt);
  const deltaText = transcriptDelta(input.previousText ?? "", fullText);

  return {
    meetingId: input.meetingId,
    transcriptId,
    fullText,
    deltaText,
    ready: Boolean(fullText),
    note: fullText
      ? "Transcript loaded from Microsoft Graph."
      : "Transcript file was empty.",
  };
}
