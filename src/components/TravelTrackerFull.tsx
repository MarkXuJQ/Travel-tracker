import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJourneyStore } from '../hooks/useJourneyStore';
import type { Journey, JourneyRecordFilter } from '../types/journey';
import { filterJourneysByRecordFilter, journeyMatchesRecordFilter } from '../utils/journeyRecordFilter';
import TravelMap from './TravelMap';
import { BASE_MAP_OPTIONS, useTravelMapPreferences } from './travelTrackerConfig';
import {
  publishCloudPersonalRecord,
  readStoredAdminToken,
  readStoredAutoSyncPreference,
  writeStoredAdminToken,
  writeStoredAutoSyncPreference,
  type CloudPublishResponse,
  type CloudPublishStatus,
} from '../services/travelRecordCloud';

const SettingsModal = lazy(() => import('./SettingsModal'));
const JourneyEditorModal = lazy(() => import('./JourneyEditorModal'));
const JourneyPanel = lazy(() => import('./JourneyPanel'));
const JourneyOverviewDrawer = lazy(() => import('./JourneyOverviewDrawer'));

export default function TravelTrackerFull() {
  const {
    journeys,
    birthplace,
    passengerName,
    activeRecordId,
    activeRecordKind,
    activeRecordSource,
    activeRecordName,
    activeRecordDescription,
    availableRecords,
    setActiveRecord,
    createHistoricalRecord,
    importHistoricalRecordFromJson,
    deleteHistoricalRecord,
    addJourney,
    updateJourney,
    deleteJourney,
    setBirthplace,
    setPassengerName,
    exportRecord,
    personalRecord,
    cloudRecordLoadStatus,
    cloudRecordSource,
    cloudRecordError,
  } = useJourneyStore();
  const { baseMap, setBaseMap, showProvinceHighlights, setShowProvinceHighlights } = useTravelMapPreferences();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<JourneyRecordFilter | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorJourney, setEditorJourney] = useState<Journey | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [adminToken, setAdminToken] = useState(readStoredAdminToken);
  const [autoCloudSync, setAutoCloudSync] = useState(readStoredAutoSyncPreference);
  const [cloudPublishStatus, setCloudPublishStatus] = useState<CloudPublishStatus>('idle');
  const [cloudPublishMessage, setCloudPublishMessage] = useState<string | null>(null);
  const personalRecordSignature = useMemo(() => JSON.stringify(personalRecord), [personalRecord]);
  const previousPersonalRecordSignatureRef = useRef(personalRecordSignature);

  useEffect(() => {
    if (selectedJourneyId && !journeys.some(journey => journey.id === selectedJourneyId)) {
      setSelectedJourneyId(null);
    }
  }, [journeys, selectedJourneyId]);

  useEffect(() => {
    setActiveFilter(null);
    setSelectedJourneyId(null);
    setSelectedProvinceName(null);
  }, [activeRecordId]);

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

  const requestAdminToken = useCallback(() => {
    const currentToken = adminToken.trim();
    if (currentToken) return currentToken;
    if (typeof window === 'undefined') return '';

    const nextToken = window.prompt('输入 TravelTracker 管理员同步口令')?.trim() ?? '';
    if (nextToken) {
      setAdminToken(nextToken);
      writeStoredAdminToken(nextToken);
    }

    return nextToken;
  }, [adminToken]);

  const getPublishMessage = (response: CloudPublishResponse) => {
    const updatedTargets = response.commits.filter(commit => commit.status === 'updated');
    if (updatedTargets.length === 0) {
      return '云端档案已经是最新状态。';
    }

    return `已更新 ${updatedTargets.map(commit => commit.repo).join('、')}，Vercel 会继续处理对应部署。`;
  };

  const handlePublishCloudRecord = useCallback(async (options?: {
    token?: string;
    mode?: 'manual' | 'auto';
  }) => {
    const token = options?.token?.trim()
      || (options?.mode === 'auto' ? adminToken.trim() : requestAdminToken());

    if (!token) {
      setCloudPublishStatus('error');
      setCloudPublishMessage('需要管理员同步口令后才能保存到云端。');
      return false;
    }

    setCloudPublishStatus('saving');
    setCloudPublishMessage(options?.mode === 'auto' ? '正在自动保存到云端...' : '正在保存到云端...');

    try {
      const response = await publishCloudPersonalRecord(personalRecord, token);
      setCloudPublishStatus('saved');
      setCloudPublishMessage(getPublishMessage(response));
      return true;
    } catch (error) {
      setCloudPublishStatus('error');
      setCloudPublishMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [adminToken, personalRecord, requestAdminToken]);

  const handleAutoCloudSyncChange = useCallback((enabled: boolean) => {
    if (!enabled) {
      setAutoCloudSync(false);
      writeStoredAutoSyncPreference(false);
      return;
    }

    const token = adminToken.trim() || requestAdminToken();
    if (!token) return;

    setAutoCloudSync(true);
    writeStoredAutoSyncPreference(true);
    void handlePublishCloudRecord({ token, mode: 'manual' });
  }, [adminToken, handlePublishCloudRecord, requestAdminToken]);

  useEffect(() => {
    const previousSignature = previousPersonalRecordSignatureRef.current;
    previousPersonalRecordSignatureRef.current = personalRecordSignature;

    if (previousSignature === personalRecordSignature) return;
    if (!autoCloudSync || !adminToken.trim()) return;

    const timer = window.setTimeout(() => {
      void handlePublishCloudRecord({
        token: adminToken.trim(),
        mode: 'auto',
      });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [adminToken, autoCloudSync, handlePublishCloudRecord, personalRecordSignature]);

  const isNightMode = baseMap === 'night';
  const topControlsPosition = panelOpen ? 'right-4 sm:right-[32rem]' : 'right-4';
  const isCloudSaving = cloudPublishStatus === 'saving';

  return (
    <div className="relative h-full w-full">
      <TravelMap
        journeys={journeys}
        birthplace={birthplace}
        showProvinceHighlights={showProvinceHighlights}
        baseMap={baseMap}
        enableLocationSelection
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
          onClick={() => {
            setEditorJourney(null);
            setEditorOpen(true);
          }}
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
          onClick={() => setSettingsOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.36 2.36 1.724 1.724 0 001.065 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.36 2.36 1.724 1.724 0 00-2.572 1.065 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.36-2.36 1.724 1.724 0 00-1.065-2.572 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.36-2.36 1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          type="button"
          title="保存到云端"
          aria-label="保存到云端"
          disabled={isCloudSaving}
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition disabled:cursor-wait disabled:opacity-70 ${
            cloudPublishStatus === 'saved'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : cloudPublishStatus === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : isNightMode
                  ? 'border-slate-700 bg-slate-950/88 text-slate-100 hover:bg-slate-900'
                  : 'border-gray-200 bg-white text-stone-700 hover:bg-gray-50'
          }`}
          onClick={() => {
            void handlePublishCloudRecord({ mode: 'manual' });
          }}
        >
          {isCloudSaving ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3a9 9 0 109 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 17.5a4.5 4.5 0 01.72-8.94A6 6 0 0119 10.5a3.5 3.5 0 01-.5 6.97H13m-1-3.97V21m0-7.5l-3 3m3-3l3 3" />
            </svg>
          )}
        </button>
      </div>

      <Suspense fallback={null}>
        {(editorOpen || editorJourney) && (
          <JourneyEditorModal
            isOpen={editorOpen}
            journey={editorJourney}
            passengerName={passengerName}
            onClose={() => {
              setEditorOpen(false);
              setEditorJourney(null);
            }}
            onCreateJourney={journey => addJourney(journey)}
            onUpdateJourney={(id, journey) => updateJourney(id, journey)}
          />
        )}

        {settingsOpen && (
          <SettingsModal
            isOpen={settingsOpen}
            showProvinceHighlights={showProvinceHighlights}
            birthplace={birthplace}
            passengerName={passengerName}
            onClose={() => setSettingsOpen(false)}
            onProvinceHighlightChange={setShowProvinceHighlights}
            onBirthplaceChange={setBirthplace}
            onPassengerNameChange={setPassengerName}
          />
        )}

        <JourneyOverviewDrawer
          isOpen={overviewOpen}
          archiveOpen={panelOpen}
          journeys={journeys}
          selectedProvinceName={selectedProvinceName}
          onProvinceSelect={setSelectedProvinceName}
          onToggle={() => setOverviewOpen(current => !current)}
        />

        {panelOpen && (
          <JourneyPanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            passengerName={passengerName}
            journeys={journeys}
            activeRecordId={activeRecordId}
            activeRecordKind={activeRecordKind}
            activeRecordSource={activeRecordSource}
            activeRecordName={activeRecordName}
            activeRecordDescription={activeRecordDescription}
            availableRecords={availableRecords}
            activeFilter={activeFilter}
            deleteJourney={handleDeleteJourney}
            exportRecord={exportRecord}
            cloudSync={{
              loadStatus: cloudRecordLoadStatus,
              loadError: cloudRecordError,
              sourceLabel: cloudRecordSource
                ? `${cloudRecordSource.repo}@${cloudRecordSource.branch}`
                : '',
              publishStatus: cloudPublishStatus,
              message: cloudPublishMessage,
              autoSync: autoCloudSync,
              onAutoSyncChange: handleAutoCloudSyncChange,
              onPublish: () => {
                void handlePublishCloudRecord({ mode: 'manual' });
              },
            }}
            selectedJourneyId={selectedJourneyId}
            editingJourneyId={editorOpen ? editorJourney?.id ?? null : null}
            onSelectJourney={journeyId => {
              setSelectedJourneyId(current => (current === journeyId ? null : journeyId));
            }}
            onEditJourney={journey => {
              setEditorJourney(journey);
              setEditorOpen(true);
            }}
            onClearFilter={() => setActiveFilter(null)}
            onActiveRecordChange={setActiveRecord}
            onCreateHistoricalRecord={createHistoricalRecord}
            onImportHistoricalRecordFromJson={importHistoricalRecordFromJson}
            onDeleteHistoricalRecord={deleteHistoricalRecord}
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
    </div>
  );
}
