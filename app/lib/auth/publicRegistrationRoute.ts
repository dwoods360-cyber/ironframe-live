import { PUBLIC_LEAD_API_PATH, SALES_CONTACT_PATH } from "@/config/registration";

/** Zero-knowledge prospect registration (public marketing funnel). */
export const PUBLIC_REGISTRATION_PATH = "/register/setup";
export const PUBLIC_DEMO_REGISTRATION_PATH = "/register/demo";
export const PUBLIC_REGISTRATION_API_PATH = "/api/register/public-intake";
export const SALES_INTAKE_API_PATH = "/api/register/sales-intake";

export { PUBLIC_LEAD_API_PATH, SALES_CONTACT_PATH };

export function isPublicRegistrationPath(pathname: string): boolean {
  return pathname === PUBLIC_REGISTRATION_PATH;
}

export function isPublicDemoRegistrationPath(pathname: string): boolean {
  return pathname === PUBLIC_DEMO_REGISTRATION_PATH;
}

export function isPublicRegistrationApiPath(pathname: string): boolean {
  return pathname === PUBLIC_REGISTRATION_API_PATH || pathname === PUBLIC_LEAD_API_PATH;
}

export function isSalesIntakeApiPath(pathname: string): boolean {
  return pathname === SALES_INTAKE_API_PATH;
}
