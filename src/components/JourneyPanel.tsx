import { startTransition, useEffect, useMemo, useState } from 'react';
import type { Journey, JourneyLocation, JourneyTransportMode } from '../types/journey';
import { getTravelStats } from '../utils/travelStats';
import { formatJourneyDate, getJourneyDateTimestamp } from '../utils/journeyDate';
import { filterJourneysByRecordFilter } from '../utils/journeyRecordFilter';
import type { JourneyRecordFilter } from '../types/journey';
import { getCountryNameForLocation } from '../data/locationData';
import { getWorldCountryIso3, TOTAL_MAPPED_WORLD_COUNTRIES } from '../data/worldCountryIso3';
import TransportModeIcon from './TransportModeIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  passengerName: string;
  journeys: Journey[];
  activeFilter: JourneyRecordFilter | null;
  deleteJourney: (id: string) => void;
  exportRecord: () => void;
  selectedJourneyId: string | null;
  editingJourneyId?: string | null;
  onSelectJourney: (id: string) => void;
  onEditJourney: (journey: Journey) => void;
  onClearFilter: () => void;
}

const TYPE_LABEL: Record<JourneyLocation['type'], string> = {
  country: '国家',
  province: '省份',
  city: '城市',
};

const TYPE_DOT: Record<JourneyLocation['type'], string> = {
  country: 'bg-slate-500',
  province: 'bg-stone-400',
  city: 'bg-sky-500/70',
};

const TRAIN_TICKET_ID = '370306 20260203 XXXX';
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

function getJourneyTransportMode(journey: Journey): JourneyTransportMode {
  if (journey.transportMode) {
    return journey.transportMode;
  }

  if (journey.showEndpoints === false) {
    return 'default';
  }

  return journey.locations.length <= 2 ? 'train' : 'default';
}

function getTicketReference(journey: Journey, index: number, transportMode: JourneyTransportMode) {
  const digits = journey.id.replace(/\D/g, '');

  if (transportMode === 'flight') {
    const base = (digits.slice(0, 3) || `${223 + index}`).padEnd(3, '0');
    return `AA${base.slice(0, 3)}`;
  }

  const trainNo = Number.parseInt((digits.slice(0, 4) || `${6262 + index}`).slice(0, 4), 10);
  return `D${Number.isNaN(trainNo) ? 6262 + index : trainNo}`;
}

function getTicketSerial(journey: Journey, index: number, transportMode: JourneyTransportMode) {
  const seed = journey.id.replace(/-/g, '').toUpperCase();

  if (transportMode === 'flight') {
    return seed.slice(0, 8) || `BP${String(index + 1).padStart(6, '0')}`;
  }

  return `Z${(seed.slice(0, 9) || String(index + 14941).padStart(9, '0')).slice(0, 9)}`;
}

function getFlightStubLabel(index: number) {
  return {
    title: 'Gate',
    value: String((index % 8) + 1).padStart(2, '0'),
  };
}

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

function getJourneyTimestamp(journey: Journey) {
  if (!journey.date) return null;

  const timestamp = getJourneyDateTimestamp(journey.date);
  return timestamp === 0 ? null : timestamp;
}

