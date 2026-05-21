import { handleCanonicalRawSignalPost } from '@/app/api/ingestion/canonicalRawSignal';

/**
 * Legacy path — delegates to the same pipeline as `POST /api/ingestion/raw-signal`.
 * Prefer the canonical URL for new integrations.
 */
export async function POST(request: Request) {
  return handleCanonicalRawSignalPost(request);
}
