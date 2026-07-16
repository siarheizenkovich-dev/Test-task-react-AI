/**
 * Carrier payout calculation — pure domain logic, no framework imports.
 *
 * Business rules:
 *  - linehaul: loaded miles at the negotiated rate
 *  - deadhead: empty miles paid at 50% of the rate
 *  - fuel surcharge: $0.40 per loaded mile, only while the fuel index is
 *    strictly above 3.75; deadhead miles never get a surcharge
 *  - brokerage fee, tiered by subtotal: <$1,500 → 12%, <$3,000 → 10%, else 8%
 *  - every component is rounded to cents (half-up) before summing
 */

export const FUEL_INDEX_THRESHOLD = 3.75;
export const FUEL_SURCHARGE_PER_MILE = 0.4;
export const DEADHEAD_PAY_RATIO = 0.5;

export interface RateInput {
  miles: number;
  deadheadMiles: number;
  ratePerMile: number;
  fuelIndex: number;
}

export interface RateBreakdown {
  linehaul: number;
  deadheadPay: number;
  fuelSurcharge: number;
  subtotal: number;
  brokerageFeeRate: number;
  brokerageFee: number;
  carrierTotal: number;
}

/** Half-up rounding to cents. */
export const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const getBrokerageFeeRate = (subtotal: number): number => {
  if (subtotal < 1500) return 0.12;
  if (subtotal < 3000) return 0.1;
  return 0.08;
};

export const calculateRate = (input: RateInput): RateBreakdown => {
  const linehaul = roundToCents(input.miles * input.ratePerMile);
  const deadheadPay = roundToCents(input.deadheadMiles * input.ratePerMile * DEADHEAD_PAY_RATIO);
  const fuelSurcharge =
    input.fuelIndex > FUEL_INDEX_THRESHOLD
      ? roundToCents(input.miles * FUEL_SURCHARGE_PER_MILE)
      : 0;

  const subtotal = roundToCents(linehaul + deadheadPay + fuelSurcharge);
  const brokerageFeeRate = getBrokerageFeeRate(subtotal);
  const brokerageFee = roundToCents(subtotal * brokerageFeeRate);
  const carrierTotal = roundToCents(subtotal - brokerageFee);

  return { linehaul, deadheadPay, fuelSurcharge, subtotal, brokerageFeeRate, brokerageFee, carrierTotal };
};
