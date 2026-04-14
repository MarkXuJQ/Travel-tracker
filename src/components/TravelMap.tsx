import { useEffect, useMemo, useRef, useState } from 'react';
import { Map, NavigationControl, Source, Layer, type MapRef } from '@vis.gl/react-maplibre';
import * as topojson from 'topojson-client';
import type { MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
import {
  getCountryNameForLocation,
  getLocationLabel,
  getProvinceGeoNameByCityName,
  resolveJourneyLocationCoords,
} from '../data/locationData';
import type { Journey, JourneyLocation, JourneyRecordFilter } from '../types/journey';
import 'maplibre-gl/dist/maplibre-gl.css';

export type BaseMapMode = 'liberty' | 'bright' | 'night';

type MapTone = 'light' | 'night';

const DIRECT_MUNICIPALITY_PROVINCE_GEO_NAME_BY_ADCODE: Record<number, string> = {
  110000: '北京市',
  120000: '天津市',
  310000: '上海市',
  500000: '重庆市',
};

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
  const hasHighlights = names.length > 0;

  if (tone === 'night') {
    if (!hasHighlights) {
      return excludedCountry
        ? {
            'fill-color': ['case', ['==', ['get', 'name'], excludedCountry], 'transparent', '#020617'],
            'fill-opacity': ['case', ['==', ['get', 'name'], excludedCountry], 0, 0.06],
          }
        : {
            'fill-color': '#020617',
            'fill-opacity': 0.06,
          };
    }

    return {
      'fill-color': excludedCountry
        ? ['case', ['==', ['get', 'name'], excludedCountry], 'transparent', ['match', ['get', 'name'], names, '#22d3ee', '#020617']]
        : ['match', ['get', 'name'], names, '#22d3ee', '#020617'],
      'fill-opacity': excludedCountry
        ? ['case', ['==', ['get', 'name'], excludedCountry], 0, ['match', ['get', 'name'], names, 0.34, 0.06]]
        : ['match', ['get', 'name'], names, 0.34, 0.06],
    };
  }

  if (!hasHighlights) {
    return excludedCountry
      ? {
          'fill-color': ['case', ['==', ['get', 'name'], excludedCountry], 'transparent', '#ecfeff'],
          'fill-opacity': ['case', ['==', ['get', 'name'], excludedCountry], 0, 0.05],
        }
      : {
          'fill-color': '#ecfeff',
          'fill-opacity': 0.05,
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
      const geoName = DIRECT_MUNICIPALITY_PROVINCE_GEO_NAME_BY_ADCODE[provinceAdcode];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSelectedCityPaint(highlighted: string[], tone: MapTone): any {
  if (highlighted.length === 0) return { 'fill-color': 'transparent', 'fill-opacity': 0 };

  if (tone === 'night') {
    return {
      'fill-color': ['match', ['get', 'name'], highlighted, '#d8f3ff', 'transparent'],
      'fill-opacity': ['match', ['get', 'name'], highlighted, 0.34, 0],
    };
  }

  return {
    'fill-color': ['match', ['get', 'name'], highlighted, '#fff3db', 'transparent'],
    'fill-opacity': ['match', ['get', 'name'], highlighted, 0.82, 0],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSelectedCityHaloPaint(highlighted: string[], tone: MapTone): any {
  if (highlighted.length === 0) {
    return {
      'line-color': 'transparent',
      'line-opacity': 0,
      'line-width': 0,
      'line-blur': 0,
    };
  }

  if (tone === 'night') {
    return {
      'line-color': ['match', ['get', 'name'], highlighted, '#7dd3fc', 'transparent'],
      'line-opacity': ['match', ['get', 'name'], highlighted, 0.72, 0],
      'line-width': ['match', ['get', 'name'], highlighted, 4.2, 0],
      'line-blur': ['match', ['get', 'name'], highlighted, 2.6, 0],
    };
  }

  return {
    'line-color': ['match', ['get', 'name'], highlighted, '#f59e0b', 'transparent'],
    'line-opacity': ['match', ['get', 'name'], highlighted, 0.34, 0],
    'line-width': ['match', ['get', 'name'], highlighted, 5.2, 0],
    'line-blur': ['match', ['get', 'name'], highlighted, 2.2, 0],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSelectedCityBorderPaint(highlighted: string[], tone: MapTone): any {
  if (highlighted.length === 0) {
    return {
      'line-color': 'transparent',
      'line-opacity': 0,
      'line-width': 0,
    };
  }

  if (tone === 'night') {
    return {
      'line-color': ['match', ['get', 'name'], highlighted, '#e0f2fe', 'transparent'],
      'line-opacity': ['match', ['get', 'name'], highlighted, 0.98, 0],
      'line-width': ['match', ['get', 'name'], highlighted, 1.65, 0],
    };
  }

  return {
    'line-color': ['match', ['get', 'name'], highlighted, '#92400e', 'transparent'],
    'line-opacity': ['match', ['get', 'name'], highlighted, 0.95, 0],
    'line-width': ['match', ['get', 'name'], highlighted, 1.55, 0],
  };
}

// ---- Component ----

interface Props {
  journeys: Journey[];
  birthplace?: JourneyLocation | null;
  showProvinceHighlights?: boolean;
  baseMap?: BaseMapMode;
  enableLocationSelection?: boolean;
  selectedJourney?: Journey | null;
  selectedProvinceName?: string | null;
  selectionMode?: 'records' | 'province-stats';
  panelOpen?: boolean;
  onVisitedLocationSelect?: (filter: JourneyRecordFilter) => void;
  onProvinceSelect?: (provinceName: string) => void;
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

function getProvinceGeoNameFromCityFeature(feature: MapGeoJSONFeature) {
  const adcode = typeof feature.properties?.adcode === 'number' ? feature.properties.adcode : null;
  const parentAdcode = typeof feature.properties?.parent?.adcode === 'number' ? feature.properties.parent.adcode : null;
  const provinceAdcode = parentAdcode ?? (adcode === null ? null : Math.floor(adcode / 10000) * 10000);

  if (provinceAdcode === null) return null;
  return DIRECT_MUNICIPALITY_PROVINCE_GEO_NAME_BY_ADCODE[provinceAdcode] ?? null;
}

function walkGeometryCoordinates(
  coordinates: GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][],
  visit: (lng: number, lat: number) => void,
) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return;

  if (typeof coordinates[0] === 'number') {
    visit(coordinates[0] as number, coordinates[1] as number);
    return;
  }

  (coordinates as Array<GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][]>).forEach(child => {
    walkGeometryCoordinates(child as GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][], visit);
  });
}

function getFeatureBounds(feature: GeoJSON.Feature): [[number, number], [number, number]] | null {
  if (!feature.geometry) return null;

  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  const visit = (lng: number, lat: number) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  };

  if (feature.geometry.type === 'GeometryCollection') {
    feature.geometry.geometries.forEach(geometry => {
      if ('coordinates' in geometry) {
        walkGeometryCoordinates(
          geometry.coordinates as GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][],
          visit,
        );
      }
    });
  } else {
    walkGeometryCoordinates(
      feature.geometry.coordinates as GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][],
      visit,
    );
  }

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    return null;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function resolveProvinceSelectionFromFeatures(features: MapGeoJSONFeature[] | undefined): string | null {
  if (!features || features.length === 0) return null;

  const orderedFeatures = [...features].sort((left, right) => {
    const rank = (feature: MapGeoJSONFeature) => {
      if (feature.layer.id === 'city-fill') return 0;
      if (feature.layer.id === 'china-fill') return 1;
      return 2;
    };

    return rank(left) - rank(right);
  });

  for (const feature of orderedFeatures) {
    const rawName = feature.properties?.name;
    if (typeof rawName !== 'string') continue;

    if (feature.layer.id === 'city-fill') {
      return getProvinceGeoNameByCityName(rawName) ?? getProvinceGeoNameFromCityFeature(feature);
    }

    if (feature.layer.id === 'china-fill') {
      return rawName;
    }
  }

  return null;
}

function resolveVisitedLocationFilterFromFeatures(
  features: MapGeoJSONFeature[] | undefined,
  visitedCountries: Set<string>,
  visitedProvinces: Set<string>,
  visitedCities: Set<string>,
): JourneyRecordFilter | null {
  if (!features || features.length === 0) return null;

  const orderedFeatures = [...features].sort((left, right) => {
    const rank = (feature: MapGeoJSONFeature) => {
      if (feature.layer.id === 'city-fill') return 0;
      if (feature.layer.id === 'china-fill') return 1;
      if (feature.layer.id === 'world-fill') return 2;
      return 3;
    };

    return rank(left) - rank(right);
  });

  for (const feature of orderedFeatures) {
    const rawName = feature.properties?.name;
    if (typeof rawName !== 'string') continue;

    if (feature.layer.id === 'city-fill') {
      const level = typeof feature.properties?.level === 'string' ? feature.properties.level : null;

      if (visitedCities.has(rawName)) {
        return {
          type: 'city',
          name: rawName,
          label: getLocationLabel('city', rawName) ?? rawName,
        };
      }

      if (level === 'district') {
        const provinceGeoName = getProvinceGeoNameFromCityFeature(feature);
        if (provinceGeoName && visitedProvinces.has(provinceGeoName)) {
          return {
            type: 'province',
            name: provinceGeoName,
            label: getLocationLabel('province', provinceGeoName) ?? rawName,
          };
        }
      }
    }

    if (feature.layer.id === 'china-fill' && visitedProvinces.has(rawName)) {
      return {
        type: 'province',
        name: rawName,
        label: getLocationLabel('province', rawName) ?? rawName,
      };
    }

    if (feature.layer.id === 'world-fill' && visitedCountries.has(rawName)) {
      return {
        type: 'country',
        name: rawName,
        label: getLocationLabel('country', rawName) ?? rawName,
      };
    }
  }

  return null;
}

export default function TravelMap({
  journeys,
  birthplace = null,
  showProvinceHighlights = true,
  baseMap = 'liberty',
  enableLocationSelection = true,
  selectedJourney = null,
  selectedProvinceName = null,
  selectionMode = 'province-stats',
  panelOpen = false,
  onVisitedLocationSelect,
  onProvinceSelect,
}: Props) {
  const [worldData, setWorldData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [chinaProvinceData, setChinaProvinceData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cityData, setCityData] = useState<GeoJSON.FeatureCollection | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const cityLoadingRef = useRef(false);
  const lastAutoFocusedJourneyIdRef = useRef<string | null>(null);
  const mapTheme = BASE_MAPS[baseMap];
  const isNightMode = mapTheme.tone === 'night';

  useEffect(() => {
    loadWorldGeoJSON().then(setWorldData).catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/china-provinces.json')
      .then(r => r.json())
      .then((data: GeoJSON.FeatureCollection) => setChinaProvinceData(data))
      .catch(console.error);
  }, []);

  const { countries, provinces, cities } = useMemo(() => deriveHighlights(journeys), [journeys]);
  const visitedCountrySet = useMemo(() => new Set(countries), [countries]);
  const visitedProvinceSet = useMemo(() => new Set(provinces), [provinces]);
  const visitedCitySet = useMemo(() => new Set(cities), [cities]);
  const birthplaceCountry = useMemo(
    () => (birthplace ? getCountryNameForLocation(birthplace) : null),
    [birthplace],
  );

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
  const selectedProvinceFillPaint = useMemo(() => {
    if (!selectedProvinceName) {
      return { 'fill-color': 'transparent', 'fill-opacity': 0 };
    }

    if (mapTheme.tone === 'night') {
      return {
        'fill-color': ['match', ['get', 'name'], [selectedProvinceName], '#b5e8fb', 'transparent'],
        'fill-opacity': ['match', ['get', 'name'], [selectedProvinceName], 0.16, 0],
      };
    }

    return {
      'fill-color': ['match', ['get', 'name'], [selectedProvinceName], '#e8dcc6', 'transparent'],
      'fill-opacity': ['match', ['get', 'name'], [selectedProvinceName], 0.46, 0],
    };
  }, [mapTheme.tone, selectedProvinceName]);
  const selectedProvinceBorderPaint = useMemo(() => {
    if (!selectedProvinceName) {
      return { 'line-color': 'transparent', 'line-opacity': 0, 'line-width': 0 };
    }

    if (mapTheme.tone === 'night') {
      return {
        'line-color': ['match', ['get', 'name'], [selectedProvinceName], '#67e8f9', 'transparent'],
        'line-opacity': ['match', ['get', 'name'], [selectedProvinceName], 0.92, 0],
        'line-width': ['match', ['get', 'name'], [selectedProvinceName], 1.35, 0],
      };
    }

    return {
      'line-color': ['match', ['get', 'name'], [selectedProvinceName], '#2f2419', 'transparent'],
      'line-opacity': ['match', ['get', 'name'], [selectedProvinceName], 0.82, 0],
      'line-width': ['match', ['get', 'name'], [selectedProvinceName], 1.1, 0],
    };
  }, [mapTheme.tone, selectedProvinceName]);
  const highlightedCityNames = useMemo(() => {
    if (!cityData) return [];
    return getHighlightedCityNames(cityData.features as GeoJSON.Feature[], cities, provinces);
  }, [cityData, cities, provinces]);
  const selectedJourneyHighlights = useMemo(
    () => deriveHighlights(selectedJourney ? [selectedJourney] : []),
    [selectedJourney],
  );
  const selectedJourneyCityNames = useMemo(() => {
    if (!cityData) return [];

    return getHighlightedCityNames(
      cityData.features as GeoJSON.Feature[],
      selectedJourneyHighlights.cities,
      selectedJourneyHighlights.provinces,
    );
  }, [cityData, selectedJourneyHighlights.cities, selectedJourneyHighlights.provinces]);
  const cityPaint = useMemo(() => {
    return buildCityPaint(highlightedCityNames, mapTheme.tone);
  }, [highlightedCityNames, mapTheme.tone]);
  const cityGlowPaint = useMemo(() => {
    return buildCityGlowPaint(highlightedCityNames, mapTheme.tone);
  }, [highlightedCityNames, mapTheme.tone]);
  const selectedCityPaint = useMemo(() => {
    return buildSelectedCityPaint(selectedJourneyCityNames, mapTheme.tone);
  }, [mapTheme.tone, selectedJourneyCityNames]);
  const selectedCityHaloPaint = useMemo(() => {
    return buildSelectedCityHaloPaint(selectedJourneyCityNames, mapTheme.tone);
  }, [mapTheme.tone, selectedJourneyCityNames]);
  const selectedCityBorderPaint = useMemo(() => {
    return buildSelectedCityBorderPaint(selectedJourneyCityNames, mapTheme.tone);
  }, [mapTheme.tone, selectedJourneyCityNames]);
  const selectedJourneyId = selectedJourney?.id ?? null;
  const selectedRouteStops = useMemo(() => resolveRouteStops(selectedJourney), [selectedJourney]);
  const selectedRouteData = useMemo(() => {
    if (selectedRouteStops.length === 0) return null;
    return buildSelectedJourneyGeoJSON(selectedRouteStops);
  }, [selectedRouteStops]);

  useEffect(() => {
    if (!selectedJourneyId) {
      lastAutoFocusedJourneyIdRef.current = null;
      return;
    }

    if (lastAutoFocusedJourneyIdRef.current === selectedJourneyId) return;

    const map = mapRef.current?.getMap();
    if (!map || selectedRouteStops.length === 0) return;
    lastAutoFocusedJourneyIdRef.current = selectedJourneyId;

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
  }, [panelOpen, selectedJourneyId, selectedRouteStops]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !selectedProvinceName || !chinaProvinceData) return;

    const selectedFeature = chinaProvinceData.features.find(feature => feature.properties?.name === selectedProvinceName);
    const bounds = selectedFeature ? getFeatureBounds(selectedFeature) : null;
    if (!bounds) return;

    map.fitBounds(bounds, {
      padding: {
        top: 86,
        bottom: 118,
        left: 86,
        right: panelOpen ? 470 : 132,
      },
      duration: 860,
      maxZoom: 6.2,
    });
  }, [chinaProvinceData, panelOpen, selectedProvinceName]);

  const routeStopHaloPaint = isNightMode
    ? { 'circle-color': '#67e8f9', 'circle-opacity': 0.24, 'circle-radius': 9.5 }
    : { 'circle-color': '#94a3b8', 'circle-opacity': 0.16, 'circle-radius': 7.5 };
  const routeStopPaint = isNightMode
    ? { 'circle-color': '#e0f2fe', 'circle-radius': 5, 'circle-stroke-color': '#67e8f9', 'circle-stroke-width': 1.6 }
    : { 'circle-color': '#ffffff', 'circle-radius': 4.8, 'circle-stroke-color': '#475569', 'circle-stroke-width': 1.5 };
  const routeOrderPaint = isNightMode ? { 'text-color': '#082f49' } : { 'text-color': '#334155' };
  const interactiveLayerIds = useMemo(() => {
    if (!enableLocationSelection) return undefined;

    const layerIds = selectionMode === 'records'
      ? ['world-fill', 'china-fill']
      : ['china-fill'];

    if (cities.length > 0 && cityData) {
      layerIds.push('city-fill');
    }

    return layerIds;
  }, [cities.length, cityData, enableLocationSelection, selectionMode]);

  return (
    <div className={`map-shell ${isNightMode ? 'map-shell--night' : 'map-shell--light'} ${mapTheme.shellClassName} w-full h-full`}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 105, latitude: 35, zoom: 3.5 }}
        mapStyle={mapTheme.styleUrl}
        style={{ width: '100%', height: '100%' }}
        minZoom={1.5}
        interactiveLayerIds={interactiveLayerIds}
        onClick={(event: MapLayerMouseEvent) => {
          if (!enableLocationSelection) return;

          if (selectionMode === 'province-stats') {
            const nextSelectedProvinceName = resolveProvinceSelectionFromFeatures(
              event.features as MapGeoJSONFeature[] | undefined,
            );

            if (nextSelectedProvinceName) {
              onProvinceSelect?.(nextSelectedProvinceName);
            }

            return;
          }

          const filter = resolveVisitedLocationFilterFromFeatures(
            event.features as MapGeoJSONFeature[] | undefined,
            visitedCountrySet,
            visitedProvinceSet,
            visitedCitySet,
          );

          if (filter) {
            onVisitedLocationSelect?.(filter);
          }
        }}
        onMouseMove={(event: MapLayerMouseEvent) => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          if (!enableLocationSelection) {
            map.getCanvas().style.cursor = '';
            return;
          }

          if (selectionMode === 'province-stats') {
            const nextSelectedProvinceName = resolveProvinceSelectionFromFeatures(
              event.features as MapGeoJSONFeature[] | undefined,
            );

            map.getCanvas().style.cursor = nextSelectedProvinceName ? 'pointer' : '';
            return;
          }

          const filter = resolveVisitedLocationFilterFromFeatures(
            event.features as MapGeoJSONFeature[] | undefined,
            visitedCountrySet,
            visitedProvinceSet,
            visitedCitySet,
          );

          map.getCanvas().style.cursor = filter ? 'pointer' : '';
        }}
        onMouseLeave={() => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          map.getCanvas().style.cursor = '';
        }}
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

        <Source id="china" type="geojson" data="/china-provinces.json">
          <Layer
            id="china-fill"
            type="fill"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paint={provincePaint as any}
          />
          <Layer
            id="china-selected-fill"
            type="fill"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paint={selectedProvinceFillPaint as any}
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
          <Layer
            id="china-selected-border"
            type="line"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paint={selectedProvinceBorderPaint as any}
          />
        </Source>

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
              id="selected-journey-city-fill"
              type="fill"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={selectedCityPaint as any}
            />
            <Layer
              id="city-glow"
              type="line"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={cityGlowPaint as any}
            />
            <Layer
              id="selected-journey-city-halo"
              type="line"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={selectedCityHaloPaint as any}
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
            <Layer
              id="selected-journey-city-border"
              type="line"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              paint={selectedCityBorderPaint as any}
            />
          </Source>
        )}

        {selectedRouteData && (
          <Source id="selected-journey-route" type="geojson" data={selectedRouteData}>
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
