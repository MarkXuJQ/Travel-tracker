import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Journey } from '../types/journey';
import { getProvinceTravelStats, getTravelStats, type ProvinceTravelStat } from '../utils/travelStats';
import { getCountryNameForLocation } from '../data/locationData';
import { getWorldCountryIso3 } from '../data/worldCountryIso3';

interface Props {
  isOpen: boolean;
  archiveOpen?: boolean;
  journeys: Journey[];
  selectedProvinceName?: string | null;
  onProvinceSelect?: (provinceName: string) => void;
  onToggle: () => void;
}

const WORLD_LED_MAP_SETTINGS = {
  height: 64,
  grid: 'diagonal' as const,
  projection: { name: 'robinson' as const },
  region: {
    lat: { min: -58, max: 84 },
    lng: { min: -180, max: 180 },
  },
};

let dottedMapModulePromise: Promise<typeof import('dotted-map')> | null = null;
let cachedWorldLedBaseSvg: string | null = null;
const MIN_DRAWER_HEIGHT = 320;
const DEFAULT_DRAWER_HEIGHT = 520;
const MIN_DRAG_HEIGHT = 26;
const CLOSE_THRESHOLD_HEIGHT = 92;
const CLOSE_ANIMATION_MS = 180;
const INERTIA_DISTANCE = 180;

