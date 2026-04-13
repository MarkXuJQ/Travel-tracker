import { CHINA_PROVINCES } from './chinaData';
import { getProvinceGeoJsonName } from './chinaProvinceMeta';
import type { JourneyLocation } from '../types/journey';

export type LocationOption = Omit<JourneyLocation, 'coords'> & {
  coords: [number, number];
  pinyin?: string; // for fuzzy search
};

// --- Countries (Natural Earth names matching world-atlas.json) ---
// coords are approximate centroids [lat, lng]
const COUNTRIES: LocationOption[] = [
  { type: 'country', name: 'Afghanistan', label: '阿富汗', coords: [33.9391, 67.7099] },
  { type: 'country', name: 'Argentina', label: '阿根廷', coords: [-38.4161, -63.6167] },
  { type: 'country', name: 'Australia', label: '澳大利亚', coords: [-25.2744, 133.7751] },
  { type: 'country', name: 'Austria', label: '奥地利', coords: [47.5162, 14.5501] },
  { type: 'country', name: 'Belgium', label: '比利时', coords: [50.8503, 4.3517] },
  { type: 'country', name: 'Brazil', label: '巴西', coords: [-14.235, -51.9253] },
  { type: 'country', name: 'Cambodia', label: '柬埔寨', coords: [12.5657, 104.991] },
  { type: 'country', name: 'Canada', label: '加拿大', coords: [56.1304, -106.3468] },
  { type: 'country', name: 'Chile', label: '智利', coords: [-35.6751, -71.543] },
  { type: 'country', name: 'Colombia', label: '哥伦比亚', coords: [4.5709, -74.2973] },
  { type: 'country', name: 'Croatia', label: '克罗地亚', coords: [45.1, 15.2] },
  { type: 'country', name: 'Czech Republic', label: '捷克', coords: [49.8175, 15.473] },
  { type: 'country', name: 'Denmark', label: '丹麦', coords: [56.2639, 9.5018] },
  { type: 'country', name: 'Egypt', label: '埃及', coords: [26.8206, 30.8025] },
  { type: 'country', name: 'Finland', label: '芬兰', coords: [61.9241, 25.7482] },
  { type: 'country', name: 'France', label: '法国', coords: [46.2276, 2.2137] },
  { type: 'country', name: 'Germany', label: '德国', coords: [51.1657, 10.4515] },
  { type: 'country', name: 'Greece', label: '希腊', coords: [39.0742, 21.8243] },
  { type: 'country', name: 'Hungary', label: '匈牙利', coords: [47.1625, 19.5033] },
  { type: 'country', name: 'Iceland', label: '冰岛', coords: [64.9631, -19.0208] },
  { type: 'country', name: 'India', label: '印度', coords: [20.5937, 78.9629] },
  { type: 'country', name: 'Indonesia', label: '印度尼西亚', coords: [-0.7893, 113.9213] },
  { type: 'country', name: 'Iran', label: '伊朗', coords: [32.4279, 53.688] },
  { type: 'country', name: 'Ireland', label: '爱尔兰', coords: [53.4129, -8.2439] },
  { type: 'country', name: 'Israel', label: '以色列', coords: [31.0461, 34.8516] },
  { type: 'country', name: 'Italy', label: '意大利', coords: [41.8719, 12.5674] },
  { type: 'country', name: 'Japan', label: '日本', coords: [36.2048, 138.2529] },
  { type: 'country', name: 'Jordan', label: '约旦', coords: [30.5852, 36.2384] },
  { type: 'country', name: 'South Korea', label: '韩国', coords: [35.9078, 127.7669] },
  { type: 'country', name: 'Laos', label: '老挝', coords: [19.8563, 102.4955] },
  { type: 'country', name: 'Malaysia', label: '马来西亚', coords: [4.2105, 101.9758] },
  { type: 'country', name: 'Mexico', label: '墨西哥', coords: [23.6345, -102.5528] },
  { type: 'country', name: 'Morocco', label: '摩洛哥', coords: [31.7917, -7.0926] },
  { type: 'country', name: 'Myanmar', label: '缅甸', coords: [21.9162, 95.956] },
  { type: 'country', name: 'Nepal', label: '尼泊尔', coords: [28.3949, 84.124] },
  { type: 'country', name: 'Netherlands', label: '荷兰', coords: [52.1326, 5.2913] },
  { type: 'country', name: 'New Zealand', label: '新西兰', coords: [-40.9006, 174.886] },
  { type: 'country', name: 'Norway', label: '挪威', coords: [60.472, 8.4689] },
  { type: 'country', name: 'Pakistan', label: '巴基斯坦', coords: [30.3753, 69.3451] },
  { type: 'country', name: 'Peru', label: '秘鲁', coords: [-9.19, -75.0152] },
  { type: 'country', name: 'Philippines', label: '菲律宾', coords: [12.8797, 121.774] },
  { type: 'country', name: 'Poland', label: '波兰', coords: [51.9194, 19.1451] },
  { type: 'country', name: 'Portugal', label: '葡萄牙', coords: [39.3999, -8.2245] },
  { type: 'country', name: 'Russia', label: '俄罗斯', coords: [61.524, 105.3188] },
  { type: 'country', name: 'Saudi Arabia', label: '沙特阿拉伯', coords: [23.8859, 45.0792] },
  { type: 'country', name: 'Singapore', label: '新加坡', coords: [1.3521, 103.8198] },
  { type: 'country', name: 'South Africa', label: '南非', coords: [-30.5595, 22.9375] },
  { type: 'country', name: 'Spain', label: '西班牙', coords: [40.4637, -3.7492] },
  { type: 'country', name: 'Sweden', label: '瑞典', coords: [60.1282, 18.6435] },
  { type: 'country', name: 'Switzerland', label: '瑞士', coords: [46.8182, 8.2275] },
  { type: 'country', name: 'Thailand', label: '泰国', coords: [15.87, 100.9925] },
  { type: 'country', name: 'Turkey', label: '土耳其', coords: [38.9637, 35.2433] },
  { type: 'country', name: 'United Arab Emirates', label: '阿联酋', coords: [23.4241, 53.8478] },
  { type: 'country', name: 'United Kingdom', label: '英国', coords: [55.3781, -3.436] },
  { type: 'country', name: 'United States of America', label: '美国', coords: [37.0902, -95.7129] },
  { type: 'country', name: 'Vietnam', label: '越南', coords: [14.0583, 108.2772] },
];

