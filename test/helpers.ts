export const START = Date.parse('2026-01-10T08:00:00Z');

export function hour(hours: number): string {
  return new Date(START + hours * 3_600_000).toISOString();
}
