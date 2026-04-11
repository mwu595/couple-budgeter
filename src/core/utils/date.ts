import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subDays,
  format,
} from 'date-fns'
import type { ActivePeriod, DateRange } from '@/core/types'

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

export function getDateRangeForPeriod(period: ActivePeriod): DateRange {
  const today = new Date()

  switch (period.preset) {
    case 'all_time':
      return { start: '2000-01-01', end: '2099-12-31' }

    case 'this_month':
      return { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) }

    case 'last_month': {
      const lastMonth = subMonths(today, 1)
      return { start: fmt(startOfMonth(lastMonth)), end: fmt(endOfMonth(lastMonth)) }
    }

    case 'last_30_days':
      return { start: fmt(subDays(today, 30)), end: fmt(today) }

    case 'last_90_days':
      return { start: fmt(subDays(today, 90)), end: fmt(today) }

    case 'this_year':
      return { start: fmt(startOfYear(today)), end: fmt(endOfYear(today)) }

    case 'custom':
      // Caller must supply period.custom when preset === 'custom'
      return period.custom ?? { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) }
  }
}
