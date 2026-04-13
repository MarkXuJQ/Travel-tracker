import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '../hooks/useJourneyStore';
import TravelMap, { type BaseMapMode } from './TravelMap';
import JourneyPanel from './JourneyPanel';

const BASE_MAP_STORAGE_KEY = 'travel-tracker-base-map';

const BASE_MAP_OPTIONS: Array<{ key: BaseMapMode; label: string; title: string }> = [
  { key: 'liberty', label: '彩色', title: 'Liberty 彩色底图' },
  { key: 'bright', label: '明亮', title: 'Bright 明亮底图' },
  { key: 'night', label: '夜间', title: 'Dark Matter 夜间底图' },
];

function isBaseMapMode(value: string | null): value is BaseMapMode {
  return BASE_MAP_OPTIONS.some(option => option.key === value);
}

export default function TravelTracker() {
  const {
    journeys,
    userName,
    addJourney,
    deleteJourney,
    exportRecord,
  } = useJourneyStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [baseMap, setBaseMap] = useState<BaseMapMode>(() => {
    if (typeof window === 'undefined') return 'liberty';
    const savedBaseMap = window.localStorage.getItem(BASE_MAP_STORAGE_KEY);
    return isBaseMapMode(savedBaseMap) ? savedBaseMap : 'liberty';
  });

  useEffect(() => {
    window.localStorage.setItem(BASE_MAP_STORAGE_KEY, baseMap);
  }, [baseMap]);

  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedJourneyId && !journeys.some(journey => journey.id === selectedJourneyId)) {
      setSelectedJourneyId(null);
    }
  }, [journeys, selectedJourneyId]);

  const selectedJourney = useMemo(
    () => journeys.find(journey => journey.id === selectedJourneyId) ?? null,
    [journeys, selectedJourneyId],
  );

  const handleDeleteJourney = (id: string) => {
    if (selectedJourneyId === id) {
      setSelectedJourneyId(null);
    }
    deleteJourney(id);
  };

  const isNightMode = baseMap === 'night';

  return (
    <div className="w-full h-full relative">
      <TravelMap journeys={journeys} baseMap={baseMap} selectedJourney={selectedJourney} panelOpen={panelOpen} />

      <div
        className={`absolute top-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1 rounded-full border px-1.5 py-1 shadow-lg backdrop-blur-md ${
          isNightMode
            ? 'border-slate-700/70 bg-slate-950/78'
            : 'border-white/70 bg-white/78'
        }`}
      >
        {BASE_MAP_OPTIONS.map(option => {
          const selected = option.key === baseMap;

          return (
            <button
              key={option.key}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                selected
                  ? isNightMode
                    ? 'bg-slate-100 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-white shadow-sm'
                  : isNightMode
                    ? 'text-slate-200 hover:bg-white/10'
                    : 'text-slate-700 hover:bg-slate-900/5'
              }`}
              onClick={() => setBaseMap(option.key)}
              title={option.title}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Toggle panel button */}
      <button
        className={`absolute top-4 right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition ${
          isNightMode
            ? 'border-slate-700 bg-slate-950/88 hover:bg-slate-900'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
        onClick={() => setPanelOpen(o => !o)}
        title="旅程列表"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 ${isNightMode ? 'text-slate-100' : 'text-gray-700'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>

      <JourneyPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        userName={userName}
        journeys={journeys}
        addJourney={addJourney}
        deleteJourney={handleDeleteJourney}
        exportRecord={exportRecord}
        selectedJourneyId={selectedJourneyId}
        onSelectJourney={journeyId => {
          setSelectedJourneyId(current => (current === journeyId ? null : journeyId));
        }}
      />
    </div>
  );
}
