import { useEffect, useState } from 'react';
import type { Journey, JourneyLocation, JourneyTransportMode } from '../types/journey';
import { formatJourneyDate, normalizeJourneyDate, parseJourneyDate } from '../utils/journeyDate';
import TransportModeIcon from './TransportModeIcon';
import LocationPicker from './LocationPicker';

interface Props {
  isOpen: boolean;
  journey: Journey | null;
  passengerName: string;
  onClose: () => void;
  onCreateJourney: (journey: Omit<Journey, 'id'>) => void;
  onUpdateJourney: (id: string, journey: Omit<Journey, 'id'>) => void;
}

type JourneyDraft = Omit<Journey, 'id'>;

const fieldClassName =
  'w-full rounded-2xl border border-stone-200 bg-white/92 px-4 py-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-900';

const FORMAT_OPTIONS: Array<{
  key: JourneyTransportMode;
  label: string;
}> = [
  { key: 'default', label: '默认' },
  { key: 'train', label: '车票' },
  { key: 'flight', label: '登机牌' },
];

const TRAIN_TICKET_ID = '370306 20260203 XXXX';

function resolveJourneyFormat(journey: Pick<Journey, 'transportMode' | 'showEndpoints' | 'locations'>): JourneyTransportMode {
  if (journey.transportMode) {
    return journey.transportMode;
  }

  if (journey.showEndpoints === false) {
    return 'default';
  }

  return journey.locations.length <= 2 ? 'train' : 'default';
}

function inferTicketEndpoints(locations: JourneyLocation[]) {
  const departure = locations[0] ? { ...locations[0] } : null;
  const destination = locations[locations.length - 1] ? { ...locations[locations.length - 1] } : departure;

  return {
    departure,
    destination,
  };
}

function isSameLocation(left: JourneyLocation | null, right: JourneyLocation | null) {
  return Boolean(left && right && left.type === right.type && left.name === right.name);
}

function buildTicketLocations(departure: JourneyLocation | null, destination: JourneyLocation | null) {
  if (departure && destination) {
    if (isSameLocation(departure, destination)) {
      return [{ ...departure }];
    }

    return [{ ...departure }, { ...destination }];
  }

  if (departure) return [{ ...departure }];
  if (destination) return [{ ...destination }];

  return [];
}

const emptyForm = (): JourneyDraft => ({
  title: '',
  date: '',
  transportMode: 'default',
  showEndpoints: false,
  departure: null,
  destination: null,
  locations: [],
  description: '',
  url: '',
});

const formFromJourney = (journey: Journey): JourneyDraft => {
  const locations = journey.locations.map(location => ({ ...location }));
  const inferredEndpoints = inferTicketEndpoints(locations);
  const usesTicketLayout = locations.length <= 2;
  const format = usesTicketLayout ? resolveJourneyFormat(journey) : 'default';

  return {
    title: journey.title,
    date: journey.date ?? '',
    transportMode: format,
    showEndpoints: format !== 'default',
    departure: journey.departure ? { ...journey.departure } : inferredEndpoints.departure,
    destination: journey.destination ? { ...journey.destination } : inferredEndpoints.destination,
    locations,
    description: journey.description ?? '',
    url: journey.url ?? '',
  };
};

