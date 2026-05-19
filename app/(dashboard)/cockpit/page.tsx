import type { Metadata } from "next";
import CommandPostGrid from "@/app/components/commandPost/CommandPostGrid";

export const metadata: Metadata = {
  title: "Command Post · Ironframe",
  description: "Dense agent telemetry cockpit with persisted layout.",
};

/** Full-viewport Command Post (19-agent grid). Route: `/cockpit`. */
export default function CockpitPage() {
  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden p-0">
      <CommandPostGrid variant="cockpit" />
    </div>
  );
}
