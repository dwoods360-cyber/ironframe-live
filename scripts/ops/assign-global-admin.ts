/**
 * Ensure a Supabase auth user exists and grant GLOBAL_ADMIN (platform operator).
 *
 * Usage:
 *   npm run ops:assign-global-admin -- --email Dereck@ironframegrc.com
 *   npm run ops:assign-global-admin -- --email Dereck@ironframegrc.com --password "TempPass123!"
 *   npm run ops:assign-global-admin -- --email Dereck@ironframegrc.com --dry-run
 *
 * Without --password, a random temporary password is generated for new users only.
 * Existing users keep their password unless --password is supplied.
 */
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

import { PrismaClient, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

/** Canonical seed tenants — GLOBAL_ADMIN on any one is enough; we mirror the seed bundle. */
const SEED_TENANT_SLUGS = ["medshield", "vaultbank", "gridcore"] as const;

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1]?.trim() || null;
}

function generateTempPassword(): string {
  return `IF-${randomBytes(12).toString("base64url")}!aA1`;
}

async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalized);
    if (match?.id) return { id: match.id, email: match.email ?? normalized };
    if (data.users.length < 1000) break;
    page += 1;
  }
  return null;
}

async function main(): Promise<void> {
  const emailRaw = readArg("--email");
  const passwordArg = readArg("--password");
  const dryRun = process.argv.includes("--dry-run");

  if (!emailRaw) {
    throw new Error(
      'Usage: npm run ops:assign-global-admin -- --email <operator@ironframegrc.com> [--password "..."] [--dry-run]',
    );
  }

  const email = emailRaw.trim().toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const prisma = new PrismaClient();
  let createdUser = false;
  let tempPassword: string | null = null;

  try {
    let user = await findUserIdByEmail(supabase, email);

    if (!user) {
      const password = passwordArg && passwordArg.length >= 8 ? passwordArg : generateTempPassword();
      if (!passwordArg) tempPassword = password;

      if (dryRun) {
        console.log(
          JSON.stringify(
            {
              ok: true,
              dryRun: true,
              wouldCreateAuthUser: true,
              email,
              wouldAssign: UserRole.GLOBAL_ADMIN,
              tenants: SEED_TENANT_SLUGS,
            },
            null,
            2,
          ),
        );
        return;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "admin" },
        app_metadata: { role: "admin" },
      });
      if (error || !data.user?.id) {
        throw new Error(error?.message ?? "createUser failed.");
      }
      user = { id: data.user.id, email: data.user.email ?? email };
      createdUser = true;
    } else if (passwordArg && passwordArg.length >= 8 && !dryRun) {
      const { error } = await supabase.auth.admin.updateUserById(user.id, { password: passwordArg });
      if (error) throw new Error(`Password update failed: ${error.message}`);
    }

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            dryRun: true,
            email,
            userId: user.id,
            wouldAssign: UserRole.GLOBAL_ADMIN,
            tenants: SEED_TENANT_SLUGS,
          },
          null,
          2,
        ),
      );
      return;
    }

    const tenants = await prisma.tenant.findMany({
      where: { slug: { in: [...SEED_TENANT_SLUGS] } },
      select: { id: true, slug: true, name: true },
    });
    if (tenants.length === 0) {
      throw new Error("No seed tenants found — run prisma seed first.");
    }

    const assigned: string[] = [];
    for (const tenant of tenants) {
      const existing = await prisma.userRoleAssignment.findFirst({
        where: { userId: user.id, tenantId: tenant.id, role: UserRole.GLOBAL_ADMIN },
        select: { id: true },
      });
      if (existing) {
        assigned.push(`${tenant.slug}:idempotent`);
        continue;
      }
      await prisma.userRoleAssignment.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: UserRole.GLOBAL_ADMIN,
        },
      });
      assigned.push(`${tenant.slug}:created`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email,
          userId: user.id,
          createdAuthUser: createdUser,
          role: UserRole.GLOBAL_ADMIN,
          assignments: assigned,
          nextStep: "Sign in at /login — Ops Hub /admin/onboarding available as GLOBAL_ADMIN.",
          ...(tempPassword
            ? {
                temporaryPassword: tempPassword,
                passwordNote: "Change immediately after first sign-in.",
              }
            : {}),
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
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
