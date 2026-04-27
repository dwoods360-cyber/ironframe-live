"use server";

import type { UserRole } from "@prisma/client";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

const ROLE_COOKIE = "ironframe-role";

function roleFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp("(?:^|; )" + ROLE_COOKIE + "=([^;]*)"));
  return match ? decodeURIComponent(match[1] ?? "").trim() || null : null;
}

export type SecurityProfileAssignment = {
  id: string;
  tenantId: string;
  role: UserRole;
  grantedAt: string;
};

export type SecurityProfileIntegrityRow = {
  id: string;
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  source: string;
};

export async function getSecurityProfileServerData(): Promise<{
  userId: string | null;
  email: string | null;
  displayName: string;
  assignments: SecurityProfileAssignment[];
  integrityEvents: SecurityProfileIntegrityRow[];
  cookieDevRole: string | null;
}> {
  const user = await getSupabaseSessionUser();
  const cookieHeader = (await headers()).get("cookie");
  const cookieDevRole = roleFromCookieHeader(cookieHeader);

  if (!user) {
    return {
      userId: null,
      email: null,
      displayName: "Guest",
      assignments: [],
      integrityEvents: [],
      cookieDevRole,
    };
  }

  const uid = typeof user.id === "string" ? user.id.trim() : "";
  const email = user.email?.trim() ?? null;
  const metaName = user.user_metadata?.full_name;
  const displayName =
    (typeof metaName === "string" && metaName.trim()) || email || uid || "Operator";

  const actorCandidates = new Set<string>();
  if (uid) actorCandidates.add(uid);
  if (email) actorCandidates.add(email);
  if (displayName) actorCandidates.add(displayName);
  // Legacy pipeline / demo ledger keys still present in some environments
  actorCandidates.add("Dereck");
  actorCandidates.add("dereck");

  const [assignments, integrityEvents] = await Promise.all([
    uid
      ? prisma.userRoleAssignment.findMany({
          where: { userId: uid },
          orderBy: { grantedAt: "desc" },
        })
      : [],
    prisma.integrityEvent.findMany({
      where: { actorUserId: { in: [...actorCandidates] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    userId: uid || null,
    email,
    displayName,
    assignments: assignments.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      role: a.role,
      grantedAt: a.grantedAt.toISOString(),
    })),
    integrityEvents: integrityEvents.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      eventType: e.eventType,
      entityType: e.entityType,
      entityId: e.entityId,
      createdAt: e.createdAt.toISOString(),
      source: e.source,
    })),
    cookieDevRole,
  };
}
