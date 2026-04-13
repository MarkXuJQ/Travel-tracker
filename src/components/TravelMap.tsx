import { useEffect, useMemo, useRef, useState } from 'react';
import { Map, NavigationControl, Source, Layer, type MapRef } from '@vis.gl/react-maplibre';
import * as topojson from 'topojson-client';
import { getCountryNameForLocation, getProvinceGeoNameByCityName, resolveJourneyLocationCoords } from '../data/locationData';
import type { Journey, JourneyLocation } from '../types/journey';
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
//   type='city'     → highlight city boundaries and auto-light its province

function deriveHighlights(journeys: Journey[]) {
  const countries = new Set<string>();
  const provinces = new Set<string>();
  const cities = new Set<string>();

  for (const journey of journeys) {
    for (const loc of (journey.locations ?? [])) {
      const countryName = getCountryNameForLocation(loc);
      if (countryName) countries.add(countryName);

      if (loc.type === 'province') {
        provinces.add(loc.name);
      } else if (loc.type === 'city') {
        cities.add(loc.name);
        const provinceGeoName = getProvinceGeoNameByCityName(loc.name);
        if (provinceGeoName) provinces.add(provinceGeoName);
      }
    }
  }

  return {
    countries: [...countries],
    provinces: [...provinces],
    cities: [...cities],
  };
}

// ---- Paint builders ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildWorldPaint(countries: string[], tone: MapTone, hiddenCountry?: string | null): any {
  const excludedCountry = hiddenCountry && hiddenCountry !== 'China' ? hiddenCountry : null;
  const names = countries.filter(country => country !== 'China' && country !== excludedCountry);

  if (tone === 'night') {
    return {
      'fill-color': excludedCountry
        ? ['case', ['==', ['get', 'name'], excludedCountry], 'transparent', ['match', ['get', 'name'], names, '#22d3ee', '#020617']]
        : ['match', ['get', 'name'], names, '#22d3ee', '#020617'],
      'fill-opacity': excludedCountry
        ? ['case', ['==', ['get', 'name'], excludedCountry], 0, ['match', ['get', 'name'], names, 0.34, 0.06]]
        : ['match', ['get', 'name'], names, 0.34, 0.06],
    };
  }

  return {
    'fill-color': excludedCountry
      ? ['case', ['==', ['get', 'name'], excludedCountry], 'transparent', ['match', ['get', 'name'], names, '#14b8a6', '#ecfeff']]
      : ['match', ['get', 'name'], names, '#14b8a6', '#ecfeff'],
    'fill-opacity': excludedCountry
      ? ['case', ['==', ['get', 'name'], excludedCountry], 0, ['match', ['get', 'name'], names, 0.42, 0.05]]
      : ['match', ['get', 'name'], names, 0.42, 0.05],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProvincePaint(provinces: string[], tone: MapTone): any {
  if (provinces.length === 0) return { 'fill-color': 'transparent', 'fill-opacity': 0 };

  if (tone === 'night') {
    return {
      'fill-color': ['match', ['get', 'name'], provinces, '#8dc8ff', 'transparent'],
      'fill-opacity': ['match', ['get', 'name'], provinces, 0.16, 0],
    };
  }

  return {
    'fill-color': ['match', ['get', 'name'], provinces, '#cdb79b', 'transparent'],
    'fill-opacity': ['match', ['get', 'name'], provinces, 0.24, 0],
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
  birthplace?: JourneyLocation | null;
  showProvinceHighlights?: boolean;
  baseMap?: BaseMapMode;
  selectedJourney?: Journey | null;
  panelOpen?: boolean;
}

interface RouteStop {
  label: string;
  type: Journey['locations'][number]['type'];
  coords: [number, number];
}

function resolveRouteStops(journey: Journey | null | undefined): RouteStop[] {
  if (!journey) return [];

  const resolvedStops = journey.locations
    .map(location => {
      const coords = resolveJourneyLocationCoords(location);
      if (!coords) return null;

      return {
        label: location.label,
        type: location.type,
        coords,
      };
    })
    .filter((stop): stop is RouteStop => stop !== null);

  const cityStops = resolvedStops.filter(stop => stop.type === 'city');
  const orderedStops = cityStops.length >= 2 ? cityStops : resolvedStops;

  return orderedStops.filter((stop, index, array) => {
    const previous = array[index - 1];
    if (!previous) return true;

    return previous.coords[0] !== stop.coords[0] || previous.coords[1] !== stop.coords[1];
  });
}

function createArcCoordinates(from: [number, number], to: [number, number], steps = 36): [number, number][] {
  const startLat = from[0];
  const startLng = from[1];
  const endLat = to[0];
  let endLng = to[1];

  if (endLng - startLng > 180) endLng -= 360;
  if (endLng - startLng < -180) endLng += 360;

  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return [[startLng, startLat], [endLng, endLat]];
  }

  const midpointLng = (startLng + endLng) / 2;
  const midpointLat = (startLat + endLat) / 2;
  const normalLng = -dy / distance;
  const normalLat = dx / distance;
  const offset = Math.min(Math.max(distance * 0.16, 0.8), 9);

  const controlA: [number, number] = [midpointLng + normalLng * offset, midpointLat + normalLat * offset];
  const controlB: [number, number] = [midpointLng - normalLng * offset, midpointLat - normalLat * offset];
  const control = controlA[1] >= controlB[1] ? controlA : controlB;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const inv = 1 - t;
    const lng = inv * inv * startLng + 2 * inv * t * control[0] + t * t * endLng;
    const lat = inv * inv * startLat + 2 * inv * t * control[1] + t * t * endLat;

    return [lng, lat];
  });
}

