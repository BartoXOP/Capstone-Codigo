import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useRef } from 'react';

type LatLng = { latitude: number; longitude: number };

interface Props {
  accessToken?: string;
  driverLocation?: LatLng;
  simulatedPath?: LatLng[];
}

export default function MapboxDriver({ accessToken, driverLocation, simulatedPath }: Props) {
  const mapContainer = useRef(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!accessToken) {
      console.error('Mapbox token is required');
      return;
    }

    if (!mapContainer.current) return;

    mapboxgl.accessToken = accessToken;

    const initialLocation = {
      lng: driverLocation?.longitude || -70.6667,
      lat: driverLocation?.latitude || -33.45
    };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [initialLocation.lng, initialLocation.lat],
      zoom: 14
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [accessToken]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker');
    while (markers[0]) {
      markers[0].remove();
    }

    // Add new markers
    const route = simulatedPath || (driverLocation ? [driverLocation] : []);
    route.forEach(point => {
      new mapboxgl.Marker()
        .setLngLat([point.longitude, point.latitude])
        .addTo(map.current!);
    });
  }, [driverLocation, simulatedPath]);

  if (!accessToken) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>Error: Se requiere un token de Mapbox.</p>
        <p style={styles.errorSubtext}>Por favor, configura EXPO_PUBLIC_MAPBOX_TOKEN en el archivo .env</p>
      </div>
    );
  }

  return <div ref={mapContainer} style={styles.mapContainer} />;
}

const styles = {
  mapContainer: {
    height: '100%',
    width: '100%',
    borderRadius: '15px',
    overflow: 'hidden'
  },
  errorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f8d7da',
    height: '100%',
    borderRadius: '15px',
  },
  errorText: {
    fontSize: '16px',
    color: '#721c24',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  errorSubtext: {
    fontSize: '14px',
    color: '#721c24',
    opacity: 0.8,
    textAlign: 'center' as const,
  }
};