import { useEffect, useRef, useCallback, useState } from 'react';
import { Map, NavigationControl, useMap } from '@vis.gl/react-maplibre';
import { Source, Layer } from '@vis.gl/react-maplibre';
import { travelConfig } from '../data/travelConfig';
import { CHINA_PROVINCES } from '../data/chinaData';
import type { Journey } from '../data/travelConfig';
import type { Granularity } from './GranularityControl';
import 'maplibre-gl/dist/maplibre-gl.css';

// ---- Visited sets ----

const visitedCountriesNoChina = travelConfig.visitedCountries.filter(c => c !== 'China');

// Province name matching (GeoJSON uses full names like "北京市", "四川省")
const GEOJSON_PROVINCE_NAMES = [
  '北京市','天津市','河北省','山西省','内蒙古自治区','辽宁省','吉林省','黑龙江省',
  '上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省',
  '湖北省','湖南省','广东省','广西壮族自治区','海南省','重庆市','四川省',
  '贵州省','云南省','西藏自治区','陕西省','甘肃省','青海省','宁夏回族自治区',
  '新疆维吾尔自治区','台湾省','香港特别行政区','澳门特别行政区',
];

const visitedProvinceGeoNames = GEOJSON_PROVINCE_NAMES.filter(fullName =>
  travelConfig.visitedChinaProvinces.some(p => fullName.includes(p))
);

// 直辖市 province adcodes — their DataV features are districts, not cities
const ZHIXIASHI_ADCODES = [110000, 120000, 310000, 500000];
// Visited 直辖市 province short names (e.g. "北京")
const visitedZhixiashiProvinces = travelConfig.visitedChinaProvinces.filter(p =>
  ['北京', '天津', '上海', '重庆'].includes(p)
);

