'use client';

import { usePathname } from 'next/navigation';
import TopNav from '@/app/components/TopNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isThreatDetailPage = pathname.startsWith('/threats/');

  if (isThreatDetailPage) {
    return (
      <main className="command-center-surface mt-0 h-screen overflow-y-auto">
        {children}
      </main>
    );
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50">
        <TopNav />
      </div>
      <main className="command-center-surface mt-[108px] h-[calc(100vh-108px)] overflow-y-auto">
        {children}
      </main>
    </>
  );
}
