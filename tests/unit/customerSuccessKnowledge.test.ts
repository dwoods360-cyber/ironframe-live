import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  AGENTIC_BOARD_ROSTER,
  CUSTOMER_SUCCESS_KNOWLEDGE_BINDING,
  STRATEGIC_KNOWLEDGE_VAULT,
} from "../../Ironboard/src/staticContext.ts";
import {
  requiresCorporateDocsPrefetch,
  resolveDocsQueryIntent,
} from "../../Ironboard/src/services/ingress/docsQueryIntent.js";

const REPO_ROOT = process.cwd();

function assertDocExists(relativePath: string): void {
  const absolute = path.join(REPO_ROOT, relativePath);
  expect(fs.existsSync(absolute), `missing ${relativePath}`).toBe(true);
  const content = fs.readFileSync(absolute, "utf8");
  expect(content.length).toBeGreaterThan(200);
  expect(content).not.toContain("STAGED DRAFT");
}

describe("customer success knowledge base", () => {
  it("ships authoritative customer-success corpus files", () => {
    assertDocExists("docs/customer-success/customer-success-library.md");
    assertDocExists("docs/customer-success/retention-playbook.md");
    assertDocExists("docs/customer-success/health-score-framework.md");
    assertDocExists("docs/customer-success/qbr-expansion-framework.md");
    assertDocExists("docs/customer-success/onboarding-success-playbook.md");
  });

  it("includes customer success books in strategy vault", () => {
    const titles = STRATEGIC_KNOWLEDGE_VAULT.map((book) => book.title);
    expect(titles).toContain("Customer Success");
    expect(titles).toContain("The Customer Success Economy");
    expect(titles).toContain("Subscribed");
  });

  it("binds board-customer-success to CS frameworks", () => {
    const csm = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-customer-success");
    expect(csm?.primaryBookAlignment).toBe("Customer Success");
    expect(CUSTOMER_SUCCESS_KNOWLEDGE_BINDING).toContain("customer-success-library.md");
    expect(CUSTOMER_SUCCESS_KNOWLEDGE_BINDING).toContain("customerSuccessCorpus.ts");
  });

  it("routes customer success queries to customer-success matrix category", () => {
    const intent = resolveDocsQueryIntent("Draft a QBR agenda for customer success retention");
    expect(intent.docCategory).toBe("customer-success");
    expect(requiresCorporateDocsPrefetch("What is our health score framework for churn?")).toBe(true);
  });
});
