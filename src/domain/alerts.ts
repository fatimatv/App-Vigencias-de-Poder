import type { EstadoAlerta } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSinceIssue(fechaExpedicion?: string, today = new Date()): number | undefined {
  if (!fechaExpedicion) return undefined;
  const issued = new Date(`${fechaExpedicion}T00:00:00`);
  if (Number.isNaN(issued.getTime())) return undefined;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const issuedStart = new Date(issued.getFullYear(), issued.getMonth(), issued.getDate());
  return Math.floor((todayStart.getTime() - issuedStart.getTime()) / DAY_MS);
}

export function calculateAlertState(fechaExpedicion?: string, today = new Date()): EstadoAlerta {
  const days = daysSinceIssue(fechaExpedicion, today);
  if (days === undefined) return 'vencida';
  if (days < 60) return 'vigente';
  if (days <= 90) return 'proxima';
  return 'vencida';
}
