import { describe, expect, it } from 'vitest';
import { calculateRate, getBrokerageFeeRate, roundToCents } from './rate';

describe('calculateRate', () => {
  it('computes the plain case: linehaul + deadhead, no surcharge', () => {
    const result = calculateRate({
      miles: 1000,
      deadheadMiles: 100,
      ratePerMile: 2,
      fuelIndex: 3.5,
    });
    expect(result.linehaul).toBe(2000);
    expect(result.deadheadPay).toBe(100); // 100 mi × $2 × 50%
    expect(result.fuelSurcharge).toBe(0);
    expect(result.subtotal).toBe(2100);
    expect(result.brokerageFeeRate).toBe(0.1);
    expect(result.brokerageFee).toBe(210);
    expect(result.carrierTotal).toBe(1890);
  });

  it('applies the fuel surcharge to loaded miles only when index is above threshold', () => {
    const result = calculateRate({
      miles: 500,
      deadheadMiles: 200,
      ratePerMile: 2,
      fuelIndex: 3.76,
    });
    expect(result.fuelSurcharge).toBe(200); // 500 mi × $0.40 — deadhead excluded
  });

  it('gives no surcharge at exactly the threshold (rule is strictly greater)', () => {
    const result = calculateRate({
      miles: 500,
      deadheadMiles: 0,
      ratePerMile: 2,
      fuelIndex: 3.75,
    });
    expect(result.fuelSurcharge).toBe(0);
  });

  it('handles zero deadhead', () => {
    const result = calculateRate({
      miles: 300,
      deadheadMiles: 0,
      ratePerMile: 2.5,
      fuelIndex: 3.2,
    });
    expect(result.deadheadPay).toBe(0);
    expect(result.subtotal).toBe(750);
  });

  it('uses 12% below $1,500 and 10% at exactly $1,500', () => {
    expect(getBrokerageFeeRate(1499.99)).toBe(0.12);
    expect(getBrokerageFeeRate(1500)).toBe(0.1);
  });

  it('uses 10% below $3,000 and 8% at exactly $3,000', () => {
    expect(getBrokerageFeeRate(2999.99)).toBe(0.1);
    expect(getBrokerageFeeRate(3000)).toBe(0.08);
  });

  it('crosses a fee tier via the subtotal, not the linehaul alone', () => {
    // linehaul 1400 (12% tier on its own) + deadhead 150 pushes subtotal
    // to 1550 → 10% tier
    const result = calculateRate({
      miles: 700,
      deadheadMiles: 150,
      ratePerMile: 2,
      fuelIndex: 3.0,
    });
    expect(result.subtotal).toBe(1550);
    expect(result.brokerageFeeRate).toBe(0.1);
    expect(result.carrierTotal).toBe(1395);
  });

  it('rounds each component to cents half-up before summing', () => {
    // 333 mi × $1.115 = 371.295 → 371.30 (half-up)
    // deadhead 3 mi × $1.115 × 0.5 = 1.6725 → 1.67
    const result = calculateRate({
      miles: 333,
      deadheadMiles: 3,
      ratePerMile: 1.115,
      fuelIndex: 3.0,
    });
    expect(result.linehaul).toBe(371.3);
    expect(result.deadheadPay).toBe(1.67);
    expect(result.subtotal).toBe(372.97);
  });
});

describe('roundToCents', () => {
  it('rounds half-up', () => {
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(1.004)).toBe(1.0);
  });
});
