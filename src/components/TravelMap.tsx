import { useEffect, useRef, useState, useMemo } from 'react';
import { Map, NavigationControl } from '@vis.gl/react-maplibre';
import { Source, Layer } from '@vis.gl/react-maplibre';
import * as topojson from 'topojson-client';
import type { Journey } from '../data/travelConfig';
import 'maplibre-gl/dist/maplibre-gl.css';

// ---- Convert TopoJSON world-atlas to GeoJSON with antimeridian fix ----

function wrapCoordinates(geometry: GeoJSON.Geometry) {
  const wrapRing = (ring: number[][]) => {
    for (let i = 1; i < ring.length; i++) {
      const prevLng = ring[i - 1][0];
      const currLng = ring[i][0];
      if (Math.abs(currLng - prevLng) > 180) {
        ring[i][0] += currLng > prevLng ? -360 : 360;
      }
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = geometry as any;
  if (g.type === 'Polygon') g.coordinates.forEach(wrapRing);
  else if (g.type === 'MultiPolygon') g.coordinates.forEach((p: number[][][]) => p.forEach(wrapRing));
}

async function loadWorldGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch('/world-atlas.json');
  const topo = await res.json();
  const objectName = Object.keys(topo.objects)[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geojson = topojson.feature(topo, topo.objects[objectName]) as any as GeoJSON.FeatureCollection;
  geojson.features.forEach(f => { if (f.geometry) wrapCoordinates(f.geometry); });
  return geojson;
}

// ---- Derived highlight sets from journeys ----
// Highlight level is determined purely by location type:
//   type='country'  → highlight on world layer
//   type='province' → highlight on china-provinces layer
//   type='city'     → highlight on city-boundaries layer

function deriveHighlights(journeys: Journey[]) {
  const countries: string[] = [];
  const provinces: string[] = [];
  const cities: string[] = [];

  for (const journey of journeys) {
    for (const loc of (journey.locations ?? [])) {
      if (loc.type === 'country' && !countries.includes(loc.name)) {
        countries.push(loc.name);
      } else if (loc.type === 'province' && !provinces.includes(loc.name)) {
        provinces.push(loc.name);
      } else if (loc.type === 'city' && !cities.includes(loc.name)) {
        cities.push(loc.name);
      }
    }
  }

  return { countries, provinces, cities };
}

// ---- Paint builders ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildWorldPaint(countries: string[]): any {
  const names = countries.filter(c => c !== 'China');
  if (names.length === 0) return { 'fill-color': '#e5e7eb', 'fill-opacity': 0.3 };
  return {
    'fill-color': ['match', ['get', 'name'], names, '#4ade80', '#e5e7eb'],
    'fill-opacity': ['match', ['get', 'name'], names, 0.6, 0.3],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProvincePaint(provinces: string[]): any {
  if (provinces.length === 0) return { 'fill-color': 'transparent', 'fill-opacity': 0 };
  return {
    'fill-color': ['match', ['get', 'name'], provinces, '#facc15', 'transparent'],
    'fill-opacity': ['match', ['get', 'name'], provinces, 0.5, 0],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCityPaint(features: GeoJSON.Feature[], visitedCities: string[], visitedProvinceGeoNames: string[]): any {
  const highlighted: string[] = [];

  for (const f of features) {
    const { name, level, adcode, parent } = f.properties as {
      name: string; level: string; adcode: number; parent?: { adcode: number };
    };

    if (level === 'city') {
      if (visitedCities.includes(name)) highlighted.push(name);
    } else if (level === 'district') {
      // Districts of 直辖市 — highlight if that 直辖市 is visited as a province
      const provinceAdcode = parent?.adcode ?? Math.floor(adcode / 10000) * 10000;
      const provinceAdcodeMap: Record<number, string> = {
        110000: '北京市', 120000: '天津市', 310000: '上海市', 500000: '重庆市',
      };
      const geoName = provinceAdcodeMap[provinceAdcode];
      if (geoName && visitedProvinceGeoNames.includes(geoName)) {
        highlighted.push(name);
      }
    }
  }

  if (highlighted.length === 0) return { 'fill-color': 'transparent', 'fill-opacity': 0 };
  return {
    'fill-color': ['match', ['get', 'name'], highlighted, '#fb923c', 'transparent'],
    'fill-opacity': ['match', ['get', 'name'], highlighted, 0.55, 0],
  };
}

// ---- Component ----

interface Props {
  journeys: Journey[];
}

export default function TravelMap({ journeys }: Props) {
  const [worldData, setWorldData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cityData, setCityData] = useState<GeoJSON.FeatureCollection | null>(null);
  const cityLoadingRef = useRef(false);

  useEffect(() => {
    loadWorldGeoJSON().then(setWorldData).catch(console.error);
  }, []);

  const { countries, provinces, cities } = useMemo(() => deriveHighlights(journeys), [journeys]);

  const hasChinaContent = provinces.length > 0 || cities.length > 0;

  // Lazy-load city GeoJSON whenever there are city-type locations
  useEffect(() => {
    if (cities.length === 0 || cityData || cityLoadingRef.current) return;
    cityLoadingRef.current = true;
    fetch('/china-cities.json')
      .then(r => r.json())
      .then((data: GeoJSON.FeatureCollection) => setCityData(data))
      .catch(console.error)
      .finally(() => { cityLoadingRef.current = false; });
  }, [cities, cityData]);

  const worldPaint = useMemo(() => buildWorldPaint(countries), [countries]);
  const provincePaint = useMemo(() => buildProvincePaint(provinces), [provinces]);
  const cityPaint = useMemo(() => {
    if (!cityData) return null;
    return buildCityPaint(cityData.features as GeoJSON.Feature[], cities, provinces);
  }, [cityData, cities, provinces]);

  return (
    <div className="w-full h-full">
      <Map
        initialViewState={{ longitude: 105, latitude: 35, zoom: 3.5 }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '100%' }}
        minZoom={1.5}
      >
        <NavigationControl position="top-left" />

        {/* World countries — always shown, China excluded (handled by province layer) */}
        {worldData && (
          <Source id="world" type="geojson" data={worldData}>
            <Layer
              id="world-fill"
              type="fill"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={worldPaint as any}
              filter={['!=', ['get', 'name'], 'China']}
            />
            <Layer
              id="world-border"
              type="line"
              paint={{ 'line-color': '#ffffff', 'line-width': 0.5 }}
              filter={['!=', ['get', 'name'], 'China']}
            />
          </Source>
        )}

        {/* China provinces — shown whenever there's province or city content */}
        {hasChinaContent && (
          <Source id="china" type="geojson" data="/china-provinces.json">
            <Layer
              id="china-fill"
              type="fill"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={provincePaint as any}
            />
            <Layer
              id="china-border"
              type="line"
              paint={{ 'line-color': '#9ca3af', 'line-width': 0.5 }}
            />
          </Source>
        )}

        {/* City boundaries — shown when city-type locations exist */}
        {cities.length > 0 && cityData && cityPaint && (
          <Source id="city-boundaries" type="geojson" data={cityData}>
            <Layer
              id="city-fill"
              type="fill"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={cityPaint as any}
            />
            <Layer
              id="city-border"
              type="line"
              paint={{ 'line-color': '#d1d5db', 'line-width': 0.4 }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
