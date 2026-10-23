import "server-only";

export type LngLat = [lng: number, lat: number];

/** Straight-line distance in km (haversine). */
export function distanceKm([lon1, lat1]: LngLat, [lon2, lat2]: LngLat) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// OSRM's public demo server; switch to a self-hosted OSRM (same API) before launch.
const OSRM = "https://router.project-osrm.org/route/v1/driving";

/** Road distance in km through `points` in order, or the straight-line distance if routing is unavailable. */
export async function roadDistanceKm(points: LngLat[]) {
  try {
    const res = await fetch(`${OSRM}/${points.map((p) => p.join(",")).join(";")}?overview=false`, {
      signal: AbortSignal.timeout(8_000),
    });
    const data = await res.json();
    if (res.ok && data.code === "Ok" && data.routes?.length) return data.routes[0].distance / 1000;
  } catch {}
  return points.slice(1).reduce((km, point, i) => km + distanceKm(points[i], point), 0);
}