function JourneyFormatSlider({
  value,
  onChange,
  ticketOptionsLocked,
}: {
  value: JourneyTransportMode;
  onChange: (mode: JourneyTransportMode) => void;
  ticketOptionsLocked: boolean;
}) {
  const currentValue = ticketOptionsLocked ? 'default' : value;
  const activeIndex = FORMAT_OPTIONS.findIndex(option => option.key === currentValue);

  return (
    <div className="rounded-[26px] border border-stone-200/80 bg-white/70 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Journey Format</p>
      <h3 className="mt-2 text-base font-medium text-stone-900">旅程格式</h3>

      <div className="relative mt-4 grid grid-cols-3 rounded-full border border-stone-200 bg-[#f4efe7] p-1">
        <span className="pointer-events-none absolute inset-y-1 left-1 right-1 grid grid-cols-3">
          <span
            className="rounded-full bg-stone-900 shadow-[0_14px_24px_-18px_rgba(15,23,42,0.45)] transition-all duration-300"
            style={{ gridColumn: `${Math.max(activeIndex, 0) + 1} / span 1` }}
          />
        </span>

        {FORMAT_OPTIONS.map(option => {
          const isDisabled = ticketOptionsLocked && option.key !== 'default';
          const isSelected = currentValue === option.key;

          return (
            <button
              key={option.key}
              type="button"
              className={`relative z-10 rounded-full px-3 py-2.5 text-sm transition ${
                isSelected
                  ? 'text-white'
                  : isDisabled
                    ? 'text-stone-400'
                    : 'text-stone-600 hover:text-stone-900'
              }`}
              onClick={() => {
                if (!isDisabled) {
                  onChange(option.key);
                }
              }}
              aria-pressed={isSelected}
              disabled={isDisabled}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TicketPreviewEditor({
  mode,
  dateLabel,
  passengerName,
  departure,
  destination,
  onDepartureChange,
  onDestinationChange,
}: {
  mode: Exclude<JourneyTransportMode, 'default'>;
  dateLabel: string;
  passengerName: string;
  departure: JourneyLocation | null;
  destination: JourneyLocation | null;
  onDepartureChange: (locations: JourneyLocation[]) => void;
  onDestinationChange: (locations: JourneyLocation[]) => void;
}) {
  const displayPassengerName = passengerName.trim() || '未设置';

  if (mode === 'flight') {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-[#e6d7bc] shadow-[0_24px_44px_-34px_rgba(217,119,6,0.28)]">
        <div className="absolute inset-0 bg-[#f8f4ec]" />
        <div className="absolute inset-x-0 top-0 h-12 bg-[linear-gradient(90deg,#f4b649_0%,#eea934_58%,#e59e24_100%)]" />
        <div className="absolute inset-y-0 right-0 w-[6rem] border-l border-dashed border-[#d8cab2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,245,239,0.98)_100%)]" />
        <div className="absolute right-0 top-0 h-12 w-[6rem] bg-[linear-gradient(90deg,#f3b347_0%,#e9a12d_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_56%_60%,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.05)_18%,rgba(15,23,42,0)_19%),radial-gradient(circle_at_44%_66%,rgba(15,23,42,0.035)_0%,rgba(15,23,42,0.035)_14%,rgba(15,23,42,0)_15%)]" />

        <div className="relative grid grid-cols-[minmax(0,1fr)_6rem]">
          <div className="relative px-5 pb-5 pt-[4.35rem]">
            <div className="absolute inset-x-0 top-0 z-[1] flex h-12 items-center justify-between px-5">
              <div className="flex min-w-0 items-center gap-3 text-stone-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/24 text-stone-950">
                  <TransportModeIcon mode={mode} tone="light" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-950/92">Boarding Pass</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-stone-900/68">Entry 01</p>
                </div>
              </div>

              <p className="font-tabular text-[11px] tracking-[0.14em] text-stone-950/92">AA223</p>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-editorial text-[1.45rem] leading-snug text-stone-900">票面预览</h4>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Date</p>
                <p className="font-tabular mt-2 text-sm text-stone-800">{dateLabel}</p>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">From</p>
                <p className="mt-2 truncate text-lg font-semibold leading-none text-stone-900">
                  {departure?.label ?? '选择出发地'}
                </p>
              </div>
              <div className="flex-1 border-t border-dashed border-stone-300/90" />
              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">To</p>
                <p className="mt-2 truncate text-lg font-semibold leading-none text-stone-900">
                  {destination?.label ?? '选择目的地'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#e7dcc9] bg-white/88 px-3 py-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-stone-400">Departure</p>
                <LocationPicker
                  value={departure ? [departure] : []}
                  onChange={onDepartureChange}
                  allowedTypes={['country', 'city']}
                  maxSelections={1}
                  placeholder="搜索出发城市或国家"
                  helperText={null}
                  showOrderHint={false}
                  compact
                />
              </div>

              <div className="rounded-[22px] border border-[#e7dcc9] bg-white/88 px-3 py-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-stone-400">Destination</p>
                <LocationPicker
                  value={destination ? [destination] : []}
                  onChange={onDestinationChange}
                  allowedTypes={['country', 'city']}
                  maxSelections={1}
                  placeholder="搜索目的地城市或国家"
                  helperText={null}
                  showOrderHint={false}
                  compact
                />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-between px-3 pb-4 pt-[4.35rem]">
            <div className="absolute inset-x-0 top-0 z-[1] flex h-12 flex-col items-center justify-center text-stone-950">
              <p className="text-[9px] uppercase tracking-[0.24em] text-stone-950/72">Gate</p>
              <p className="font-tabular text-[11px] tracking-[0.18em] text-stone-950/92">04</p>
            </div>

            <div className="relative flex flex-col items-center gap-2 text-center">
              <div className="rounded-full border border-stone-300 bg-white/90 p-2 text-stone-700">
                <TransportModeIcon mode={mode} tone="dark" className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Flight</p>
                <p className="mt-1 text-xs font-medium text-stone-800">Stub</p>
              </div>
            </div>

            <div className="relative w-full text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Passenger</p>
              <p className="mt-1 break-words text-[11px] font-medium leading-4 text-stone-900">{displayPassengerName}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#8fd4ec] shadow-[0_24px_44px_-34px_rgba(8,145,178,0.26)]">
      <div className="absolute inset-0 bg-[#eaf7fc]" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-[#58afd9]" />
      <div className="absolute inset-x-0 bottom-0 z-[1] flex h-8 items-center px-5">
        <p className="font-tabular text-[10px] tracking-[0.26em] text-white/92">{TRAIN_TICKET_ID}</p>
      </div>

      <div className="relative px-5 pb-10 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d33f49]">Z31C014941</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-sky-950/70">中国旅程车票</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Date</p>
            <p className="font-tabular mt-2 text-sm text-stone-800">{dateLabel}</p>
          </div>
        </div>

        <div className="mt-7 flex items-end justify-between gap-3 text-stone-950">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.24em] text-sky-900/60">始发</p>
            <p className="mt-2 truncate text-[1.55rem] font-semibold leading-none">
              {departure?.label ?? '选择出发地'}
            </p>
          </div>
          <div className="flex-1 border-t border-dashed border-sky-500/40" />
          <div className="min-w-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.24em] text-sky-900/60">终到</p>
            <p className="mt-2 truncate text-[1.55rem] font-semibold leading-none">
              {destination?.label ?? '选择目的地'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-[#8fd4ec] bg-[#f8fdff] px-3 py-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-sky-950/60">Departure</p>
            <LocationPicker
              value={departure ? [departure] : []}
              onChange={onDepartureChange}
              allowedTypes={['country', 'city']}
              maxSelections={1}
              placeholder="搜索出发城市或国家"
              helperText={null}
              showOrderHint={false}
              compact
            />
          </div>

          <div className="rounded-[22px] border border-[#8fd4ec] bg-[#f8fdff] px-3 py-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-sky-950/60">Destination</p>
            <LocationPicker
              value={destination ? [destination] : []}
              onChange={onDestinationChange}
              allowedTypes={['country', 'city']}
              maxSelections={1}
              placeholder="搜索目的地城市或国家"
              helperText={null}
              showOrderHint={false}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JourneyEditorModal({
  isOpen,
  journey,
  passengerName,
  onClose,
  onCreateJourney,
  onUpdateJourney,
}: Props) {
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [form, setForm] = useState<JourneyDraft>(emptyForm);
  const isEditing = journey !== null;
  const usesTicketLayout = form.locations.length <= 2;
  const selectedFormat = usesTicketLayout ? (form.transportMode ?? 'default') : 'default';
  const usesTicketPreview = usesTicketLayout && selectedFormat !== 'default';
  const hasTicketEndpoints = !usesTicketPreview || Boolean(form.departure && form.destination);
  const hasJourneyLocations = usesTicketPreview ? hasTicketEndpoints : form.locations.length > 0;
  const dateInput = form.date?.trim() ?? '';
  const parsedDate = parseJourneyDate(dateInput);
  const hasValidDate = dateInput === '' || parsedDate.isValid;
  const formattedTicketDate = dateInput && parsedDate.isValid ? formatJourneyDate(dateInput) : '--.--.--';
  const canSubmit = Boolean(form.title.trim() && hasJourneyLocations && hasValidDate);

  useEffect(() => {
    if (!isOpen) return;

    if (journey) {
      setForm(formFromJourney(journey));
      setShowOptionalFields(Boolean(journey.description?.trim() || journey.url?.trim()));
      return;
    }

    setForm(emptyForm());
    setShowOptionalFields(false);
  }, [isOpen, journey]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const setLocations = (locations: JourneyLocation[]) => setForm(current => {
    const next = { ...current, locations };

    if (!current.departure && locations[0]) {
      next.departure = { ...locations[0] };
    }

    if (!current.destination && locations[locations.length - 1]) {
      next.destination = { ...locations[locations.length - 1] };
    }

    return next;
  });

  const setSingleLocation = (field: 'departure' | 'destination', locations: JourneyLocation[]) => {
    setForm(current => ({ ...current, [field]: locations[0] ?? null }));
  };

  const setTransportMode = (mode: JourneyTransportMode) => {
    setForm(current => {
      const nextLocations = mode === 'default' && current.locations.length === 0
        ? buildTicketLocations(current.departure ?? null, current.destination ?? null)
        : current.locations;

      return {
        ...current,
        transportMode: mode,
        locations: nextLocations,
      };
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const transportMode = usesTicketLayout ? (form.transportMode ?? 'default') : 'default';
    const showEndpoints = usesTicketLayout && transportMode !== 'default';
    const locations = usesTicketPreview
      ? buildTicketLocations(form.departure ?? null, form.destination ?? null)
      : form.locations.map(location => ({ ...location }));

    const draft: JourneyDraft = {
      title: form.title.trim(),
      date: dateInput ? normalizeJourneyDate(dateInput) ?? undefined : undefined,
      transportMode,
      showEndpoints,
      departure: showEndpoints ? form.departure ?? null : null,
      destination: showEndpoints ? form.destination ?? null : null,
      locations,
      description: form.description?.trim() || undefined,
      url: form.url?.trim() || undefined,
    };

    if (journey) {
      onUpdateJourney(journey.id, draft);
    } else {
      onCreateJourney(draft);
    }

    onClose();
  };

  return (
    <>
      <button
        type="button"
        aria-label="关闭旅程编辑弹窗"
        className="fixed inset-0 z-[2150] bg-slate-950/34 backdrop-blur-[8px]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 sm:p-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? '修改旅程' : '添加旅程'}
          className="relative w-full max-w-[44rem] overflow-hidden border border-stone-200/80 bg-[#f6f1e8] text-stone-800 shadow-[0_36px_90px_-40px_rgba(15,23,42,0.45)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.04)_24%,rgba(255,255,255,0)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0)_38%)]" />

          <div className="relative flex items-start justify-between border-b border-stone-200/80 px-6 py-5 sm:px-7">
            <div className="max-w-[31rem]">
              <p className="text-[10px] uppercase tracking-[0.34em] text-stone-500">
                {isEditing ? 'Edit Entry' : 'New Entry'}
              </p>
              <h2 className="font-editorial mt-3 text-[2rem] leading-none text-stone-900">
                {isEditing ? '修改旅程' : '添加旅程'}
              </h2>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/82 text-stone-500 transition hover:border-stone-300 hover:text-stone-900"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative max-h-[min(80vh,56rem)] overflow-y-auto px-6 py-5 sm:px-7">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
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
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="2026 / 2026-04 / 2026-04-13 / 1974-1975"
                    className={`${fieldClassName} font-tabular`}
                    value={form.date ?? ''}
                    onChange={event => setForm(current => ({ ...current, date: event.target.value }))}
                    onBlur={event => {
                      const normalizedDate = normalizeJourneyDate(event.target.value);
                      if (!normalizedDate) return;

                      setForm(current => ({ ...current, date: normalizedDate }));
                    }}
                  />
                  {!hasValidDate ? (
                    <span className="mt-2 block text-[11px] text-red-500">支持 YYYY、YYYY-MM、YYYY-MM-DD 或 YYYY-YYYY</span>
                  ) : null}
                </label>
              </div>

              <JourneyFormatSlider
                value={selectedFormat}
                onChange={setTransportMode}
                ticketOptionsLocked={!usesTicketLayout}
              />

              {usesTicketPreview ? (
                <section className="space-y-3">
                  <div className="border-b border-stone-200/70 pb-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Ticket Preview</p>
                    <h3 className="mt-2 text-base font-medium text-stone-900">票面信息</h3>
                  </div>

                  <div className="pt-1">
                    <TicketPreviewEditor
                      mode={selectedFormat}
                      dateLabel={formattedTicketDate}
                      passengerName={passengerName}
                      departure={form.departure ?? null}
                      destination={form.destination ?? null}
                      onDepartureChange={locations => setSingleLocation('departure', locations)}
                      onDestinationChange={locations => setSingleLocation('destination', locations)}
                    />
                  </div>
                </section>
              ) : null}

              {!usesTicketPreview && (
                <section className="space-y-3">
                  <div className="border-b border-stone-200/70 pb-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Journey Path</p>
                    <h3 className="mt-2 text-base font-medium text-stone-900">旅程足迹</h3>
                  </div>

                  <LocationPicker
                    value={form.locations}
                    onChange={setLocations}
                    allowedTypes={['country', 'city']}
                    placeholder="按顺序搜索经过的城市或国家"
                    helperText={null}
                    showOrderHint={false}
                  />
                </section>
              )}

              <div className="border-t border-dashed border-stone-300 pt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setShowOptionalFields(current => !current)}
                >
                  <p className="text-sm text-stone-700">备注与链接</p>
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
                      className={`${fieldClassName} min-h-[132px] resize-none leading-6`}
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
          </div>

          <div className="relative flex gap-3 border-t border-stone-200/80 bg-white/45 px-6 py-5 backdrop-blur-md sm:px-7">
            <button
              type="button"
              className="flex-1 rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isEditing ? '保存修改' : '收进旅程档案'}
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-200 bg-white px-5 py-3 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
              onClick={onClose}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
