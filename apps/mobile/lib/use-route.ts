import { getRoute, type Route } from '@/lib/routing';
import type { LngLat } from '@maplibre/maplibre-react-native';
import * as React from 'react';

export type RouteState =
  | { status: 'idle' }
  | { status: 'loading' }
  // route is null when routing failed.
  | { status: 'done'; route: Route | null };

/** Road route through `stops` in order; idle with fewer than two stops. */
export function useRoute(stops: LngLat[] | null): RouteState {
  const key = stops && stops.length >= 2 ? stops.map((s) => s.join(',')).join(';') : null;
  const [found, setFound] = React.useState<{ key: string; route: Route | null } | null>(null);
  const fetchRoute = React.useEffectEvent((signal: AbortSignal) => getRoute(stops!, signal));

  React.useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetchRoute(controller.signal)
      .then((route) => setFound({ key, route }))
      .catch(() => !controller.signal.aborted && setFound({ key, route: null }));
    return () => controller.abort();
  }, [key]);

  if (!key) return { status: 'idle' };
  if (found?.key !== key) return { status: 'loading' };
  return { status: 'done', route: found.route };
}
