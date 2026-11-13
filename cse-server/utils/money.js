/**
 * Strict Whole-Integer Taka (BDT ৳) financial utilities.
 * All prices, splits, commissions, instructor payouts, and totals use
 * whole integers (no floating-point decimals or fractional values).
 */

const CURRENCY_CODE = "BDT";
const CURRENCY_SYMBOL = "৳";
const MIN_PRICE_BDT = 1;
const MAX_PRICE_BDT = 999999;
const DEFAULT_COMMISSION_PCT = 15;

/**
 * Convert any numeric input cleanly to a whole integer Taka amount.
 */
function toWholeTaka(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

/**
 * Convert BDT Taka to whole-Taka poisha minor units (integer * 100).
 */
function toPoisha(amount) {
  return toWholeTaka(amount) * 100;
}

/**
 * Convert poisha back to a strict whole integer Taka value (zero floating point).
 */
function fromPoisha(poisha) {
  return Math.round((Number(poisha) || 0) / 100);
}

/**
 * Sum an iterable of BDT amounts using exact whole-integer arithmetic.
 */
function sumBdtAmounts(amounts) {
  let totalTaka = 0;
  for (const amt of amounts) {
    totalTaka += toWholeTaka(amt);
  }
  return {
    poisha: totalTaka * 100,
    bdt: totalTaka,
  };
}

/**
 * Split a course price between platform commission and instructor earnings
 * strictly in whole integer Taka so that:
 *   commission + instructorEarnings === price
 * ALWAYS holds with zero floating-point decimals.
 */
function splitRevenuePoisha(priceBDT, commissionPct = DEFAULT_COMMISSION_PCT) {
  const priceTaka = Math.max(0, toWholeTaka(priceBDT));
  const commissionTaka = Math.round((priceTaka * commissionPct) / 100);
  const instructorTaka = priceTaka - commissionTaka;

  return {
    currency: CURRENCY_CODE,
    pricePoisha: priceTaka * 100,
    commissionPoisha: commissionTaka * 100,
    instructorEarningsPoisha: instructorTaka * 100,
    price: priceTaka,
    commission: commissionTaka,
    instructorEarnings: instructorTaka,
  };
}

/**
 * Validate a submitted BDT course price.
 * Enforces whole integer Taka in range [৳1, ৳999,999] with zero floating-point decimals.
 */
function validateBdtPrice(rawPrice) {
  if (rawPrice === undefined || rawPrice === null || String(rawPrice).trim() === "") {
    return {
      valid: false,
      error: `Price must be a whole BDT amount between ৳${MIN_PRICE_BDT} and ৳${MAX_PRICE_BDT.toLocaleString("en-US")}.`,
    };
  }

  const numPrice = Number(rawPrice);
  if (!Number.isFinite(numPrice) || numPrice < MIN_PRICE_BDT || numPrice > MAX_PRICE_BDT) {
    return {
      valid: false,
      error: `Price must be between ৳${MIN_PRICE_BDT} and ৳${MAX_PRICE_BDT.toLocaleString("en-US")} BDT.`,
    };
  }

  if (!Number.isInteger(numPrice)) {
    return {
      valid: false,
      error: "Price must be a whole Taka integer without decimal or floating-point values.",
    };
  }

  return {
    valid: true,
    pricePoisha: numPrice * 100,
    price: numPrice,
  };
}

/**
 * Resolve exact integer Taka ledger amounts (normalized to poisha multiples of 100)
 * for both new and legacy enrollments. Always guarantees:
 *   commission + instructorEarnings === gross (with zero decimals).
 */
function resolveEnrollmentPoisha(doc = {}) {
  const rawPrice =
    doc.price !== undefined && doc.price !== null
      ? doc.price
      : Number.isFinite(doc.pricePoisha)
      ? doc.pricePoisha / 100
      : null;

  if (rawPrice !== null) {
    const split = splitRevenuePoisha(rawPrice);
    return {
      pricePoisha: split.pricePoisha,
      commissionPoisha: split.commissionPoisha,
      instructorEarningsPoisha: split.instructorEarningsPoisha,
    };
  }

  const instructorTaka = toWholeTaka(doc.instructorEarnings || 0);
  const commissionTaka = toWholeTaka(doc.commission || 0);
  return {
    pricePoisha: (commissionTaka + instructorTaka) * 100,
    commissionPoisha: commissionTaka * 100,
    instructorEarningsPoisha: instructorTaka * 100,
  };
}

/**
 * Generates or deterministically resolves a canonical Invoice Number (INV-YYYYMMDD-XXXXXX)
 * for any course enrollment record (new or legacy).
 */
function formatInvoiceNumber(doc = {}) {
  if (doc.invoiceNumber && typeof doc.invoiceNumber === "string") {
    return doc.invoiceNumber;
  }
  const iso = typeof doc.createdAt === "string" ? doc.createdAt : new Date().toISOString();
  const datePart = iso.slice(0, 10).replace(/-/g, "");
  const idStr = doc._id ? doc._id.toString().toUpperCase() : "000000";
  const tail = idStr.slice(-6).padStart(6, "0");
  return `INV-${datePart}-${tail}`;
}

function generateNewInvoiceNumber(date = new Date()) {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(16).slice(2, 8).toUpperCase().padEnd(6, "0");
  return `INV-${datePart}-${randomSuffix}`;
}

module.exports = {
  CURRENCY_CODE,
  CURRENCY_SYMBOL,
  MIN_PRICE_BDT,
  MAX_PRICE_BDT,
  DEFAULT_COMMISSION_PCT,
  toWholeTaka,
  toPoisha,
  fromPoisha,
  sumBdtAmounts,
  splitRevenuePoisha,
  validateBdtPrice,
  resolveEnrollmentPoisha,
  formatInvoiceNumber,
  generateNewInvoiceNumber,
};
