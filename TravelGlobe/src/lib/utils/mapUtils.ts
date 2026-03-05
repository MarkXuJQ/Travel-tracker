import * as topojson from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';

export async function loadWorldData(url: string): Promise<FeatureCollection<Geometry, { name: string }>> {
  const response = await fetch(url);
  const data = await response.json();
  
  // Check if it's TopoJSON and convert to GeoJSON
  if (data.type === 'Topology') {
    const objectName = Object.keys(data.objects)[0];
    const geojson = topojson.feature(data, data.objects[objectName]) as any;
    
    // Fix antimeridian issues for features like Russia and Fiji
    if (geojson.features) {
      geojson.features.forEach((feature: any) => {
        if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
          wrapCoordinates(feature.geometry);
        }
      });
    }
    return geojson;
  }
  
  return data;
}

/**
 * Helper to wrap coordinates that cross the antimeridian to prevent horizontal lines.
 * It ensures that consecutive points in a ring don't jump more than 180 degrees.
 */
function wrapCoordinates(geometry: any) {
  const wrapRing = (ring: any[]) => {
    for (let i = 1; i < ring.length; i++) {
      let prevLng = ring[i - 1][0];
      let currLng = ring[i][0];
      
      if (Math.abs(currLng - prevLng) > 180) {
        if (currLng > prevLng) {
          ring[i][0] -= 360;
        } else {
          ring[i][0] += 360;
        }
      }
    }
  };

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(wrapRing);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon: any[]) => {
      polygon.forEach(wrapRing);
    });
  }
}

