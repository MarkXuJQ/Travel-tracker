import { CHINA_PROVINCES } from './chinaData';
import { getProvinceGeoJsonName } from './chinaProvinceMeta';
import { WORLD_COUNTRY_DATA } from './worldCountryData';
import type { JourneyLocation } from '../types/journey';

const CHINA_COUNTRY_NAME = 'China';
const ANTARCTICA_COUNTRY_NAME = 'Antarctica';

export type LocationOption = Omit<JourneyLocation, 'coords'> & {
  coords: [number, number];
  aliases?: string[];
  pinyin?: string; // for fuzzy search
};

const COUNTRY_CANONICAL_NAME_BY_ALIAS: Record<string, string> = {
  '中华人民共和国': CHINA_COUNTRY_NAME,
  'Czech Republic': 'Czechia',
  'North Macedonia': 'Macedonia',
  'United States': 'United States of America',
  USA: 'United States of America',
  US: 'United States of America',
  UK: 'United Kingdom',
  Britain: 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'Republic of Korea': 'South Korea',
  'Korea, South': 'South Korea',
  'Korea, North': 'North Korea',
  "Democratic People's Republic of Korea": 'North Korea',
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  'Central African Republic': 'Central African Rep.',
  'Dominican Republic': 'Dominican Rep.',
  'Equatorial Guinea': 'Eq. Guinea',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  Eswatini: 'eSwatini',
  'French Southern and Antarctic Lands': 'Fr. S. Antarctic Lands',
  'Falkland Islands': 'Falkland Is.',
  'Solomon Islands': 'Solomon Is.',
  'Western Sahara': 'W. Sahara',
  'South Sudan': 'S. Sudan',
  'Ivory Coast': "Côte d'Ivoire",
  "Cote d'Ivoire": "Côte d'Ivoire",
};

const COUNTRY_LABEL_OVERRIDES: Record<string, string> = {
  Macedonia: '北马其顿',
  Taiwan: '台湾',
  'United Arab Emirates': '阿联酋',
};

const countryAliasesByName = new Map<string, string[]>();

for (const [alias, canonicalName] of Object.entries(COUNTRY_CANONICAL_NAME_BY_ALIAS)) {
  const aliases = countryAliasesByName.get(canonicalName) ?? [];
  aliases.push(alias);
  countryAliasesByName.set(canonicalName, aliases);
}

const COUNTRIES: LocationOption[] = WORLD_COUNTRY_DATA
  .filter(country => country.name !== CHINA_COUNTRY_NAME && country.name !== ANTARCTICA_COUNTRY_NAME)
  .map(country => ({
    type: 'country' as const,
    name: country.name,
    label: COUNTRY_LABEL_OVERRIDES[country.name] ?? country.label,
    coords: country.coords,
    aliases: countryAliasesByName.get(country.name),
  }));

// --- Chinese provinces ---
const PROVINCES: LocationOption[] = CHINA_PROVINCES.map(p => ({
  type: 'province',
  name: getProvinceGeoJsonName(p.name),
  label: p.name,
  coords: [p.lat, p.lng] as [number, number],
}));

function normalizeCityGeoName(name: string) {
  return name.endsWith('市')
    || name.endsWith('区')
    || name.endsWith('自治州')
    || name.endsWith('地区')
    || name.endsWith('盟')
    || name.endsWith('县')
    ? name
    : `${name}市`;
}

const CITIES: LocationOption[] = CHINA_PROVINCES.flatMap(p =>
  p.cities.length > 0
    ? p.cities.map(c => ({
      type: 'city' as const,
      name: normalizeCityGeoName(c.name),
      label: c.name,
      coords: [c.lat, c.lng] as [number, number],
    }))
    : [{
      type: 'city' as const,
      name: getProvinceGeoJsonName(p.name),
      label: p.name,
      coords: [p.lat, p.lng] as [number, number],
    }]
);

// The picker still keeps some special-region entries for recording,
// but China progress follows the 333-prefecture-level-unit statistic.
export const TOTAL_TRACKABLE_CHINA_CITIES = 333;
export const TOTAL_TRACKABLE_WORLD_COUNTRIES = COUNTRIES.length;

const allLocations: LocationOption[] = [...COUNTRIES, ...PROVINCES, ...CITIES];
const provinceGeoNameByCityName = new Map<string, string>();
const provinceLabelByCityName = new Map<string, string>();

for (const province of CHINA_PROVINCES) {
  const provinceGeoName = getProvinceGeoJsonName(province.name);

  if (province.cities.length === 0) {
    provinceGeoNameByCityName.set(provinceGeoName, provinceGeoName);
    provinceLabelByCityName.set(provinceGeoName, province.name);
    continue;
  }

  for (const city of province.cities) {
    const cityGeoName = normalizeCityGeoName(city.name);
    provinceGeoNameByCityName.set(cityGeoName, provinceGeoName);
    provinceLabelByCityName.set(cityGeoName, province.name);
  }
}

function canonicalizeCountryName(name: string) {
  return COUNTRY_CANONICAL_NAME_BY_ALIAS[name] ?? name;
}

export function getLocationOptionByTypeAndName(
  type: JourneyLocation['type'],
  name: string,
): LocationOption | undefined {
  if (type === 'country') {
    const canonicalName = canonicalizeCountryName(name);

    return allLocations.find(option =>
      option.type === 'country'
      && (
        option.name === canonicalName
        || option.aliases?.includes(name)
      )
    );
  }

  return allLocations.find(option => option.type === type && option.name === name);
}

function findLocationOption(location: Pick<JourneyLocation, 'type' | 'name' | 'label'>): LocationOption | undefined {
  return getLocationOptionByTypeAndName(location.type, location.name)
    ?? allLocations.find(option => option.type === location.type && option.label === location.label);
}

export function resolveJourneyLocationCoords(location: JourneyLocation): [number, number] | undefined {
  return location.coords ?? findLocationOption(location)?.coords;
}

export function getProvinceGeoNameByCityName(cityName: string): string | null {
  return provinceGeoNameByCityName.get(cityName) ?? null;
}

export function getProvinceLabelByCityName(cityName: string): string | null {
  return provinceLabelByCityName.get(cityName) ?? null;
}

export function getLocationLabel(type: JourneyLocation['type'], name: string): string | null {
  return getLocationOptionByTypeAndName(type, name)?.label ?? null;
}

export function getCanonicalCountryName(name: string) {
  return canonicalizeCountryName(name);
}

export function getCountryNameForLocation(location: Pick<JourneyLocation, 'type' | 'name'>): string | null {
  if (location.type === 'country') {
    return canonicalizeCountryName(location.name);
  }

  if (location.type === 'province' || location.type === 'city') {
    return CHINA_COUNTRY_NAME;
  }

  return null;
}

/** Case-insensitive fuzzy search over label + name */
export function searchLocations(query: string, allowedTypes?: JourneyLocation['type'][]): LocationOption[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const allowedTypeSet = allowedTypes?.length ? new Set(allowedTypes) : null;

  return allLocations.filter(
    l => (!allowedTypeSet || allowedTypeSet.has(l.type))
      && (
        l.label.includes(query)
        || l.name.toLowerCase().includes(q)
        || l.aliases?.some(alias => alias.includes(query) || alias.toLowerCase().includes(q))
      )
  ).slice(0, 12);
}
