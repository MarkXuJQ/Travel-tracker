import { useEffect, useRef, useCallback } from 'react';
import { Map, NavigationControl, useMap } from '@vis.gl/react-maplibre';
import { Source, Layer } from '@vis.gl/react-maplibre';
import { travelConfig } from '../data/travelConfig';
import { CHINA_PROVINCES } from '../data/chinaData';
import type { Journey } from '../data/travelConfig';
import 'maplibre-gl/dist/maplibre-gl.css';

const visitedCountries = travelConfig.visitedCountries.filter(c => c !== 'China');

// GeoJSON province names include suffixes like 省/市/自治区; match by containment
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const worldFillPaint: any = {
  'fill-color': ['match', ['get', 'name'], visitedCountries, '#4ade80', '#e5e7eb'],
  'fill-opacity': ['match', ['get', 'name'], visitedCountries, 0.6, 0.3],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chinaFillPaint: any = visitedProvinceGeoNames.length > 0
  ? {
      'fill-color': ['match', ['get', 'name'], visitedProvinceGeoNames, '#facc15', 'transparent'],
      'fill-opacity': ['match', ['get', 'name'], visitedProvinceGeoNames, 0.5, 0],
    }
  : { 'fill-color': 'transparent', 'fill-opacity': 0 };

// Visited city coordinates from CHINA_PROVINCES data
const visitedCityPoints = CHINA_PROVINCES.flatMap(province =>
  province.cities
    .filter(city => travelConfig.visitedChinaCities.includes(city.name))
    .map(city => ({ name: city.name, lat: city.lat, lng: city.lng }))
);

interface Props {
  journeys: Journey[];
  onMarkerClick: (journey: Journey) => void;
}

export default function TravelMap({ journeys, onMarkerClick }: Props) {
  return (
    <div className="w-full h-full">
      <Map
        initialViewState={{ longitude: 105, latitude: 35, zoom: 3.5 }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: '100%', height: '100%' }}
        minZoom={1.5}
      >
        <NavigationControl position="top-left" />

        {/* World countries layer — China excluded via filter */}
        <Source id="world" type="geojson" data="/world-atlas.json">
          <Layer
            id="world-fill"
            type="fill"
            paint={worldFillPaint}
            filter={['!=', ['get', 'name'], 'China']}
          />
          <Layer
            id="world-border"
            type="line"
            paint={{ 'line-color': '#ffffff', 'line-width': 0.5 }}
            filter={['!=', ['get', 'name'], 'China']}
          />
        </Source>

        {/* China provinces layer */}
        <Source id="china" type="geojson" data="/china-provinces.json">
          <Layer
            id="china-fill"
            type="fill"
            paint={chinaFillPaint}
          />
          <Layer
            id="china-border"
            type="line"
            paint={{ 'line-color': '#9ca3af', 'line-width': 0.5 }}
          />
        </Source>

        {/* Visited city dots */}
        <Source
          id="cities"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: visitedCityPoints.map(city => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [city.lng, city.lat] },
              properties: { name: city.name },
            })),
          }}
        >
          <Layer
            id="city-dots"
            type="circle"
            paint={{
              'circle-radius': 5,
              'circle-color': '#ef4444',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1,
            }}
          />
        </Source>

        {/* Journey markers rendered as DOM overlays */}
        <JourneyMarkers journeys={journeys} onMarkerClick={onMarkerClick} />
      </Map>
    </div>
  );
}

// Inner component so it can use useMap hook
function JourneyMarkers({ journeys, onMarkerClick }: Props) {
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

// Individual marker using maplibre Marker via imperative API
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
    el.className = 'journey-marker-pin';
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
