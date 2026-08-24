/** StoryBrand guardrails — customer is hero; Ironframe is guide only. */
export const STORYBRAND_GUIDELINES = {
  forbiddenPhrases: [
    "ironframe is the hero",
    "we are the only solution",
    "revolutionary platform",
    "generic compliance checklist",
    "co-builder seat structured around",
  ],
  requiredElements: [
    "lead with a specific signal + peer question (operator is the hero)",
    "state a single clear plan step in plain language",
    "anchor financial risk in whole cents (no BigInt / eng dumps)",
    "name Command Design Partner with Path B $ / window locks",
    "end with workflow-review CTA (not a demo)",
    "human voice: short spoken sentences; no stacked economics clauses",
  ],
} as const;

export function validateStoryBrandDraft(body: string): { ok: boolean; violations: string[] } {
  const lower = body.toLowerCase();
  const violations = STORYBRAND_GUIDELINES.forbiddenPhrases.filter((phrase) =>
    lower.includes(phrase),
  );
  return { ok: violations.length === 0, violations };
}