// ---- Paint helpers ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function worldPaint(highlightChina: boolean): any {
  const countries = highlightChina
    ? travelConfig.visitedCountries
    : visitedCountriesNoChina;
  return {
    'fill-color': ['match', ['get', 'name'], countries, '#4ade80', '#e5e7eb'],
    'fill-opacity': ['match', ['get', 'name'], countries, 0.6, 0.3],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const provincePaint: any = visitedProvinceGeoNames.length > 0
  ? {
      'fill-color': ['match', ['get', 'name'], visitedProvinceGeoNames, '#facc15', 'transparent'],
      'fill-opacity': ['match', ['get', 'name'], visitedProvinceGeoNames, 0.5, 0],
    }
  : { 'fill-color': 'transparent', 'fill-opacity': 0 };

// City paint — highlights:
//  • regular prefecture-level cities that match visitedChinaCities (exact name match)
//  • all districts of visited 直辖市
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCityPaint(features: GeoJSON.Feature[]): any {
  const highlightedNames: string[] = [];

  for (const f of features) {
    const { name, level, adcode, parent } = f.properties as {
      name: string; level: string; adcode: number; parent?: { adcode: number };
    };

    if (level === 'city') {
      // Regular prefecture: check if name matches visitedChinaCities
      if (travelConfig.visitedChinaCities.some(v => name === v || name.includes(v) || v.includes(name.replace('市', '')))) {
        highlightedNames.push(name);
      }
    } else if (level === 'district') {
      // District belongs to a 直辖市 — highlight if that province is visited
      const provinceAdcode = parent?.adcode ?? Math.floor(adcode / 10000) * 10000;
      if (ZHIXIASHI_ADCODES.includes(provinceAdcode)) {
        const provinceMap: Record<number, string> = {
          110000: '北京', 120000: '天津', 310000: '上海', 500000: '重庆',
        };
        const shortName = provinceMap[provinceAdcode];
        if (shortName && visitedZhixiashiProvinces.includes(shortName)) {
          highlightedNames.push(name);
        }
      }
    }
  }

  if (highlightedNames.length === 0) {
    return { 'fill-color': 'transparent', 'fill-opacity': 0 };
  }
  return {
    'fill-color': ['match', ['get', 'name'], highlightedNames, '#fb923c', 'transparent'],
    'fill-opacity': ['match', ['get', 'name'], highlightedNames, 0.55, 0],
  };
}

// ---- Component ----

interface Props {
  journeys: Journey[];
  onMarkerClick: (journey: Journey) => void;
  granularity: Granularity;
}

export default function TravelMap({ journeys, onMarkerClick, granularity }: Props) {
  const [cityData, setCityData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [cityPaint, setCityPaint] = useState<object | null>(null);
  const loadingRef = useRef(false);

  // Lazy-load city GeoJSON only when switching to city granularity
  useEffect(() => {
    if (granularity !== 'city' || cityData || loadingRef.current) return;
    loadingRef.current = true;
    fetch('/china-cities.json')
      .then(r => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        setCityData(data);
        setCityPaint(buildCityPaint(data.features as GeoJSON.Feature[]));
      })
      .catch(console.error)
      .finally(() => { loadingRef.current = false; });
  }, [granularity, cityData]);

  const showCountryChina = granularity === 'country';
  const showProvinces = granularity === 'province';
  const showCities = granularity === 'city';

  return (
    <div className="w-full h-full">
      <Map
        initialViewState={{ longitude: 105, latitude: 35, zoom: 3.5 }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '100%' }}
        minZoom={1.5}
      >
        <NavigationControl position="top-left" />

        {/* World countries — China filtered out unless granularity=country */}
        <Source id="world" type="geojson" data="/world-atlas.json">
          <Layer
            id="world-fill"
            type="fill"
            paint={worldPaint(showCountryChina)}
            filter={showCountryChina ? undefined : ['!=', ['get', 'name'], 'China']}
          />
          <Layer
            id="world-border"
            type="line"
            paint={{ 'line-color': '#ffffff', 'line-width': 0.5 }}
            filter={showCountryChina ? undefined : ['!=', ['get', 'name'], 'China']}
          />
        </Source>

        {/* China provinces — visible in province mode */}
        {(showProvinces || showCities) && (
          <Source id="china" type="geojson" data="/china-provinces.json">
            <Layer
              id="china-fill"
              type="fill"
              paint={showProvinces ? provincePaint : { 'fill-color': 'transparent', 'fill-opacity': 0 }}
            />
            <Layer
              id="china-border"
              type="line"
              paint={{ 'line-color': '#9ca3af', 'line-width': 0.5 }}
            />
          </Source>
        )}

        {/* City boundaries — visible in city mode, lazy-loaded */}
        {showCities && cityData && cityPaint && (
          <Source id="cities" type="geojson" data={cityData}>
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

        {/* Journey markers */}
        <JourneyMarkers journeys={journeys} onMarkerClick={onMarkerClick} />
      </Map>
    </div>
  );
}

// Inner component so it can use useMap hook
function JourneyMarkers({ journeys, onMarkerClick }: Pick<Props, 'journeys' | 'onMarkerClick'>) {
  return (
    <>
      {journeys.map(journey => {
        let coords = journey.coordinates;
        if (!coords) {
          for (const province of CHINA_PROVINCES) {
            const city = province.cities.find(c => c.name === journey.location);
            if (city) { coords = [city.lat, city.lng]; break; }
            if (province.name === journey.location) { coords = [province.lat, province.lng]; break; }
          }
        }
        if (!coords) return null;
        const [lat, lng] = coords;

        return (
          <JourneyMarker
            key={journey.id}
            lat={lat}
            lng={lng}
            journey={journey}
            onClick={onMarkerClick}
          />
        );
      })}
    </>
  );
}

import maplibregl from 'maplibre-gl';

interface MarkerProps {
  lat: number;
  lng: number;
  journey: Journey;
  onClick: (journey: Journey) => void;
}

function JourneyMarker({ lat, lng, journey, onClick }: MarkerProps) {
  const { current: map } = useMap();
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const handleClick = useCallback(() => onClick(journey), [journey, onClick]);

  useEffect(() => {
    if (!map) return;

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="animation: bounce 1s infinite; cursor: pointer;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20" fill="#ef4444" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4))">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
      </div>
    `;
    el.addEventListener('click', handleClick);

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map.getMap());

    markerRef.current = marker;

    return () => {
      el.removeEventListener('click', handleClick);
      marker.remove();
    };
  }, [map, lat, lng, handleClick]);

  return null;
}
