import { calculateRate, FUEL_INDEX_THRESHOLD } from '../../domain/rate';
import { formatMoney } from '../../lib/format';
import type { Load } from '../../shared/apiTypes';

export const RateBreakdown = ({ load }: { load: Load }) => {
  const rate = calculateRate(load);

  return (
    <section className="card">
      <h2>Rate breakdown</h2>
      <table className="rate-table">
        <tbody>
          <tr>
            <td>
              Linehaul — {load.miles.toLocaleString()} mi × {formatMoney(load.ratePerMile)}
            </td>
            <td>{formatMoney(rate.linehaul)}</td>
          </tr>
          <tr>
            <td>Deadhead — {load.deadheadMiles.toLocaleString()} mi at 50%</td>
            <td>{formatMoney(rate.deadheadPay)}</td>
          </tr>
          <tr>
            <td>
              Fuel surcharge{' '}
              {rate.fuelSurcharge === 0 &&
                `(none — fuel index ${load.fuelIndex} ≤ ${FUEL_INDEX_THRESHOLD})`}
            </td>
            <td>{formatMoney(rate.fuelSurcharge)}</td>
          </tr>
          <tr className="subtotal">
            <td>Subtotal</td>
            <td>{formatMoney(rate.subtotal)}</td>
          </tr>
          <tr>
            <td>Brokerage fee ({Math.round(rate.brokerageFeeRate * 100)}%)</td>
            <td>−{formatMoney(rate.brokerageFee)}</td>
          </tr>
          <tr className="total">
            <td>Carrier total</td>
            <td>{formatMoney(rate.carrierTotal)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
};
