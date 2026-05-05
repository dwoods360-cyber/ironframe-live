import DashboardHomeClient from './components/DashboardHomeClient';
import GlobalHealthSummaryCard from './components/GlobalHealthSummaryCard';

export default async function Page() {
  const serverTimeEpochMs = Date.now();
  return (
    <DashboardHomeClient serverTimeEpochMs={serverTimeEpochMs}>
      <GlobalHealthSummaryCard coreintelTrendActive={false} />
    </DashboardHomeClient>
  );
}
