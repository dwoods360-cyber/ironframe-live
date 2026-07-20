import { describe, expect, it } from 'vitest';
import { formatPerimeterWorkforceHealthAnswer, type ProductMatrixHealthSnapshot } from './productMatrixHealth.js';

describe('formatPerimeterWorkforceHealthAnswer', () => {
  it('explains red as unreachable probe and HIGH as static priority', () => {
    const snapshot: ProductMatrixHealthSnapshot = {
      checkedAt: '2026-07-19T00:00:00.000Z',
      services: [
        {
          key: 'ironleads',
          name: 'Ironleads',
          priority: 'HIGH',
          port: 8083,
          healthUrl: 'http://127.0.0.1:8083/health',
          reachable: false,
          status: null,
          latencyMs: 12,
          crmStage: 'SUSPECT',
        },
        {
          key: 'salesteam',
          name: 'SalesTeam',
          priority: 'HIGH',
          port: 8084,
          healthUrl: 'http://127.0.0.1:8084/health',
          reachable: true,
          status: 'OK',
          latencyMs: 8,
          crmStage: 'PROSPECT',
        },
      ],
    };

    const answer = formatPerimeterWorkforceHealthAnswer(snapshot);
    expect(answer).toContain('product-matrix');
    expect(answer).toContain('not U.S. labor-market');
    expect(answer).toContain('not CRM pipeline');
    expect(answer).toContain('Ironleads');
    expect(answer).toContain('red / unreachable');
    expect(answer).toContain('static ops priority');
    expect(answer).not.toContain('Conference Board');
    expect(answer).not.toContain('manageCrmPipeline');
  });
});