function compareJourneysByNewest(left: Journey, right: Journey) {
  const leftTimestamp = getJourneyTimestamp(left);
  const rightTimestamp = getJourneyTimestamp(right);

  if (leftTimestamp === null && rightTimestamp === null) {
    return left.id.localeCompare(right.id);
  }

  if (leftTimestamp === null) return 1;
  if (rightTimestamp === null) return -1;

  if (rightTimestamp !== leftTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return left.id.localeCompare(right.id);
}

function compareJourneysByOldest(left: Journey, right: Journey) {
  const leftTimestamp = getJourneyTimestamp(left);
  const rightTimestamp = getJourneyTimestamp(right);

  if (leftTimestamp === null && rightTimestamp === null) {
    return left.id.localeCompare(right.id);
  }

  if (leftTimestamp === null) return 1;
  if (rightTimestamp === null) return -1;

  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return left.id.localeCompare(right.id);
}

export default function JourneyPanel({
  isOpen,
  onClose,
  passengerName,
  journeys,
  activeFilter,
  deleteJourney,
  exportRecord,
  selectedJourneyId,
  editingJourneyId = null,
  onSelectJourney,
  onEditJourney,
  onClearFilter,
}: Props) {
  const stats = useMemo(() => getTravelStats(journeys), [journeys]);
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
  const visibleJourneys = useMemo(
    () => filterJourneysByRecordFilter(journeys, activeFilter),
    [activeFilter, journeys],
  );
  const sortedJourneys = useMemo(
    () => [...visibleJourneys].sort(compareJourneysByNewest),
    [visibleJourneys],
  );
  const entryNumberById = useMemo(
    () => new Map(
      [...journeys]
        .sort(compareJourneysByOldest)
        .map((journey, index) => [journey.id, index + 1]),
    ),
    [journeys],
  );
  const worldFootprintCount = visitedCountryCodes.length;
  const worldFootprintTotal = TOTAL_MAPPED_WORLD_COUNTRIES;
  const worldFootprintProgress = worldFootprintTotal === 0 ? 0 : (worldFootprintCount / worldFootprintTotal) * 100;

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="关闭旅程面板"
        className="fixed inset-0 z-[1900] bg-slate-950/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 z-[2000] flex h-full w-full max-w-[30rem] flex-col overflow-hidden border-l border-stone-200/80 bg-[#f6f1e8] text-stone-800 shadow-[-24px_0_60px_rgba(15,23,42,0.16)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_18%,rgba(255,255,255,0)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0)_36%)]" />

        <div className="relative flex items-start justify-between border-b border-stone-200/80 px-6 py-5">
          <div className="max-w-sm">
            <p className="text-[10px] uppercase tracking-[0.36em] text-stone-500">Travel Register</p>
            <h2 className="font-editorial mt-3 text-[2rem] leading-none text-stone-900">我的旅程</h2>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/80 text-stone-500 transition hover:border-stone-300 hover:text-stone-900"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto">
          <div className="space-y-7 px-6 py-5">
            <section>
              <div className="border-b border-stone-200/80 pb-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Field Notes</p>
                    <h3 className="font-editorial mt-3 text-[1.9rem] leading-none text-stone-900">旅行概览</h3>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Entries</p>
                    <p className="font-editorial font-tabular mt-2 text-[2.75rem] leading-none text-stone-900">
                      {stats.journeyCount}
                    </p>
                  </div>
                </div>

              </div>

              <div className="mt-4">
                <WorldFootprintBoard
                  visitedCountryCodes={visitedCountryCodes}
                  worldFootprintCount={worldFootprintCount}
                  worldFootprintProgress={worldFootprintProgress}
                  worldFootprintTotal={worldFootprintTotal}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
                <StatBlock
                  label="国家"
                  value={stats.countryCount}
                  accentClassName="bg-slate-500"
                />
                <StatBlock
                  label="省份"
                  value={stats.provinceCount}
                  accentClassName="bg-stone-400"
                />
              </div>

              <div className="mt-5 divide-y divide-stone-200/80 border-t border-stone-200/80">
                <ProgressMeter
                  label="中国旅行进度"
                  value={stats.chinaProgress}
                  numerator={stats.chinaVisitedUnits}
                  denominator={stats.totalChinaUnits}
                  railClassName="bg-stone-200"
                  fillClassName="bg-stone-800"
                />
              </div>
            </section>

            <section className="border-t border-stone-300/70 pt-5 pb-3">
              <div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Archive</p>
                  <h3 className="font-editorial mt-2 text-[1.65rem] leading-none text-stone-900">旅程档案</h3>
                </div>
              </div>

              {activeFilter && (
                <div className="mt-4 flex items-center justify-between gap-4 rounded-[22px] border border-stone-200/90 bg-white/68 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Location Filter</p>
                    <p className="mt-1 truncate text-sm text-stone-800">
                      正在查看
                      <span className="mx-1 font-medium text-stone-900">{activeFilter.label}</span>
                      相关的旅程
                    </p>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
                    onClick={onClearFilter}
                  >
                    清除
                  </button>
                </div>
              )}

              <div className="mt-5">
                {sortedJourneys.length === 0 ? (
                  activeFilter ? (
                    <div className="bg-[#fcf8f1] px-5 py-10 text-center">
                      <p className="font-editorial text-[1.4rem] text-stone-900">这里还没有对应的旅程记录</p>
                      <button
                        type="button"
                        className="mt-5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
                        onClick={onClearFilter}
                      >
                        查看全部旅程
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#fcf8f1] px-5 py-10 text-center">
                      <p className="font-editorial text-[1.4rem] text-stone-900">旅行档案还是空白的</p>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {sortedJourneys.map((journey, index) => (
                      <JourneyCard
                        key={journey.id}
                        journey={journey}
                        index={index}
                        entryNumber={entryNumberById.get(journey.id) ?? index + 1}
                        passengerName={passengerName}
                        onDelete={deleteJourney}
                        onEdit={() => onEditJourney(journey)}
                        editing={journey.id === editingJourneyId}
                        selected={journey.id === selectedJourneyId}
                        onSelect={() => onSelectJourney(journey.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="relative border-t border-stone-200/80 bg-white/50 px-6 py-5 backdrop-blur-md">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-stone-800 transition hover:text-stone-950"
            onClick={exportRecord}
          >
            <p className="text-sm text-stone-800">导出 JSON</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/70 text-stone-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </span>
          </button>
        </div>
      </aside>
    </>
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
    <div className="relative overflow-hidden rounded-[28px] border border-stone-200/80 bg-[#202427] px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_52%)]" />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">World Footprint</p>
          <h4 className="font-editorial mt-2 text-[1.55rem] leading-none text-white">世界旅行足迹</h4>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-editorial font-tabular text-[2.15rem] leading-none text-[#b5e8fb]">
            {formatPercent(worldFootprintProgress)}
            <span className="ml-0.5 text-base text-white/45">%</span>
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/42">
            {worldFootprintCount} / {worldFootprintTotal}
          </p>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-[#171b1e] px-3 py-3">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px)] [background-size:18px_18px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(181,232,251,0.08)_0%,rgba(181,232,251,0)_72%)]" />

        <div className="relative h-[11.25rem] overflow-hidden">
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

      <div className="relative mt-4 flex items-center justify-between gap-4">
        <p className="text-sm leading-6 text-white/74">
          已点亮 <span className="font-tabular text-white">{worldFootprintCount}</span> 个国家与地区
        </p>

        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.22em] text-white/42">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#b5e8fb] shadow-[0_0_12px_rgba(181,232,251,0.5)]" />
            Visited
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            World
          </span>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: number;
  accentClassName: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accentClassName}`} />
        <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">{label}</p>
      </div>
      <p className="font-editorial font-tabular mt-3 text-[2.2rem] leading-none text-stone-900">{value}</p>
    </div>
  );
}

function ProgressMeter({
  label,
  value,
  numerator,
  denominator,
  railClassName,
  fillClassName,
}: {
  label: string;
  value: number;
  numerator: number;
  denominator: number;
  railClassName: string;
  fillClassName: string;
}) {
  const visualValue = value === 0 ? 0 : Math.max(value, 3.5);

  return (
    <div className="py-5">
      <div className="flex items-end justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">{label}</p>
        <div className="text-right">
          <p className="font-editorial font-tabular text-[2.15rem] leading-none text-stone-900">
            {formatPercent(value)}
            <span className="ml-0.5 text-base text-stone-500">%</span>
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-stone-500">
            {numerator} / {denominator}
          </p>
        </div>
      </div>

      <div className={`mt-4 h-2 overflow-hidden rounded-full ${railClassName}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${fillClassName}`}
          style={{ width: `${visualValue}%` }}
        />
      </div>
    </div>
  );
}

function JourneyCard({
  journey,
  index,
  entryNumber,
  passengerName,
  onDelete,
  onEdit,
  editing,
  selected,
  onSelect,
}: {
  journey: Journey;
  index: number;
  entryNumber: number;
  passengerName: string;
  onDelete: (id: string) => void;
  onEdit: () => void;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const transportMode = getJourneyTransportMode(journey);
  const isFlightTicket = transportMode === 'flight';
  const isDefaultLayout = transportMode === 'default';
  const isMultiStopJourney = journey.locations.length > 2;
  const usesLedgerLayout = isMultiStopJourney || isDefaultLayout;
  const ticketLabel = isFlightTicket ? 'Boarding Pass' : 'Rail Ticket';
  const ticketReference = getTicketReference(journey, index, transportMode);
  const ticketSerial = getTicketSerial(journey, index, transportMode);
  const flightStubLabel = isFlightTicket ? getFlightStubLabel(index) : null;
  const displayFrom = journey.departure?.label ?? journey.locations[0]?.label ?? '待补出发地';
  const displayTo = journey.destination?.label ?? journey.locations[journey.locations.length - 1]?.label ?? '待补目的地';
  const formattedJourneyDate = journey.date ? formatJourneyDate(journey.date) : '--.--.--';
  const displayPassengerName = passengerName.trim() || '未设置';
  const entryLabel = `Entry ${String(entryNumber).padStart(2, '0')}`;
  const articleClassName = isFlightTicket
    ? editing
      ? 'border-[#dcbf82] shadow-[0_28px_56px_-40px_rgba(217,119,6,0.3)]'
      : selected
        ? 'border-[#ddb879] shadow-[0_28px_56px_-40px_rgba(217,119,6,0.24)]'
        : 'border-[#ead9b8] hover:border-[#e2bf7d]'
    : editing
      ? 'border-[#89d2eb] shadow-[0_28px_56px_-40px_rgba(8,145,178,0.28)]'
      : selected
        ? 'border-[#7fd3ef] shadow-[0_28px_56px_-40px_rgba(8,145,178,0.22)]'
        : 'border-[#a9dff1] hover:border-[#7fd1ec]';
  const routeShellClassName = isFlightTicket
    ? 'border-[#e7dcc9] bg-white/92'
    : 'border-[#89cee7] bg-[#f5fbfe]';
  const stubClassName = isFlightTicket
    ? 'border-[#ead9b8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(249,245,239,0.98)_100%)]'
    : 'border-[#8fd4ec] bg-[#dff2f9]';
  const contentPaddingClassName = isFlightTicket ? 'px-5 pb-5 pt-[4.35rem] sm:px-6' : 'px-5 pb-10 pt-5 sm:px-6';
  const stubPaddingClassName = isFlightTicket ? 'px-3 pb-4 pt-[4.35rem]' : 'px-3 pb-10 pt-4';
  const ticketGridClassName = isFlightTicket ? 'grid grid-cols-[minmax(0,1fr)_5.75rem]' : 'grid grid-cols-1';
  const actionButtonClassName = 'flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-stone-400 transition hover:border-white/80 hover:bg-white/82';

  if (usesLedgerLayout) {
    return (
      <article
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        className={`group relative overflow-hidden rounded-[30px] border text-left outline-none transition ${
          editing
            ? 'border-stone-300 shadow-[0_28px_56px_-40px_rgba(15,23,42,0.18)]'
            : selected
              ? 'border-stone-300 shadow-[0_28px_56px_-40px_rgba(15,23,42,0.14)]'
              : 'border-stone-200/90 hover:border-stone-300'
        }`}
        onClick={onSelect}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="absolute inset-0 bg-[#fbf8f2]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(120,113,108,0.06)_0%,rgba(120,113,108,0.06)_1px,transparent_1px,transparent_3.2rem)] opacity-36" />
        <div className="relative px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-stone-500">Journey Ledger</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-stone-400">{entryLabel}</p>

              <h4 className="font-editorial mt-4 text-[1.45rem] leading-snug text-stone-900">
                {journey.url ? (
                  <a
                    href={journey.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-stone-700"
                    onClick={event => event.stopPropagation()}
                  >
                    {journey.title}
                  </a>
                ) : (
                  journey.title
                )}
              </h4>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-3 text-right">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Date</p>
                <p className="font-tabular mt-2 text-sm text-stone-800">{formattedJourneyDate}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="修改旅程"
                  className={`${actionButtonClassName} ${editing ? 'border-stone-300 bg-white/90 text-stone-700' : 'hover:text-stone-700'}`}
                  onClick={event => {
                    event.stopPropagation();
                    onEdit();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 14.536a4 4 0 01-1.414.95L7 17l1.514-4.122A4 4 0 019 11z" />
                  </svg>
                </button>

                <button
                  type="button"
                  title="删除旅程"
                  className={`${actionButtonClassName} hover:text-red-500`}
                  onClick={event => {
                    event.stopPropagation();
                    onDelete(journey.id);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-stone-200/90 bg-white/64 px-4 py-4">
            <div className="flex items-center gap-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Journey Order</p>
            </div>

            <div className="mt-4 space-y-3">
              {journey.locations.map((location, locationIndex) => (
                <div key={`${journey.id}-${location.type}-${location.name}-${locationIndex}`} className="grid grid-cols-[1.9rem_minmax(0,1fr)] gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-[11px] font-medium text-stone-600">
                      {locationIndex + 1}
                    </span>
                    {locationIndex < journey.locations.length - 1 && (
                      <span className="mt-1 block h-full w-px bg-stone-200/90" />
                    )}
                  </div>

                  <div className="pb-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/76 px-3 py-1.5 text-sm text-stone-700">
                      <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[location.type]}`} />
                      <span className="text-[10px] uppercase tracking-[0.22em] text-stone-400">{TYPE_LABEL[location.type]}</span>
                      <span>{location.label}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {journey.description && (
            <p className="mt-4 border-t border-dashed border-stone-200/90 pt-4 text-sm leading-7 text-stone-600">
              {journey.description}
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={`group relative overflow-hidden rounded-[30px] border text-left outline-none transition ${articleClassName}`}
      onClick={onSelect}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {isFlightTicket ? (
        <>
          <div className="absolute inset-0 bg-[#f6f1e7]" />
          <div className="absolute inset-x-0 top-0 h-12 bg-[linear-gradient(90deg,#f5b84e_0%,#efab38_56%,#e49b24_100%)]" />
          <div className="absolute inset-y-0 right-0 w-[5.75rem] border-l border-dashed border-[#d8cab2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,245,239,0.98)_100%)]" />
          <div className="absolute right-0 top-0 h-12 w-[5.75rem] bg-[linear-gradient(90deg,#f2b240_0%,#eaa32d_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_56%_60%,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.05)_18%,rgba(15,23,42,0)_19%),radial-gradient(circle_at_44%_66%,rgba(15,23,42,0.035)_0%,rgba(15,23,42,0.035)_14%,rgba(15,23,42,0)_15%),radial-gradient(circle_at_70%_70%,rgba(15,23,42,0.03)_0%,rgba(15,23,42,0.03)_15%,rgba(15,23,42,0)_16%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[#eaf7fc]" />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-[#58afd9]" />
          <div className="absolute inset-x-0 bottom-0 z-[1] flex h-8 items-center px-5 sm:px-6">
            <p className="font-tabular text-[10px] tracking-[0.26em] text-white/92">{TRAIN_TICKET_ID}</p>
          </div>
        </>
      )}

      <div className={ticketGridClassName}>
        <div className={`relative ${contentPaddingClassName}`}>
          {isFlightTicket ? (
            <div className="absolute inset-x-0 top-0 z-[1] flex h-12 items-center justify-between px-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3 text-stone-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/24 text-stone-950">
                  <TransportModeIcon mode={transportMode} tone="light" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-950/92">Boarding Pass</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-stone-900/68">{entryLabel}</p>
                </div>
              </div>

              <p className="font-tabular text-[11px] tracking-[0.14em] text-stone-950/92">{ticketSerial}</p>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {!isFlightTicket ? (
                <>
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-[#d33f49]">
                    {ticketSerial}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200/90 bg-white/84 text-sky-900">
                      <TransportModeIcon mode={transportMode} tone="light" className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-sky-950/72">
                        {ticketLabel}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-stone-500">{entryLabel}</p>
                    </div>
                  </div>
                </>
              ) : null}

              <h4 className={`font-editorial text-[1.45rem] leading-snug text-stone-900 ${isFlightTicket ? '' : 'mt-4'}`}>
                {journey.url ? (
                  <a
                    href={journey.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-stone-700"
                    onClick={event => event.stopPropagation()}
                  >
                    {journey.title}
                  </a>
                  ) : (
                    journey.title
                  )}
                </h4>
            </div>

            <div className={`shrink-0 ${isFlightTicket ? 'text-right' : 'flex flex-col items-end gap-3 text-right'}`}>
              {isFlightTicket ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Date</p>
                  <p className="font-tabular mt-2 text-sm text-stone-800">{formattedJourneyDate}</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Date</p>
                    <p className="font-tabular mt-2 text-sm text-stone-800">{formattedJourneyDate}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="修改旅程"
                      className={`${actionButtonClassName} ${editing ? 'border-sky-200 bg-white/90 text-sky-900' : 'hover:text-sky-900'}`}
                      onClick={event => {
                        event.stopPropagation();
                        onEdit();
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 14.536a4 4 0 01-1.414.95L7 17l1.514-4.122A4 4 0 019 11z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      title="删除旅程"
                      className={`${actionButtonClassName} hover:text-red-500`}
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(journey.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`mt-5 rounded-[24px] border px-4 py-4 ${routeShellClassName}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  {isFlightTicket ? 'From' : '始发'}
                </p>
                <p className={`mt-2 truncate leading-none text-stone-900 ${
                  isFlightTicket ? 'text-[1.5rem] font-semibold' : 'font-editorial text-[1.75rem]'
                }`}>
                  {displayFrom}
                </p>
              </div>

              <div className="flex min-w-[3rem] flex-col items-center gap-2 px-2">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isFlightTicket ? 'bg-stone-900 text-white' : 'bg-white/84 text-sky-950'
                }`}>
                  <TransportModeIcon mode={transportMode} tone="dark" className="h-4 w-4" />
                </span>
                <span className={`block w-10 border-t border-dashed ${
                  isFlightTicket ? 'border-stone-400' : 'border-sky-600/35'
                }`} />
              </div>

              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  {isFlightTicket ? 'To' : '终到'}
                </p>
                <p className={`mt-2 truncate leading-none text-stone-900 ${
                  isFlightTicket ? 'text-[1.5rem] font-semibold' : 'font-editorial text-[1.75rem]'
                }`}>
                  {displayTo}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-dashed border-stone-200/80 pt-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-600">{ticketReference}</p>
            </div>
          </div>

          {journey.description && (
            <p className="mt-4 border-t border-dashed border-stone-200/90 pt-4 text-sm leading-7 text-stone-600">
              {journey.description}
            </p>
          )}
        </div>

        {isFlightTicket ? (
          <div className={`relative flex flex-col items-center justify-between border-l border-dashed ${stubPaddingClassName} ${stubClassName}`}>
            <div className="absolute inset-x-0 top-0 h-12 bg-[linear-gradient(90deg,#f3b448_0%,#eba630_100%)]" />
            <div className="absolute inset-x-0 top-0 z-[1] flex h-12 flex-col items-center justify-center text-stone-950">
              <p className="text-[9px] uppercase tracking-[0.24em] text-stone-950/72">{flightStubLabel?.title}</p>
              <p className="font-tabular text-[11px] tracking-[0.18em] text-stone-950/92">{flightStubLabel?.value}</p>
            </div>

            <div className="relative flex flex-col items-center gap-2 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white/94 text-stone-700">
                <TransportModeIcon mode={transportMode} tone="dark" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Flight</p>
                <p className="mt-1 text-xs font-medium text-stone-800">Stub</p>
              </div>
            </div>

            <div className="relative flex flex-col items-center gap-2">
              <button
                type="button"
                title="删除旅程"
                className={`${actionButtonClassName} hover:text-red-500`}
                onClick={event => {
                  event.stopPropagation();
                  onDelete(journey.id);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <button
                type="button"
                title="修改旅程"
                className={`${actionButtonClassName} ${
                  editing
                    ? 'border-stone-300 bg-white/90 text-stone-700'
                    : 'hover:text-stone-700'
                }`}
                onClick={event => {
                  event.stopPropagation();
                  onEdit();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 14.536a4 4 0 01-1.414.95L7 17l1.514-4.122A4 4 0 019 11z" />
                </svg>
              </button>
            </div>

            <div className="relative text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Passenger</p>
              <p className="mt-1 max-w-[4.25rem] break-words text-[11px] font-medium leading-4 text-stone-900">
                {displayPassengerName}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
