/**
 * Dashboard layout utility tokens — keep out of `app/(dashboard)/layout.tsx` so Next.js
 * route layout type generation only sees the default export.
 */

/** Left control rail — w-80 (320px); right audit rail — w-96 (384px). */
export const DASHBOARD_GROUP_LEFT_RAIL = "flex-none shrink-0 w-80";

export const DASHBOARD_GROUP_RIGHT_RAIL = "flex-none shrink-0 w-96";
