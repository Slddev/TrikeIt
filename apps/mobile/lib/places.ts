import type { LngLat } from '@maplibre/maplibre-react-native';

// Photon (https://photon.komoot.io) is a free OpenStreetMap geocoder with no API key.
// It asks for fair use, so callers debounce and cancel stale requests.
const PHOTON = 'https://photon.komoot.io';
const PH_BBOX = '116.9,4.5,126.7,21.2';

export type Place = {
  coords: LngLat;
  title: string;
  subtitle: string;
};

type PhotonFeature = {
  geometry: { coordinates: LngLat };
  properties: Record<string, string | undefined>;
};

function toPlace({ geometry, properties: p }: PhotonFeature): Place {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const title = p.name || street || p.locality || p.district || p.city || 'Pinned location';
  const subtitle = [title === street ? undefined : street, p.locality, p.district, p.city, p.state]
    .filter((part, i, all) => part && part !== title && all.indexOf(part) === i)
    .join(', ');
  return { coords: geometry.coordinates, title, subtitle };
}

async function photon(path: string, params: Record<string, string>, signal?: AbortSignal) {
  const res = await fetch(`${PHOTON}${path}?${new URLSearchParams(params)}`, { signal });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  const data: { features: PhotonFeature[] } = await res.json();
  return data.features.map(toPlace);
}

export function searchPlaces(query: string, near?: LngLat, signal?: AbortSignal) {
  return photon(
    '/api/',
    {
      q: query,
      limit: '8',
      bbox: PH_BBOX,
      ...(near && { lon: String(near[0]), lat: String(near[1]) }),
    },
    signal
  );
}

export async function reverseGeocode(coords: LngLat, signal?: AbortSignal): Promise<Place> {
  const [place] = await photon(
    '/reverse',
    { lon: String(coords[0]), lat: String(coords[1]), limit: '1' },
    signal
  );
  return place ? { ...place, coords } : { coords, title: 'Pinned location', subtitle: '' };
}

export function distanceKm([lon1, lat1]: LngLat, [lon2, lat2]: LngLat) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
