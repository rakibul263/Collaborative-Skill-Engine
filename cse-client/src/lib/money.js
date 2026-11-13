/**
 * Strict Whole-Integer Taka (BDT ৳) financial utilities for frontend calculations & formatting.
 * Ensures zero floating-point or decimal values ever appear in Taka displays or inputs.
 */

export const CURRENCY_CODE = "BDT";
export const CURRENCY_SYMBOL = "৳";
export const MIN_PRICE_BDT = 1;
export const MAX_PRICE_BDT = 999999;

export function toWholeTaka(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

export function toPoisha(amount) {
  return toWholeTaka(amount) * 100;
}

export function fromPoisha(poisha) {
  return Math.round((Number(poisha) || 0) / 100);
}

export function sumBdtAmounts(amounts) {
  let totalTaka = 0;
  for (const amt of amounts) {
    totalTaka += toWholeTaka(amt);
  }
  return totalTaka;
}

/**
 * Split a BDT price between platform commission (15%) and instructor earnings (85%)
 * strictly as whole integer Taka so commission + instructorEarnings === price always holds.
 */
export function splitRevenuePoisha(priceBDT, commissionPct = 15) {
  const priceTaka = Math.max(0, toWholeTaka(priceBDT));
  const commissionTaka = Math.round((priceTaka * commissionPct) / 100);
  const instructorTaka = priceTaka - commissionTaka;
  return {
    pricePoisha: priceTaka * 100,
    commissionPoisha: commissionTaka * 100,
    instructorEarningsPoisha: instructorTaka * 100,
    price: priceTaka,
    commission: commissionTaka,
    instructorEarnings: instructorTaka,
  };
}

/**
 * Safely resolves a course's price strictly as a whole integer Bangladeshi Taka (৳).
 * Automatically handles:
 * - Direct whole Taka numbers (e.g. 500, 1000)
 * - Legacy poisha minor units (e.g. 100000 -> 1000)
 * - Objects with price or pricePoisha
 */
export function resolveCoursePrice(course) {
  if (!course) return 0;
  if (typeof course === "number") {
    const num = Math.round(course);
    if (num >= 50000 && num % 100 === 0) {
      return Math.round(num / 100);
    }
    return Math.max(0, num);
  }
  const rawPrice = Number(course.price);
  const rawPoisha = Number(course.pricePoisha);

  if (Number.isFinite(rawPoisha) && rawPoisha > 0) {
    return Math.round(rawPoisha / 100);
  }
  if (Number.isFinite(rawPrice)) {
    const rounded = Math.round(rawPrice);
    if (rounded >= 50000 && rounded % 100 === 0 && (!rawPoisha || rawPoisha === rounded)) {
      return Math.round(rounded / 100);
    }
    return Math.max(0, rounded);
  }
  return 0;
}

/**
 * Format any Taka amount strictly as a whole integer without decimals (e.g. ৳500, ৳12,500).
 */
export function formatBDT(amount, { withSymbol = true } = {}) {
  const intTaka = toWholeTaka(amount);
  const absTaka = Math.abs(intTaka);
  const formatted = absTaka.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${intTaka < 0 ? "-" : ""}${withSymbol ? CURRENCY_SYMBOL : ""}${formatted}`;
}
