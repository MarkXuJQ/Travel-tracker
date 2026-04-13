import { useMemo } from 'react';
import type { Journey, JourneyLocation, JourneyTransportMode } from '../types/journey';
import { getTravelStats } from '../utils/travelStats';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  journeys: Journey[];
  deleteJourney: (id: string) => void;
  exportRecord: () => void;
  selectedJourneyId: string | null;
  editingJourneyId?: string | null;
  onSelectJourney: (id: string) => void;
  onEditJourney: (journey: Journey) => void;
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

function getJourneyTransportMode(journey: Journey): JourneyTransportMode {
  return journey.transportMode ?? 'train';
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

function getTicketStubLabel(index: number, transportMode: JourneyTransportMode) {
  if (transportMode === 'flight') {
    return {
      title: 'Gate',
      value: String((index % 8) + 1).padStart(2, '0'),
    };
  }

  return {
    title: '检票',
    value: `B${(index % 9) + 1}`,
  };
}

function getJourneyRouteMeta(
  journey: Journey,
  transportMode: JourneyTransportMode,
) {
  if (journey.locations.length <= 1) {
    return transportMode === 'flight' ? '票面显示起讫地，足迹仍可继续补充。' : '票面显示起讫地，途中站点仍可继续补充。';
  }

  if (journey.locations.length === 2) {
    return transportMode === 'flight' ? '票面显示为单航段结构。' : '票面显示为直达车次结构。';
  }

  const viaCount = journey.locations.length - 2;
  return transportMode === 'flight' ? `票面外另记录 ${viaCount} 处中途停留。` : `票面外另记录 ${viaCount} 处沿途站点。`;
}

function TransportModeIcon({
  mode,
  className,
}: {
  mode: JourneyTransportMode;
  className?: string;
}) {
  if (mode === 'flight') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 13.5l7.4-1.8 4.2-7a1.1 1.1 0 011.96.14l.88 5 4.56 1.14a1.1 1.1 0 01.08 2.12l-4.64 1.42-.88 5a1.1 1.1 0 01-1.96.14l-4.18-7.06-7.42-1.64a1.1 1.1 0 010-2.16z" />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 15h16M6.5 18h11M7 6.5h10l1.8 4.5H5.2L7 6.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7.5 11V8.8m9 2.2V8.8" />
      <circle cx="8" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function formatPercent(value: number) {
  if (value >= 10) return value.toFixed(0);
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function formatPanelDate(date?: string) {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed).replace(/\//g, '.');
}

function getJourneyTimestamp(journey: Journey) {
  if (!journey.date) return 0;
  const timestamp = new Date(`${journey.date}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getHeaderMessage(userName: string, journeyCount: number) {
  if (journeyCount === 0) {
    return `${userName}，你的下一段路，值得从这里认真写下第一行。`;
  }

  if (journeyCount < 5) {
    return `${userName}，地图已经开始有回声了，下一站也别忘了留下日期。`;
  }

  if (journeyCount < 12) {
    return `${userName}，这些旅程正在慢慢把地图变成你的版本。`;
  }

  return `${userName}，这本旅程册已经越写越厚，新的页码还在继续往后翻。`;
}

function getOverviewMessage(journeyCount: number, footprintCount: number) {
  if (journeyCount === 0) {
    return '还没有任何记录，不过第一段旅程往往最值得记住。';
  }

  return `已经收进 ${journeyCount} 段旅程、${footprintCount} 个足迹单位，地图正在一点点被你点亮。`;
}

export default function JourneyPanel({
  isOpen,
  onClose,
  userName,
  journeys,
  deleteJourney,
  exportRecord,
  selectedJourneyId,
  editingJourneyId = null,
  onSelectJourney,
  onEditJourney,
}: Props) {
  const stats = useMemo(() => getTravelStats(journeys), [journeys]);
  const sortedJourneys = useMemo(
    () => [...journeys].sort((left, right) => getJourneyTimestamp(right) - getJourneyTimestamp(left)),
    [journeys],
  );
  const footprintCount = stats.countryCount + stats.provinceCount + stats.cityCount;
  const headerMessage = getHeaderMessage(userName, stats.journeyCount);
  const overviewMessage = getOverviewMessage(stats.journeyCount, footprintCount);

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

        <div className="relative flex items-start justify-between border-b border-stone-200/80 px-6 py-6">
          <div className="max-w-sm">
            <p className="text-[10px] uppercase tracking-[0.36em] text-stone-500">Travel Register</p>
            <h2 className="font-editorial mt-3 text-[2rem] leading-none text-stone-900">我的旅程</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{headerMessage}</p>
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
          <div className="space-y-9 px-6 py-6">
            <section>
              <div className="border-b border-stone-200/80 pb-5">
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

                <p className="mt-4 max-w-[22rem] text-sm leading-6 text-stone-600">
                  {overviewMessage}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6">
                <StatBlock
                  label="旅程记录"
                  value={stats.journeyCount}
                  note="已经写下来的完整旅程"
                  accentClassName="bg-stone-900"
                />
                <StatBlock
                  label="足迹单位"
                  value={footprintCount}
                  note="国家、省份与城市合计"
                  accentClassName="bg-stone-500"
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-6 border-t border-stone-200/80 pt-5">
                <StatBlock
                  label="国家"
                  value={stats.countryCount}
                  note="已点亮版图"
                  accentClassName="bg-slate-500"
                />
                <StatBlock
                  label="省份"
                  value={stats.provinceCount}
                  note={`共 ${stats.totalChinaProvinces} 个省级`}
                  accentClassName="bg-stone-400"
                />
                <StatBlock
                  label="城市"
                  value={stats.cityCount}
                  note={`共 ${stats.totalChinaCities} 个城市`}
                  accentClassName="bg-sky-500/70"
                />
              </div>

              <div className="mt-6 divide-y divide-stone-200/80 border-t border-stone-200/80">
                <ProgressMeter
                  label="中国旅行进度"
                  value={stats.chinaProgress}
                  numerator={stats.chinaVisitedUnits}
                  denominator={stats.totalChinaUnits}
                  description="按省级与城市点位数量估算"
                  railClassName="bg-stone-200"
                  fillClassName="bg-[linear-gradient(90deg,#1f2937_0%,#57534e_48%,#a8a29e_100%)]"
                />

                <ProgressMeter
                  label="世界旅行进度"
                  value={stats.worldProgress}
                  numerator={stats.worldVisitedUnits}
                  denominator={stats.totalWorldCountries}
                  description="按国家数量估算，不含南极洲"
                  railClassName="bg-stone-200"
                  fillClassName="bg-[linear-gradient(90deg,#0f172a_0%,#334155_52%,#94a3b8_100%)]"
                />
              </div>
            </section>

            <section className="border-t border-stone-300/70 pt-6 pb-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Archive</p>
                  <h3 className="font-editorial mt-2 text-[1.65rem] leading-none text-stone-900">旅程档案</h3>
                </div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">按时间倒序 · 点击条目预览路线</p>
              </div>

              <div className="mt-5">
                {sortedJourneys.length === 0 ? (
                  <div className="bg-[#fcf8f1] px-5 py-10 text-center">
                    <p className="font-editorial text-[1.4rem] text-stone-900">旅行档案还是空白的</p>
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      从 {userName} 的第一段路开始记起。哪怕只是一次周末出走，也值得留下脚注。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedJourneys.map((journey, index) => (
                      <JourneyCard
                        key={journey.id}
                        journey={journey}
                        index={index}
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
            <div>
              <p className="text-[10px] uppercase tracking-[0.26em] text-stone-500">Export</p>
              <p className="mt-1 text-sm text-stone-800">导出当前用户 JSON</p>
            </div>
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

function StatBlock({
  label,
  value,
  note,
  accentClassName,
}: {
  label: string;
  value: number;
  note: string;
  accentClassName: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accentClassName}`} />
        <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">{label}</p>
      </div>
      <p className="font-editorial font-tabular mt-3 text-[2.2rem] leading-none text-stone-900">{value}</p>
      <p className="mt-2 max-w-[12rem] text-xs leading-5 text-stone-500">{note}</p>
    </div>
  );
}

function ProgressMeter({
  label,
  value,
  numerator,
  denominator,
  description,
  railClassName,
  fillClassName,
}: {
  label: string;
  value: number;
  numerator: number;
  denominator: number;
  description: string;
  railClassName: string;
  fillClassName: string;
}) {
  const visualValue = value === 0 ? 0 : Math.max(value, 3.5);

  return (
    <div className="py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">{label}</p>
          <p className="mt-2 max-w-[15rem] text-sm leading-6 text-stone-600">{description}</p>
        </div>
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

      <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-stone-400">
        <span>Start</span>
        <span>Current Reach</span>
      </div>
    </div>
  );
}

function JourneyCard({
  journey,
  index,
  onDelete,
  onEdit,
  editing,
  selected,
  onSelect,
}: {
  journey: Journey;
  index: number;
  onDelete: (id: string) => void;
  onEdit: () => void;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const transportMode = getJourneyTransportMode(journey);
  const isMultiStopJourney = journey.locations.length > 2;
  const ticketLabel = transportMode === 'flight' ? 'Boarding Pass' : 'Rail Ticket';
  const ticketNote = transportMode === 'flight' ? '登机牌档案' : '车票档案';
  const routeMeta = getJourneyRouteMeta(journey, transportMode);
  const ticketReference = getTicketReference(journey, index, transportMode);
  const ticketSerial = getTicketSerial(journey, index, transportMode);
  const stubLabel = getTicketStubLabel(index, transportMode);
  const displayFrom = journey.departure?.label ?? journey.locations[0]?.label ?? '待补出发地';
  const displayTo = journey.destination?.label ?? journey.locations[journey.locations.length - 1]?.label ?? '待补目的地';
  const hasRoutePreview = journey.locations.filter(location => location.type === 'city').length > 1
    || journey.locations.filter(location => location.coords).length > 1;
  const previewText = editing
    ? '正在编辑这张票据'
    : selected
      ? (hasRoutePreview ? '路线预览中' : '地点预览中')
      : (hasRoutePreview ? '点击查看路线' : '点击定位地点');
  const articleClassName = transportMode === 'flight'
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
  const routeShellClassName = transportMode === 'flight'
    ? 'border-[#e7dcc9] bg-white/92'
    : 'border-[#85cee8] bg-white/34';
  const locationChipClassName = transportMode === 'flight'
    ? 'border-[#e7dcc9] bg-[#fffdf9]'
    : 'border-[#8fd4ec] bg-white/56';
  const stubClassName = transportMode === 'flight'
    ? 'border-[#ead9b8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(249,245,239,0.98)_100%)]'
    : 'border-[#8fd4ec] bg-[linear-gradient(180deg,rgba(241,251,255,0.92)_0%,rgba(221,245,252,0.92)_100%)]';

  if (isMultiStopJourney) {
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffdfa_0%,#f7f1e7_52%,#f3ede3_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.03)_0%,rgba(15,23,42,0.03)_1px,transparent_1px,transparent_3.2rem)] opacity-35" />
        <div className="absolute inset-y-0 right-0 w-[4.75rem] border-l border-dashed border-stone-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(249,245,239,0.92)_100%)]" />

        <div className="grid grid-cols-[minmax(0,1fr)_4.75rem]">
          <div className="relative px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.32em] text-stone-500">Route Ledger</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-stone-400">
                  Entry {String(index + 1).padStart(2, '0')} · 多站旅程档案
                </p>

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
                <p className={`mt-2 text-[10px] uppercase tracking-[0.24em] ${editing || selected ? 'text-stone-700' : 'text-stone-500'}`}>
                  {previewText}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Date</p>
                <p className="font-tabular mt-2 text-sm text-stone-800">{journey.date ? formatPanelDate(journey.date) : '--.--.--'}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-stone-200/90 bg-white/64 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Start</p>
                  <p className="font-editorial mt-2 truncate text-[1.55rem] leading-none text-stone-900">
                    {displayFrom}
                  </p>
                </div>

                <div className="flex min-w-[4rem] flex-col items-center gap-2 px-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-900 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h16m0 0l-4-4m4 4l-4 4" />
                    </svg>
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-stone-400">
                    {journey.locations.length} Stops
                  </span>
                </div>

                <div className="min-w-0 text-right">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">End</p>
                  <p className="font-editorial mt-2 truncate text-[1.55rem] leading-none text-stone-900">
                    {displayTo}
                  </p>
                </div>
              </div>

              <p className="mt-4 border-t border-dashed border-stone-200/90 pt-3 text-xs leading-6 text-stone-600">
                这段旅程记录了多个停留点，所以会以行程单方式展示完整顺序，而不是压缩成单张票据。
              </p>
            </div>

            <div className="mt-5 rounded-[24px] border border-stone-200/90 bg-white/64 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Journey Order</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">{journey.locations.length} Stops</p>
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

            <p className="mt-4 text-xs leading-6 text-stone-600">
              地图会按这个顺序展示整段路线。如果你想调整顺序，回到编辑里重新排序地点即可。
            </p>

            {journey.description && (
              <p className="mt-4 border-t border-dashed border-stone-200/90 pt-4 text-sm leading-7 text-stone-600">
                {journey.description}
              </p>
            )}
          </div>

          <div className="relative flex flex-col items-center justify-between px-3 py-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Mode</p>
              <p className="mt-1 text-xs font-medium text-stone-800">Route</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                title="删除旅程"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-stone-400 transition hover:border-white/80 hover:bg-white/82 hover:text-red-500"
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
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  editing
                    ? 'border-stone-300 bg-white/90 text-stone-700'
                    : 'border-transparent text-stone-400 hover:border-white/80 hover:bg-white/82 hover:text-stone-700'
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

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Count</p>
              <p className="font-tabular mt-1 text-lg text-stone-900">{journey.locations.length}</p>
            </div>
          </div>
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
      {transportMode === 'flight' ? (
        <>
          <div className="absolute inset-0 bg-[#f6f1e7]" />
          <div className="absolute inset-x-0 top-0 h-12 bg-[linear-gradient(90deg,#f5b84e_0%,#efab38_56%,#e49b24_100%)]" />
          <div className="absolute inset-y-0 right-0 w-[5.75rem] border-l border-dashed border-[#d8cab2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,245,239,0.98)_100%)]" />
          <div className="absolute right-0 top-0 h-12 w-[5.75rem] bg-[linear-gradient(90deg,#f2b240_0%,#eaa32d_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_56%_60%,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.05)_18%,rgba(15,23,42,0)_19%),radial-gradient(circle_at_44%_66%,rgba(15,23,42,0.035)_0%,rgba(15,23,42,0.035)_14%,rgba(15,23,42,0)_15%),radial-gradient(circle_at_70%_70%,rgba(15,23,42,0.03)_0%,rgba(15,23,42,0.03)_15%,rgba(15,23,42,0)_16%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#f1fcff_0%,#e3f8ff_42%,#c7eefc_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-7 bg-[linear-gradient(90deg,#5dbddf_0%,#81dcef_48%,#56afd9_100%)]" />
          <div className="absolute inset-y-0 right-0 w-[5.75rem] border-l border-dashed border-[#89cee7] bg-[linear-gradient(180deg,rgba(234,250,255,0.9)_0%,rgba(212,241,251,0.94)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_34%,rgba(255,255,255,0.56)_0%,rgba(255,255,255,0.16)_14%,rgba(255,255,255,0)_34%),radial-gradient(circle_at_65%_64%,rgba(123,211,238,0.22)_0%,rgba(123,211,238,0)_26%)]" />
        </>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_5.75rem]">
        <div className="relative px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold tracking-[0.08em] ${
                transportMode === 'flight' ? 'text-stone-900' : 'text-[#d33f49]'
              }`}>
                {ticketSerial}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  transportMode === 'flight'
                    ? 'border-stone-300 bg-white/90 text-stone-700'
                    : 'border-sky-200/90 bg-white/84 text-sky-900'
                }`}>
                  <TransportModeIcon mode={transportMode} className="h-4 w-4" />
                </span>
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.3em] ${
                    transportMode === 'flight' ? 'text-stone-900' : 'text-sky-950/72'
                  }`}>
                    {ticketLabel}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-stone-500">
                    Entry {String(index + 1).padStart(2, '0')} · {ticketNote}
                  </p>
                </div>
              </div>

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
              <p className={`mt-2 text-[10px] uppercase tracking-[0.24em] ${editing || selected ? 'text-stone-700' : 'text-stone-500'}`}>
                {previewText}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-[0.26em] text-stone-500">
                {transportMode === 'flight' ? 'Boarding Pass' : '检票'}
              </p>
              <p className="font-tabular mt-2 text-sm text-stone-800">{stubLabel.value}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-stone-500">
                {journey.date ? formatPanelDate(journey.date) : '--.--.--'}
              </p>
            </div>
          </div>

          <div className={`mt-5 rounded-[24px] border px-4 py-4 ${routeShellClassName}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  {transportMode === 'flight' ? 'From' : '始发'}
                </p>
                <p className={`mt-2 truncate leading-none text-stone-900 ${
                  transportMode === 'flight' ? 'text-[1.5rem] font-semibold' : 'font-editorial text-[1.75rem]'
                }`}>
                  {displayFrom}
                </p>
              </div>

              <div className="flex min-w-[3rem] flex-col items-center gap-2 px-2">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  transportMode === 'flight' ? 'bg-stone-900 text-white' : 'bg-white/84 text-sky-950'
                }`}>
                  <TransportModeIcon mode={transportMode} className="h-4 w-4" />
                </span>
                <span className={`block w-10 border-t border-dashed ${
                  transportMode === 'flight' ? 'border-stone-400' : 'border-sky-600/35'
                }`} />
              </div>

              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                  {transportMode === 'flight' ? 'To' : '终到'}
                </p>
                <p className={`mt-2 truncate leading-none text-stone-900 ${
                  transportMode === 'flight' ? 'text-[1.5rem] font-semibold' : 'font-editorial text-[1.75rem]'
                }`}>
                  {displayTo}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-stone-200/80 pt-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-600">{ticketReference}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                {journey.locations.length} {journey.locations.length > 1 ? 'Stops' : 'Stop'}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Journey Stops</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                {journey.locations.length} {journey.locations.length > 1 ? 'Stops' : 'Stop'}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {journey.locations.map((location, locationIndex) => (
                <span
                  key={`${journey.id}-${location.type}-${location.name}-${locationIndex}`}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm leading-none text-stone-700 ${locationChipClassName}`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    transportMode === 'flight' ? 'border-stone-200 bg-stone-50' : 'border-sky-200 bg-white/72'
                  } text-[10px] font-medium text-stone-500`}>
                    {locationIndex + 1}
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[location.type]}`} />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-stone-400">{TYPE_LABEL[location.type]}</span>
                  <span>{location.label}</span>
                </span>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs leading-6 text-stone-600">{routeMeta}</p>

          {journey.description && (
            <p className="mt-4 border-t border-dashed border-stone-200/90 pt-4 text-sm leading-7 text-stone-600">
              {journey.description}
            </p>
          )}
        </div>

        <div className={`relative flex flex-col items-center justify-between border-l border-dashed px-3 py-4 ${stubClassName}`}>
          {transportMode === 'flight' ? (
            <div className="absolute inset-x-0 top-0 h-12 bg-[linear-gradient(90deg,#f3b448_0%,#eba630_100%)]" />
          ) : (
            <div className="absolute inset-x-0 bottom-0 h-7 bg-[linear-gradient(90deg,#5ebddf_0%,#81dcef_48%,#57afd9_100%)]" />
          )}

          <div className="relative flex flex-col items-center gap-2 text-center">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${
              transportMode === 'flight'
                ? 'border-stone-300 bg-white/94 text-stone-700'
                : 'border-sky-200 bg-white/84 text-sky-900'
            }`}>
              <TransportModeIcon mode={transportMode} className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
                {stubLabel.title}
              </p>
              <p className="mt-1 text-xs font-medium text-stone-800">{stubLabel.value}</p>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-2">
            <button
              type="button"
              title="删除旅程"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-stone-400 transition hover:border-white/80 hover:bg-white/82 hover:text-red-500"
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
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                editing
                  ? 'border-stone-300 bg-white/90 text-stone-700'
                  : 'border-transparent text-stone-400 hover:border-white/80 hover:bg-white/82 hover:text-stone-700'
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
            <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
              {transportMode === 'flight' ? 'Passenger' : 'Count'}
            </p>
            <p className="font-tabular mt-1 text-lg text-stone-900">
              {transportMode === 'flight' ? String(journey.locations.length).padStart(2, '0') : journey.locations.length}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
