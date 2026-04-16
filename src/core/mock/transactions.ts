import { format, subDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import type { Transaction, PayerId, Label } from '@/core/types'

// [daysAgo, merchant, amount, accountName, payerId, labelSlots, reviewed]
// labelSlots are 0-based indices into the labels array (Food=0, DiningOut=1, etc.)
type TxTemplate = [number, string, number, string, PayerId, number[], boolean]

const TEMPLATES: TxTemplate[] = [
  // ── Dining Out (slot 1) — 15 ─────────────────────────────────────────────
  [0,  'Starbucks',        7.25,  'Chase Sapphire',  'user_a', [1], true],
  [2,  'Starbucks',        6.50,  'Chase Sapphire',  'user_a', [1], true],
  [5,  'Chipotle',        13.50,  'Chase Sapphire',  'user_a', [1], true],
  [7,  'Starbucks',        8.00,  'Chase Sapphire',  'user_a', [1], true],
  [10, 'Sweetgreen',      15.75,  'Chase Sapphire',  'user_a', [1], true],
  [12, 'Starbucks',        7.25,  'Chase Sapphire',  'user_a', [1], true],
  [14, 'Chipotle',        14.75,  'Chase Sapphire',  'user_a', [1], true],
  [20, "McDonald's",       8.50,  'BofA Debit',      'user_b', [1], true],
  [25, 'Starbucks',        6.75,  'BofA Debit',      'user_b', [1], true],
  [30, 'Panera Bread',    12.50,  'BofA Debit',      'user_b', [1], true],
  [35, "McDonald's",       9.75,  'BofA Debit',      'user_b', [1], false],
  [40, 'Starbucks',        7.50,  'Chase Sapphire',  'user_a', [1], false],
  [50, 'Sweetgreen',      16.50,  'Chase Sapphire',  'user_a', [1], false],
  [60, 'Chipotle',        12.00,  'BofA Debit',      'user_b', [1], false],
  [70, 'Shake Shack',     18.75,  'Shared Checking', 'shared', [1], false],

  // ── Groceries (slot 3) — 12 ──────────────────────────────────────────────
  [1,  'Whole Foods',     89.50,  'Chase Sapphire',  'user_a', [3], true],
  [8,  "Trader Joe's",    54.30,  'BofA Debit',      'user_b', [3], true],
  [15, 'Whole Foods',    124.75,  'Chase Sapphire',  'user_a', [3], true],
  [22, 'Costco',         187.40,  'Shared Checking', 'shared', [3], true],
  [29, "Trader Joe's",    78.50,  'BofA Debit',      'user_b', [3], true],
  [36, 'Whole Foods',     67.00,  'Chase Sapphire',  'user_a', [3], false],
  [43, 'Safeway',         95.10,  'BofA Debit',      'user_b', [3], false],
  [50, 'Costco',         215.60,  'Shared Checking', 'shared', [3], false],
  [57, 'Whole Foods',    145.20,  'Chase Sapphire',  'user_a', [3], false],
  [64, "Trader Joe's",    62.40,  'BofA Debit',      'user_b', [3], false],
  [71, 'Whole Foods',     98.30,  'Chase Sapphire',  'user_a', [3], false],
  [78, 'Costco',         199.80,  'Shared Checking', 'shared', [3], false],

  // ── Transport (slot 2) — 12 ───────────────────────────────────────────────
  [1,  'Uber',            18.50,  'Chase Sapphire',  'user_a', [2], true],
  [4,  'Lyft',            22.75,  'BofA Debit',      'user_b', [2], true],
  [9,  'Shell',           65.40,  'Chase Sapphire',  'user_a', [2], true],
  [13, 'Uber',            14.25,  'Chase Sapphire',  'user_a', [2], true],
  [18, 'Uber',            31.50,  'BofA Debit',      'user_b', [2], true],
  [23, 'BP',              58.90,  'BofA Debit',      'user_b', [2], true],
  [32, 'Uber',            24.00,  'Chase Sapphire',  'user_a', [2], false],
  [41, 'Lyft',            19.50,  'BofA Debit',      'user_b', [2], false],
  [49, 'Shell',           71.20,  'Chase Sapphire',  'user_a', [2], false],
  [56, 'Uber',            27.75,  'Chase Sapphire',  'user_a', [2], false],
  [65, 'Chevron',         62.30,  'BofA Debit',      'user_b', [2], false],
  [74, 'Uber',            16.50,  'Chase Sapphire',  'user_a', [2], false],

  // ── Subscriptions (slot 5) — 10 ──────────────────────────────────────────
  [5,  'Netflix',         22.99,  'Shared Checking', 'shared', [5], true],
  [5,  'Spotify',          9.99,  'Chase Sapphire',  'user_a', [5], true],
  [10, 'Amazon Prime',    14.99,  'Shared Checking', 'shared', [5], true],
  [15, 'Apple One',       32.95,  'Shared Checking', 'shared', [5], true],
  [20, 'ChatGPT Plus',    20.00,  'Chase Sapphire',  'user_a', [5], true],
  [35, 'Netflix',         22.99,  'Shared Checking', 'shared', [5], false],
  [35, 'Spotify',          9.99,  'Chase Sapphire',  'user_a', [5], false],
  [65, 'Netflix',         22.99,  'Shared Checking', 'shared', [5], false],
  [65, 'Spotify',          9.99,  'Chase Sapphire',  'user_a', [5], false],
  [65, 'Hulu',            17.99,  'Shared Checking', 'shared', [5], false],

  // ── Utilities (slot 4) — 8 ───────────────────────────────────────────────
  [3,  'PG&E',           145.00,  'Shared Checking', 'shared', [4], true],
  [3,  'Comcast',         89.99,  'Shared Checking', 'shared', [4], true],
  [3,  'Verizon',        120.00,  'Chase Sapphire',  'user_a', [4], true],
  [3,  'AT&T',            95.00,  'BofA Debit',      'user_b', [4], true],
  [33, 'PG&E',           138.00,  'Shared Checking', 'shared', [4], false],
  [33, 'Comcast',         89.99,  'Shared Checking', 'shared', [4], false],
  [63, 'PG&E',           167.50,  'Shared Checking', 'shared', [4], false],
  [63, 'Comcast',         89.99,  'Shared Checking', 'shared', [4], false],

  // ── Shopping (slot 8) — 10 ───────────────────────────────────────────────
  [4,  'Amazon',          45.99,  'Chase Sapphire',  'user_a', [8], true],
  [11, 'Target',          78.40,  'BofA Debit',      'user_b', [8], true],
  [18, 'Amazon',         129.99,  'Chase Sapphire',  'user_a', [8], true],
  [26, 'IKEA',           349.00,  'Shared Checking', 'shared', [8], true],
  [33, 'Amazon',          67.50,  'BofA Debit',      'user_b', [8], false],
  [40, 'Zara',            89.90,  'Chase Sapphire',  'user_a', [8], false],
  [48, 'Amazon',          34.99,  'Chase Sapphire',  'user_a', [8], false],
  [55, 'Target',         156.30,  'BofA Debit',      'user_b', [8], false],
  [62, 'Nordstrom',      245.00,  'BofA Debit',      'user_b', [8], false],
  [69, 'Amazon',          89.99,  'Chase Sapphire',  'user_a', [8], false],

  // ── Health (slot 6) — 8 ──────────────────────────────────────────────────
  [6,  'LA Fitness',      29.99,  'Chase Sapphire',  'user_a', [6], true],
  [6,  'Peloton',         44.00,  'BofA Debit',      'user_b', [6], true],
  [11, 'CVS',             34.50,  'BofA Debit',      'user_b', [6], true],
  [19, 'Walgreens',       28.75,  'Chase Sapphire',  'user_a', [6], true],
  [36, 'LA Fitness',      29.99,  'Chase Sapphire',  'user_a', [6], false],
  [36, 'Peloton',         44.00,  'BofA Debit',      'user_b', [6], false],
  [66, 'LA Fitness',      29.99,  'Chase Sapphire',  'user_a', [6], false],
  [66, 'Peloton',         44.00,  'BofA Debit',      'user_b', [6], false],

  // ── Entertainment (slot 9) — 8 ───────────────────────────────────────────
  [3,  'AMC Theaters',    32.50,  'Shared Checking', 'shared', [9], true],
  [16, 'Apple App Store',  4.99,  'Chase Sapphire',  'user_a', [9], true],
  [24, 'Steam',           29.99,  'BofA Debit',      'user_b', [9], true],
  [31, 'AMC Theaters',    28.00,  'Shared Checking', 'shared', [9], true],
  [45, 'Ticketmaster',   175.00,  'Shared Checking', 'shared', [9], false],
  [52, 'Apple App Store',  2.99,  'Chase Sapphire',  'user_a', [9], false],
  [60, 'Steam',           14.99,  'BofA Debit',      'user_b', [9], false],
  [75, 'AMC Theaters',    35.50,  'Shared Checking', 'shared', [9], false],

  // ── Food (slot 0) — 4 ────────────────────────────────────────────────────
  [8,  "Domino's Pizza",  32.50,  'Chase Sapphire',  'user_a', [0],    true],
  [28, 'DoorDash',        45.75,  'Shared Checking', 'shared', [0, 1], true],
  [55, "Domino's Pizza",  28.90,  'Chase Sapphire',  'user_a', [0],    false],
  [77, 'DoorDash',        38.50,  'Shared Checking', 'shared', [0, 1], false],

  // ── Travel (slot 7) — 3 ──────────────────────────────────────────────────
  [45, 'Southwest Airlines', 287.00, 'Shared Checking', 'shared', [7], false],
  [46, 'Airbnb',            420.00, 'Shared Checking', 'shared', [7], false],
  [80, 'United Airlines',   345.00, 'Shared Checking', 'shared', [7], false],
]

/**
 * Generate mock transactions using the provided labels array.
 * Label slots are 0-based indices into the labels array.
 */
export function generateMockTransactions(labels: Label[]): Transaction[] {
  const today = new Date()
  return TEMPLATES.map(([daysAgo, merchant, amount, accountName, payerId, labelSlots, reviewed]) => {
    const date = format(subDays(today, daysAgo), 'yyyy-MM-dd')
    return {
      id: uuidv4(),
      date,
      merchant,
      amount,
      accountName,
      payerId,
      appliedTo: 'shared' as const,
      labelIds: labelSlots.map((slot) => labels[slot].id),
      reviewed,
      createdAt: `${date}T12:00:00.000Z`,
    }
  })
}