// --- Chinese provinces ---
const PROVINCES: LocationOption[] = CHINA_PROVINCES.map(p => ({
  type: 'province',
  name: getProvinceGeoJsonName(p.name),
  label: p.name,
  coords: [p.lat, p.lng] as [number, number],
}));

// --- Chinese cities ---
// 直辖市 (Beijing/Shanghai/Tianjin/Chongqing) have a single "city" entry
// matching the province name — highlighted at province level in city mode.
// Other cities use "XXX市" DataV name.
const ZHIXIASHI = new Set(['北京', '天津', '上海', '重庆']);

const CITIES: LocationOption[] = CHINA_PROVINCES.flatMap(p =>
  p.cities
    .filter(c => {
      // Skip the single city entry for 直辖市 (e.g. "北京市") —
      // those are already covered by the province option.
      if (ZHIXIASHI.has(p.name) && c.name === p.name + '市') return false;
      return true;
    })
    .map(c => ({
      type: 'city' as const,
      // Normalise to DataV "XXX市" format
      name: c.name.endsWith('市') || c.name.endsWith('区') || c.name.endsWith('自治州') || c.name.endsWith('地区') || c.name.endsWith('盟') || c.name.endsWith('县')
        ? c.name : c.name + '市',
      label: c.name,
      coords: [c.lat, c.lng] as [number, number],
    }))
);

const allLocations: LocationOption[] = [...COUNTRIES, ...PROVINCES, ...CITIES];

function findLocationOption(location: Pick<JourneyLocation, 'type' | 'name' | 'label'>): LocationOption | undefined {
  return allLocations.find(option =>
    option.type === location.type && (option.name === location.name || option.label === location.label)
  );
}

export function resolveJourneyLocationCoords(location: JourneyLocation): [number, number] | undefined {
  return location.coords ?? findLocationOption(location)?.coords;
}

/** Case-insensitive fuzzy search over label + name */
export function searchLocations(query: string): LocationOption[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return allLocations.filter(
    l => l.label.includes(query) || l.name.toLowerCase().includes(q)
  ).slice(0, 12);
}
