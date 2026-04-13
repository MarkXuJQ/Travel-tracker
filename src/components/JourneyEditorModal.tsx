import { useEffect, useState } from 'react';
import type { Journey, JourneyLocation, JourneyTransportMode } from '../types/journey';
import LocationPicker from './LocationPicker';

interface Props {
  isOpen: boolean;
  journey: Journey | null;
  onClose: () => void;
  onCreateJourney: (journey: Omit<Journey, 'id'>) => void;
  onUpdateJourney: (id: string, journey: Omit<Journey, 'id'>) => void;
}

type JourneyDraft = Omit<Journey, 'id'>;

const fieldClassName =
  'w-full rounded-2xl border border-stone-200 bg-white/92 px-4 py-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-900';

const TRANSPORT_OPTIONS: Array<{
  key: JourneyTransportMode;
  label: string;
  hint: string;
}> = [
  { key: 'train', label: '车票', hint: '参考高铁票的浅蓝票面' },
  { key: 'flight', label: '登机牌', hint: '参考登机牌的橙白票面' },
];

function inferTicketEndpoints(locations: JourneyLocation[]) {
  const departure = locations[0] ? { ...locations[0] } : null;
  const destination = locations[locations.length - 1] ? { ...locations[locations.length - 1] } : departure;

  return {
    departure,
    destination,
  };
}

