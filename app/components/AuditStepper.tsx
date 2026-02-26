import React from 'react';

interface AuditStep {
  name: string;
  agent: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp?: string;
}

export default function AuditStepper({ logs }: { logs: string[] }) {
  // Logic to determine step status based on technical logs
  const steps: AuditStep[] = [
    {
      name: 'Initial Routing',
      agent: 'Agent 1 (Ironcore)',
      status: logs.some(l => l.includes('Ironcore routed')) ? 'completed' : 'processing'
    },
    {
      name: 'Document Extraction',
      agent: 'Agent 5 (Ironscribe)',
      status: logs.some(l => l.includes('Ironscribe successfully extracted')) ? 'completed' :
        logs.some(l => l.includes('Ironcore routed')) ? 'processing' : 'pending'
    },
    {
      name: 'Financial Risk Audit',
      agent: 'Agent 3 (Irontrust)',
      status: logs.some(l => l.includes('Irontrust analyzed')) ? 'completed' :
        logs.some(l => l.includes('Ironscribe successfully extracted')) ? 'processing' : 'pending'
    }
  ];

  return (
    <div className="space-y-6">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4 items-start relative">
          {/* Vertical Line Connector */}
          {index < steps.length - 1 && (
            <div className={`absolute left-[11px] top-6 w-[2px] h-full ${
              step.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-800'
            }`} />
          )}

          {/* Status Icon */}
          <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
            step.status === 'completed' ? 'bg-emerald-500 border-emerald-500' :
            step.status === 'processing' ? 'bg-slate-900 border-blue-500 animate-pulse' :
              'bg-slate-950 border-slate-800'
          }`}>
            {step.status === 'completed' && <span className="text-[10px] text-slate-950 font-bold">✓</span>}
            {step.status === 'processing' && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
          </div>

          {/* Text Content */}
          <div className="flex flex-col">
            <h3 className={`text-sm font-semibold ${
              step.status === 'pending' ? 'text-slate-500' : 'text-slate-100'
            }`}>{step.name}</h3>
            <p className="text-xs text-slate-400">{step.agent}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
