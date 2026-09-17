export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return roundToTwoDecimals(change);
}
