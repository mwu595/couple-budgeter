// Exchange rates from Frankfurter (ECB daily reference rates).
// Free, no API key, no quota. Called only by core/store's getExchangeRate,
// which caches results — never call this from a component.

const BASE_URL = 'https://api.frankfurter.dev/v1'
const TIMEOUT_MS = 8000

interface FrankfurterResponse {
  base: string
  date: string
  rates: Record<string, number>
}

/**
 * Units of `code` per 1 USD.
 * `date` (YYYY-MM-DD) asks for that day's rate — the source falls back to the
 * last published business day. Omit it for the latest rate.
 */
export async function fetchUsdRate(
  code: string,
  date?: string,
): Promise<{ rate: number; rateDate: string }> {
  const path = date ?? 'latest'
  const res = await fetch(
    `${BASE_URL}/${path}?base=USD&symbols=${encodeURIComponent(code)}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  )
  if (!res.ok) throw new Error(`Exchange rate request failed (${res.status})`)
  const body = (await res.json()) as FrankfurterResponse
  const rate = body.rates?.[code]
  if (typeof rate !== 'number' || !(rate > 0)) {
    throw new Error(`No exchange rate for ${code}`)
  }
  return { rate, rateDate: body.date }
}
