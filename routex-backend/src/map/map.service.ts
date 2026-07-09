import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MapService {
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org';
  private readonly osrmUrl = 'https://router.project-osrm.org';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Geocode an address using Nominatim (OpenStreetMap)
   */
  async geocode(
    address: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!address) return null;
    try {
      const url = `${this.nominatimUrl}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RouteX-Logistics-Platform/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = (await response.json()) as any[];
        if (data && data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
      }
    } catch (err: any) {
      console.error(`Nominatim geocoding failed for: ${address}`, err.message);
    }
    return null;
  }

  /**
   * Get route details (distance, duration, and geojson polyline) from OSRM
   */
  async getRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<{
    distanceKm: number;
    durationMin: number;
    geometry: any;
  } | null> {
    try {
      const url = `${this.osrmUrl}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.routes && data.routes[0]) {
          const route = data.routes[0];
          return {
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
            geometry: route.geometry,
          };
        }
      }
    } catch (err: any) {
      console.error(`OSRM routing failed:`, err.message);
    }
    return null;
  }

  /**
   * Calculate distance between two coordinates using PostGIS
   */
  async getPostGisDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): Promise<number> {
    try {
      const res = await this.prisma.$queryRaw<any[]>`
        SELECT ST_Distance(
          ST_SetSRID(ST_MakePoint(${lon1}, ${lat1}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lon2}, ${lat2}), 4326)::geography
        ) / 1000 AS distance_km
      `;
      if (res && res[0] && typeof res[0].distance_km !== 'undefined') {
        return Number(res[0].distance_km);
      }
    } catch (err: any) {
      console.error(
        'PostGIS ST_Distance query failed, falling back to Haversine:',
        err.message,
      );
    }

    // Fallback: Haversine Formula
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
