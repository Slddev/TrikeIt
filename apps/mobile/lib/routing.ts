import type { LngLat } from '@maplibre/maplibre-react-native';

// OSRM's public demo server: free road routing on OpenStreetMap data, no API key.
// It's limited to about 1 request per second and isn't meant for production traffic;
// switch to a self-hosted OSRM (same API) before launch.
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

export type Route = {
  km: number;
  minutes: number;
  line: LngLat[];
};

/** Road route through `stops` in order (at least two). */
export async function getRoute(stops: LngLat[], signal?: AbortSignal): Promise<Route> {
  const coords = stops.map((stop) => stop.join(',')).join(';');
  const res = await fetch(`${OSRM}/${coords}?overview=full&geometries=geojson`, { signal });
  const data = await res.json();
  if (!res.ok || data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`No route found (${data.code ?? res.status})`);
  }
  const [route] = data.routes;
  return {
    km: route.distance / 1000,
    minutes: Math.max(1, Math.round(route.duration / 60)),
    line: route.geometry.coordinates,
  };
}