function buildSelectedJourneyGeoJSON(stops: RouteStop[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  stops.forEach((stop, index) => {
    features.push({
      type: 'Feature',
      properties: {
        kind: 'stop',
        order: index + 1,
        label: stop.label,
      },
      geometry: {
        type: 'Point',
        coordinates: [stop.coords[1], stop.coords[0]],
      },
    });

    const nextStop = stops[index + 1];
    if (!nextStop) return;

    features.push({
      type: 'Feature',
      properties: {
        kind: 'segment',
        order: index + 1,
      },
      geometry: {
        type: 'LineString',
        coordinates: createArcCoordinates(stop.coords, nextStop.coords),
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

function getRouteBounds(stops: RouteStop[]) {
  const lngs = stops.map(stop => stop.coords[1]);
  const lats = stops.map(stop => stop.coords[0]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngPadding = Math.max((maxLng - minLng) * 0.22, 3.5);
  const latPadding = Math.max((maxLat - minLat) * 0.22, 2.2);

  return {
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding,
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
  };
}

export default function TravelMap({
  journeys,
  birthplace = null,
  showProvinceHighlights = true,
  baseMap = 'liberty',
  selectedJourney = null,
  panelOpen = false,
}: Props) {
  const [worldData, setWorldData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cityData, setCityData] = useState<GeoJSON.FeatureCollection | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const cityLoadingRef = useRef(false);
  const mapTheme = BASE_MAPS[baseMap];
  const isNightMode = mapTheme.tone === 'night';

  useEffect(() => {
    loadWorldGeoJSON().then(setWorldData).catch(console.error);
  }, []);

  const { countries, provinces, cities } = useMemo(() => deriveHighlights(journeys), [journeys]);
  const birthplaceCountry = useMemo(
    () => (birthplace ? getCountryNameForLocation(birthplace) : null),
    [birthplace],
  );

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

  const worldPaint = useMemo(
    () => buildWorldPaint(countries, mapTheme.tone, birthplaceCountry),
    [birthplaceCountry, countries, mapTheme.tone],
  );
  const provincePaint = useMemo(
    () => (showProvinceHighlights ? buildProvincePaint(provinces, mapTheme.tone) : { 'fill-color': 'transparent', 'fill-opacity': 0 }),
    [mapTheme.tone, provinces, showProvinceHighlights],
  );
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
  const selectedRouteStops = useMemo(() => resolveRouteStops(selectedJourney), [selectedJourney]);
  const selectedRouteData = useMemo(() => {
    if (selectedRouteStops.length === 0) return null;
    return buildSelectedJourneyGeoJSON(selectedRouteStops);
  }, [selectedRouteStops]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || selectedRouteStops.length === 0) return;

    if (selectedRouteStops.length === 1) {
      const [lat, lng] = selectedRouteStops[0].coords;
      map.easeTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 5.6),
        duration: 900,
      });
      return;
    }

    const bounds = getRouteBounds(selectedRouteStops);
    map.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      {
        padding: {
          top: 88,
          bottom: 88,
          left: 88,
          right: panelOpen ? 460 : 100,
        },
        duration: 1000,
        maxZoom: 5.8,
      },
    );
  }, [panelOpen, selectedRouteStops]);

  const routeLineHaloPaint = isNightMode
    ? { 'line-color': '#22d3ee', 'line-opacity': 0.2, 'line-width': 6, 'line-blur': 2.1 }
    : { 'line-color': '#cbd5e1', 'line-opacity': 0.52, 'line-width': 4.5, 'line-blur': 1.2 };
  const routeLinePaint = isNightMode
    ? { 'line-color': '#93c5fd', 'line-opacity': 0.84, 'line-width': 2.15 }
    : { 'line-color': '#475569', 'line-opacity': 0.78, 'line-width': 1.95 };
  const routeStopHaloPaint = isNightMode
    ? { 'circle-color': '#67e8f9', 'circle-opacity': 0.24, 'circle-radius': 9.5 }
    : { 'circle-color': '#94a3b8', 'circle-opacity': 0.16, 'circle-radius': 7.5 };
  const routeStopPaint = isNightMode
    ? { 'circle-color': '#e0f2fe', 'circle-radius': 5, 'circle-stroke-color': '#67e8f9', 'circle-stroke-width': 1.6 }
    : { 'circle-color': '#ffffff', 'circle-radius': 4.8, 'circle-stroke-color': '#475569', 'circle-stroke-width': 1.5 };
  const routeOrderPaint = isNightMode ? { 'text-color': '#082f49' } : { 'text-color': '#334155' };

  return (
    <div className={`map-shell ${isNightMode ? 'map-shell--night' : 'map-shell--light'} ${mapTheme.shellClassName} w-full h-full`}>
      <Map
        ref={mapRef}
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

        {selectedRouteData && (
          <Source id="selected-journey-route" type="geojson" data={selectedRouteData}>
            <Layer
              id="selected-journey-route-halo"
              type="line"
              filter={['==', ['get', 'kind'], 'segment']}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={routeLineHaloPaint as any}
            />
            <Layer
              id="selected-journey-route-line"
              type="line"
              filter={['==', ['get', 'kind'], 'segment']}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={routeLinePaint as any}
            />
            <Layer
              id="selected-journey-route-stop-halo"
              type="circle"
              filter={['==', ['get', 'kind'], 'stop']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={routeStopHaloPaint as any}
            />
            <Layer
              id="selected-journey-route-stop"
              type="circle"
              filter={['==', ['get', 'kind'], 'stop']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={routeStopPaint as any}
            />
            <Layer
              id="selected-journey-route-order"
              type="symbol"
              filter={['==', ['get', 'kind'], 'stop']}
              layout={{
                'text-field': ['to-string', ['get', 'order']],
                'text-size': 10,
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-allow-overlap': true,
                'text-ignore-placement': true,
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={routeOrderPaint as any}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
