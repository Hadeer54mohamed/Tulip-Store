/**
 * Prices and counts are always printed with Western digits (450, 1,200), whatever language the visitor's browser uses.
 * `toLocaleString()` with no locale prints Arabic digits on an Arabic browser, so the server and the browser disagree
 * and React reports a hydration error.
 */
export const fmt = (n: unknown) => Number(n || 0).toLocaleString("en-US")
