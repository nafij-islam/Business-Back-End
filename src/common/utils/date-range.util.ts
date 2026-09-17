export type DatePreset =
  'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'previousMonth' | 'thisYear' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getDateRangeFromPreset(
  preset?: DatePreset,
  customStart?: string | Date,
  customEnd?: string | Date,
): DateRange {
  const now = new Date();

  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59,
      999,
    );
    return { startDate: start, endDate: end };
  }

  if (preset === 'last7days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (preset === 'previousMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (preset === 'thisYear') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (preset === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  // Default: thisMonth
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate: start, endDate: end };
}
