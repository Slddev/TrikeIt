import { StopDot } from '@/components/brand/stop-dot';
import { MAP_STYLE } from '@/lib/map';
import type { Route } from '@/lib/routing';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type LngLatBounds,
} from '@maplibre/maplibre-react-native';
import { View } from 'react-native';

export function RouteMap({ route }: { route: Route }) {
  const start = route.line[0];
  const end = route.line[route.line.length - 1];

  return (
    <View className="h-44 overflow-hidden rounded-3xl">
      <Map
        // Remount per route so the camera re-fits instead of keeping the old view.
        key={`${start}-${end}`}
        style={{ flex: 1 }}
        mapStyle={MAP_STYLE}
        logo={false}
        compass={false}
        dragPan={false}
        touchZoom={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        touchRotate={false}
        touchPitch={false}>
        <Camera
          initialViewState={{
            bounds: boundsOf(route.line),
            padding: { top: 32, right: 32, bottom: 32, left: 32 },
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
        <Marker lngLat={start}>
          <StopDot stop="pickup" />
        </Marker>
        <Marker lngLat={end}>
          <StopDot stop="dropoff" />
        </Marker>
      </Map>
    </View>
  );
}

function boundsOf(line: Route['line']): LngLatBounds {
  const lngs = line.map(([lng]) => lng);
  const lats = line.map(([, lat]) => lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}