function formatPercent(value: number) {
  if (value >= 10) return value.toFixed(0);
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function loadDottedMap() {
  if (!dottedMapModulePromise) {
    dottedMapModulePromise = import('dotted-map');
  }

  return dottedMapModulePromise;
}

function clampDrawerHeight(height: number, viewportHeight: number) {
  return Math.min(Math.max(height, MIN_DRAWER_HEIGHT), viewportHeight);
}

function clampDraggedDrawerHeight(height: number, viewportHeight: number) {
  return Math.min(Math.max(height, MIN_DRAG_HEIGHT), viewportHeight);
}

export default function JourneyOverviewDrawer({
  isOpen,
  archiveOpen = false,
  journeys,
  selectedProvinceName = null,
  onProvinceSelect,
  onToggle,
}: Props) {
  const stats = useMemo(() => getTravelStats(journeys), [journeys]);
  const provinceStats = useMemo(() => getProvinceTravelStats(journeys), [journeys]);
  const [drawerHeight, setDrawerHeight] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_DRAWER_HEIGHT;
    return clampDrawerHeight(Math.min(window.innerHeight * 0.42, DEFAULT_DRAWER_HEIGHT), window.innerHeight);
  });
  const dragStateRef = useRef<{
    startY: number;
    startHeight: number;
    lastY: number;
    lastTimestamp: number;
    velocityY: number;
  } | null>(null);
  const drawerHeightRef = useRef(drawerHeight);
  const lastSettledHeightRef = useRef(drawerHeight);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isClosingByDrag, setIsClosingByDrag] = useState(false);
  const visitedCountryNames = useMemo(() => {
    const countries = new Set<string>();

    for (const journey of journeys) {
      for (const location of journey.locations ?? []) {
        const countryName = getCountryNameForLocation(location);
        if (countryName && countryName !== 'Antarctica') {
          countries.add(countryName);
        }
      }
    }

    return countries;
  }, [journeys]);
  const visitedCountryCodes = useMemo(
    () => [...visitedCountryNames]
      .map(countryName => getWorldCountryIso3(countryName))
      .filter((countryCode): countryCode is string => Boolean(countryCode))
      .sort(),
    [visitedCountryNames],
  );
  const selectedProvinceStat = useMemo(
    () => provinceStats.find(province => province.geoName === selectedProvinceName)
      ?? provinceStats.find(province => province.visitedCount > 0)
      ?? provinceStats[0]
      ?? null,
    [provinceStats, selectedProvinceName],
  );
  const drawerPositionClassName = archiveOpen ? 'right-4 sm:right-[32rem]' : 'right-4';

  useEffect(() => {
    drawerHeightRef.current = drawerHeight;
  }, [drawerHeight]);

  useEffect(() => {
    const handleResize = () => {
      setDrawerHeight(currentHeight => {
        const nextHeight = clampDrawerHeight(Math.max(currentHeight, MIN_DRAWER_HEIGHT), window.innerHeight);
        lastSettledHeightRef.current = nextHeight;
        return nextHeight;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }

      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isOpen) {
      setIsClosingByDrag(false);
      setDrawerHeight(currentHeight => (
        currentHeight < MIN_DRAWER_HEIGHT
          ? lastSettledHeightRef.current
          : clampDrawerHeight(currentHeight, window.innerHeight)
      ));
      return;
    }

    setDrawerHeight(currentHeight => {
      const nextHeight = currentHeight < MIN_DRAWER_HEIGHT
        ? lastSettledHeightRef.current
        : clampDrawerHeight(currentHeight, window.innerHeight);
      lastSettledHeightRef.current = nextHeight;
      return nextHeight;
    });
  }, [isOpen]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    dragStateRef.current = {
      startY: event.clientY,
      startHeight: drawerHeightRef.current,
      lastY: event.clientY,
      lastTimestamp: event.timeStamp,
      velocityY: 0,
    };
    setIsResizing(true);
    setIsClosingByDrag(false);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    const finishDragInteraction = () => {
      dragStateRef.current = null;
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    const collapseDrawerFromDrag = () => {
      setIsClosingByDrag(true);
      setDrawerHeight(MIN_DRAG_HEIGHT);
      closeTimeoutRef.current = window.setTimeout(() => {
        closeTimeoutRef.current = null;
        setIsClosingByDrag(false);
        setDrawerHeight(lastSettledHeightRef.current);
        onToggle();
      }, CLOSE_ANIMATION_MS);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const deltaY = moveEvent.clientY - dragState.startY;
      const nextHeight = clampDraggedDrawerHeight(dragState.startHeight - deltaY, window.innerHeight);
      const elapsed = Math.max(moveEvent.timeStamp - dragState.lastTimestamp, 1);
      const instantVelocity = (moveEvent.clientY - dragState.lastY) / elapsed;

      dragState.velocityY = dragState.velocityY * 0.35 + instantVelocity * 0.65;
      dragState.lastY = moveEvent.clientY;
      dragState.lastTimestamp = moveEvent.timeStamp;
      setDrawerHeight(nextHeight);

      if (nextHeight <= MIN_DRAG_HEIGHT + 1 && dragState.velocityY >= 0) {
        finishDragInteraction();
        collapseDrawerFromDrag();
      }
    };

    const handlePointerUp = () => {
      const dragState = dragStateRef.current;
      const currentHeight = drawerHeightRef.current;

      finishDragInteraction();

      if (!dragState) return;

      const projectedHeight = currentHeight - dragState.velocityY * INERTIA_DISTANCE;

      if (currentHeight <= CLOSE_THRESHOLD_HEIGHT || projectedHeight <= CLOSE_THRESHOLD_HEIGHT) {
        collapseDrawerFromDrag();
        return;
      }

      const settledHeight = clampDrawerHeight(projectedHeight, window.innerHeight);
      lastSettledHeightRef.current = settledHeight;
      setDrawerHeight(settledHeight);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className={`fixed z-[2050] ${drawerPositionClassName} ${isOpen ? 'bottom-0' : 'bottom-16 sm:bottom-14'}`}>
      {isOpen ? (
        <aside
          className={`relative flex w-[calc(100vw-2rem)] max-w-[42rem] flex-col overflow-hidden rounded-t-[30px] border-x border-t border-stone-200/90 bg-[#f6f1e8] text-stone-800 shadow-[0_-12px_54px_-24px_rgba(15,23,42,0.32)] sm:w-[min(40vw,42rem)] ${
            isResizing
              ? ''
              : 'transition-[height,opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]'
          } ${isClosingByDrag ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
          style={{ height: drawerHeight }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-t-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.54)_0%,rgba(255,255,255,0)_26%)]" />

          <div className="relative flex justify-center px-5 pt-3">
            <button
              type="button"
              className="flex h-5 w-full cursor-row-resize items-center justify-center touch-none"
              onPointerDown={handleResizeStart}
              aria-label="拖拽调整旅程概览高度"
              title="拖拽调整旅程概览高度"
            >
              <span className={`h-1 w-14 rounded-full transition-colors ${isResizing ? 'bg-stone-500' : 'bg-stone-300'}`} />
            </button>
          </div>

          <div className="relative flex items-start justify-between border-b border-stone-200/80 px-5 pb-4 pt-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-stone-500">Travel Overview</p>
              <h3 className="font-editorial mt-2 text-[1.75rem] leading-none text-stone-900">旅程概览</h3>
            </div>

            <div className="flex items-start gap-3">
              <div className="pt-1 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Entries</p>
                <p className="font-editorial font-tabular mt-1 text-[1.8rem] leading-none text-stone-900">
                  {stats.journeyCount}
                </p>
              </div>

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-500 transition hover:border-stone-300 hover:text-stone-900"
                onClick={onToggle}
                aria-label="收起旅程概览"
                title="收起旅程概览"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 14l-7-7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-5">
              <WorldFootprintBoard
                visitedCountryCodes={visitedCountryCodes}
                worldFootprintCount={stats.worldVisitedUnits}
                worldFootprintProgress={stats.worldProgress}
                worldFootprintTotal={stats.totalWorldCountries}
              />

              <ProvinceProgressBoard
                chinaProgress={stats.chinaProgress}
                chinaVisitedCount={stats.cityCount}
                chinaTotalCount={stats.totalChinaCities}
                provinceStats={provinceStats}
                selectedProvince={selectedProvinceStat}
                onProvinceSelect={onProvinceSelect}
              />
            </div>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          className="flex items-center gap-3 rounded-full border border-stone-200/90 bg-[#f6f1e8] px-4 py-3 text-stone-800 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.28)] transition hover:border-stone-300 hover:bg-[#fbf8f2]"
          onClick={onToggle}
          aria-label="打开旅程概览"
          title="打开旅程概览"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19h16M7 15V9m5 6V5m5 10v-3" />
            </svg>
          </span>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Drawer</p>
            <p className="font-medium text-stone-900">旅程概览</p>
          </div>
        </button>
      )}
    </div>
  );
}

function WorldFootprintBoard({
  visitedCountryCodes,
  worldFootprintCount,
  worldFootprintProgress,
  worldFootprintTotal,
}: {
  visitedCountryCodes: string[];
  worldFootprintCount: number;
  worldFootprintProgress: number;
  worldFootprintTotal: number;
}) {
  const [worldMapSvgSet, setWorldMapSvgSet] = useState<{ baseSvg: string; highlightedSvg: string | null } | null>(null);
  const visitedCountryCodesKey = visitedCountryCodes.join(',');

  useEffect(() => {
    let cancelled = false;

    const buildWorldMapSvgSet = async () => {
      const { default: DottedMap } = await loadDottedMap();

      if (!cachedWorldLedBaseSvg) {
        cachedWorldLedBaseSvg = new DottedMap(WORLD_LED_MAP_SETTINGS).getSVG({
          shape: 'circle',
          radius: 0.18,
          color: '#5f666e',
          backgroundColor: 'transparent',
        });
      }

      const highlightedSvg = visitedCountryCodes.length > 0
        ? new DottedMap({
          ...WORLD_LED_MAP_SETTINGS,
          countries: visitedCountryCodes,
        }).getSVG({
          shape: 'circle',
          radius: 0.22,
          color: '#b5e8fb',
          backgroundColor: 'transparent',
        })
        : null;

      const baseSvg = cachedWorldLedBaseSvg;
      if (cancelled || !baseSvg) return;

      startTransition(() => {
        setWorldMapSvgSet({
          baseSvg,
          highlightedSvg,
        });
      });
    };

    void buildWorldMapSvgSet();

    return () => {
      cancelled = true;
    };
  }, [visitedCountryCodes, visitedCountryCodesKey]);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-stone-200/90 bg-[#202427] px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_52%)]" />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">World Footprint</p>
          <h4 className="font-editorial mt-2 text-[1.45rem] leading-none text-white">世界旅行足迹</h4>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-editorial font-tabular text-[1.95rem] leading-none text-[#b5e8fb]">
            {formatPercent(worldFootprintProgress)}
            <span className="ml-0.5 text-sm text-white/45">%</span>
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/42">
            {worldFootprintCount} / {worldFootprintTotal}
          </p>
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-[#171b1e] px-3 py-3">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px)] [background-size:18px_18px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(181,232,251,0.08)_0%,rgba(181,232,251,0)_72%)]" />

        <div className="relative h-[9.5rem] overflow-hidden">
          {worldMapSvgSet ? (
            <>
              <img
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-70"
                src={svgToDataUri(worldMapSvgSet.baseSvg)}
              />

              {worldMapSvgSet.highlightedSvg ? (
                <img
                  alt="已访问国家高亮世界地图"
                  className="absolute inset-0 h-full w-full object-contain opacity-95 drop-shadow-[0_0_18px_rgba(181,232,251,0.28)]"
                  src={svgToDataUri(worldMapSvgSet.highlightedSvg)}
                />
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(181,232,251,0.05)_0%,rgba(181,232,251,0)_70%)]" />
          )}
        </div>
      </div>
    </div>
  );
}

function ProvinceProgressBoard({
  chinaProgress,
  chinaVisitedCount,
  chinaTotalCount,
  provinceStats,
  selectedProvince,
  onProvinceSelect,
}: {
  chinaProgress: number;
  chinaVisitedCount: number;
  chinaTotalCount: number;
  provinceStats: ProvinceTravelStat[];
  selectedProvince: ProvinceTravelStat | null;
  onProvinceSelect?: (provinceName: string) => void;
}) {
  const [sortMode, setSortMode] = useState<'visited' | 'progress' | 'code'>('visited');
  const sortedProvinceStats = useMemo(() => {
    const ranked = [...provinceStats];

    if (sortMode === 'progress') {
      ranked.sort((left, right) =>
        right.progress - left.progress
        || right.visitedCount - left.visitedCount
        || left.code.localeCompare(right.code));
      return ranked;
    }

    if (sortMode === 'code') {
      ranked.sort((left, right) => left.code.localeCompare(right.code));
      return ranked;
    }

    ranked.sort((left, right) =>
      right.visitedCount - left.visitedCount
      || right.progress - left.progress
      || left.code.localeCompare(right.code));
    return ranked;
  }, [provinceStats, sortMode]);
  const selectedProvinceRank = useMemo(() => {
    if (!selectedProvince) return 0;

    const rankedByProgress = [...provinceStats].sort((left, right) =>
      right.progress - left.progress
      || right.visitedCount - left.visitedCount
      || left.code.localeCompare(right.code));

    return rankedByProgress.findIndex(province => province.geoName === selectedProvince.geoName) + 1;
  }, [provinceStats, selectedProvince]);
  const footprintUnits = useMemo(
    () => selectedProvince
      ? Array.from({ length: selectedProvince.totalCount }, (_, index) => index < selectedProvince.visitedCount)
      : [],
    [selectedProvince],
  );
  const sortOptions: Array<{ key: 'visited' | 'progress' | 'code'; label: string }> = [
    { key: 'visited', label: '已点亮' },
    { key: 'progress', label: '完成度' },
    { key: 'code', label: '省序' },
  ];

  if (provinceStats.length === 0 || !selectedProvince) return null;

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-stone-200/90 bg-white/78 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(255,255,255,0)_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0)_32%)]" />

      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">Province Progress</p>
          <h4 className="font-editorial mt-2 text-[1.45rem] leading-none text-stone-900">省份足迹</h4>
        </div>

        <div className="flex items-end gap-5 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">中国旅行足迹</p>
            <p className="font-editorial font-tabular mt-1 text-[1.55rem] leading-none text-stone-800">
              {formatPercent(chinaProgress)}
              <span className="ml-0.5 text-xs text-stone-400">%</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-400">
              {chinaVisitedCount} / {chinaTotalCount}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">当前省份</p>
            <p className="font-editorial font-tabular mt-1 text-[1.95rem] leading-none text-stone-900">
              {formatPercent(selectedProvince.progress)}
              <span className="ml-0.5 text-sm text-stone-500">%</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
              {selectedProvince.visitedCount} / {selectedProvince.totalCount}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(15rem,0.9fr)]">
        <section className="overflow-hidden rounded-[22px] border border-stone-200/80 bg-[#fbf7ef]">
          <div className="border-b border-stone-200/75 px-4 py-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-stone-500">Selected Province</p>
                <h5 className="font-editorial mt-2 text-[1.7rem] leading-none text-stone-900">{selectedProvince.name}</h5>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 text-right">
                <span className="rounded-full border border-stone-200 bg-white/84 px-3 py-1 text-[11px] tracking-[0.18em] text-stone-500">
                  全国第 {selectedProvinceRank}
                </span>
                <span className="rounded-full border border-stone-200 bg-white/84 px-3 py-1 text-[11px] tracking-[0.18em] text-stone-500">
                  还差 {selectedProvince.missingPlaces.length} 处
                </span>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200/80">
              <div
                className="h-full rounded-full bg-stone-800 transition-[width]"
                style={{ width: `${selectedProvince.progress}%` }}
              />
            </div>

            <div
              className="mt-3 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${Math.max(selectedProvince.totalCount, 1)}, minmax(0, 1fr))` }}
            >
              {footprintUnits.map((active, index) => (
                <span
                  key={`${selectedProvince.geoName}-${index}`}
                  className={`h-2 rounded-[3px] transition-colors ${
                    active ? 'bg-stone-900' : 'bg-stone-200/90'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 border-b border-stone-200/75 pb-2">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Visited</p>
                <p className="font-tabular text-[11px] text-stone-500">{selectedProvince.visitedPlaces.length}</p>
              </div>

              <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1">
                {selectedProvince.visitedPlaces.length > 0 ? (
                  selectedProvince.visitedPlaces.map(place => (
                    <div
                      key={place}
                      className="rounded-[12px] border border-stone-200/80 bg-white px-3 py-2 text-sm leading-tight text-stone-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                    >
                      {place}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">这一省还没有点亮记录。</p>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 border-b border-stone-200/75 pb-2">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Remaining</p>
                <p className="font-tabular text-[11px] text-stone-500">{selectedProvince.missingPlaces.length}</p>
              </div>

              <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1">
                {selectedProvince.missingPlaces.length > 0 ? (
                  selectedProvince.missingPlaces.map(place => (
                    <div
                      key={place}
                      className="rounded-[12px] border border-stone-200/80 bg-[#f7f2ea] px-3 py-2 text-sm leading-tight text-stone-700"
                    >
                      {place}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">这一省已经全部走到了。</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[22px] border border-stone-200/80 bg-white/86">
          <div className="border-b border-stone-200/75 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.26em] text-stone-500">All Provinces</p>
              <p className="font-tabular text-[11px] text-stone-400">{provinceStats.length}</p>
            </div>

            <div className="mt-3 inline-flex rounded-full border border-stone-200/80 bg-[#f7f1e7] p-1">
              {sortOptions.map(option => {
                const active = option.key === sortMode;

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-[11px] tracking-[0.16em] transition ${
                      active
                        ? 'bg-white text-stone-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    onClick={() => setSortMode(option.key)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[28rem] space-y-1 overflow-y-auto px-2 py-2">
            {sortedProvinceStats.map(province => {
              const selected = province.geoName === selectedProvince.geoName;

              return (
                <button
                  key={province.geoName}
                  type="button"
                  className={`w-full rounded-[18px] border px-3 py-3 text-left transition ${
                    selected
                      ? 'border-stone-300 bg-[#f7f1e7] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                      : 'border-transparent bg-transparent hover:border-stone-200/90 hover:bg-[#fbf7ef]'
                  }`}
                  onClick={() => onProvinceSelect?.(province.geoName)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-stone-900">{province.name}</p>
                      <p className="font-tabular text-[11px] text-stone-500">
                        {province.visitedCount}/{province.totalCount}
                      </p>
                    </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200/80">
                    <div
                      className={`h-full rounded-full transition-[width] ${selected ? 'bg-stone-900' : 'bg-stone-500'}`}
                      style={{ width: `${province.progress}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-stone-500">
                    <span>{formatPercent(province.progress)}%</span>
                    <span>{province.missingPlaces.length === 0 ? '已完整点亮' : `剩余 ${province.missingPlaces.length}`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
