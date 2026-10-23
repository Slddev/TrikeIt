// Keep in sync with apps/mobile/lib/fare.ts.
// Demo fare: ₱12 for the first km, then ₱12 for each succeeding km or fraction of one. In
// production this is replaced by each TODA's official fare matrix.
// A trike has 4 slots; a special trip books all of them, so it costs 4x the regular fare.
export const TRIP_CAPACITY = 4;
const REGULAR_FIRST_KM = 12;
const REGULAR_PER_SUCCEEDING_KM = 12;

/** Fare in pesos for one slot over a road distance. */
export function slotFare(km: number) {
  return REGULAR_FIRST_KM + REGULAR_PER_SUCCEEDING_KM * Math.max(0, Math.ceil(km - 1));
}
