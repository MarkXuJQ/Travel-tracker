// 地区层级类型
export type RegionLevel = 'country' | 'province' | 'city';

// 地理位置
export interface Location {
  country: string;
  countryCode: string;
  province?: string;
  provinceCode?: string;
  city?: string;
  lat: number;
  lng: number;
}

// 城市数据
export interface CityData {
  name: string;
  lat: number;
  lng: number;
  provinceCode: string;
  visited: boolean;
}

// 省份数据
export interface ProvinceData {
  code: string;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  countryCode: string;
  cities: CityData[];
  visitedCities: number;
  visited: boolean;
}

// 国家数据
export interface CountryData {
  code: string;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  visited: boolean;
  geometry?: any; // GeoJSON geometry
}

// 旅行记录
export interface TravelRecord {
  id: string;
  startDate: string; // YYYY-MM 或 YYYY-MM-DD
  endDate: string;
  datePrecision: 'month' | 'day';
  location: Location;
  blogUrl?: string;
  notes?: string;
  createdAt: number;
}

// 统计数据
export interface Statistics {
  global: {
    visited: number;
    total: number;
    percentage: number;
  };
  provinces: {
    visited: number;
    total: number;
    percentage: number;
  };
  cities: {
    visited: number;
    total: number;
    percentage: number;
  };
  totalDays: number; // 仅精确日期计算
  totalTrips: number;
}

// 地球视角状态
export interface EarthViewState {
  lat: number;
  lng: number;
  altitude: number;
}

// 应用状态
export interface AppState {
  isPanelOpen: boolean;
  isDefaultView: boolean; // 默认界面状态
}
