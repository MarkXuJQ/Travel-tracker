import { CHINA_PROVINCES } from '../data/chinaData';
import { getProvinceGeoJsonName } from '../data/chinaProvinceMeta';
import {
  getCountryNameForLocation,
  getLocationOptionByTypeAndName,
  getProvinceGeoNameByCityName,
  getProvinceLabelByCityName,
  TOTAL_TRACKABLE_CHINA_CITIES,
} from '../data/locationData';
import type { Journey } from '../types/journey';

const TOTAL_WORLD_COUNTRIES = 195;
const TOTAL_CHINA_PROVINCES = CHINA_PROVINCES.length;
const TOTAL_CHINA_CITIES = TOTAL_TRACKABLE_CHINA_CITIES;

const provinceLabelByName = new Map<string, string>();
const provinceByCityName = new Map<string, string>();
const provinceTrackablePlaceLabelsByGeoName = new Map<string, string[]>();

for (const province of CHINA_PROVINCES) {
  const geoName = getProvinceGeoJsonName(province.name);
  provinceLabelByName.set(province.name, province.name);
  provinceLabelByName.set(geoName, province.name);
  provinceTrackablePlaceLabelsByGeoName.set(
    geoName,
    province.cities.length > 0
      ? province.cities.map(city => city.name)
      : [province.name],
  );

  for (const city of province.cities) {
    provinceByCityName.set(city.name, province.name);
  }
}

export interface TravelStats {
  journeyCount: number;
  countryCount: number;
  provinceCount: number;
  cityCount: number;
  chinaProgress: number;
  worldProgress: number;
  chinaVisitedUnits: number;
  worldVisitedUnits: number;
  totalChinaUnits: number;
  totalChinaProvinces: number;
  totalChinaCities: number;
  totalWorldCountries: number;
}

export interface ProvinceTravelStat {
  code: string;
  name: string;
  geoName: string;
  visitedCount: number;
  totalCount: number;
  progress: number;
  visitedPlaces: string[];
  missingPlaces: string[];
}

function toProvinceLabel(name: string): string | null {
  return provinceLabelByName.get(name) ?? null;
}

function addVisitedProvincePlace(visitedPlacesByProvince: Map<string, Set<string>>, provinceGeoName: string, placeLabel: string) {
  const currentSet = visitedPlacesByProvince.get(provinceGeoName) ?? new Set<string>();
  currentSet.add(placeLabel);
  visitedPlacesByProvince.set(provinceGeoName, currentSet);
}

function getCanonicalPlaceLabel(location: Journey['locations'][number]) {
  if (location.type === 'country') {
    return getLocationOptionByTypeAndName('country', location.name)?.label ?? location.label;
  }

  if (location.type === 'province') {
    return getLocationOptionByTypeAndName('province', location.name)?.label ?? location.label;
  }

  return getLocationOptionByTypeAndName('city', location.name)?.label
    ?? getLocationOptionByTypeAndName('city', location.label)?.label
    ?? location.label;
}

