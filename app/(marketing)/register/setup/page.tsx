import type { ReactNode } from "react";
import type { Metadata } from "next";
import PublicRegistrationClient from "@/app/components/marketing/PublicRegistrationClient";

export const metadata: Metadata = {
  title: "Register workspace | Ironframe GRC",
  description:
    "Request an isolated Ironframe GRC tenant — workspace provisioning and operator invite with zero prior console access.",
};

export default function PublicRegistrationSetupPage() {
  return <PublicRegistrationClient />;
}
