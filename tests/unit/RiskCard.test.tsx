import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskCard from '@/app/components/RiskCard';

describe('RiskCard visual failsafe', () => {
  it('shows red flashing classes for unassigned ACTIVE_RISKS cards', () => {
    render(
      <RiskCard
        label="Risk A"
        amountCents={200_00}
        baselineCents={100_00}
        type="MEDSHIELD"
        assignee={null}
        status="ACTIVE_RISKS"
      />,
    );

    const card = screen.getByTestId('risk-card');
    expect(card).toHaveClass('animate-pulse');
    expect(card).toHaveClass('border-red-600');
  });

  it('does not show failsafe classes when card is assigned', () => {
    render(
      <RiskCard
        label="Risk B"
        amountCents={200_00}
        baselineCents={100_00}
        type="MEDSHIELD"
        assignee="dereck"
        status="ACTIVE_RISKS"
      />,
    );

    const card = screen.getByTestId('risk-card');
    expect(card).not.toHaveClass('animate-pulse');
    expect(card).not.toHaveClass('border-red-600');
  });
});

