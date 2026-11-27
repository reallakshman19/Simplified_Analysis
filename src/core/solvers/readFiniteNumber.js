/**
 * Read a solver input as a finite number. Missing, blank, and invalid values return null.
 * @param {unknown} value
 * @returns {number|null}
 */
export function readFiniteNumber(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
