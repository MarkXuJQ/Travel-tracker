import { useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '../hooks/useJourneyStore';
import type { Journey, JourneyRecordFilter } from '../types/journey';
import { filterJourneysByRecordFilter, journeyMatchesRecordFilter } from '../utils/journeyRecordFilter';
import SettingsModal from './SettingsModal';
import TravelMap, { type BaseMapMode } from './TravelMap';
import JourneyEditorModal from './JourneyEditorModal';
import JourneyPanel from './JourneyPanel';
import JourneyOverviewDrawer from './JourneyOverviewDrawer';

const BASE_MAP_STORAGE_KEY = 'travel-tracker-base-map';
const PROVINCE_HIGHLIGHT_STORAGE_KEY = 'travel-tracker-province-highlight';

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
    birthplace,
    passengerName,
    addJourney,
    updateJourney,
    deleteJourney,
    setBirthplace,
    setPassengerName,
    exportRecord,
  } = useJourneyStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [baseMap, setBaseMap] = useState<BaseMapMode>(() => {
    if (typeof window === 'undefined') return 'liberty';
    const savedBaseMap = window.localStorage.getItem(BASE_MAP_STORAGE_KEY);
    return isBaseMapMode(savedBaseMap) ? savedBaseMap : 'liberty';
  });
  const [showProvinceHighlights, setShowProvinceHighlights] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const savedValue = window.localStorage.getItem(PROVINCE_HIGHLIGHT_STORAGE_KEY);
    return savedValue === null ? true : savedValue === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(BASE_MAP_STORAGE_KEY, baseMap);
  }, [baseMap]);

  useEffect(() => {
    window.localStorage.setItem(PROVINCE_HIGHLIGHT_STORAGE_KEY, String(showProvinceHighlights));
  }, [showProvinceHighlights]);

  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<JourneyRecordFilter | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorJourney, setEditorJourney] = useState<Journey | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(true);

  useEffect(() => {
    if (selectedJourneyId && !journeys.some(journey => journey.id === selectedJourneyId)) {
      setSelectedJourneyId(null);
    }
  }, [journeys, selectedJourneyId]);

  useEffect(() => {
    if (!activeFilter || !selectedJourneyId) return;

    const selectedJourney = journeys.find(journey => journey.id === selectedJourneyId);
    if (!selectedJourney || !journeyMatchesRecordFilter(selectedJourney, activeFilter)) {
      setSelectedJourneyId(null);
    }
  }, [activeFilter, journeys, selectedJourneyId]);

  useEffect(() => {
    if (!editorJourney) return;

    const hasEditingJourney = journeys.some(journey => journey.id === editorJourney.id);
    if (!hasEditingJourney) {
      setEditorOpen(false);
      setEditorJourney(null);
    }
  }, [editorJourney, journeys]);

  const selectedJourney = useMemo(
    () => journeys.find(journey => journey.id === selectedJourneyId) ?? null,
    [journeys, selectedJourneyId],
  );

  const handleDeleteJourney = (id: string) => {
    if (selectedJourneyId === id) {
      setSelectedJourneyId(null);
    }
    if (editorJourney?.id === id) {
      setEditorOpen(false);
      setEditorJourney(null);
    }
    deleteJourney(id);
  };

  const openCreateJourneyEditor = () => {
    setEditorJourney(null);
    setEditorOpen(true);
  };

  const openEditJourneyEditor = (journey: Journey) => {
    setEditorJourney(journey);
    setEditorOpen(true);
  };

  const closeJourneyEditor = () => {
    setEditorOpen(false);
    setEditorJourney(null);
  };

  const openSettings = () => {
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
  };

  const handleCreateJourney = (journey: Omit<Journey, 'id'>) => {
    addJourney(journey);
  };

  const handleUpdateJourney = (id: string, journey: Omit<Journey, 'id'>) => {
    updateJourney(id, journey);
  };

  const handleProvinceSelect = (provinceName: string) => {
    setSelectedProvinceName(provinceName);
    setOverviewOpen(true);
  };
  const handleVisitedLocationSelect = (filter: JourneyRecordFilter) => {
    const matchingJourneys = filterJourneysByRecordFilter(journeys, filter);

    setActiveFilter(filter);
    setPanelOpen(true);
    setSelectedJourneyId(current => {
      if (matchingJourneys.length === 1) {
        return matchingJourneys[0].id;
      }

      if (current && matchingJourneys.some(journey => journey.id === current)) {
        return current;
      }

      return null;
    });
  };

  const isNightMode = baseMap === 'night';
  const topControlsPosition = panelOpen ? 'right-4 sm:right-[32rem]' : 'right-4';

  return (
    <div className="w-full h-full relative">
      <TravelMap
        journeys={journeys}
        birthplace={birthplace}
        showProvinceHighlights={showProvinceHighlights}
        baseMap={baseMap}
        selectedJourney={selectedJourney}
        selectedProvinceName={overviewOpen ? selectedProvinceName : null}
        selectionMode={overviewOpen ? 'province-stats' : 'records'}
        panelOpen={panelOpen}
        onVisitedLocationSelect={handleVisitedLocationSelect}
        onProvinceSelect={handleProvinceSelect}
      />

      <div className={`absolute top-4 z-[2100] flex flex-col gap-2 transition-all ${topControlsPosition}`}>
        <button
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition ${
            isNightMode
              ? 'border-slate-700 bg-slate-950/88 hover:bg-slate-900'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
          onClick={() => setPanelOpen(current => !current)}
          title="查看详情"
          aria-label="查看详情"
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

        <button
          type="button"
          title="添加旅程"
          aria-label="添加旅程"
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition ${
            isNightMode
              ? 'border-slate-700 bg-slate-100 text-slate-950 hover:bg-white'
              : 'border-gray-200 bg-white text-stone-900 hover:bg-[#fcfaf6]'
          }`}
          onClick={openCreateJourneyEditor}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M12 5v14m7-7H5" />
          </svg>
        </button>

        <button
          type="button"
          title="设置"
          aria-label="设置"
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition ${
            isNightMode
              ? 'border-slate-700 bg-slate-950/88 text-slate-100 hover:bg-slate-900'
              : 'border-gray-200 bg-white text-stone-700 hover:bg-gray-50'
          }`}
          onClick={openSettings}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.36 2.36 1.724 1.724 0 001.065 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.36 2.36 1.724 1.724 0 00-2.572 1.065 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.36-2.36 1.724 1.724 0 00-1.065-2.572 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.36-2.36 1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <JourneyEditorModal
        isOpen={editorOpen}
        journey={editorJourney}
        passengerName={passengerName}
        onClose={closeJourneyEditor}
        onCreateJourney={handleCreateJourney}
        onUpdateJourney={handleUpdateJourney}
      />

      <SettingsModal
        isOpen={settingsOpen}
        showProvinceHighlights={showProvinceHighlights}
        birthplace={birthplace}
        passengerName={passengerName}
        onClose={closeSettings}
        onProvinceHighlightChange={setShowProvinceHighlights}
        onBirthplaceChange={setBirthplace}
        onPassengerNameChange={setPassengerName}
      />

      <JourneyOverviewDrawer
        isOpen={overviewOpen}
        archiveOpen={panelOpen}
        journeys={journeys}
        selectedProvinceName={selectedProvinceName}
        onProvinceSelect={setSelectedProvinceName}
        onToggle={() => setOverviewOpen(current => !current)}
      />

      <JourneyPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        passengerName={passengerName}
        journeys={journeys}
        activeFilter={activeFilter}
        deleteJourney={handleDeleteJourney}
        exportRecord={exportRecord}
        selectedJourneyId={selectedJourneyId}
        editingJourneyId={editorOpen ? editorJourney?.id ?? null : null}
        onSelectJourney={journeyId => {
          setSelectedJourneyId(current => (current === journeyId ? null : journeyId));
        }}
        onEditJourney={openEditJourneyEditor}
        onClearFilter={() => setActiveFilter(null)}
      />

      <div className="absolute bottom-5 left-4 z-[2100] sm:bottom-6">
        <div
          className={`flex items-center gap-1 rounded-full border px-1.5 py-1.5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.32)] ${
            isNightMode
              ? 'border-slate-700 bg-slate-950 text-slate-100'
              : 'border-stone-200 bg-[#f6f1e8] text-stone-700'
          }`}
        >
          {BASE_MAP_OPTIONS.map(option => {
            const selected = option.key === baseMap;

            return (
              <button
                key={option.key}
                type="button"
                className={`rounded-full px-3 py-2 text-xs tracking-[0.2em] transition sm:px-4 ${
                  selected
                    ? isNightMode
                      ? 'bg-slate-100 text-slate-950'
                      : 'bg-stone-900 text-white'
                    : isNightMode
                      ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      : 'text-stone-500 hover:bg-white hover:text-stone-900'
                }`}
                onClick={() => setBaseMap(option.key)}
                aria-pressed={selected}
                title={option.title}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
