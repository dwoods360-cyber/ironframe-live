import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import CorporateOnboardingClient from "./CorporateOnboardingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Client onboarding | Ironframe Admin",
  description: "Provision B2B tenant workspaces and invite corporate operators.",
};

export default async function CorporateOnboardingPage() {
  noStore();
  const allowed = await canUsePlatformAdminTools();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="p-6">
      <CorporateOnboardingClient />
    </div>
  );
}
