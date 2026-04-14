import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type {
  Journey,
  JourneyLocation,
  JourneyRecordKind,
  JourneyTransportMode,
} from '../types/journey';
import { formatJourneyDate, getJourneyDateTimestamp } from '../utils/journeyDate';
import { filterJourneysByRecordFilter } from '../utils/journeyRecordFilter';
import type { JourneyRecordFilter } from '../types/journey';
import TransportModeIcon from './TransportModeIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  passengerName: string;
  journeys: Journey[];
  activeRecordId: string;
  activeRecordKind: JourneyRecordKind;
  activeRecordName: string;
  activeRecordDescription: string;
  availableRecords: JourneyArchiveOption[];
  activeFilter: JourneyRecordFilter | null;
  deleteJourney: (id: string) => void;
  exportRecord: () => void;
  selectedJourneyId: string | null;
  editingJourneyId?: string | null;
  onSelectJourney: (id: string) => void;
  onEditJourney: (journey: Journey) => void;
  onClearFilter: () => void;
  onActiveRecordChange: (id: string) => void;
  onCreateHistoricalRecord: (userName: string, description?: string) => void;
  onImportHistoricalRecordFromJson: (rawText: string) => {
    ok: boolean;
    recordId?: string;
    error?: string;
  };
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
const JOURNEY_PANEL_VIEW_STORAGE_KEY = 'travel-tracker-journey-panel-view';

type JourneyPanelViewMode = 'list' | 'timeline';

interface JourneyTimelineEntry {
  key: string;
  journey: Journey;
  location: JourneyLocation;
}

interface JourneyArchiveOption {
  id: string;
  name: string;
  kind: JourneyRecordKind;
  description: string;
  journeyCount: number;
}

const VIEW_OPTIONS: Array<{ key: JourneyPanelViewMode; label: string }> = [
  { key: 'list', label: '列表' },
  { key: 'timeline', label: '时间线' },
];

function isJourneyPanelViewMode(value: string | null): value is JourneyPanelViewMode {
  return value === 'list' || value === 'timeline';
}

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

