import { useEffect, useRef, useState, useMemo } from 'react';
import { Map, NavigationControl } from '@vis.gl/react-maplibre';
import { Source, Layer } from '@vis.gl/react-maplibre';
import * as topojson from 'topojson-client';
import type { Journey } from '../types/journey';
import 'maplibre-gl/dist/maplibre-gl.css';

export type BaseMapMode = 'liberty' | 'bright' | 'night';

type MapTone = 'light' | 'night';

const BASE_MAPS: Record<BaseMapMode, { styleUrl: string; shellClassName: string; tone: MapTone }> = {
  liberty: {
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    shellClassName: 'bg-[radial-gradient(circle_at_top,#ecfeff_0%,#dbeafe_42%,#bfdbfe_100%)]',
    tone: 'light',
  },
  bright: {
    styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    shellClassName: 'bg-[radial-gradient(circle_at_top,#f8fafc_0%,#e0f2fe_46%,#dbeafe_100%)]',
    tone: 'light',
  },
  night: {
    styleUrl: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    shellClassName: 'bg-[#020617]',
    tone: 'night',
  },
};

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
function buildWorldPaint(countries: string[], tone: MapTone): any {
  const names = countries.filter(c => c !== 'China');
  if (tone === 'night') {
    return {
      'fill-color': ['match', ['get', 'name'], names, '#22d3ee', '#020617'],
      'fill-opacity': ['match', ['get', 'name'], names, 0.34, 0.06],
    };
  }

  return {
    'fill-color': ['match', ['get', 'name'], names, '#14b8a6', '#ecfeff'],
    'fill-opacity': ['match', ['get', 'name'], names, 0.42, 0.05],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProvincePaint(provinces: string[], tone: MapTone): any {
  if (provinces.length === 0) return { 'fill-color': 'transparent', 'fill-opacity': 0 };

  if (tone === 'night') {
    return {
      'fill-color': ['match', ['get', 'name'], provinces, '#fbbf24', 'transparent'],
      'fill-opacity': ['match', ['get', 'name'], provinces, 0.56, 0],
    };
  }

  return {
    'fill-color': ['match', ['get', 'name'], provinces, '#f59e0b', 'transparent'],
    'fill-opacity': ['match', ['get', 'name'], provinces, 0.52, 0],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHighlightedCityNames(
  features: GeoJSON.Feature[],
  visitedCities: string[],
  visitedProvinceGeoNames: string[],
): string[] {
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

  return highlighted;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCityPaint(highlighted: string[], tone: MapTone): any {
  if (highlighted.length === 0) return { 'fill-color': 'transparent', 'fill-opacity': 0 };

  if (tone === 'night') {
    return {
      'fill-color': ['match', ['get', 'name'], highlighted, '#93c5fd', 'transparent'],
      'fill-opacity': ['match', ['get', 'name'], highlighted, 0.28, 0],
    };
  }

  return {
    'fill-color': ['match', ['get', 'name'], highlighted, '#f97316', 'transparent'],
    'fill-opacity': ['match', ['get', 'name'], highlighted, 0.58, 0],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCityGlowPaint(highlighted: string[], tone: MapTone): any {
  if (tone !== 'night' || highlighted.length === 0) {
    return {
      'line-color': 'transparent',
      'line-opacity': 0,
      'line-width': 0,
      'line-blur': 0,
    };
  }

  return {
    'line-color': ['match', ['get', 'name'], highlighted, '#67e8f9', 'transparent'],
    'line-opacity': ['match', ['get', 'name'], highlighted, 0.5, 0],
    'line-width': ['match', ['get', 'name'], highlighted, 2.2, 0],
    'line-blur': ['match', ['get', 'name'], highlighted, 1.3, 0],
  };
}

// ---- Component ----

interface Props {
  journeys: Journey[];
  baseMap?: BaseMapMode;
}

export default function TravelMap({ journeys, baseMap = 'liberty' }: Props) {
  const [worldData, setWorldData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cityData, setCityData] = useState<GeoJSON.FeatureCollection | null>(null);
  const cityLoadingRef = useRef(false);
  const mapTheme = BASE_MAPS[baseMap];
  const isNightMode = mapTheme.tone === 'night';

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

  const worldPaint = useMemo(() => buildWorldPaint(countries, mapTheme.tone), [countries, mapTheme.tone]);
  const provincePaint = useMemo(() => buildProvincePaint(provinces, mapTheme.tone), [provinces, mapTheme.tone]);
  const highlightedCityNames = useMemo(() => {
    if (!cityData) return [];
    return getHighlightedCityNames(cityData.features as GeoJSON.Feature[], cities, provinces);
  }, [cityData, cities, provinces]);
  const cityPaint = useMemo(() => {
    return buildCityPaint(highlightedCityNames, mapTheme.tone);
  }, [highlightedCityNames, mapTheme.tone]);
  const cityGlowPaint = useMemo(() => {
    return buildCityGlowPaint(highlightedCityNames, mapTheme.tone);
  }, [highlightedCityNames, mapTheme.tone]);

  return (
    <div className={`map-shell ${isNightMode ? 'map-shell--night' : 'map-shell--light'} ${mapTheme.shellClassName} w-full h-full`}>
      <Map
        initialViewState={{ longitude: 105, latitude: 35, zoom: 3.5 }}
        mapStyle={mapTheme.styleUrl}
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
              paint={{
                'line-color': isNightMode ? '#334155' : '#ffffff',
                'line-opacity': isNightMode ? 0.82 : 0.7,
                'line-width': isNightMode ? 0.6 : 0.55,
              }}
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
              paint={{
                'line-color': isNightMode ? '#334155' : '#475569',
                'line-opacity': isNightMode ? 0.58 : 0.36,
                'line-width': isNightMode ? 0.55 : 0.5,
              }}
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
              id="city-glow"
              type="line"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={cityGlowPaint as any}
            />
            <Layer
              id="city-border"
              type="line"
              paint={{
                'line-color': isNightMode ? '#475569' : '#64748b',
                'line-opacity': isNightMode ? 0.42 : 0.26,
                'line-width': isNightMode ? 0.4 : 0.35,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
