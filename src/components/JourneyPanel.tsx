import { useMemo, useState } from 'react';
import type { Journey, JourneyLocation } from '../types/journey';
import { getTravelStats } from '../utils/travelStats';
import LocationPicker from './LocationPicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  journeys: Journey[];
  addJourney: (journey: Omit<Journey, 'id'>) => void;
  deleteJourney: (id: string) => void;
  exportRecord: () => void;
}

const emptyForm = (): Omit<Journey, 'id'> => ({
  title: '',
  date: '',
  locations: [],
  description: '',
  url: '',
});

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

const fieldClassName =
  'w-full rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-900';

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
  addJourney,
  deleteJourney,
  exportRecord,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [form, setForm] = useState<Omit<Journey, 'id'>>(emptyForm);

  const stats = useMemo(() => getTravelStats(journeys), [journeys]);
  const sortedJourneys = useMemo(
    () => [...journeys].sort((left, right) => getJourneyTimestamp(right) - getJourneyTimestamp(left)),
    [journeys],
  );
  const footprintCount = stats.countryCount + stats.provinceCount + stats.cityCount;
  const headerMessage = getHeaderMessage(userName, stats.journeyCount);
  const overviewMessage = getOverviewMessage(stats.journeyCount, footprintCount);

  const handleSubmit = () => {
    if (!form.title.trim() || form.locations.length === 0) return;

    addJourney({
      title: form.title.trim(),
      date: form.date || undefined,
      locations: form.locations,
      description: form.description?.trim() || undefined,
      url: form.url?.trim() || undefined,
    });

    setForm(emptyForm());
    setShowOptionalFields(false);
    setShowForm(false);
  };

  const setLocations = (locations: JourneyLocation[]) => setForm(current => ({ ...current, locations }));

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

            <section className="border-t border-stone-300/70 pt-6">
              {!showForm ? (
                <button
                  type="button"
                  className="group w-full text-left"
                  onClick={() => {
                    setShowOptionalFields(false);
                    setShowForm(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">New Entry</p>
                      <h3 className="font-editorial mt-2 text-[1.55rem] leading-none text-stone-900">添加新旅程</h3>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200/80 bg-white/70 text-stone-500 transition group-hover:border-stone-300 group-hover:text-stone-900">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                      </svg>
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    先写标题、日期和地点，其他细节以后再慢慢补。
                  </p>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Draft</p>
                      <h3 className="font-editorial mt-2 text-[1.55rem] leading-none text-stone-900">新旅程</h3>
                      <p className="mt-3 text-sm leading-6 text-stone-600">
                        先记下必要信息，备注和链接都可以稍后再加。
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs uppercase tracking-[0.22em] text-stone-500 transition hover:text-stone-900"
                      onClick={() => {
                        setForm(emptyForm());
                        setShowOptionalFields(false);
                        setShowForm(false);
                      }}
                    >
                      取消
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-stone-500">标题</span>
                      <input
                        type="text"
                        placeholder="例如：京都深秋散步"
                        className={fieldClassName}
                        value={form.title}
                        onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-stone-500">日期</span>
                      <input
                        type="date"
                        className={`${fieldClassName} font-tabular`}
                        value={form.date ?? ''}
                        onChange={event => setForm(current => ({ ...current, date: event.target.value }))}
                      />
                    </label>

                    <div>
                      <p className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-stone-500">地点</p>
                      <LocationPicker value={form.locations} onChange={setLocations} />
                    </div>

                    <div className="border-t border-dashed border-stone-300 pt-4">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => setShowOptionalFields(current => !current)}
                      >
                        <div>
                          <p className="text-[11px] tracking-[0.24em] text-stone-500">更多</p>
                          <p className="mt-2 text-sm text-stone-700">补充备注与链接</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
                          {showOptionalFields ? '收起' : '展开'}
                        </span>
                      </button>
                    </div>

                    {showOptionalFields && (
                      <div className="space-y-3 border-l border-stone-200/80 pl-4">
                        <label className="block">
                          <span className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-stone-500">备注</span>
                          <textarea
                            placeholder="写下一点印象，比如气味、天气、路上的细节。"
                            className={`${fieldClassName} min-h-[116px] resize-none leading-6`}
                            value={form.description ?? ''}
                            onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] uppercase tracking-[0.26em] text-stone-500">链接</span>
                          <input
                            type="url"
                            placeholder="博客、相册或游记链接"
                            className={fieldClassName}
                            value={form.url ?? ''}
                            onChange={event => setForm(current => ({ ...current, url: event.target.value }))}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      className="flex-1 rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={handleSubmit}
                      disabled={!form.title.trim() || form.locations.length === 0}
                    >
                      收进旅程档案
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-stone-200 bg-white px-5 py-3 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                      onClick={() => {
                        setForm(emptyForm());
                        setShowOptionalFields(false);
                        setShowForm(false);
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="border-t border-stone-300/70 pt-6 pb-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Archive</p>
                  <h3 className="font-editorial mt-2 text-[1.65rem] leading-none text-stone-900">旅程档案</h3>
                </div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Latest First</p>
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
                  <div className="divide-y divide-stone-200/80 border-y border-stone-200/80 bg-[#fcf8f1]">
                    {sortedJourneys.map((journey, index) => (
                      <JourneyCard key={journey.id} journey={journey} index={index} onDelete={deleteJourney} />
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
}: {
  journey: Journey;
  index: number;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="group relative bg-[#fcf8f1] px-4 py-5 transition-colors hover:bg-[#fdfaf5]">
      <button
        type="button"
        className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-stone-300 transition hover:border-stone-200/80 hover:bg-white/70 hover:text-red-500"
        onClick={() => onDelete(journey.id)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <div className="pr-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">
              Entry {String(index + 1).padStart(2, '0')}
            </p>
            <h4 className="font-editorial mt-3 text-[1.4rem] leading-snug text-stone-900">
              {journey.url ? (
                <a
                  href={journey.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-stone-700"
                >
                  {journey.title}
                </a>
              ) : (
                journey.title
              )}
            </h4>
          </div>

          {journey.date && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-[0.26em] text-stone-400">Date</p>
              <p className="font-tabular mt-2 text-sm text-stone-700">{formatPanelDate(journey.date)}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-200/80 pt-4">
          {journey.locations.map(location => (
            <span key={location.name} className="inline-flex items-center gap-2 text-sm leading-none text-stone-700">
              <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[location.type]}`} />
              <span className="text-[10px] uppercase tracking-[0.22em] text-stone-400">{TYPE_LABEL[location.type]}</span>
              <span>{location.label}</span>
            </span>
          ))}
        </div>

        {journey.description && (
          <p className="mt-4 border-t border-dashed border-stone-200 pt-4 text-sm leading-7 text-stone-600">
            {journey.description}
          </p>
        )}
      </div>
    </article>
  );
}
