'use client';

import dynamic from 'next/dynamic';

const AuditClientWithNoSSR = dynamic(
  () => import('./AuditClient'),
  { ssr: false }
);

export default function AuditPage() {
  return <AuditClientWithNoSSR />;
}
