'use client';

import { useRouter } from 'next/navigation';
import InlineManualRecoveryBlock from '@/app/components/InlineManualRecoveryBlock';

export default function ThreatDetailEscalatedRecovery({ threatId }: { threatId: string }) {
  const router = useRouter();
  return (
    <section className="mb-6">
      <InlineManualRecoveryBlock
        threatId={threatId}
        variant="detail"
        onSynced={() => {
          router.refresh();
        }}
      />
    </section>
  );
}
