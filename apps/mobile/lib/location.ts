import * as Location from 'expo-location';
import * as React from 'react';

export type Coords = { lng: number; lat: number };

let lastKnown: Coords | null = null;

/** The latest position from useWatchedLocation, for code that runs outside render (e.g. polling). */
export function lastKnownLocation() {
  return lastKnown;
}

/** The device's position now, asking for permission if needed. Throws a readable error. */
export async function currentLocation(): Promise<Coords> {
  let { granted } = await Location.getForegroundPermissionsAsync();
  if (!granted) ({ granted } = await Location.requestForegroundPermissionsAsync());
  if (!granted) throw new Error('Allow location access so we can confirm where you are.');
  // A fix from the last minute is good enough and returns instantly; a fresh one can take a
  // while indoors, so it gets a deadline instead of leaving the caller waiting forever.
  const recent = await Location.getLastKnownPositionAsync({
    maxAge: 60_000,
    requiredAccuracy: 100,
  });
  const position =
    recent ??
    (await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("Couldn't get your location. Check that GPS is on and try again.")),
          15_000
        )
      ),
    ]));
  return { lng: position.coords.longitude, lat: position.coords.latitude };
}

/** Follows the device's position while `enabled` (permission must already be granted). */
export function useWatchedLocation(enabled: boolean) {
  const [coords, setCoords] = React.useState<Coords | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.getForegroundPermissionsAsync().then(({ granted }) => {
      if (!granted || cancelled) return;
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10_000 },
        ({ coords: c }) => {
          lastKnown = { lng: c.longitude, lat: c.latitude };
          setCoords(lastKnown);
        }
      ).then((sub) => (cancelled ? sub.remove() : (subscription = sub)));
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return enabled ? coords : null;
}
