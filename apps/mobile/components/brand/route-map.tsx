import { StopDot } from '@/components/brand/stop-dot';
import type { Stop } from '@/lib/booking';
import { MAP_STYLE } from '@/lib/map';
import type { Route } from '@/lib/routing';
import { cn } from '@/lib/utils';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  NativeUserLocation,
  type LngLat,
  type LngLatBounds,
} from '@maplibre/maplibre-react-native';
import { View } from 'react-native';

type MapStop = { coords: LngLat; stop: Stop };

/** The road route with a marker per stop (default: the route's start and end). */
export function RouteMap({
  route,
  stops,
  interactive = false,
  showUser = false,
  className = 'h-44 rounded-3xl',
}: {
  route: Route;
  stops?: MapStop[];
  interactive?: boolean;
  showUser?: boolean;
  className?: string;
}) {
  const start = route.line[0];
  const end = route.line[route.line.length - 1];
  const markers: MapStop[] = stops ?? [
    { coords: start, stop: 'pickup' },
    { coords: end, stop: 'dropoff' },
  ];

  return (
    <View className={cn('overflow-hidden', className)}>
      <Map
        // Remount per route so the camera re-fits instead of keeping the old view.
        key={`${start}-${end}-${route.line.length}`}
        style={{ flex: 1 }}
        mapStyle={MAP_STYLE}
        logo={false}
        compass={false}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        doubleTapHoldZoom={interactive}
        touchRotate={false}
        touchPitch={false}>
        <Camera
          initialViewState={{
            bounds: boundsOf([...route.line, ...markers.map((m) => m.coords)]),
            padding: { top: 40, right: 40, bottom: 40, left: 40 },
          }}
        />
        <GeoJSONSource
          data={{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route.line },
          }}>
          <Layer
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#0B0F3F', 'line-width': 5 }}
          />
        </GeoJSONSource>
        {markers.map((marker, i) => (
          <Marker key={i} lngLat={marker.coords}>
            <StopDot stop={marker.stop} />
          </Marker>
        ))}
        {showUser && <NativeUserLocation />}
      </Map>
    </View>
  );
}

function boundsOf(points: LngLat[]): LngLatBounds {
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}
