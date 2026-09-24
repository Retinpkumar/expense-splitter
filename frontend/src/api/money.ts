// Plain decimal literal, at most 2 fractional digits — rejects hex/
// scientific notation, leading "+", "Infinity"/"NaN", and other
// numeric-literal forms JS's Number() would otherwise accept but the
// backend's Decimal(12,2) column would reject or silently truncate.
// Restricting to whole cents also keeps toCents() exact: with no more
// than 2 decimal digits, Math.round(value * 100) never needs to correct
// a float-representation error, so summing already-rounded cents can't
// drift for any input this pattern accepts.
const DECIMAL_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/** Parses a decimal-string amount, or null if invalid/empty. */
export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  return DECIMAL_PATTERN.test(trimmed) ? Number(trimmed) : null;
}

/** Converts a dollar amount (at most 2 decimal digits) to integer cents. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}
