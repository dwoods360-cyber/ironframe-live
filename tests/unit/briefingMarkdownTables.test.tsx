import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import BriefingMarkdown from "@/app/components/governanceFrame/BriefingMarkdown";

const RIGHT_ALIGNED_GFM = `
| Economic signal | Public amount | What it demonstrates |
| --- | ---: | --- |
| OneMain / NYDFS civil monetary penalty (May 2023) | $4,250,000 | Material cost of cybersecurity-program governance failures |
| Scope of cited findings | Access privileges; third-party risk; application security | Not a multi-entity tenancy or evidence-segregation adjudication |
`;

describe("BriefingMarkdown GFM tables", () => {
  it("keeps a shared left-aligned grid even when a column marker is right-aligned", () => {
    const { container } = render(
      <BriefingMarkdown markdown={RIGHT_ALIGNED_GFM} tone="institute" />,
    );

    const table = container.querySelector("table");
    expect(table).toBeTruthy();
    expect(table?.className).toContain("table-fixed");

    const cells = [...container.querySelectorAll("th, td")];
    expect(cells.length).toBe(9);
    for (const cell of cells) {
      expect(cell.getAttribute("align")).toBeNull();
      expect(cell.getAttribute("style") ?? "").not.toMatch(/text-align:\s*right/i);
      expect(cell.className).toContain("text-left");
      expect(cell.className).toContain("align-top");
    }
  });
});
