import { handleCanonicalRawSignalPost } from '@/app/api/ingestion/canonicalRawSignal';

/**
 * Canonical GRC raw-signal ingress: Irongate (Agent 14) → Ironcore (Agent 1). Non-CLEAN → 403.
 */
export async function POST(request: Request) {
  return handleCanonicalRawSignalPost(request);
}
