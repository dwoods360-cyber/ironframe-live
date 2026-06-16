import type { NextRequest } from "next/server";

export function resolveSalesProvisionKey(): string {
  return process.env.INTERNAL_SALES_PROVISION_KEY?.trim() ?? "";
}

export function authorizeSalesIntakeRequest(request: NextRequest): boolean {
  const expected = resolveSalesProvisionKey();
  if (!expected) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${expected}`;
}
