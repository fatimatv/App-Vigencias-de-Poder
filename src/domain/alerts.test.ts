import { describe, expect, it } from 'vitest';
import { calculateAlertState, daysSinceIssue } from './alerts';

describe('calculateAlertState', () => {
  const today = new Date('2026-06-10T12:00:00-05:00');

  it('marks certificates younger than 60 days as vigente', () => {
    expect(calculateAlertState('2026-05-01', today)).toBe('vigente');
  });

  it('marks certificates from 60 to 90 days old as proxima', () => {
    expect(calculateAlertState('2026-04-01', today)).toBe('proxima');
  });

  it('marks certificates older than 90 days as vencida', () => {
    expect(calculateAlertState('2026-02-01', today)).toBe('vencida');
  });

  it('treats missing dates as vencida so they surface for review', () => {
    expect(calculateAlertState(undefined, today)).toBe('vencida');
  });
});

describe('daysSinceIssue', () => {
  it('returns whole elapsed days from fechaExpedicion', () => {
    expect(daysSinceIssue('2026-04-01', new Date('2026-06-10T12:00:00-05:00'))).toBe(70);
  });
});
