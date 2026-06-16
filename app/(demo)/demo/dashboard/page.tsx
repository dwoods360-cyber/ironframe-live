import type { Metadata } from "next";
import DemoDashboardClient from "@/app/components/demo/DemoDashboardClient";

export const metadata: Metadata = {
  title: "Command Post · Ironframe Sandbox",
  description: "Mock-authenticated multi-tenant GRC dashboard preview.",
};

export default function DemoDashboardPage() {
  return <DemoDashboardClient />;
}
