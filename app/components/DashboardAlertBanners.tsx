/**
 * IRONFRAME STANDARD: Global system alerts and regulatory ticker.
 * Sits at the top of the main dashboard feed.
 */

type RegulatoryBannerState = {
  ticker: string[];
  isSyncing: boolean;
};

export interface DashboardAlertBannersProps {
  phoneHomeAlert: string | null;
  regulatoryState: RegulatoryBannerState;
}

export default function DashboardAlertBanners({
  phoneHomeAlert,
  regulatoryState,
}: DashboardAlertBannersProps) {
  return (
    <>
      {phoneHomeAlert && (
        <div className="border-b border-red-500/60 bg-red-500/15 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-red-300">
          {phoneHomeAlert}
          <a href="mailto:support@ironframe.local" className="ml-2 underline text-red-200">
            Contact Support
          </a>
        </div>
      )}

      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-2">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="rounded border border-red-500/70 bg-red-500/15 px-2 py-0.5 font-bold uppercase tracking-wide text-red-300">
            REGULATORY ALERT
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="whitespace-nowrap text-slate-200">
              {regulatoryState.ticker.length > 0
                ? regulatoryState.ticker.join("  //  ")
                : regulatoryState.isSyncing
                  ? "Syncing regulatory feed..."
                  : "No new regulatory alerts."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

