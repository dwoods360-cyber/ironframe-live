import { parseJsonResponse } from "@/app/utils/parseJsonResponse";

type OpsPortalErrorBody = {
  error?: string;
  hint?: string;
};

/**
 * Fetch + parse ops portal JSON without opaque "Unexpected end of JSON input" failures.
 */
export async function fetchOpsPortalJson<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallbackError: string,
): Promise<T> {
  const response = await fetch(input, init);
  const parsed = await parseJsonResponse<T & OpsPortalErrorBody>(response);
  if (!parsed.ok) throw new Error(parsed.error);
  if (!response.ok) {
    throw new Error(
      [parsed.data.error, parsed.data.hint].filter(Boolean).join(" ") || fallbackError,
    );
  }
  return parsed.data;
}
