import { useEffect, useState } from 'react';
import type { BaseMapMode } from './TravelMap';

export const BASE_MAP_STORAGE_KEY = 'travel-tracker-base-map';
export const PROVINCE_HIGHLIGHT_STORAGE_KEY = 'travel-tracker-province-highlight';

export const BASE_MAP_OPTIONS: Array<{ key: BaseMapMode; label: string; title: string }> = [
  { key: 'liberty', label: '彩色', title: 'Liberty 彩色底图' },
  { key: 'bright', label: '明亮', title: 'Bright 明亮底图' },
  { key: 'night', label: '夜间', title: 'Dark Matter 夜间底图' },
];

export function isBaseMapMode(value: string | null): value is BaseMapMode {
  return BASE_MAP_OPTIONS.some(option => option.key === value);
}

export function useTravelMapPreferences() {
  const [baseMap, setBaseMap] = useState<BaseMapMode>(() => {
    if (typeof window === 'undefined') return 'liberty';
    const searchParams = new URLSearchParams(window.location.search);
    const queryBaseMap = searchParams.get('baseMap');
    if (isBaseMapMode(queryBaseMap)) return queryBaseMap;
    const savedBaseMap = window.localStorage.getItem(BASE_MAP_STORAGE_KEY);
    return isBaseMapMode(savedBaseMap) ? savedBaseMap : 'liberty';
  });
  const [showProvinceHighlights, setShowProvinceHighlights] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const savedValue = window.localStorage.getItem(PROVINCE_HIGHLIGHT_STORAGE_KEY);
    return savedValue === null ? true : savedValue === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(BASE_MAP_STORAGE_KEY, baseMap);
  }, [baseMap]);

  useEffect(() => {
    window.localStorage.setItem(PROVINCE_HIGHLIGHT_STORAGE_KEY, String(showProvinceHighlights));
  }, [showProvinceHighlights]);

  return {
    baseMap,
    setBaseMap,
    showProvinceHighlights,
    setShowProvinceHighlights,
  };
}
