'use client';

import { useCallback, useState } from 'react';

export type HubRegion = 'London' | 'Singapore';

export type FlywheelProspect = {
  id: string;
  domain: string;
  companyName: string;
  employeeCount: number;
  region: string;
  compliancePressure: string;
  dealStage: string;
  recentFunding?: string | null;
  hasComplianceJob?: boolean;
  /** Dynamic ICP score from Prisma (`ai_fitness_score`). */
  icpScore?: number;
  aiFitnessScore?: number;
};

type Props = {
  apiBase?: string;
};

export default function MarketFlywheel({ apiBase = '' }: Props) {
  const [activeHub, setActiveHub] = useState<HubRegion>('London');
  const [prospects, setProspects] = useState<FlywheelProspect[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [pitch, setPitch] = useState('');
  const [status, setStatus] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingPitch, setLoadingPitch] = useState(false);
  const [harvesting, setHarvesting] = useState(false);

  const loadBatch = useCallback(async (region: HubRegion) => {
    setLoadingBatch(true);
    setSelectedDomain('');
    setPitch('');
    setStatus(`Fetching ${region} batch…`);
    try {
      const response = await fetch(`${apiBase}/api/prospects/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region }),
      });
      if (!response.ok) throw new Error(`Batch fetch failed: ${response.status}`);
      const data = (await response.json()) as { prospects?: FlywheelProspect[] };
      const next = data.prospects ?? [];
      setProspects(next);
      setStatus(`Loaded ${next.length} qualified Fintech targets · ${region}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Batch load failed.');
    } finally {
      setLoadingBatch(false);
    }
  }, [apiBase]);

  const selectHub = (region: HubRegion) => {
    setActiveHub(region);
    void loadBatch(region);
  };

  const selectProspect = async (prospect: FlywheelProspect) => {
    setSelectedDomain(prospect.domain);
    setLoadingPitch(true);
    setPitch('Generating grounded outreach…');
    setStatus(`Staging pitch for ${prospect.domain}…`);
    try {
      const response = await fetch(`${apiBase}/api/market/pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: prospect.domain }),
      });
      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || `Pitch failed: ${response.status}`);
      }
      const data = (await response.json()) as { pitch?: string; compliancePressure?: string };
      setPitch(data.pitch ?? '');
      setStatus(`Pitch staged · BigInt precision + ${data.compliancePressure || 'GRC'} guard`);
    } catch (err) {
      setPitch('');
      setStatus(err instanceof Error ? err.message : 'Pitch generation failed.');
    } finally {
      setLoadingPitch(false);
    }
  };

  const harvestSignal = async (isPositive: boolean) => {
    if (!selectedDomain) return;
    setHarvesting(true);
    setStatus(`Harvesting signal for ${selectedDomain}…`);
    try {
      const response = await fetch(`${apiBase}/api/prospects/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: selectedDomain,
          responseText: pitch,
          isPositive,
        }),
      });
      if (!response.ok) throw new Error(`Harvest failed: ${response.status}`);
      const data = (await response.json()) as {
        newStatus?: string;
        icpScore?: number;
        aiFitnessScore?: number;
      };
      const nextScore = data.icpScore ?? data.aiFitnessScore ?? 0;

      setProspects(prev =>
        prev.map(prospect =>
          prospect.domain === selectedDomain
            ? {
                ...prospect,
                icpScore: nextScore,
                aiFitnessScore: nextScore,
                dealStage: data.newStatus ?? prospect.dealStage,
              }
            : prospect,
        ),
      );

      setStatus(`Signal harvested · ${data.newStatus ?? 'updated'} · score ${nextScore}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Harvest failed.');
    } finally {
      setHarvesting(false);
    }
  };

  return (
    <div id="market-flywheel">
      <h2>📈 MARKET INTEGRATION &amp; LEAD FLYWHEEL</h2>
      <div className="hub-toggles">
        <button
          type="button"
          className={`hub-toggle${activeHub === 'London' ? ' active' : ''}`}
          onClick={() => selectHub('London')}
        >
          London Hub
        </button>
        <button
          type="button"
          className={`hub-toggle${activeHub === 'Singapore' ? ' active' : ''}`}
          onClick={() => selectHub('Singapore')}
        >
          Singapore Hub
        </button>
      </div>
      <button type="button" id="fetch-batch-btn" disabled={loadingBatch} onClick={() => void loadBatch(activeHub)}>
        Load Prospecting Batch
      </button>
      <div id="prospect-list">
        {!prospects.length ? (
          <div className="prospect-empty">
            {loadingBatch
              ? 'Loading qualified targets…'
              : 'Select a hub and load a Fintech SaaS batch (5–50 employees).'}
          </div>
        ) : (
          prospects.map(prospect => {
            const funding = (prospect.recentFunding || 'NONE').toUpperCase();
            const hireTag = prospect.hasComplianceJob ? 'GRC hire' : 'no GRC hire';
            return (
              <div
                key={prospect.id || prospect.domain}
                className={`prospect-row${prospect.domain === selectedDomain ? ' selected' : ''}`}
                data-domain={prospect.domain}
                data-prospect-id={prospect.id}
                onClick={() => void selectProspect(prospect)}
                onKeyDown={ev => {
                  if (ev.key === 'Enter' || ev.key === ' ') void selectProspect(prospect);
                }}
                role="button"
                tabIndex={0}
              >
                <div>
                  <div className="firm-name">{prospect.companyName}</div>
                  <div className="firm-meta">
                    {prospect.region} · {prospect.employeeCount} emp · {prospect.compliancePressure} · {funding} ·{' '}
                    {hireTag} · {prospect.dealStage}
                  </div>
                </div>
                <span className="score-pill" data-score={prospect.icpScore ?? 0} title="icpScore">
                  {prospect.icpScore ?? 0}
                </span>
              </div>
            );
          })
        )}
      </div>
      <textarea
        id="pitch-preview-pane"
        readOnly
        value={pitch}
        placeholder="Select a prospect to generate BigInt-grounded outreach copy…"
      />
      <div className="harvest-actions">
        <button
          type="button"
          id="harvest-positive"
          className="harvest-btn"
          disabled={!selectedDomain || harvesting || loadingPitch}
          onClick={() => void harvestSignal(true)}
        >
          Harvest Signal (+)
        </button>
        <button
          type="button"
          id="harvest-negative"
          className="harvest-btn"
          disabled={!selectedDomain || harvesting || loadingPitch}
          onClick={() => void harvestSignal(false)}
        >
          Harvest Signal (−)
        </button>
      </div>
      <div id="market-status">{status}</div>
    </div>
  );
}
