import { useMemo } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Transaction, User, UserId, DateRange } from '@/core/types'

export interface PersonSavings {
  userId: UserId
  name: string
  income: number
  expenses: number
  savings: number
  annualPace: number | null
}

export function useSavingsByPerson(
  transactions: Transaction[],
  users: [User, User],
  dateRange: DateRange,
): [PersonSavings, PersonSavings] {
  return useMemo(() => {
    const periodDays = differenceInCalendarDays(parseISO(dateRange.end), parseISO(dateRange.start)) + 1
    const showAnnual = periodDays <= 366

    function shareFor(payerId: string, userId: UserId): number {
      if (payerId === userId) return 1
      if (payerId === 'shared') return 0.5
      return 0
    }

    return users.map((user) => {
      let income = 0
      let expenses = 0
      for (const tx of transactions) {
        const share = shareFor(tx.payerId, user.id)
        if (share === 0) continue
        if (tx.amount < 0) {
          income += Math.abs(tx.amount) * share
        } else if (tx.amount > 0) {
          expenses += tx.amount * share
        }
      }
      const savings = income - expenses
      const annualPace = showAnnual ? (savings / periodDays) * 365 : null
      return { userId: user.id, name: user.name, income, expenses, savings, annualPace }
    }) as [PersonSavings, PersonSavings]
  }, [transactions, users, dateRange])
}
