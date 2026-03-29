import DashboardHomeClient from './components/DashboardHomeClient';
import GlobalHealthSummaryCard from './components/GlobalHealthSummaryCard';

export default async function Page() {
  return (
    <DashboardHomeClient>
      <GlobalHealthSummaryCard coreintelTrendActive={false} />
    </DashboardHomeClient>
  );
}
