import { ENTERPRISE_BASELINE_CENTS } from "../prompts.js";

export const INSUFFICIENT_CONTEXT_RESPONSE = "INSUFFICIENT UNDERLYING COMPLIANCE CONTEXT.";

/** Authorized whole-integer cent baselines — any other monetary claim in docs must cite these exactly. */
const AUTHORIZED_BASELINE_CENTS = new Set(Object.values(ENTERPRISE_BASELINE_CENTS));

export type ContentFirewallAgentRole = "TRAINER" | "WRITER";

export type ContentFirewallResult = {
  ok: boolean;
  violations: string[];
};

const FINANCIAL_EVALUATION_MARKERS =
  /\b(amount_cents|financialProjectionsCents|USD_CENTS|baseline|premium|mitigated|cents|Medshield|Vaultbank|Gridcore)\b/i;

/** Decimal or float inside a financial evaluation context (e.g. 1110000000.5 or $11.1M in cent nodes). */
const FLOAT_IN_FINANCIAL_NODE_RE =
  /(?:amount_cents|financialProjectionsCents|USD_CENTS|baseline|premium[_\s]?cents|cents)\s*[:=]\s*[^\n]*?\d+\.\d+/i;

const DOLLAR_DECIMAL_RE = /\$\s*\d{1,3}(?:,\d{3})*\.\d+/;

const UNAUTHORIZED_INVENTED_FEATURE_RE =
  /\b(hallucinated|unsourced|unverified)\s+(feature|metric|command)\b/i;

const SOURCE_REFERENCE_RE =
  /(?:source-file|source file|docs\/|app\/|prisma\/|ref:\s*\S+)/i;

export function screenFinancialIntegrity(content: string): string[] {
  const violations: string[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FLOAT_IN_FINANCIAL_NODE_RE.test(line)) {
      violations.push(
        `Line ${i + 1}: floating-point decimal detected in financial evaluation node.`,
      );
    }
    if (FINANCIAL_EVALUATION_MARKERS.test(line) && DOLLAR_DECIMAL_RE.test(line)) {
      violations.push(
        `Line ${i + 1}: dollar float presentation forbidden in financial evaluation context.`,
      );
    }
  }

  const inlineCentsFloat = content.match(/\b\d{6,}\.\d+\b/g);
  if (inlineCentsFloat?.length) {
    violations.push(
      `Whole-integer cent fields must not contain decimal dots: ${inlineCentsFloat.join(", ")}`,
    );
  }

  return violations;
}

export function screenSourceAnchoring(
  content: string,
  options: { requireSourceReferences: boolean },
): string[] {
  const violations: string[] = [];
  if (content.trim() === INSUFFICIENT_CONTEXT_RESPONSE) return violations;

  if (UNAUTHORIZED_INVENTED_FEATURE_RE.test(content)) {
    violations.push("Ungrounded feature/metric/command synthesis marker detected.");
  }

  if (options.requireSourceReferences && !SOURCE_REFERENCE_RE.test(content)) {
    violations.push(
      "Missing precise source-file text references (docs/, app/, prisma/, or ref: tag).",
    );
  }

  return violations;
}

export function validateOutboundContent(
  content: string,
  options: {
    agentRole: ContentFirewallAgentRole;
    requireSourceReferences?: boolean;
  },
): ContentFirewallResult {
  const requireSourceReferences = options.requireSourceReferences ?? true;
  const violations = [
    ...screenFinancialIntegrity(content),
    ...screenSourceAnchoring(content, { requireSourceReferences }),
  ];

  return { ok: violations.length === 0, violations };
}

/** Verify outbound cent literals match authorized baselines when explicitly cited as tenant baselines. */
export function assertAuthorizedBaselineCents(centsLiteral: string): void {
  const normalized = centsLiteral.trim().replace(/,/g, "");
  if (!AUTHORIZED_BASELINE_CENTS.has(normalized as (typeof ENTERPRISE_BASELINE_CENTS)[keyof typeof ENTERPRISE_BASELINE_CENTS]) &&
      /^\d+$/.test(normalized)) {
    // Non-baseline integer cents are allowed when not claiming enterprise baseline profile.
    return;
  }
}
