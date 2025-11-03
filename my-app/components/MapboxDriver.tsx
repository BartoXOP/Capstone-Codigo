import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Platform, Image, Text, StyleSheet } from 'react-native';

type LatLng = { latitude: number; longitude: number };

interface Props {
  accessToken?: string;
  driverLocation?: LatLng;
  simulatedPath?: LatLng[];
}

// This component provides a unified Mapbox experience:
// - On web it uses `react-map-gl` (Mapbox GL JS)
// - On native it uses `@rnmapbox/maps` (requires prebuild / EAS and native install)
// If Mapbox is not configured or not available it falls back to a static image.
export default function MapboxDriver({ accessToken, driverLocation, simulatedPath }: Props) {
  const isWeb = (Platform as any).OS === 'web';
  const [WebMap, setWebMap] = useState<any>(null);
  const [RNMap, setRNMap] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    if (isWeb) {
      import('react-map-gl').then((mod) => {
        if (mounted) setWebMap(mod);
      }).catch(() => {
        /* ignore */
      });
    } else {
      // native: load @rnmapbox/maps dynamically (must be installed natively)
      import('@rnmapbox/maps').then((mod) => {
        if (mounted) setRNMap(mod);
      }).catch(() => {
        /* ignore */
      });
    }
    return () => { mounted = false; };
  }, [isWeb]);

  const initial = useMemo(() => {
    const p = driverLocation || (simulatedPath && simulatedPath[0]) || { latitude: -33.45, longitude: -70.6667 };
    return { latitude: p.latitude, longitude: p.longitude, zoom: 14 };
  }, [driverLocation, simulatedPath]);

  // Web renderer
  if (isWeb) {
    if (!accessToken) {
      return (
        <View style={styles.container}>
          <Text style={{ padding: 12 }}>Mapbox token missing. Provide accessToken prop or env variable.</Text>
          <Image source={require('@/assets/images/mapa-img.jpg')} style={styles.map} resizeMode="cover" />
        </View>
      );
    }

    if (!WebMap) {
      return (
        <View style={styles.centered}><ActivityIndicator /></View>
      );
    }

    const Map = WebMap.Map || WebMap.default || WebMap;
    const Marker = ({ lat, lng }: { lat: number; lng: number }) => (
      <div style={{ transform: 'translate(-50%, -50%)' }}>
        <svg width="36" height="36" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6" fill="#1dbb7f" opacity="0.18"/><path d="M12 2 L15 11 L12 14 L9 11 Z" fill="#fff"/></svg>
      </div>
    );

    const route = simulatedPath || (driverLocation ? [driverLocation] : []);

    return (
      // react-map-gl expects DOM usage; this file will run on web only
      <div style={{ width: '100%', height: '100%' }}>
        <Map
          initialViewState={{ longitude: initial.longitude, latitude: initial.latitude, zoom: initial.zoom }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v10"
          mapboxAccessToken={accessToken}
        >
          {route.map((pt, i) => (
            <WebMap.Marker key={i} longitude={pt.longitude} latitude={pt.latitude} anchor="center">
              <Marker lat={pt.latitude} lng={pt.longitude} />
            </WebMap.Marker>
          ))}
          {/* For a full route polyline you could add a Source/Layer here using Mapbox GL JS APIs */}
        </Map>
      </div>
    );
  }

  // Native renderer (requires @rnmapbox/maps installed and native setup)
  if (!RNMap) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const MapView = RNMap.MapView || RNMap.default?.MapView || RNMap.MapboxGL?.MapView || RNMap.default;
  const PointAnnotation = RNMap.PointAnnotation || RNMap.default?.PointAnnotation || RNMap.MapboxGL?.PointAnnotation;
  const ShapeSource = RNMap.ShapeSource || RNMap.default?.ShapeSource || RNMap.MapboxGL?.ShapeSource;
  const LineLayer = RNMap.LineLayer || RNMap.default?.LineLayer || RNMap.MapboxGL?.LineLayer;

  const coordinates = (simulatedPath && simulatedPath.map(p => [p.longitude, p.latitude])) || (driverLocation ? [[driverLocation.longitude, driverLocation.latitude]] : []);

  // Provide token to native module (you must still follow installation steps in README)
  try {
    if (RNMap && RNMap.setAccessToken && accessToken) RNMap.setAccessToken(accessToken);
  } catch (e) {
    // noop
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} styleURL={RNMap.StyleURL.Dark} zoomLevel={14} centerCoordinate={[initial.longitude, initial.latitude]}>
        {coordinates.length > 1 && ShapeSource ? (
          <ShapeSource id="route" shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates } }}>
            <LineLayer id="routeLine" style={{ lineColor: '#1dbb7f', lineWidth: 4 }} />
          </ShapeSource>
        ) : null}

        {coordinates.length > 0 && PointAnnotation ? (
          <PointAnnotation id="driver" coordinate={coordinates[0]}>
            <View style={styles.markerOuter}><View style={styles.markerCircle} /></View>
          </PointAnnotation>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markerOuter: { alignItems: 'center', justifyContent: 'center' },
  markerCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1dbb7f', borderWidth: 2, borderColor: '#fff' },
});
