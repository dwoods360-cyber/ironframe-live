'use client';

import { useCallback, useEffect, useState } from 'react';
import { displayIcpScore } from './flywheelScore.js';
import {
  formatTargetCountriesPayload,
  parseTargetCountriesInput,
  readDefaultTargetCountriesText,
  TARGET_COUNTRIES_STORAGE_KEY,
} from '../lib/flywheelTargetCountries.js';

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

function hydrateTargetCountriesText(): string {
  if (typeof window === 'undefined') return readDefaultTargetCountriesText();
  try {
    const saved = window.localStorage.getItem(TARGET_COUNTRIES_STORAGE_KEY)?.trim();
    return saved || readDefaultTargetCountriesText();
  } catch {
    return readDefaultTargetCountriesText();
  }
}

export default function MarketFlywheel({ apiBase = '' }: Props) {
  const [targetCountriesText, setTargetCountriesText] = useState(readDefaultTargetCountriesText);
  const [targetCountries, setTargetCountries] = useState<string[]>(() =>
    parseTargetCountriesInput(readDefaultTargetCountriesText()),
  );
  const [prospects, setProspects] = useState<FlywheelProspect[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [pitch, setPitch] = useState('');
  const [status, setStatus] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingPitch, setLoadingPitch] = useState(false);
  const [harvesting, setHarvesting] = useState(false);

  useEffect(() => {
    setTargetCountriesText(hydrateTargetCountriesText());
  }, []);

  useEffect(() => {
    setTargetCountries(parseTargetCountriesInput(targetCountriesText));
    try {
      window.localStorage.setItem(TARGET_COUNTRIES_STORAGE_KEY, targetCountriesText);
    } catch {
      /* non-fatal */
    }
  }, [targetCountriesText]);

  const loadBatch = useCallback(async () => {
    const countries = parseTargetCountriesInput(targetCountriesText);
    if (!countries.length) {
      setStatus('Enter at least one target country or region.');
      return;
    }

    setLoadingBatch(true);
    setSelectedDomain('');
    setPitch('');
    const label = countries.join(', ');
    setStatus(`Fetching batch for ${label}…`);
    try {
      const response = await fetch(`${apiBase}/api/prospects/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCountries: countries }),
      });
      if (!response.ok) throw new Error(`Batch fetch failed: ${response.status}`);
      const data = (await response.json()) as { prospects?: FlywheelProspect[] };
      const next = data.prospects ?? [];
      setProspects(next);
      setStatus(`Loaded ${next.length} qualified Fintech targets · ${label}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Batch load failed.');
    } finally {
      setLoadingBatch(false);
    }
  }, [apiBase, targetCountriesText]);

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

  const activeMarketsLabel =
    targetCountries.length > 0
      ? formatTargetCountriesPayload(targetCountries)
      : 'PENDING TARGET INPUT';

  return (
    <div id="market-flywheel">
      <h2>📈 MARKET INTEGRATION &amp; LEAD FLYWHEEL</h2>
      <label className="target-countries-label" htmlFor="target-countries-input">
        Target countries
      </label>
      <input
        id="target-countries-input"
        type="text"
        value={targetCountriesText}
        onChange={ev => setTargetCountriesText(ev.target.value)}
        placeholder="Germany, Australia, Ireland, Canada"
        spellCheck={false}
        autoComplete="off"
      />
      <p className="target-countries-hint">
        Active markets: <span className="target-countries-payload">{activeMarketsLabel}</span>
      </p>
      <button
        type="button"
        id="fetch-batch-btn"
        disabled={loadingBatch || targetCountries.length === 0}
        onClick={() => void loadBatch()}
      >
        Load Prospecting Batch
      </button>
      <div id="prospect-list">
        {!prospects.length ? (
          <div className="prospect-empty">
            {loadingBatch
              ? 'Loading qualified targets…'
              : 'Enter target countries and load a Fintech SaaS batch (5–50 employees).'}
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
                    {prospect.region} · {prospect.employeeCount} emp · {prospect.compliancePressure} ·{' '}
                    {funding} · {hireTag} · {prospect.dealStage}
                  </div>
                </div>
                <span className="score-pill" data-score={displayIcpScore(prospect)} title="icpScore">
                  {displayIcpScore(prospect)}
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