function getTimelineLocations(journey: Journey) {
  const transportMode = getJourneyTransportMode(journey);

  if (transportMode !== 'default') {
    const destination = journey.destination
      ?? journey.locations[journey.locations.length - 1]
      ?? journey.departure
      ?? null;

    return destination ? [destination] : [];
  }

  if (journey.locations.length > 0) {
    return journey.locations;
  }

  const fallbackLocation = journey.destination ?? journey.departure ?? null;
  return fallbackLocation ? [fallbackLocation] : [];
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
  activeRecordId,
  activeRecordKind,
  activeRecordName,
  activeRecordDescription,
  availableRecords,
  activeFilter,
  deleteJourney,
  exportRecord,
  selectedJourneyId,
  editingJourneyId = null,
  onSelectJourney,
  onEditJourney,
  onClearFilter,
  onActiveRecordChange,
  onCreateHistoricalRecord,
  onImportHistoricalRecordFromJson,
}: Props) {
  const [viewMode, setViewMode] = useState<JourneyPanelViewMode>(() => {
    if (typeof window === 'undefined') return 'list';

    const savedViewMode = window.localStorage.getItem(JOURNEY_PANEL_VIEW_STORAGE_KEY);
    return isJourneyPanelViewMode(savedViewMode) ? savedViewMode : 'list';
  });
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
  const timelineEntries = useMemo<JourneyTimelineEntry[]>(
    () => sortedJourneys.flatMap(journey => getTimelineLocations(journey).map((location, locationIndex) => ({
      key: `${journey.id}-${location.type}-${location.name}-${locationIndex}`,
      journey,
      location,
    }))),
    [sortedJourneys],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(JOURNEY_PANEL_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

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

        <div className="relative flex items-start justify-between gap-4 border-b border-stone-200/80 px-6 py-5">
          <div className="max-w-sm">
            <p className="text-[10px] uppercase tracking-[0.36em] text-stone-500">Archive</p>
            <h2 className="font-editorial mt-3 text-[2rem] leading-none text-stone-900">旅程档案</h2>
          </div>

          <div className="flex items-start gap-3">
            <div className="inline-flex rounded-full border border-stone-200/90 bg-white/80 p-1 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.28)]">
              {VIEW_OPTIONS.map(option => {
                const selected = option.key === viewMode;

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      selected
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                    onClick={() => setViewMode(option.key)}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
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
        </div>

        <div className="relative flex-1 overflow-y-auto">
          <div className="space-y-7 px-6 py-5">
            <section className="pb-3">
              {activeFilter && (
                <div className="flex items-center justify-between gap-4 rounded-[22px] border border-stone-200/90 bg-white/68 px-4 py-3">
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

              {viewMode === 'timeline' && (
                <HistoricalArchiveControls
                  activeRecordId={activeRecordId}
                  activeRecordKind={activeRecordKind}
                  activeRecordName={activeRecordName}
                  activeRecordDescription={activeRecordDescription}
                  availableRecords={availableRecords}
                  onActiveRecordChange={onActiveRecordChange}
                  onCreateHistoricalRecord={onCreateHistoricalRecord}
                  onImportHistoricalRecordFromJson={onImportHistoricalRecordFromJson}
                />
              )}

              <div className={`${activeFilter ? 'mt-4' : 'mt-5'}`}>
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
                  viewMode === 'timeline' ? (
                    <JourneyTimeline
                      entries={timelineEntries}
                      selectedJourneyId={selectedJourneyId}
                      onSelectJourney={onSelectJourney}
                    />
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
                  )
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

function JourneyTimeline({
  entries,
  selectedJourneyId,
  onSelectJourney,
}: {
  entries: JourneyTimelineEntry[];
  selectedJourneyId: string | null;
  onSelectJourney: (id: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute bottom-3 left-[5.8rem] top-3 w-px bg-stone-200/90" />

      <ol className="relative">
        {entries.map((entry, index) => {
          const selected = entry.journey.id === selectedJourneyId;
          const dateLabel = entry.journey.date ? formatJourneyDate(entry.journey.date) : '--';

          return (
            <li key={entry.key}>
              <button
                type="button"
                className="group grid w-full grid-cols-[4.75rem_1.5rem_minmax(0,1fr)] items-start gap-3 text-left"
                onClick={() => onSelectJourney(entry.journey.id)}
              >
                <span className={`pt-3 font-tabular text-[11px] tracking-[0.16em] ${
                  selected ? 'text-stone-900' : 'text-stone-500'
                }`}>
                  {dateLabel}
                </span>

                <span className="relative flex justify-center pt-[1rem]">
                  <span
                    className={`h-2.5 w-2.5 rounded-full border transition ${
                      selected
                        ? 'border-stone-900 bg-stone-900'
                        : 'border-stone-300 bg-[#f6f1e8] group-hover:border-stone-500 group-hover:bg-stone-500'
                    }`}
                  />
                </span>

                <span className={`min-w-0 border-b border-dashed pb-4 pt-2.5 text-[1rem] leading-7 transition ${
                  index === entries.length - 1 ? 'border-transparent' : ''
                } ${
                  selected
                    ? 'border-stone-300 text-stone-900'
                    : 'border-stone-200 text-stone-700 group-hover:border-stone-300 group-hover:text-stone-900'
                }`}>
                  {entry.location.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function HistoricalArchiveControls({
  activeRecordId,
  activeRecordKind,
  activeRecordName,
  activeRecordDescription,
  availableRecords,
  onActiveRecordChange,
  onCreateHistoricalRecord,
  onImportHistoricalRecordFromJson,
}: {
  activeRecordId: string;
  activeRecordKind: JourneyRecordKind;
  activeRecordName: string;
  activeRecordDescription: string;
  availableRecords: JourneyArchiveOption[];
  onActiveRecordChange: (id: string) => void;
  onCreateHistoricalRecord: (userName: string, description?: string) => void;
  onImportHistoricalRecordFromJson: (rawText: string) => {
    ok: boolean;
    recordId?: string;
    error?: string;
  };
}) {
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);
  const [isPastingJson, setIsPastingJson] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [jsonDraft, setJsonDraft] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFeedback(null);
  }, [activeRecordId]);

  const handleCreateRecord = () => {
    const nextName = draftName.trim();

    if (!nextName) {
      setFeedback({
        tone: 'error',
        message: '先写下这位人物的名字，再创建档案。',
      });
      return;
    }

    onCreateHistoricalRecord(nextName, draftDescription.trim());
    setDraftName('');
    setDraftDescription('');
    setIsCreatingRecord(false);
    setFeedback({
      tone: 'success',
      message: `已切换到 ${nextName} 的档案，接下来可以继续添加他的旅程。`,
    });
  };

  const handleJsonImport = () => {
    if (!jsonDraft.trim()) {
      setFeedback({
        tone: 'error',
        message: '先粘贴一段人物旅程 JSON。',
      });
      return;
    }

    const result = onImportHistoricalRecordFromJson(jsonDraft);
    if (!result.ok) {
      setFeedback({
        tone: 'error',
        message: result.error ?? '导入失败，请检查 JSON。',
      });
      return;
    }

    setJsonDraft('');
    setIsPastingJson(false);
    setFeedback({
      tone: 'success',
      message: '人物档案已导入，地图和档案已经切换到这个人物。',
    });
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const result = onImportHistoricalRecordFromJson(await file.text());
    if (!result.ok) {
      setFeedback({
        tone: 'error',
        message: result.error ?? '导入失败，请检查 JSON。',
      });
      return;
    }

    setFeedback({
      tone: 'success',
      message: `已导入 ${file.name}，并切换到对应人物档案。`,
    });
  };

  return (
    <section className={`rounded-[26px] border border-stone-200/90 bg-white/70 px-4 py-4 ${availableRecords.length > 0 ? 'mb-5' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileImport}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Timeline View</p>
          <h3 className="mt-2 text-base font-medium text-stone-900">
            {activeRecordName}
            <span className="ml-2 text-sm font-normal text-stone-500">
              {activeRecordKind === 'historical' ? '历史人物档案' : '我的旅程'}
            </span>
          </h3>
          {activeRecordDescription ? (
            <p className="mt-2 text-sm leading-6 text-stone-600">{activeRecordDescription}</p>
          ) : null}
        </div>

        <label className="shrink-0">
          <span className="sr-only">切换当前档案</span>
          <select
            value={activeRecordId}
            onChange={event => onActiveRecordChange(event.target.value)}
            className="rounded-full border border-stone-200 bg-[#f8f4ec] px-4 py-2 text-sm text-stone-700 outline-none transition hover:border-stone-300"
          >
            {availableRecords.map(record => (
              <option key={record.id} value={record.id}>
                {record.kind === 'historical' ? `人物 · ${record.name}` : `我的旅程 · ${record.name}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-2 text-sm transition ${
            isCreatingRecord
              ? 'border-stone-900 bg-stone-900 text-white'
              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
          }`}
          onClick={() => {
            setIsCreatingRecord(current => !current);
            setIsPastingJson(false);
          }}
          aria-pressed={isCreatingRecord}
        >
          手动添加人物
        </button>

        <button
          type="button"
          className={`rounded-full border px-3 py-2 text-sm transition ${
            isPastingJson
              ? 'border-stone-900 bg-stone-900 text-white'
              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
          }`}
          onClick={() => {
            setIsPastingJson(current => !current);
            setIsCreatingRecord(false);
          }}
          aria-pressed={isPastingJson}
        >
          粘贴 JSON
        </button>

        <button
          type="button"
          className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
          onClick={() => fileInputRef.current?.click()}
        >
          导入 JSON 文件
        </button>
      </div>

      {isCreatingRecord && (
        <div className="mt-4 rounded-[22px] border border-stone-200/90 bg-[#fcfaf6] px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <input
              type="text"
              value={draftName}
              onChange={event => setDraftName(event.target.value)}
              placeholder="人物姓名，例如 玄奘"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-900"
            />

            <input
              type="text"
              value={draftDescription}
              onChange={event => setDraftDescription(event.target.value)}
              placeholder="一句简介，可选"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-900"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-stone-900 bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800"
              onClick={handleCreateRecord}
            >
              创建并切换
            </button>

            <button
              type="button"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
              onClick={() => {
                setIsCreatingRecord(false);
                setDraftName('');
                setDraftDescription('');
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {isPastingJson && (
        <div className="mt-4 rounded-[22px] border border-stone-200/90 bg-[#fcfaf6] px-4 py-4">
          <textarea
            value={jsonDraft}
            onChange={event => setJsonDraft(event.target.value)}
            placeholder='粘贴人物档案 JSON，例如 { "userName": "郑和", "journeys": [...] }'
            rows={6}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-900"
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-stone-900 bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800"
              onClick={handleJsonImport}
            >
              导入并切换
            </button>

            <button
              type="button"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
              onClick={() => {
                setIsPastingJson(false);
                setJsonDraft('');
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-stone-500">
        新建人物后，可以继续用右上角的加号为这个人物补充旅程；切换人物后，地图和旅程档案会一起切换。
      </p>

      {feedback && (
        <p className={`mt-3 text-sm ${
          feedback.tone === 'error' ? 'text-red-600' : 'text-emerald-700'
        }`}>
          {feedback.message}
        </p>
      )}
    </section>
  );
}

function JourneyLinkButton({
  url,
  className,
}: {
  url?: string;
  className: string;
}) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="打开链接"
      aria-label="打开链接"
      className={className}
      onClick={event => event.stopPropagation()}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.25 7.5H7.5A2.25 2.25 0 005.25 9.75v6.75A2.25 2.25 0 007.5 18.75h6.75a2.25 2.25 0 002.25-2.25v-.75" />
      </svg>
    </a>
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
                <JourneyLinkButton
                  url={journey.url}
                  className={`${actionButtonClassName} hover:text-stone-700`}
                />

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
                    <JourneyLinkButton
                      url={journey.url}
                      className={`${actionButtonClassName} ${editing ? 'border-sky-200 bg-white/90 text-sky-900' : 'hover:text-sky-900'}`}
                    />

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
              <JourneyLinkButton
                url={journey.url}
                className={`${actionButtonClassName} ${
                  editing
                    ? 'border-stone-300 bg-white/90 text-stone-700'
                    : 'hover:text-stone-700'
                }`}
              />

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
