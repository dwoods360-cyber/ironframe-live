/**
 * Unit tests: riskStore template staging (Human-in-the-Loop) — GATEKEEPER PROTOCOL.
 * Proves isManualFormOpen, draftTemplate, setDraftTemplate, clearDraftTemplate, setManualFormOpen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useRiskStore } from '@/app/store/riskStore';

/** Valid template: title, source, target, loss (BigInt-compatible string e.g. cents or $M string). */
const validTemplate = {
  title: 'RANSOMWARE / PHI EXTORTION',
  source: 'Strategic Intel Profile',
  target: 'Healthcare',
  loss: '490000000', // cents = $4.9M
};

describe('riskStore — template staging (manual form open + draft)', () => {
  beforeEach(() => {
    useRiskStore.getState().clearDraftTemplate?.();
  });

  it('store initializes with isManualFormOpen: false and draftTemplate: null', () => {
    const state = useRiskStore.getState();
    expect(state.isManualFormOpen).toBe(false);
    expect(state.draftTemplate).toBeNull();
  });

  it('calling setDraftTemplate(templateData) updates draft state AND sets isManualFormOpen: true', () => {
    useRiskStore.getState().setDraftTemplate(validTemplate);

    const state = useRiskStore.getState();
    expect(state.draftTemplate).not.toBeNull();
    expect(state.draftTemplate).toEqual(validTemplate);
    expect(state.draftTemplate?.title).toBe(validTemplate.title);
    expect(state.draftTemplate?.source).toBe(validTemplate.source);
    expect(state.draftTemplate?.target).toBe(validTemplate.target);
    expect(state.draftTemplate?.loss).toBe(validTemplate.loss);
    expect(state.isManualFormOpen).toBe(true);
  });

  it('calling clearDraftTemplate() resets template to null and closes the form', () => {
    useRiskStore.getState().setDraftTemplate(validTemplate);
    expect(useRiskStore.getState().draftTemplate).not.toBeNull();
    expect(useRiskStore.getState().isManualFormOpen).toBe(true);

    useRiskStore.getState().clearDraftTemplate();
    const state = useRiskStore.getState();
    expect(state.draftTemplate).toBeNull();
    expect(state.isManualFormOpen).toBe(false);
  });

  it('templateData strictly requires title, source, target, and loss (non-empty)', () => {
    const setDraft = useRiskStore.getState().setDraftTemplate;
    expect(() => setDraft({ ...validTemplate, title: '' })).toThrow();
    expect(() => setDraft({ ...validTemplate, source: '' })).toThrow();
    expect(() => setDraft({ ...validTemplate, target: '' })).toThrow();
    expect(() => setDraft({ ...validTemplate, loss: '' })).toThrow();
    setDraft({ title: 'x', source: 'y', target: 'z', loss: '0' });
    expect(useRiskStore.getState().draftTemplate?.loss).toBe('0');
  });

  it('setManualFormOpen(true) opens form without changing draft; setManualFormOpen(false) closes form', () => {
    useRiskStore.getState().setManualFormOpen(true);
    expect(useRiskStore.getState().isManualFormOpen).toBe(true);
    expect(useRiskStore.getState().draftTemplate).toBeNull();

    useRiskStore.getState().setDraftTemplate(validTemplate);
    expect(useRiskStore.getState().isManualFormOpen).toBe(true);
    useRiskStore.getState().setManualFormOpen(false);
    expect(useRiskStore.getState().isManualFormOpen).toBe(false);
    expect(useRiskStore.getState().draftTemplate).toEqual(validTemplate);
  });
});
