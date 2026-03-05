import { useState, useEffect, useCallback } from 'react';
import type { TravelRecord, Statistics } from '@/types';
import { CHINA_PROVINCES, WORLD_COUNTRIES, getTotalCities } from '@/data/chinaData';

// 访问状态存储
interface VisitedState {
  countries: Set<string>;
  provinces: Set<string>;
  cities: Set<string>;
}

const STORAGE_KEY = 'travel-records-v3';
const VISITED_KEY = 'travel-visited-v3';

export function useTravelStore() {
  const [records, setRecords] = useState<TravelRecord[]>([]);
  const [visited, setVisited] = useState<VisitedState>({
    countries: new Set(),
    provinces: new Set(),
    cities: new Set(),
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载数据
  useEffect(() => {
    const savedRecords = localStorage.getItem(STORAGE_KEY);
    const savedVisited = localStorage.getItem(VISITED_KEY);
    
    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords));
      } catch (e) {
        console.error('Failed to parse records:', e);
      }
    }
    
    if (savedVisited) {
      try {
        const parsed = JSON.parse(savedVisited);
        setVisited({
          countries: new Set(parsed.countries || []),
          provinces: new Set(parsed.provinces || []),
          cities: new Set(parsed.cities || []),
        });
      } catch (e) {
        console.error('Failed to parse visited:', e);
      }
    }
    
    setIsLoaded(true);
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      localStorage.setItem(VISITED_KEY, JSON.stringify({
        countries: Array.from(visited.countries),
        provinces: Array.from(visited.provinces),
        cities: Array.from(visited.cities),
      }));
    }
  }, [records, visited, isLoaded]);

  // 添加旅行记录
  const addRecord = useCallback((record: Omit<TravelRecord, 'id' | 'createdAt'>) => {
    const newRecord: TravelRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    
    setRecords(prev => [newRecord, ...prev]);
    
    // 更新访问状态
    setVisited(prev => {
      const next = {
        countries: new Set(prev.countries),
        provinces: new Set(prev.provinces),
        cities: new Set(prev.cities),
      };
      
      const loc = record.location;
      
      // 标记城市（最具体）
      if (loc.city) {
        next.cities.add(loc.city);
        // 同时标记所属省份
        if (loc.province) {
          next.provinces.add(loc.province);
        }
      }
      // 标记省份
      else if (loc.province) {
        next.provinces.add(loc.province);
      }
      // 标记国家
      else if (loc.country) {
        next.countries.add(loc.country);
      }
      
      return next;
    });
    
    return newRecord.id;
  }, []);

  // 删除旅行记录
  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => {
      const remaining = prev.filter(r => r.id !== id);
      
      // 重新计算访问状态
      const newVisited: VisitedState = {
        countries: new Set(),
        provinces: new Set(),
        cities: new Set(),
      };
      
      remaining.forEach(r => {
        const loc = r.location;
        if (loc.city) {
          newVisited.cities.add(loc.city);
          if (loc.province) newVisited.provinces.add(loc.province);
        } else if (loc.province) {
          newVisited.provinces.add(loc.province);
        } else if (loc.country) {
          newVisited.countries.add(loc.country);
        }
      });
      
      setVisited(newVisited);
      return remaining;
    });
  }, []);

  // 获取统计数据
  const getStatistics = useCallback((): Statistics => {
    const totalCountries = WORLD_COUNTRIES.length;
    const totalProvinces = CHINA_PROVINCES.length;
    const totalCities = getTotalCities();
    
    // 计算精确日期的旅行天数
    let totalDays = 0;
    records.forEach(record => {
      if (record.datePrecision === 'day') {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalDays += Math.max(1, days);
      }
      // 仅月份的记录不计入天数
    });
    
    return {
      global: {
        visited: visited.countries.size,
        total: totalCountries,
        percentage: Math.round((visited.countries.size / totalCountries) * 100),
      },
      provinces: {
        visited: visited.provinces.size,
        total: totalProvinces,
        percentage: Math.round((visited.provinces.size / totalProvinces) * 100),
      },
      cities: {
        visited: visited.cities.size,
        total: totalCities,
        percentage: Math.round((visited.cities.size / totalCities) * 100),
      },
      totalDays,
      totalTrips: records.length,
    };
  }, [visited, records]);

  // 获取省份统计
  const getProvinceStats = useCallback((provinceName: string) => {
    const province = CHINA_PROVINCES.find(p => p.name === provinceName);
    if (!province) return { total: 0, visited: 0, percentage: 0 };
    
    const total = province.cities.length;
    const visitedCities = province.cities.filter(c => visited.cities.has(c.name)).length;
    
    return {
      total,
      visited: visitedCities,
      percentage: Math.round((visitedCities / total) * 100),
    };
  }, [visited.cities]);

  // 获取已访问的城市列表（带坐标）
  const getVisitedCities = useCallback(() => {
    const result: { name: string; lat: number; lng: number; province: string }[] = [];
    
    CHINA_PROVINCES.forEach(province => {
      province.cities.forEach(city => {
        if (visited.cities.has(city.name)) {
          result.push({
            name: city.name,
            lat: city.lat,
            lng: city.lng,
            province: province.name,
          });
        }
      });
    });
    
    return result;
  }, [visited.cities]);

  // 获取已访问的省份列表
  const getVisitedProvinces = useCallback(() => {
    return CHINA_PROVINCES.filter(p => visited.provinces.has(p.name));
  }, [visited.provinces]);

  // 获取已访问的国家列表
  const getVisitedCountries = useCallback(() => {
    return WORLD_COUNTRIES.filter(c => visited.countries.has(c.name));
  }, [visited.countries]);

  // 检查是否已访问
  const isVisited = useCallback((type: 'country' | 'province' | 'city', name: string) => {
    if (type === 'country') return visited.countries.has(name);
    if (type === 'province') return visited.provinces.has(name);
    return visited.cities.has(name);
  }, [visited]);

  // 从分享数据导入
  const importFromShare = useCallback((data: { records: TravelRecord[]; visited: VisitedState }) => {
    setRecords(data.records);
    setVisited({
      countries: new Set(data.visited.countries),
      provinces: new Set(data.visited.provinces),
      cities: new Set(data.visited.cities),
    });
  }, []);

  // 清空数据
  const clearAll = useCallback(() => {
    setRecords([]);
    setVisited({
      countries: new Set(),
      provinces: new Set(),
      cities: new Set(),
    });
  }, []);

  return {
    records,
    visited,
    isLoaded,
    addRecord,
    deleteRecord,
    getStatistics,
    getProvinceStats,
    getVisitedCities,
    getVisitedProvinces,
    getVisitedCountries,
    isVisited,
    importFromShare,
    clearAll,
  };
}
