import { CHINA_PROVINCES } from '../data/chinaData';
import { getProvinceGeoJsonName } from '../data/chinaProvinceMeta';
import {
  getCountryNameForLocation,
  getProvinceLabelByCityName,
  TOTAL_TRACKABLE_CHINA_CITIES,
} from '../data/locationData';
import type { Journey } from '../types/journey';

const TOTAL_WORLD_COUNTRIES = 195;
const TOTAL_CHINA_PROVINCES = CHINA_PROVINCES.length;
const TOTAL_CHINA_CITIES = TOTAL_TRACKABLE_CHINA_CITIES;

const provinceLabelByName = new Map<string, string>();
const provinceByCityName = new Map<string, string>();

for (const province of CHINA_PROVINCES) {
  const geoName = getProvinceGeoJsonName(province.name);
  provinceLabelByName.set(province.name, province.name);
  provinceLabelByName.set(geoName, province.name);

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

function toProvinceLabel(name: string): string | null {
  return provinceLabelByName.get(name) ?? null;
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
        const provinceLabel = toProvinceLabel(location.name);
        if (provinceLabel) visitedProvinces.add(provinceLabel);
        continue;
      }

      if (location.type === 'city') {
        visitedCities.add(location.name);
        const provinceLabel = getProvinceLabelByCityName(location.name) ?? provinceByCityName.get(location.name);
        if (provinceLabel) visitedProvinces.add(provinceLabel);
      }
    }
  }

  const normalizedCityCount = Math.min(visitedCities.size, TOTAL_CHINA_CITIES);
  const chinaVisitedUnits = visitedProvinces.size + normalizedCityCount;
  const totalChinaUnits = TOTAL_CHINA_PROVINCES + TOTAL_CHINA_CITIES;

  return {
    journeyCount: journeys.length,
    countryCount: visitedCountries.size,
    provinceCount: visitedProvinces.size,
    cityCount: normalizedCityCount,
    chinaProgress: totalChinaUnits === 0 ? 0 : (chinaVisitedUnits / totalChinaUnits) * 100,
    worldProgress: (visitedCountries.size / TOTAL_WORLD_COUNTRIES) * 100,
    chinaVisitedUnits,
    worldVisitedUnits: visitedCountries.size,
    totalChinaUnits,
    totalChinaProvinces: TOTAL_CHINA_PROVINCES,
    totalChinaCities: TOTAL_CHINA_CITIES,
    totalWorldCountries: TOTAL_WORLD_COUNTRIES,
  };
}
