import GetStartedPortalClient from "./GetStartedPortalClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get Started | Ironframe Command Post",
  description:
    "Progressive onboarding portal — quick-start guides, Level 1 training, and Trainer agent sandbox.",
};

export default function GetStartedPage() {
  return <GetStartedPortalClient />;
}
