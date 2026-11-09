import type { CurrencyCode, Transaction } from '@/core/types'

export const BASE_CURRENCY: CurrencyCode = 'USD'

// Pinned to the top of every currency picker — the two we actually live in.
export const PINNED_CURRENCIES: CurrencyCode[] = ['USD', 'CNY']

const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US Dollar',
  CNY: 'Chinese Yuan (RMB)',
  AUD: 'Australian Dollar',
  BRL: 'Brazilian Real',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  CZK: 'Czech Koruna',
  DKK: 'Danish Krone',
  EUR: 'Euro',
  GBP: 'British Pound',
  HKD: 'Hong Kong Dollar',
  HUF: 'Hungarian Forint',
  IDR: 'Indonesian Rupiah',
  ILS: 'Israeli Shekel',
  INR: 'Indian Rupee',
  ISK: 'Icelandic Króna',
  JPY: 'Japanese Yen',
  KRW: 'South Korean Won',
  MXN: 'Mexican Peso',
  MYR: 'Malaysian Ringgit',
  NOK: 'Norwegian Krone',
  NZD: 'New Zealand Dollar',
  PHP: 'Philippine Peso',
  PLN: 'Polish Złoty',
  RON: 'Romanian Leu',
  SEK: 'Swedish Krona',
  SGD: 'Singapore Dollar',
  THB: 'Thai Baht',
  TRY: 'Turkish Lira',
  ZAR: 'South African Rand',
}

// Everything that isn't pinned, alphabetical by code.
export const OTHER_CURRENCIES: CurrencyCode[] = (Object.keys(CURRENCY_NAMES) as CurrencyCode[])
  .filter((c) => !PINNED_CURRENCIES.includes(c))
  .sort()

export function currencyName(code: CurrencyCode): string {
  return CURRENCY_NAMES[code]
}

export function currencySymbol(code: CurrencyCode): string {
  const part = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
  })
    .formatToParts(0)
    .find((p) => p.type === 'currency')
  return part?.value ?? code
}

// "¥100.00 CNY" — narrow symbol plus the code, since ¥ alone is ambiguous (CNY / JPY).
export function formatMoney(amount: number, code: CurrencyCode): string {
  const n = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
  }).format(amount)
  return `${n} ${code}`
}

// The currency a transaction was logged in (absent = USD).
export function txCurrency(tx: Pick<Transaction, 'currency'>): CurrencyCode {
  return tx.currency ?? BASE_CURRENCY
}

// originalAmount in `rate` units per 1 USD → USD, rounded to cents.
export function toUsd(originalAmount: number, rate: number): number {
  return Math.round((originalAmount / rate) * 100) / 100
}
