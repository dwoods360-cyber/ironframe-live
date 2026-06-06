/**
 * Secure vector storage namespaces — User Trainer & Technical Writer RAG corpora.
 * Isolated from ironframe-live SaaS runtime; scoped to Ironboard documentation plane.
 */
export const VECTOR_STORAGE_NAMESPACES = {
  /** Style guides, textbooks, classroom sandbox HTML corpora for User Trainer agent. */
  USER_TRAINER: "ironboard/secure/trainer/style-guides-v1",
  /** Active repository snapshots, TAS anchors, API contracts for Technical Writer agent. */
  TECHNICAL_WRITER: "ironboard/secure/writer/repo-snapshots-v1",
} as const;

export type VectorNamespaceKey = keyof typeof VECTOR_STORAGE_NAMESPACES;

export function resolveVectorNamespace(role: "TRAINER" | "WRITER"): string {
  return role === "TRAINER"
    ? VECTOR_STORAGE_NAMESPACES.USER_TRAINER
    : VECTOR_STORAGE_NAMESPACES.TECHNICAL_WRITER;
}
