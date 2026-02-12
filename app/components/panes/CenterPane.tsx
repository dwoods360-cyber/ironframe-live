'use client';
import React from 'react';
import type { Risk } from '@/app/types/domain';
import PipelineIngestion from './center/PipelineIngestion';
import RiskRegistration from './center/RiskRegistration';
import ActiveRisks from './center/ActiveRisks';

type Props = {
  risks: any[];
  onAction: (riskId: number, action: string) => Promise<void>;
  [key: string]: any;
};

export default function CenterPane({ risks = [], onAction, ...props }: Props) {
  // Cast risks to the domain type to satisfy child components
  const typedRisks = risks as Risk[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PipelineIngestion 
        risks={typedRisks} 
        onAction={onAction} 
      />
      <RiskRegistration 
        risks={typedRisks} 
        onAction={onAction} 
        onAddRisk={() => {}} 
      />
      <ActiveRisks 
        risks={typedRisks} 
      />
    </div>
  );
}
