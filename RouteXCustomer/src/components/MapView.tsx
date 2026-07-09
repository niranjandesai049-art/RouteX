import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MapProps {
  driverLocation?: Coordinates | null;
  pickupLocation?: Coordinates | null;
  deliveryLocation?: Coordinates | null;
  waypoints?: Coordinates[] | null;
  showRoute?: boolean;
}

export function AppMapView({
  driverLocation,
  pickupLocation,
  deliveryLocation,
  waypoints = [],
  showRoute = false,
}: MapProps) {
  const mapRef = useRef<MapView>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);

  // Set initial coordinates defaulting to a fallback (e.g. Mumbai)
  const defaultCoords = {
    latitude: 19.076,
    longitude: 72.8777,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    // Fit map to show all active markers
    const coordinates: Coordinates[] = [];
    if (driverLocation) {
      coordinates.push(driverLocation);
    }
    if (pickupLocation) {
      coordinates.push(pickupLocation);
    }
    if (deliveryLocation) {
      coordinates.push(deliveryLocation);
    }
    if (waypoints && waypoints.length > 0) {
      coordinates.push(...waypoints);
    }

    if (coordinates.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [
    driverLocation,
    pickupLocation,
    deliveryLocation,
    waypoints,
    routeCoords,
  ]);

  useEffect(() => {
    if (showRoute && pickupLocation && deliveryLocation) {
      const fetchOSRMRoute = async () => {
        try {
          let routeUrl = `https://router.project-osrm.org/route/v1/driving/${pickupLocation.longitude},${pickupLocation.latitude};`;

          if (waypoints && waypoints.length > 0) {
            waypoints.forEach(wp => {
              routeUrl += `${wp.longitude},${wp.latitude};`;
            });
          }

          routeUrl += `${deliveryLocation.longitude},${deliveryLocation.latitude}?overview=full&geometries=geojson`;

          const res = await fetch(routeUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes[0]) {
              const coords = data.routes[0].geometry.coordinates;
              const mappedCoords = coords.map((c: number[]) => ({
                latitude: c[1],
                longitude: c[0],
              }));
              setRouteCoords(mappedCoords);
            }
          }
        } catch (e) {
          console.error('OSRM Route fetching error:', e);
        }
      };
      fetchOSRMRoute();
    } else {
      setRouteCoords([]);
    }
  }, [showRoute, pickupLocation, deliveryLocation, waypoints]);

  const initialRegion = driverLocation
    ? {
        ...driverLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : defaultCoords;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="Your Location"
            description="Active driver telemetry"
            pinColor="#2563EB"
          />
        )}
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Pickup Location"
            pinColor="#10B981"
          />
        )}
        {waypoints &&
          waypoints.map((wp, index) => (
            <Marker
              key={`wp-${index}`}
              coordinate={wp}
              title={`Stop ${index + 1}`}
              pinColor="#F59E0B"
            />
          ))}
        {deliveryLocation && (
          <Marker
            coordinate={deliveryLocation}
            title="Delivery Location"
            pinColor="#EF4444"
          />
        )}
        {showRoute && routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2563EB"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default AppMapView;
