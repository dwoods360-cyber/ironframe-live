import { describe, expect, it } from 'vitest';

import {
  formatTargetCountriesPayload,
  parseTargetCountriesInput,
} from '../lib/flywheelTargetCountries.js';

describe('flywheelTargetCountries', () => {
  it('parses comma, pipe, and semicolon separated labels', () => {
    expect(parseTargetCountriesInput('Germany, Australia | Ireland; Canada')).toEqual([
      'Germany',
      'Australia',
      'Ireland',
      'Canada',
    ]);
  });

  it('formats payload as uppercase comma-joined markets', () => {
    expect(formatTargetCountriesPayload(['Germany', 'Australia'])).toBe('GERMANY,AUSTRALIA');
  });
});
