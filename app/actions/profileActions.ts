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

export type SecurityProfileOperatorProfile = {
  title: string;
  phone: string;
  avatarUrl: string;
  hasRecord: boolean;
};

export async function getSecurityProfileServerData(): Promise<{
  userId: string | null;
  email: string | null;
  displayName: string;
  assignments: SecurityProfileAssignment[];
  integrityEvents: SecurityProfileIntegrityRow[];
  cookieDevRole: string | null;
  operatorProfile: SecurityProfileOperatorProfile;
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
      operatorProfile: { title: "", phone: "", avatarUrl: "", hasRecord: false },
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

  const [assignments, integrityEvents, operatorProfileRow] = await Promise.all([
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
    uid
      ? prisma.operatorProfile.findUnique({
          where: { id: uid },
          select: { title: true, phone: true, avatarUrl: true },
        })
      : null,
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
    operatorProfile: {
      title: operatorProfileRow?.title ?? "",
      phone: operatorProfileRow?.phone ?? "",
      avatarUrl: operatorProfileRow?.avatarUrl ?? "",
      hasRecord: Boolean(operatorProfileRow),
    },
    cookieDevRole,
  };
}
