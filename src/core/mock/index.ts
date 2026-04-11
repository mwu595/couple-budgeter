import type { AppState } from '@/core/types'
import { generateMockLabels } from './labels'
import { generateMockTransactions } from './transactions'

export { generateMockLabels } from './labels'
export { generateMockTransactions } from './transactions'

export function generateMockData(): Pick<AppState, 'users' | 'transactions' | 'labels'> {
  const labels = generateMockLabels()
  return {
    users: [
      { id: 'user_a', name: 'Alex',   avatarEmoji: '🧑' },
      { id: 'user_b', name: 'Jordan', avatarEmoji: '👩' },
    ],
    labels,
    transactions: generateMockTransactions(labels),
  }
}