export function getTravelStats(journeys: Journey[]): TravelStats {
  const visitedCountries = new Set<string>();
  const visitedProvinces = new Set<string>();
  const visitedCities = new Set<string>();

  for (const journey of journeys) {
    for (const location of journey.locations ?? []) {
      const countryName = getCountryNameForLocation(location);
      if (countryName) visitedCountries.add(countryName);

      if (location.type === 'country') {
        continue;
      }

      if (location.type === 'province') {
        const canonicalProvince = getLocationOptionByTypeAndName('province', location.name);
        const provinceLabel = toProvinceLabel(canonicalProvince?.name ?? location.name)
          ?? canonicalProvince?.label
          ?? toProvinceLabel(location.label);
        if (provinceLabel) visitedProvinces.add(provinceLabel);
        continue;
      }

      if (location.type === 'city') {
        const canonicalCity = getLocationOptionByTypeAndName('city', location.name)
          ?? getLocationOptionByTypeAndName('city', location.label);
        const cityName = canonicalCity?.name ?? location.name;
        visitedCities.add(cityName);
        const provinceLabel = getProvinceLabelByCityName(cityName)
          ?? provinceByCityName.get(cityName)
          ?? getProvinceLabelByCityName(location.name)
          ?? getProvinceLabelByCityName(location.label)
          ?? provinceByCityName.get(location.name)
          ?? provinceByCityName.get(location.label);
        if (provinceLabel) visitedProvinces.add(provinceLabel);
      }
    }
  }

  const normalizedCityCount = Math.min(visitedCities.size, TOTAL_CHINA_CITIES);
  // China progress follows the 333 prefecture-level-unit statistic.
  // Province highlights are a separate visual summary and should not dilute this percentage.
  const chinaVisitedUnits = normalizedCityCount;
  const totalChinaUnits = TOTAL_CHINA_CITIES;

  return {
    journeyCount: journeys.length,
    countryCount: visitedCountries.size,
    provinceCount: visitedProvinces.size,
    cityCount: normalizedCityCount,
    chinaProgress: (chinaVisitedUnits / totalChinaUnits) * 100,
    worldProgress: (visitedCountries.size / TOTAL_WORLD_COUNTRIES) * 100,
    chinaVisitedUnits,
    worldVisitedUnits: visitedCountries.size,
    totalChinaUnits,
    totalChinaProvinces: TOTAL_CHINA_PROVINCES,
    totalChinaCities: TOTAL_CHINA_CITIES,
    totalWorldCountries: TOTAL_WORLD_COUNTRIES,
  };
}

export function getProvinceTravelStats(journeys: Journey[]): ProvinceTravelStat[] {
  const visitedPlacesByProvince = new Map<string, Set<string>>();

  for (const journey of journeys) {
    for (const location of journey.locations ?? []) {
      if (location.type === 'city') {
        const canonicalCity = getLocationOptionByTypeAndName('city', location.name)
          ?? getLocationOptionByTypeAndName('city', location.label);
        const cityName = canonicalCity?.name ?? location.name;
        const provinceGeoName = getProvinceGeoNameByCityName(cityName)
          ?? getProvinceGeoNameByCityName(location.name)
          ?? getProvinceGeoNameByCityName(location.label);
        if (!provinceGeoName) continue;

        addVisitedProvincePlace(visitedPlacesByProvince, provinceGeoName, getCanonicalPlaceLabel(location));
        continue;
      }

      if (location.type !== 'province') continue;

      const canonicalProvince = getLocationOptionByTypeAndName('province', location.name)
        ?? getLocationOptionByTypeAndName('province', location.label);
      const provinceGeoName = canonicalProvince?.name ?? location.name;
      const trackablePlaceLabels = provinceTrackablePlaceLabelsByGeoName.get(provinceGeoName);
      if (!trackablePlaceLabels || trackablePlaceLabels.length !== 1) {
        continue;
      }

      addVisitedProvincePlace(visitedPlacesByProvince, provinceGeoName, trackablePlaceLabels[0]);
    }
  }

  return CHINA_PROVINCES.map(province => {
    const geoName = getProvinceGeoJsonName(province.name);
    const trackablePlaces = provinceTrackablePlaceLabelsByGeoName.get(geoName) ?? [];
    const visitedPlaceSet = visitedPlacesByProvince.get(geoName) ?? new Set<string>();
    const visitedPlaces = trackablePlaces.filter(place => visitedPlaceSet.has(place));
    const missingPlaces = trackablePlaces.filter(place => !visitedPlaceSet.has(place));
    const totalCount = trackablePlaces.length;
    const visitedCount = visitedPlaces.length;

    return {
      code: province.code,
      name: province.name,
      geoName,
      visitedCount,
      totalCount,
      progress: totalCount === 0 ? 0 : (visitedCount / totalCount) * 100,
      visitedPlaces,
      missingPlaces,
    };
  });
}
