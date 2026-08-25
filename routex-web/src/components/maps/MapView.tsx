'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Locate, Maximize } from 'lucide-react';

// Fix for default Leaflet marker assets breaking in Next.js compilations
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom Premium Pulsing SVG Pins
const createPulsingIcon = (color: 'blue' | 'green' | 'red' | 'gold') => {
  const colors = {
    blue: '#2563eb',
    green: '#10b981',
    red: '#ef4444',
    gold: '#f59e0b',
  };
  const hex = colors[color] || colors.blue;
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute inline-flex h-8 w-8 rounded-full opacity-40 animate-ping" style="background-color: ${hex};"></span>
        <span class="relative inline-flex rounded-full h-4.5 w-4.5 border-2 border-white shadow-lg" style="background-color: ${hex};"></span>
      </div>
    `,
    className: 'custom-pulsing-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10],
  });
};

export interface MapMarker {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
  color?: 'blue' | 'green' | 'red' | 'gold';
  popupData?: {
    driverName?: string;
    truckNumber?: string;
    bookingRef?: string;
    status?: string;
    speed?: string;
    eta?: string;
  };
}

interface MapViewProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  pickupCoords?: [number, number];
  dropCoords?: [number, number];
  waypoints?: [number, number][];
  autoCenter?: boolean;
}

// Controller component to center and fit map bounds dynamically
function FitMapBounds({ bounds, center }: { bounds: L.LatLngBoundsExpression | null; center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [bounds, center, map]);

  return null;
}

export default function MapView({
  markers = [],
  center = [28.6139, 77.2090], // Default Delhi coordinates
  zoom = 12,
  pickupCoords,
  dropCoords,
  waypoints = [],
  autoCenter = false,
}: MapViewProps) {
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);

  // Fetch OSRM driving route polyline with network fallback
  useEffect(() => {
    if (!pickupCoords || !dropCoords) {
      setRoutePath([]);
      setMapBounds(null);
      return;
    }

    let isMounted = true;
    const fetchRoute = async () => {
      try {
        const [lat1, lng1] = pickupCoords;
        const [lat2, lng2] = dropCoords;
        
        let url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};`;
        if (waypoints && waypoints.length > 0) {
          waypoints.forEach(([lat, lng]) => {
            url += `${lng},${lat};`;
          });
        }
        url += `${lng2},${lat2}?overview=full&geometries=geojson`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, { signal: controller.signal }).catch(() => null);
        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates;
            // OSRM returns [lng, lat], map it to Leaflet [lat, lng]
            const path: [number, number][] = coords.map((c: number[]) => [c[1], c[0]]);
            setRoutePath(path);

            // Calculate bounds containing the route
            const bounds = L.latLngBounds(path);
            setMapBounds([
              [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
              [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
            ]);
            return;
          }
        }

        // Safe Fallback: Direct polyline connecting pickup, waypoints, and drop points
        const fallbackPath: [number, number][] = [pickupCoords, ...(waypoints || []), dropCoords];
        setRoutePath(fallbackPath);
        const bounds = L.latLngBounds(fallbackPath);
        setMapBounds([
          [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
          [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
        ]);
      } catch (err) {
        if (!isMounted) return;
        if (pickupCoords && dropCoords) {
          const fallbackPath: [number, number][] = [pickupCoords, ...(waypoints || []), dropCoords];
          setRoutePath(fallbackPath);
        }
      }
    };

    fetchRoute();

    return () => {
      isMounted = false;
    };
  }, [pickupCoords, dropCoords, waypoints]);

  // Recenter on active marker if autoCenter is toggled
  const getCenterCoordinates = (): [number, number] => {
    if (autoCenter && markers.length > 0) {
      return markers[0].position;
    }
    return center;
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-inner min-h-[300px]">
      <MapContainer
        center={getCenterCoordinates()}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic Bounds Controller */}
        <FitMapBounds bounds={mapBounds} center={getCenterCoordinates()} />

        {/* Draw Driving Route */}
        {routePath.length > 0 && <Polyline positions={routePath} color="#2563eb" weight={5} opacity={0.8} />}

        {/* Render Custom Pulsing Markers */}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={m.position}
            icon={createPulsingIcon(m.color || 'blue')}
          >
            <Popup>
              <div className="p-2 min-w-[200px] text-xs font-sans text-slate-800">
                <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1 mb-2">
                  {m.title}
                </h4>
                {m.description && <p className="mb-2 text-slate-500 font-semibold">{m.description}</p>}
                
                {m.popupData && (
                  <div className="space-y-1.5 font-semibold text-slate-600">
                    {m.popupData.driverName && (
                      <div className="flex justify-between">
                        <span>Driver:</span>
                        <span className="font-extrabold text-slate-800">{m.popupData.driverName}</span>
                      </div>
                    )}
                    {m.popupData.truckNumber && (
                      <div className="flex justify-between">
                        <span>Truck:</span>
                        <span className="font-extrabold text-slate-800">{m.popupData.truckNumber}</span>
                      </div>
                    )}
                    {m.popupData.bookingRef && (
                      <div className="flex justify-between">
                        <span>Ref:</span>
                        <span className="font-extrabold text-slate-800">{m.popupData.bookingRef}</span>
                      </div>
                    )}
                    {m.popupData.status && (
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-blue-50 text-blue-600 border border-blue-100">
                          {m.popupData.status}
                        </span>
                      </div>
                    )}
                    {m.popupData.speed && (
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span className="font-extrabold text-slate-800">{m.popupData.speed}</span>
                      </div>
                    )}
                    {m.popupData.eta && (
                      <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5 text-blue-600">
                        <span>Est. ETA:</span>
                        <span className="font-black">{m.popupData.eta}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Premium Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => {
            const container = document.querySelector('.leaflet-container');
            if (container) {
              if (!document.fullscreenElement) {
                container.requestFullscreen().catch((err) => console.error(err));
              } else {
                document.exitFullscreen();
              }
            }
          }}
          className="w-10 h-10 bg-white border border-slate-200 rounded-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition cursor-pointer text-slate-600"
          title="Fullscreen Mode"
        >
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}
