import SupportPortalClient from "@/app/(dashboard)/dashboard/support/SupportPortalClient";

export const metadata = {
  title: "Support Portal | Ironframe",
  description: "View and submit engineering support tickets for your workspace.",
};

export default function SupportPortalPage() {
  return <SupportPortalClient />;
}
