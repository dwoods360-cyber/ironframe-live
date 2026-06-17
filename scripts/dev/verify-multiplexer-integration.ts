/**
 * Live multiplexer verification — acorp billing + pilot-corp provision via :4242 fan-out.
 *
 * Prerequisites: npm run dev, dev:stripe:multiplexer, dev:stripe:listen
 *
 * Usage: npx tsx scripts/dev/verify-multiplexer-integration.ts
 */
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PILOT_CORP_SLUG = "pilot-corp";
const ACORP_SLUG = "acorp";

function run(command: string, args: string[]): void {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    shell: process.platform === "win32",
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status ?? "unknown"}`);
  }
}

async function assertAuditAction(
  prisma: PrismaClient,
  tenantSlug: string,
  action: string,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    throw new Error(`Tenant "${tenantSlug}" not found for audit verification.`);
  }

  const row = await prisma.auditLog.findFirst({
    where: { tenantId: tenant.id, action },
    orderBy: { createdAt: "desc" },
    select: { id: true, action: true, tenantId: true, justification: true },
  });

  if (!row) {
    throw new Error(`Missing audit log action "${action}" for tenant "${tenantSlug}".`);
  }

  console.log(`  ✓ audit ${action} (tenantId=${row.tenantId})`);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    console.log("=== Task 2: Multiplexer integration verification ===");

    run("stripe", [
      "trigger",
      "payment_intent.succeeded",
      "--override",
      "payment_intent:metadata.tenant_slug=acorp",
      "--override",
      "payment_intent:metadata.stripe_customer_id=cus_acorp_test_fixture",
    ]);
    await assertAuditAction(prisma, ACORP_SLUG, "STRIPE_PAYMENT_INTENT_BILLING_ACTIVE");

    run("npm", ["run", "smoke:pilot-corp:provision", "--", "--reset"]);
    await assertAuditAction(prisma, PILOT_CORP_SLUG, "STRIPE_CHECKOUT_TENANT_PROVISIONED");

    const billing = await prisma.tenantBilling.findUnique({ where: { tenantSlug: PILOT_CORP_SLUG } });
    if (!billing || billing.status !== "ACTIVE") {
      throw new Error(`Expected ACTIVE billing for ${PILOT_CORP_SLUG}.`);
    }
    console.log(`  ✓ tenant_billing ACTIVE for ${PILOT_CORP_SLUG}`);

    console.log("\nMultiplexer verification PASSED.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nMultiplexer verification FAILED:", error);
  process.exit(1);
});
