/**
 * Grant BUSINESS_ADMIN on a tenant so the operator can use CLIENTS (/admin/onboarding).
 *
 * Usage:
 *   npm run ops:assign-partner-provisioner -- --email operator@design-partner.test --tenant acorp
 *   npm run ops:assign-partner-provisioner -- --email partner@example.com --tenant medshield --dry-run
 */
import { resolve } from "node:path";

import { UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1]?.trim() || null;
}

async function resolveUserIdByEmail(email: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const normalized = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalized);
    if (match?.id) return match.id;
    if (data.users.length < 1000) break;
    page += 1;
  }

  throw new Error(`No Supabase auth user found for email "${normalized}".`);
}

async function main(): Promise<void> {
  const email = readArg("--email");
  const tenantSlug = readArg("--tenant")?.trim().toLowerCase() ?? null;
  const dryRun = process.argv.includes("--dry-run");

  if (!email || !tenantSlug) {
    throw new Error(
      "Usage: npm run ops:assign-partner-provisioner -- --email <operator@company.com> --tenant <slug> [--dry-run]",
    );
  }

  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) {
      throw new Error(`Tenant "${tenantSlug}" not found.`);
    }

    const userId = await resolveUserIdByEmail(email);
    const existing = await prisma.userRoleAssignment.findFirst({
      where: { userId, tenantId: tenant.id },
      select: { id: true, role: true },
    });

    if (existing?.role === UserRole.BUSINESS_ADMIN) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            idempotent: true,
            email,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            userId,
            role: UserRole.BUSINESS_ADMIN,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            dryRun: true,
            wouldAssign: UserRole.BUSINESS_ADMIN,
            email,
            tenantSlug: tenant.slug,
            userId,
            replacesExistingRole: existing?.role ?? null,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (existing) {
      await prisma.userRoleAssignment.update({
        where: { id: existing.id },
        data: { role: UserRole.BUSINESS_ADMIN },
      });
    } else {
      await prisma.userRoleAssignment.create({
        data: {
          userId,
          tenantId: tenant.id,
          role: UserRole.BUSINESS_ADMIN,
        },
      });
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          userId,
          role: UserRole.BUSINESS_ADMIN,
          nextStep: "Sign in → CLIENTS chip → /admin/onboarding",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
