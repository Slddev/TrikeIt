import { Linking } from 'react-native';

// Universal links: they open the app when it's installed and the website otherwise.
export function openInWaze(lng: number, lat: number) {
  return Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
}

export function openInGoogleMaps(lng: number, lat: number) {
  return Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
  );
}

export function call(phoneNumber: string) {
  return Linking.openURL(`tel:${phoneNumber}`);
}

/** Google Maps directions through every stop in order (Waze links only take one destination). */
export function openRouteInGoogleMaps(stops: { lng: number; lat: number }[]) {
  const destination = stops.at(-1);
  if (!destination) return;
  const waypoints = stops
    .slice(0, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join('|');
  return Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}` +
      `&travelmode=driving${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`
  );
}
