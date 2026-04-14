import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useJourneyStore } from '../hooks/useJourneyStore';
import type { JourneyRecordFilter } from '../types/journey';
import { filterJourneysByRecordFilter, journeyMatchesRecordFilter } from '../utils/journeyRecordFilter';
import TravelMap from './TravelMap';
import { BASE_MAP_OPTIONS, useTravelMapPreferences } from './travelTrackerConfig';

const JourneyPanel = lazy(() => import('./JourneyPanel'));
const JourneyOverviewDrawer = lazy(() => import('./JourneyOverviewDrawer'));

interface Props {
  embedMode?: boolean;
}

export default function TravelTrackerPlugin({ embedMode = false }: Props) {
  const { library, setActiveRecord } = useJourneyStore();
  const { baseMap, setBaseMap, showProvinceHighlights } = useTravelMapPreferences();
  const personalRecord = library.personalRecord;
  const journeys = personalRecord.journeys;
  const birthplace = personalRecord.birthplace ?? null;
  const passengerName = personalRecord.passengerName?.trim() ?? '';
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<JourneyRecordFilter | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(() => !embedMode);

  useEffect(() => {
    setActiveRecord(personalRecord.userId);
  }, [personalRecord.userId, setActiveRecord]);

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

  const selectedJourney = useMemo(
    () => journeys.find(journey => journey.id === selectedJourneyId) ?? null,
    [journeys, selectedJourneyId],
  );

  const handleVisitedLocationSelect = (filter: JourneyRecordFilter) => {
    if (embedMode) return;

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

  const handleExportRecord = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(personalRecord, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${personalRecord.userId || 'travel-record'}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const isNightMode = baseMap === 'night';
  const topControlsPosition = panelOpen ? 'right-4 sm:right-[32rem]' : 'right-4';
  const pluginMapUrl = typeof window === 'undefined'
    ? '/?variant=plugin'
    : `${window.location.origin}${window.location.pathname}?variant=plugin`;

  return (
    <div className="relative h-full w-full">
      <TravelMap
        journeys={journeys}
        birthplace={birthplace}
        showProvinceHighlights={showProvinceHighlights}
        baseMap={baseMap}
        enableLocationSelection={!embedMode}
        selectedJourney={selectedJourney}
        selectionMode="records"
        panelOpen={panelOpen}
        onVisitedLocationSelect={handleVisitedLocationSelect}
      />

      {embedMode ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-[2100] flex justify-end">
          <a
            href={pluginMapUrl}
            target="_blank"
            rel="noreferrer"
            className={`pointer-events-auto inline-flex items-center rounded-full border px-4 py-2 text-xs tracking-[0.22em] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.4)] transition ${
              isNightMode
                ? 'border-slate-700 bg-slate-950/88 text-slate-100 hover:bg-slate-900'
                : 'border-white/70 bg-white/86 text-slate-700 hover:bg-white'
            }`}
          >
            显示完整地图
          </a>
        </div>
      ) : (
        <>
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
          </div>

          <Suspense fallback={null}>
            <JourneyOverviewDrawer
              isOpen={overviewOpen}
              archiveOpen={panelOpen}
              publicMode
              journeys={journeys}
              onToggle={() => setOverviewOpen(current => !current)}
            />

            {panelOpen && (
              <JourneyPanel
                isOpen={panelOpen}
                onClose={() => setPanelOpen(false)}
                passengerName={passengerName}
                journeys={journeys}
                activeRecordId={personalRecord.userId}
                activeRecordKind="personal"
                activeRecordName={personalRecord.userName}
                activeRecordDescription={personalRecord.description?.trim() ?? ''}
                availableRecords={[
                  {
                    id: personalRecord.userId,
                    name: personalRecord.userName,
                    kind: 'personal',
                    description: personalRecord.description?.trim() ?? '',
                    journeyCount: journeys.length,
                  },
                ]}
                activeFilter={activeFilter}
                publicMode
                deleteJourney={() => undefined}
                exportRecord={handleExportRecord}
                selectedJourneyId={selectedJourneyId}
                editingJourneyId={null}
                onSelectJourney={journeyId => {
                  setSelectedJourneyId(current => (current === journeyId ? null : journeyId));
                }}
                onEditJourney={() => undefined}
                onClearFilter={() => setActiveFilter(null)}
                onActiveRecordChange={() => undefined}
                onCreateHistoricalRecord={() => undefined}
                onImportHistoricalRecordFromJson={() => ({ ok: false, error: '插件版未启用该功能' })}
                onDeleteHistoricalRecord={() => undefined}
              />
            )}
          </Suspense>

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
        </>
      )}
    </div>
  );
}
