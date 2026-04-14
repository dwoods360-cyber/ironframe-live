import { chromium } from "@playwright/test";

function extractIds(content: string): {
  optimistic: string[];
  cuidLike: string[];
} {
  const optimistic = Array.from(
    new Set(content.match(/optimistic-chaos-[a-z0-9-]+/gi) ?? []),
  );
  const cuidLike = Array.from(
    new Set(content.match(/\bc[a-z0-9]{20,}\b/g) ?? []),
  );
  return { optimistic, cuidLike };
}

function classifyIds(values: string[]): {
  optimistic: string[];
  cuidLike: string[];
} {
  const optimistic = values.filter((v) => /^optimistic-chaos-/i.test(v));
  const cuidLike = values.filter((v) => /^c[a-z0-9]{20,}$/i.test(v));
  return { optimistic, cuidLike };
}

async function run(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = "http://localhost:3000";
  const result: Record<string, unknown> = {
    baseUrl,
    optimisticAppeared: false,
    optimisticSampleId: null,
    optimisticGoneAfterSync: false,
    finalIncidentCardCount: 0,
    finalDisplayedIdType: "unknown",
    finalDisplayedIds: [],
    anomaly: null,
  };

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[aria-label="Chaos scenario"]', { timeout: 45000 });

    await page.selectOption('[aria-label="Chaos scenario"]', "REMOTE_SUPPORT");
    await page.getByRole("button", { name: /Generate Chaos Threat/i }).click();

    let optimisticId: string | null = null;
    const optimisticDeadline = Date.now() + 7000;
    while (Date.now() < optimisticDeadline && !optimisticId) {
      const html = await page.content();
      const ids = extractIds(html);
      if (ids.optimistic.length > 0) {
        optimisticId = ids.optimistic[0] ?? null;
        break;
      }
      await page.waitForTimeout(250);
    }

    if (optimisticId) {
      result.optimisticAppeared = true;
      result.optimisticSampleId = optimisticId;
    }

    await page.waitForTimeout(12000);

    const finalHtml = await page.content();
    const globalIds = extractIds(finalHtml);
    const boardIdTexts = await page
      .locator('[data-testid="active-risks-board"] p.font-mono')
      .allInnerTexts()
      .catch(() => []);
    const boardIds = boardIdTexts.map((t) => t.trim()).filter(Boolean);
    const finalIds = classifyIds(boardIds);
    const hasOptimisticLeft = finalIds.optimistic.length > 0;
    result.optimisticGoneAfterSync = !hasOptimisticLeft;

    const chaosCardText = await page
      .locator('[data-testid="active-risks-board"]')
      .innerText()
      .catch(() => "");
    const finalIncidentMatches =
      chaosCardText.match(/Poisoned Chaos Threat|IRONTECH RECOVERY IN PROGRESS/gi) ?? [];
    result.finalIncidentCardCount = finalIncidentMatches.length;

    const finalDisplayedIds = [...finalIds.optimistic, ...finalIds.cuidLike];
    result.finalDisplayedIds = finalDisplayedIds;
    result.finalDisplayedIdsGlobal = [...globalIds.optimistic, ...globalIds.cuidLike];
    if (finalIds.optimistic.length > 0) {
      result.finalDisplayedIdType = "optimistic-chaos-*";
    } else if (finalIds.cuidLike.length > 0) {
      result.finalDisplayedIdType = "cuid-like/non-optimistic";
    } else {
      result.finalDisplayedIdType = "none-detected";
    }

    if (hasOptimisticLeft) {
      result.anomaly = "Optimistic ID remained after sync window.";
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
}

void run().catch((error) => {
  console.error("[verify-s4-optimistic] failed:", error);
  process.exit(1);
});

