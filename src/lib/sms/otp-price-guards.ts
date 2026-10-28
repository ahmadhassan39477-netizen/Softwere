/**
 * Guardrails so misparsed wholesale (provider IDs, stock counts, RUB-as-USD)
 * never reaches Auto ranking or the shop as thousand-dollar OTP tiers.
 */

/** Wholesale above this is not a normal single OTP activation in USD. */
export const MAX_PLAUSIBLE_OTP_WHOLESALE_USD = 40;

/** Retail above this is rejected from Auto / multi-offer ranking (20% → ~$33 wholesale). */
export const MAX_PLAUSIBLE_OTP_RETAIL_USD = 50;

export function isPlausibleOtpWholesale(wholesale: number): boolean {
  return Number.isFinite(wholesale) && wholesale > 0 && wholesale <= MAX_PLAUSIBLE_OTP_WHOLESALE_USD;
}

export function isPlausibleOtpRetail(retail: number): boolean {
  return Number.isFinite(retail) && retail > 0 && retail <= MAX_PLAUSIBLE_OTP_RETAIL_USD;
}

/** Retail from wholesale × markup; false when either side is absurd. */
export function isPlausibleMarkedUpOtp(
  wholesale: number,
  markupPercent: number,
): boolean {
  if (!isPlausibleOtpWholesale(wholesale)) return false;
  const m = Number.isFinite(markupPercent) && markupPercent >= 0 ? markupPercent : 20;
  const retail = wholesale * (1 + m / 100);
  return isPlausibleOtpRetail(retail);
}
