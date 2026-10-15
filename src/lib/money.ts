// Exact money calculations. All inputs and outputs are integer TZS; rates
// are integer basis points (1 bp = 0.01%, so 1000 bps = 10%). There is no
// floating-point arithmetic on money anywhere in this file.

export const BPS_DENOMINATOR = 10_000;
export const DEFAULT_COMMISSION_BPS = 1_000; // 10%

function assertWholeTzs(amount: number, label: string) {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError(`${label} must be a non-negative whole number of TZS (got ${amount})`);
  }
}

function assertBps(bps: number) {
  if (!Number.isInteger(bps) || bps < 0 || bps > BPS_DENOMINATOR) {
    throw new RangeError(`Commission rate must be 0–10000 basis points (got ${bps})`);
  }
}

/**
 * Commission on a merchandise amount, rounded half-up to the nearest
 * shilling using integer maths only.
 */
export function commissionFor(merchandiseTzs: number, rateBps: number): number {
  assertWholeTzs(merchandiseTzs, "Merchandise amount");
  assertBps(rateBps);
  return Math.floor((merchandiseTzs * rateBps + BPS_DENOMINATOR / 2) / BPS_DENOMINATOR);
}

export function formatBps(bps: number): string {
  const whole = Math.floor(bps / 100);
  const fraction = bps % 100;
  return fraction === 0 ? `${whole}%` : `${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}%`;
}

export interface MoneyLine {
  unitPriceTzs: number;
  quantity: number;
  commissionBps: number;
}

export function lineTotal(line: Pick<MoneyLine, "unitPriceTzs" | "quantity">): number {
  assertWholeTzs(line.unitPriceTzs, "Unit price");
  if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) throw new RangeError("Invalid quantity");
  return line.unitPriceTzs * line.quantity;
}

export interface Breakdown {
  merchandiseTzs: number;
  commissionTzs: number;
  sellerProceedsTzs: number;
}

/**
 * Merchandise subtotal, commission and seller proceeds for a set of lines.
 * Commission is calculated per line (each line may have its own rate) and
 * excludes delivery charges.
 */
export function breakdown(lines: MoneyLine[]): Breakdown {
  let merchandise = 0;
  let commission = 0;
  for (const line of lines) {
    const total = lineTotal(line);
    merchandise += total;
    commission += commissionFor(total, line.commissionBps);
  }
  return { merchandiseTzs: merchandise, commissionTzs: commission, sellerProceedsTzs: merchandise - commission };
}

export interface OrderTotals extends Breakdown {
  deliveryFeeTzs: number;
  customerTotalTzs: number;
}

export function orderTotals(lines: MoneyLine[], deliveryFeeTzs: number): OrderTotals {
  assertWholeTzs(deliveryFeeTzs, "Delivery fee");
  const b = breakdown(lines);
  return { ...b, deliveryFeeTzs, customerTotalTzs: b.merchandiseTzs + deliveryFeeTzs };
}

export interface RefundInput {
  /** Lines (or partial quantities) being refunded, at their original snapshot price and rate. */
  lines: MoneyLine[];
  /** Delivery fee portion to refund to the customer (0 if delivery was performed). */
  deliveryRefundTzs: number;
}

export interface RefundResult {
  /** Amount returned to the customer. */
  customerRefundTzs: number;
  /** Commission KARIAKOO gives back because the sale is reversed. */
  commissionReversedTzs: number;
  /** Amount deducted from the seller's proceeds. */
  sellerDeductionTzs: number;
  deliveryRefundTzs: number;
}

/**
 * Refunding merchandise reverses the sale: the customer gets the item price
 * back, the seller loses the proceeds and KARIAKOO reverses its commission.
 */
export function calculateRefund({ lines, deliveryRefundTzs }: RefundInput): RefundResult {
  assertWholeTzs(deliveryRefundTzs, "Delivery refund");
  const b = breakdown(lines);
  return {
    customerRefundTzs: b.merchandiseTzs + deliveryRefundTzs,
    commissionReversedTzs: b.commissionTzs,
    sellerDeductionTzs: b.sellerProceedsTzs,
    deliveryRefundTzs,
  };
}

export interface SettlementInput {
  /** Delivered fulfilment groups eligible for settlement. */
  deliveredLines: MoneyLine[];
  /** Seller deductions from refunds. */
  refundDeductionsTzs: number;
  /** Signed manual adjustments recorded by an admin (+ pays seller more). */
  adjustmentsTzs: number;
}

export interface SettlementResult extends Breakdown {
  refundDeductionsTzs: number;
  adjustmentsTzs: number;
  netPayableTzs: number;
}

export function calculateSettlement({ deliveredLines, refundDeductionsTzs, adjustmentsTzs }: SettlementInput): SettlementResult {
  assertWholeTzs(refundDeductionsTzs, "Refund deductions");
  if (!Number.isSafeInteger(adjustmentsTzs)) throw new RangeError("Adjustments must be whole TZS");
  const b = breakdown(deliveredLines);
  const net = b.sellerProceedsTzs - refundDeductionsTzs + adjustmentsTzs;
  return { ...b, refundDeductionsTzs, adjustmentsTzs, netPayableTzs: Math.max(0, net) };
}