const emptyForm = (): JourneyDraft => ({
  title: '',
  date: '',
  transportMode: 'train',
  showEndpoints: true,
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

  return {
    title: journey.title,
    date: journey.date ?? '',
    transportMode: journey.transportMode ?? 'train',
    showEndpoints: usesTicketLayout,
    departure: journey.departure ? { ...journey.departure } : inferredEndpoints.departure,
    destination: journey.destination ? { ...journey.destination } : inferredEndpoints.destination,
    locations,
    description: journey.description ?? '',
    url: journey.url ?? '',
  };
};

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

function TransportOptionCard({
  mode,
  label,
  hint,
  selected,
  onSelect,
}: {
  mode: JourneyTransportMode;
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  if (mode === 'flight') {
    return (
      <button
        type="button"
        className={`relative overflow-hidden rounded-[26px] border text-left transition ${
          selected
            ? 'border-[#e9a628] shadow-[0_26px_42px_-32px_rgba(217,119,6,0.62)]'
            : 'border-stone-200 hover:border-[#efb23d]'
        }`}
        onClick={onSelect}
        aria-pressed={selected}
      >
        <div className="absolute inset-x-0 top-0 h-11 bg-[linear-gradient(90deg,#f6b948_0%,#f0a932_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_56%,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.05)_18%,rgba(15,23,42,0)_19%),radial-gradient(circle_at_44%_66%,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.04)_16%,rgba(15,23,42,0)_17%)]" />
        <div className="relative flex min-h-[11rem] flex-col justify-between bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_22%,rgba(255,255,255,0.96)_22%,rgba(255,255,255,0.96)_100%)] px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3 text-stone-900">
            <div className="pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Airlines Ticket</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.24em] opacity-75">Boarding Pass</p>
            </div>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${
              selected
                ? 'border-white/55 bg-white/18 text-white'
                : 'border-stone-300/80 bg-white/92 text-stone-700'
            }`}>
              <TransportModeIcon mode={mode} className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-8 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">From</p>
              <p className="mt-2 text-lg font-semibold leading-none text-stone-900">SHANGHAI</p>
            </div>
            <div className="flex-1 border-t border-dashed border-stone-300/90" />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-400">To</p>
              <p className="mt-2 text-lg font-semibold leading-none text-stone-900">LONDON</p>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-900">{label}</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">{hint}</p>
            </div>
            {selected && (
              <span className="rounded-full bg-[#f6b948] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-900">
                Active
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`relative overflow-hidden rounded-[26px] border text-left transition ${
        selected
          ? 'border-[#78c6e8] shadow-[0_26px_42px_-32px_rgba(8,145,178,0.62)]'
          : 'border-stone-200 hover:border-[#8ad3ee]'
      }`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#f4fdff_0%,#def6ff_54%,#bae9fb_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-6 bg-[linear-gradient(90deg,#59b9df_0%,#79d8eb_54%,#49add9_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_52%,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.08)_18%,rgba(255,255,255,0)_38%),radial-gradient(circle_at_72%_70%,rgba(122,211,238,0.28)_0%,rgba(122,211,238,0)_26%)]" />
      <div className="relative min-h-[11rem] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d03b44]">Z31C014941</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-[#36576b]">中国旅程车票</p>
          </div>
          <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${
            selected
              ? 'border-white/55 bg-white/18 text-[#0f3f52]'
              : 'border-sky-200/90 bg-white/90 text-sky-800'
          }`}>
            <TransportModeIcon mode={mode} className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3 text-stone-950">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-sky-900/60">始发</p>
            <p className="mt-2 text-[1.55rem] font-semibold leading-none">南 昌</p>
          </div>
          <div className="flex-1 border-t border-dashed border-sky-500/40" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.24em] text-sky-900/60">终到</p>
            <p className="mt-2 text-[1.55rem] font-semibold leading-none">九 江</p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-stone-900">{label}</p>
            <p className="mt-1 text-xs leading-5 text-sky-950/65">{hint}</p>
          </div>
          {selected && (
            <span className="rounded-full bg-white/76 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-900">
              Active
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function JourneyEditorModal({
  isOpen,
  journey,
  onClose,
  onCreateJourney,
  onUpdateJourney,
}: Props) {
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [form, setForm] = useState<JourneyDraft>(emptyForm);
  const isEditing = journey !== null;
  const usesTicketLayout = form.locations.length <= 2;
  const hasTicketEndpoints = Boolean(form.departure && form.destination);
  const canSubmit = Boolean(form.title.trim() && form.locations.length > 0 && (!usesTicketLayout || hasTicketEndpoints));

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

  const handleSubmit = () => {
    if (!canSubmit) return;

    const draft: JourneyDraft = {
      title: form.title.trim(),
      date: form.date || undefined,
      transportMode: form.transportMode ?? 'train',
      showEndpoints: usesTicketLayout,
      departure: usesTicketLayout ? form.departure ?? null : null,
      destination: usesTicketLayout ? form.destination ?? null : null,
      locations: form.locations.map(location => ({ ...location })),
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

          <div className="relative flex items-start justify-between border-b border-stone-200/80 px-6 py-6 sm:px-7">
            <div className="max-w-[31rem]">
              <p className="text-[10px] uppercase tracking-[0.34em] text-stone-500">
                {isEditing ? 'Edit Entry' : 'New Entry'}
              </p>
              <h2 className="font-editorial mt-3 text-[2rem] leading-none text-stone-900">
                {isEditing ? '修改旅程' : '添加旅程'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                单段旅程会使用票据样式展示起讫地；如果你记录了更多站点，系统会自动切换为行程单方式来展开整段路线。
              </p>
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

          <div className="relative max-h-[min(80vh,56rem)] overflow-y-auto px-6 py-6 sm:px-7">
            <div className="space-y-6">
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
                    type="date"
                    className={`${fieldClassName} font-tabular`}
                    value={form.date ?? ''}
                    onChange={event => setForm(current => ({ ...current, date: event.target.value }))}
                  />
                </label>
              </div>

              {usesTicketLayout ? (
                <>
                  <section className="space-y-3">
                    <div className="flex items-end justify-between gap-4 border-b border-stone-200/70 pb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Ticket Style</p>
                        <h3 className="mt-2 text-base font-medium text-stone-900">出行方式与票面配色</h3>
                      </div>
                      <p className="max-w-[16rem] text-right text-xs leading-5 text-stone-500">
                        当前是单段旅程，会使用车票或登机牌样式展开。
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {TRANSPORT_OPTIONS.map(option => (
                        <TransportOptionCard
                          key={option.key}
                          mode={option.key}
                          label={option.label}
                          hint={option.hint}
                          selected={(form.transportMode ?? 'train') === option.key}
                          onSelect={() => setForm(current => ({ ...current, transportMode: option.key }))}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-end justify-between gap-4 border-b border-stone-200/70 pb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Ticket Fields</p>
                        <h3 className="mt-2 text-base font-medium text-stone-900">票面起讫地</h3>
                      </div>
                      <p className="max-w-[16rem] text-right text-xs leading-5 text-stone-500">
                        单段旅程会固定展示起点和终点，因此这里仍然保留票面字段。
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-[24px] border border-stone-200/80 bg-white/72 px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-stone-900">票据样式默认显示起讫地</p>
                        <p className="mt-1 text-xs leading-5 text-stone-500">
                          如果路线已经录好了，可以直接把首站和末站带入票面。
                        </p>
                      </div>

                      <button
                        type="button"
                        className="shrink-0 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
                        onClick={() => {
                          const inferredEndpoints = inferTicketEndpoints(form.locations);
                          setForm(current => ({
                            ...current,
                            departure: inferredEndpoints.departure,
                            destination: inferredEndpoints.destination,
                          }));
                        }}
                      >
                        按路线首尾带入
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[24px] border border-stone-200/80 bg-white/72 px-4 py-4">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Departure</p>
                        <p className="mt-2 text-sm text-stone-700">出发地会显示在票据左侧。</p>
                        <div className="mt-3">
                          <LocationPicker
                            value={form.departure ? [form.departure] : []}
                            onChange={locations => setSingleLocation('departure', locations)}
                            allowedTypes={['country', 'city']}
                            maxSelections={1}
                            placeholder="搜索出发城市或国家"
                            helperText={null}
                            showOrderHint={false}
                            compact
                          />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-stone-200/80 bg-white/72 px-4 py-4">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Destination</p>
                        <p className="mt-2 text-sm text-stone-700">目的地会显示在票据右侧。</p>
                        <div className="mt-3">
                          <LocationPicker
                            value={form.destination ? [form.destination] : []}
                            onChange={locations => setSingleLocation('destination', locations)}
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

                    {!hasTicketEndpoints && (
                      <p className="text-xs leading-5 text-stone-500">
                        单段旅程采用票据展示时，需要同时补全出发地和目的地后才可以保存。
                      </p>
                    )}
                  </section>
                </>
              ) : (
                <section className="space-y-3">
                  <div className="flex items-end justify-between gap-4 border-b border-stone-200/70 pb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Route Ledger</p>
                      <h3 className="mt-2 text-base font-medium text-stone-900">多站旅程已自动切换为行程单</h3>
                    </div>
                    <p className="max-w-[16rem] text-right text-xs leading-5 text-stone-500">
                      既然你记录了 3 站及以上地点，这段旅程会按完整路线展开，不再使用车票或登机牌样式。
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-stone-200/80 bg-[#fbf7ef] px-4 py-4">
                    <p className="text-sm leading-7 text-stone-700">
                      这类旅程更像一张完整的行程单：我们会重点展示沿途顺序、停留节点和路线预览，而不是把它压缩成“起点到终点”的单张票据。
                    </p>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-end justify-between gap-4 border-b border-stone-200/70 pb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Journey Path</p>
                    <h3 className="mt-2 text-base font-medium text-stone-900">旅程足迹</h3>
                  </div>
                  <p className="max-w-[17rem] text-right text-xs leading-5 text-stone-500">
                    这里仍然按实际顺序记录经过地点，地图会据此预览整段路线。
                  </p>
                </div>

                <LocationPicker
                  value={form.locations}
                  onChange={setLocations}
                  allowedTypes={['country', 'city']}
                  placeholder="按出发到抵达的顺序搜索经过的城市或国家"
                  helperText="如果中间会停留多处，就继续往后添加；达到 3 站及以上时，会自动改用行程单样式展示。"
                />
              </section>

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
