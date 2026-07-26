const COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT || 20);

/**
 * Commission is computed first (floor); the worker gets the remainder,
 * so the two always sum to the price exactly with no rounding leak.
 */
export function splitPrice(pricePaise) {
  const commissionPaise = Math.floor((pricePaise * COMMISSION_PERCENT) / 100);
  const workerEarningPaise = pricePaise - commissionPaise;
  return { commissionPaise, workerEarningPaise };
}
