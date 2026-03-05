import { useState, useEffect, useCallback, useMemo } from "react";
import type { TravelRecord, Statistics } from "@/types";
import {
  CHINA_PROVINCES,
  WORLD_COUNTRIES,
  getTotalCities,
} from "@/data/chinaData";

// 访问状态存储
interface VisitedState {
  countries: Set<string>;
  provinces: Set<string>;
  cities: Set<string>;
}

const STORAGE_KEY = "travel-records-v3";
const VISITED_KEY = "travel-visited-v3";

const createEmptyVisited = (): VisitedState => ({
  countries: new Set(),
  provinces: new Set(),
  cities: new Set(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeRecords = (value: unknown): TravelRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const location = isRecord(item.location) ? item.location : null;
    if (!location || typeof location.country !== "string") {
      return [];
    }

    const startDate = typeof item.startDate === "string" ? item.startDate : "";
    const endDate = typeof item.endDate === "string" ? item.endDate : "";
    const datePrecision = item.datePrecision === "month" ? "month" : "day";

    if (!startDate || !endDate) {
      return [];
    }

    const lat = typeof location.lat === "number" ? location.lat : 0;
    const lng = typeof location.lng === "number" ? location.lng : 0;

    const normalized: TravelRecord = {
      id:
        typeof item.id === "string" && item.id
          ? item.id
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startDate,
      endDate,
      datePrecision,
      location: {
        country: location.country,
        countryCode:
          typeof location.countryCode === "string" ? location.countryCode : "",
        province:
          typeof location.province === "string" ? location.province : undefined,
        provinceCode:
          typeof location.provinceCode === "string"
            ? location.provinceCode
            : undefined,
        city: typeof location.city === "string" ? location.city : undefined,
        lat,
        lng,
      },
      blogUrl: typeof item.blogUrl === "string" ? item.blogUrl : undefined,
      notes: typeof item.notes === "string" ? item.notes : undefined,
      createdAt:
        typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    };

    return [normalized];
  });
};

const buildVisitedFromRecords = (records: TravelRecord[]): VisitedState => {
  const next = createEmptyVisited();

  records.forEach((record) => {
    const loc = record.location;
    if (loc.country) {
      next.countries.add(loc.country);
    }
    if (loc.province) {
      next.provinces.add(loc.province);
    }
    if (loc.city) {
      next.cities.add(loc.city);
    }
  });

  return next;
};

export function useTravelStore() {
  const [records, setRecords] = useState<TravelRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const visited = useMemo(() => buildVisitedFromRecords(records), [records]);

  // 从 localStorage 加载数据
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      if (savedRecords) {
        const parsed = JSON.parse(savedRecords);
        setRecords(normalizeRecords(parsed));
      }
    } catch (e) {
      console.error("Failed to load records:", e);
      setRecords([]);
    } finally {
      setIsLoaded(true);
      try {
        localStorage.removeItem(VISITED_KEY);
      } catch (e) {
        console.error("Failed to clean legacy storage:", e);
      }
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch (e) {
        console.error("Failed to save records:", e);
      }
    }
  }, [records, isLoaded]);

  // 添加旅行记录
  const addRecord = useCallback(
    (record: Omit<TravelRecord, "id" | "createdAt">) => {
      const generatedId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const newRecord: TravelRecord = {
        ...record,
        id: generatedId,
        createdAt: Date.now(),
      };

      setRecords((prev) => [newRecord, ...prev]);

      return newRecord.id;
    },
    [],
  );

  // 删除旅行记录
  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // 获取统计数据
  const getStatistics = useCallback((): Statistics => {
    const totalCountries = WORLD_COUNTRIES.length;
    const totalProvinces = CHINA_PROVINCES.length;
    const totalCities = getTotalCities();

    // 计算精确日期的旅行天数
    let totalDays = 0;
    records.forEach((record) => {
      if (record.datePrecision === "day") {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        const days =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;
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
  const getProvinceStats = useCallback(
    (provinceName: string) => {
      const province = CHINA_PROVINCES.find((p) => p.name === provinceName);
      if (!province) return { total: 0, visited: 0, percentage: 0 };

      const total = province.cities.length;
      const visitedCities = province.cities.filter((c) =>
        visited.cities.has(c.name),
      ).length;

      return {
        total,
        visited: visitedCities,
        percentage: Math.round((visitedCities / total) * 100),
      };
    },
    [visited.cities],
  );

  // 获取已访问的城市列表（带坐标）
  const getVisitedCities = useCallback(() => {
    const result: {
      name: string;
      lat: number;
      lng: number;
      province: string;
    }[] = [];

    CHINA_PROVINCES.forEach((province) => {
      province.cities.forEach((city) => {
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
    return CHINA_PROVINCES.filter((p) => visited.provinces.has(p.name));
  }, [visited.provinces]);

  // 获取已访问的国家列表
  const getVisitedCountries = useCallback(() => {
    return WORLD_COUNTRIES.filter((c) => visited.countries.has(c.name));
  }, [visited.countries]);

  // 检查是否已访问
  const isVisited = useCallback(
    (type: "country" | "province" | "city", name: string) => {
      if (type === "country") return visited.countries.has(name);
      if (type === "province") return visited.provinces.has(name);
      return visited.cities.has(name);
    },
    [visited],
  );

  // 从分享数据导入
  const importFromShare = useCallback((data: unknown) => {
    const parsed = isRecord(data) ? normalizeRecords(data.records) : [];
    setRecords(parsed);
  }, []);

  // 清空数据
  const clearAll = useCallback(() => {
    setRecords([]);
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
