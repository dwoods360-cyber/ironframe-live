/** StoryBrand guardrails — customer is hero; Ironframe is guide only. */
export const STORYBRAND_GUIDELINES = {
  forbiddenPhrases: [
    'ironframe is the hero',
    'we are the only solution',
    'revolutionary platform',
    'generic compliance checklist',
  ],
  requiredElements: [
    'name the operator as the decision-maker',
    'state a single clear plan step',
    'anchor financial risk in whole cents',
    'end with a low-friction next step',
  ],
} as const;

export function validateStoryBrandDraft(body: string): { ok: boolean; violations: string[] } {
  const lower = body.toLowerCase();
  const violations = STORYBRAND_GUIDELINES.forbiddenPhrases.filter((phrase) =>
    lower.includes(phrase),
  );
  return { ok: violations.length === 0, violations };
}
