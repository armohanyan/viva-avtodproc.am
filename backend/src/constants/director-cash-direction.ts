export const DIRECTOR_CASH_DIRECTIONS = ['in', 'out'] as const;

export type DirectorCashDirection = (typeof DIRECTOR_CASH_DIRECTIONS)[number];

export function directorCashEntryType(direction: DirectorCashDirection): string {
  return direction === 'out' ? 'Ելք' : 'Մուտք';
}

export function directorCashSignedAmount(direction: DirectorCashDirection, amount: number): number {
  const abs = Math.abs(Math.round(amount));
  return direction === 'out' ? -abs : abs;
}

export function directorCashDirectionFromAmount(amount: number): DirectorCashDirection {
  return amount < 0 ? 'out' : 'in';
}
