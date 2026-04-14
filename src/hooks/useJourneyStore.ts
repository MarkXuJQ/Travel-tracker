import { useEffect, useMemo, useState } from 'react';
import type {
  Journey,
  JourneyLibraryState,
  JourneyLocation,
  JourneyRecordKind,
  JourneyRecordSource,
  UserJourneyRecord,
} from '../types/journey';
import { FAMOUS_JOURNEY_PRESETS } from '../data/famousJourneyArchives';
import { normalizeJourneyDate } from '../utils/journeyDate';

const STORAGE_KEY = 'travel_globe_journey_library';
const LEGACY_RECORD_STORAGE_KEY = 'travel_globe_journeys';
const ARCHIVE_STORAGE_KEY = 'travel_globe_archive';
const RETIRED_PRESET_HISTORICAL_RECORD_IDS = new Set(['zheng-he']);
const RETIRED_PRESET_HISTORICAL_RECORD_NAMES = new Set(['郑和']);
const DEFAULT_USER_RECORD: UserJourneyRecord = {
  userId: 'me',
  userName: '我',
  kind: 'personal',
  description: '',
  birthplace: null,
  passengerName: '',
  journeys: [],
};

interface LegacyTravelerProfile {
  id: string;
  name: string;
  journeys: Journey[];
}

interface LegacyJourneyArchive {
  selectedTravelerId: string;
  travelers: LegacyTravelerProfile[];
}

function cloneLocation(location: JourneyLocation): JourneyLocation {
  return { ...location };
}

function cloneOptionalLocation(location?: JourneyLocation | null): JourneyLocation | null {
  return location ? cloneLocation(location) : null;
}

function inferJourneyEndpoints(locations: JourneyLocation[]): {
  departure: JourneyLocation | null;
  destination: JourneyLocation | null;
} {
  const firstLocation = locations[0] ? cloneLocation(locations[0]) : null;
  const lastLocation = locations[locations.length - 1] ? cloneLocation(locations[locations.length - 1]) : firstLocation;

  return {
    departure: firstLocation,
    destination: lastLocation,
  };
}

function cloneJourney(journey: Journey): Journey {
  const inferredEndpoints = inferJourneyEndpoints(journey.locations);
  const departure = cloneOptionalLocation(journey.departure) ?? inferredEndpoints.departure;
  const destination = cloneOptionalLocation(journey.destination) ?? inferredEndpoints.destination;
  const transportMode = journey.transportMode ?? (journey.showEndpoints === false ? 'default' : 'train');
  const shouldShowEndpoints = journey.showEndpoints ?? (transportMode !== 'default' && journey.locations.length <= 2);

  return {
    ...journey,
    date: journey.date ? normalizeJourneyDate(journey.date) ?? journey.date.trim() : undefined,
    transportMode,
    showEndpoints: Boolean(shouldShowEndpoints && departure && destination),
    departure,
    destination,
    locations: journey.locations.map(cloneLocation),
  };
}

function isJourneyRecordKind(value: unknown): value is JourneyRecordKind {
  return value === 'personal' || value === 'historical';
}

function isJourneyRecordSource(value: unknown): value is JourneyRecordSource {
  return value === 'preset' || value === 'custom';
}

function createHistoricalRecordId(name: string, usedIds: Set<string>, preferredId?: string) {
  const seed = (preferredId && preferredId !== DEFAULT_USER_RECORD.userId ? preferredId : name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const baseId = seed || `historical-${Date.now()}`;

  let nextId = baseId;
  let counter = 2;
  while (usedIds.has(nextId)) {
    nextId = `${baseId}-${counter}`;
    counter += 1;
  }

  return nextId;
}

function cloneRecord(record: UserJourneyRecord, fallbackKind: JourneyRecordKind = 'personal'): UserJourneyRecord {
  const normalizedKind = record.kind === 'historical' || fallbackKind === 'historical' ? 'historical' : 'personal';

  return {
    userId: record.userId,
    userName: record.userName,
    kind: normalizedKind,
    source: normalizedKind === 'historical' ? record.source : undefined,
    description: record.description?.trim() ?? '',
    birthplace: record.birthplace ? cloneLocation(record.birthplace) : null,
    passengerName: record.passengerName?.trim() ?? '',
    journeys: record.journeys.map(cloneJourney),
  };
}

function createEmptyRecord(kind: JourneyRecordKind = 'personal'): UserJourneyRecord {
  return cloneRecord({
    ...DEFAULT_USER_RECORD,
    kind,
  }, kind);
}

function isJourneyLocation(value: unknown): value is Journey['locations'][number] {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Journey['locations'][number]>;

  return (
    (candidate.type === 'country' || candidate.type === 'province' || candidate.type === 'city') &&
    typeof candidate.name === 'string' &&
    typeof candidate.label === 'string'
  );
}

function isJourney(value: unknown): value is Journey {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Journey>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    (candidate.transportMode === undefined || candidate.transportMode === 'default' || candidate.transportMode === 'train' || candidate.transportMode === 'flight') &&
    (candidate.showEndpoints === undefined || typeof candidate.showEndpoints === 'boolean') &&
    (candidate.departure === undefined || candidate.departure === null || isJourneyLocation(candidate.departure)) &&
    (candidate.destination === undefined || candidate.destination === null || isJourneyLocation(candidate.destination)) &&
    Array.isArray(candidate.locations) &&
    candidate.locations.every(isJourneyLocation)
  );
}

function isUserJourneyRecord(value: unknown): value is UserJourneyRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<UserJourneyRecord>;

  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.userName === 'string' &&
    (candidate.kind === undefined || isJourneyRecordKind(candidate.kind)) &&
    (candidate.source === undefined || isJourneyRecordSource(candidate.source)) &&
    (candidate.description === undefined || typeof candidate.description === 'string') &&
    (candidate.birthplace === undefined || candidate.birthplace === null || isJourneyLocation(candidate.birthplace)) &&
    (candidate.passengerName === undefined || typeof candidate.passengerName === 'string') &&
    Array.isArray(candidate.journeys) &&
    candidate.journeys.every(isJourney)
  );
}

function isLegacyTravelerProfile(value: unknown): value is LegacyTravelerProfile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LegacyTravelerProfile>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.journeys) &&
    candidate.journeys.every(isJourney)
  );
}

function isLegacyJourneyArchive(value: unknown): value is LegacyJourneyArchive {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LegacyJourneyArchive>;

  return (
    typeof candidate.selectedTravelerId === 'string' &&
    Array.isArray(candidate.travelers) &&
    candidate.travelers.every(isLegacyTravelerProfile)
  );
}

function isJourneyLibraryState(value: unknown): value is JourneyLibraryState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<JourneyLibraryState>;

  return (
    typeof candidate.activeRecordId === 'string' &&
    (candidate.dismissedPresetRecordIds === undefined || (
      Array.isArray(candidate.dismissedPresetRecordIds)
      && candidate.dismissedPresetRecordIds.every(item => typeof item === 'string')
    )) &&
    isUserJourneyRecord(candidate.personalRecord) &&
    Array.isArray(candidate.historicalRecords) &&
    candidate.historicalRecords.every(isUserJourneyRecord)
  );
}

function normalizeRecord(
  record: UserJourneyRecord,
  kind: JourneyRecordKind,
  sourceOverride?: JourneyRecordSource,
): UserJourneyRecord {
  const normalizedSource = kind === 'historical'
    ? (sourceOverride ?? (isJourneyRecordSource(record.source) ? record.source : undefined))
    : undefined;

  return {
    userId: record.userId.trim() || (kind === 'personal' ? DEFAULT_USER_RECORD.userId : DEFAULT_USER_RECORD.userId),
    userName: record.userName.trim() || (kind === 'personal' ? DEFAULT_USER_RECORD.userName : '未命名人物'),
    kind,
    source: normalizedSource,
    description: record.description?.trim() ?? '',
    birthplace: record.birthplace && isJourneyLocation(record.birthplace)
      ? cloneLocation(record.birthplace)
      : null,
    passengerName: record.passengerName?.trim() ?? '',
    journeys: record.journeys.filter(isJourney).map(cloneJourney),
  };
}

function mergePresetHistoricalRecord(presetRecord: UserJourneyRecord, existingRecord: UserJourneyRecord | null) {
  const normalizedPresetRecord = normalizeRecord(presetRecord, 'historical', 'preset');

  if (!existingRecord) {
    return normalizedPresetRecord;
  }

  const presetJourneyIds = new Set(normalizedPresetRecord.journeys.map(journey => journey.id));
  const existingJourneysById = new Map(existingRecord.journeys.map(journey => [journey.id, journey]));
  const mergedJourneys = [
    ...normalizedPresetRecord.journeys.map(journey => {
      const existingJourney = existingJourneysById.get(journey.id);

      return existingJourney
        ? cloneJourney({
            ...existingJourney,
            ...journey,
          })
        : cloneJourney(journey);
    }),
    ...existingRecord.journeys
      .filter(journey => !presetJourneyIds.has(journey.id))
      .map(cloneJourney),
  ];

  return normalizeRecord({
    ...existingRecord,
    ...normalizedPresetRecord,
    userId: normalizedPresetRecord.userId,
    userName: normalizedPresetRecord.userName,
    description: normalizedPresetRecord.description || existingRecord.description,
    journeys: mergedJourneys,
  }, 'historical', 'preset');
}

function isRetiredPresetHistoricalRecord(record: UserJourneyRecord) {
  return RETIRED_PRESET_HISTORICAL_RECORD_IDS.has(record.userId)
    || RETIRED_PRESET_HISTORICAL_RECORD_NAMES.has(record.userName);
}

function normalizeLibraryState(library: JourneyLibraryState): JourneyLibraryState {
  const personalRecord = normalizeRecord(library.personalRecord, 'personal');
  const usedIds = new Set<string>([personalRecord.userId]);
  const dismissedPresetRecordIds = (library.dismissedPresetRecordIds ?? [])
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
  const dismissedPresetRecordIdSet = new Set(dismissedPresetRecordIds);
  const rawHistoricalRecords = library.historicalRecords
    .filter(isUserJourneyRecord)
    .map(record => normalizeRecord(record, 'historical'));
  const presetRecordIds = new Set(FAMOUS_JOURNEY_PRESETS.map(record => record.userId));
  const presetRecordNames = new Set(FAMOUS_JOURNEY_PRESETS.map(record => record.userName));
  const presetHistoricalRecords: UserJourneyRecord[] = FAMOUS_JOURNEY_PRESETS.flatMap(presetRecord => {
    if (dismissedPresetRecordIdSet.has(presetRecord.userId)) {
      return [];
    }

    const existingRecord = rawHistoricalRecords.find(record =>
      record.userId === presetRecord.userId || record.userName === presetRecord.userName,
    ) ?? null;
    const mergedRecord = mergePresetHistoricalRecord(presetRecord, existingRecord);
    const nextId = createHistoricalRecordId(mergedRecord.userName, usedIds, presetRecord.userId);
    usedIds.add(nextId);

    return [{
      ...mergedRecord,
      userId: nextId,
      kind: 'historical' as const,
      source: 'preset' as const,
    }];
  });
  const customHistoricalRecords = rawHistoricalRecords
    .filter(record => {
      if (presetRecordIds.has(record.userId) || presetRecordNames.has(record.userName)) {
        return false;
      }

      if (record.source === 'preset') {
        return false;
      }

      if (!record.source && isRetiredPresetHistoricalRecord(record)) {
        return false;
      }

      return true;
    })
    .map(record => {
      const nextId = createHistoricalRecordId(record.userName, usedIds, record.userId);
      usedIds.add(nextId);

      return {
        ...record,
        userId: nextId,
        kind: 'historical' as const,
        source: 'custom' as const,
      };
    });
  const historicalRecords = [
    ...presetHistoricalRecords,
    ...customHistoricalRecords,
  ];
  const allRecordIds = new Set([personalRecord.userId, ...historicalRecords.map(record => record.userId)]);
  const activeRecordId = allRecordIds.has(library.activeRecordId) ? library.activeRecordId : personalRecord.userId;

  return {
    personalRecord,
    historicalRecords,
    activeRecordId,
    dismissedPresetRecordIds: dismissedPresetRecordIds.filter(recordId => presetRecordIds.has(recordId)),
  };
}

function migrateLegacyArchive(archive: LegacyJourneyArchive): JourneyLibraryState {
  const selectedTraveler = archive.travelers.find(traveler => traveler.id === archive.selectedTravelerId) ?? archive.travelers[0];
  const personalRecord = normalizeRecord({
    userId: selectedTraveler?.id || DEFAULT_USER_RECORD.userId,
    userName: selectedTraveler?.name || DEFAULT_USER_RECORD.userName,
    journeys: selectedTraveler?.journeys ?? [],
  }, 'personal');
  const usedIds = new Set<string>([personalRecord.userId]);
  const historicalRecords = archive.travelers
    .filter(traveler => traveler.id !== selectedTraveler?.id)
    .map(traveler => ({
      userId: createHistoricalRecordId(traveler.name, usedIds, traveler.id),
      userName: traveler.name,
      kind: 'historical' as const,
      source: 'custom' as const,
      description: '',
      birthplace: null,
      passengerName: '',
      journeys: traveler.journeys,
    }))
    .map(record => {
      usedIds.add(record.userId);
      return normalizeRecord(record, 'historical');
    });

  return {
    personalRecord,
    historicalRecords,
    activeRecordId: personalRecord.userId,
    dismissedPresetRecordIds: [],
  };
}

function loadLibraryFromStorage(): JourneyLibraryState {
  const seedLibrary: JourneyLibraryState = {
    personalRecord: createEmptyRecord('personal'),
    historicalRecords: [],
    activeRecordId: DEFAULT_USER_RECORD.userId,
    dismissedPresetRecordIds: [],
  };

  try {
    const rawLibrary = localStorage.getItem(STORAGE_KEY);
    if (rawLibrary) {
      const parsedLibrary = JSON.parse(rawLibrary) as unknown;

      if (isJourneyLibraryState(parsedLibrary)) {
        return normalizeLibraryState(parsedLibrary);
      }
    }

    const raw = localStorage.getItem(LEGACY_RECORD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;

      if (isUserJourneyRecord(parsed)) {
        return normalizeLibraryState({
          personalRecord: normalizeRecord(parsed, 'personal'),
          historicalRecords: [],
          activeRecordId: parsed.userId,
          dismissedPresetRecordIds: [],
        });
      }

      if (Array.isArray(parsed)) {
        return normalizeLibraryState({
          personalRecord: normalizeRecord({
            ...seedLibrary.personalRecord,
            journeys: parsed.filter(isJourney),
          }, 'personal'),
          historicalRecords: [],
          activeRecordId: seedLibrary.personalRecord.userId,
          dismissedPresetRecordIds: [],
        });
      }
    }

    const archiveRaw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (archiveRaw) {
      const parsedArchive = JSON.parse(archiveRaw) as unknown;
      if (isLegacyJourneyArchive(parsedArchive)) {
        return normalizeLibraryState(migrateLegacyArchive(parsedArchive));
      }
    }

    return seedLibrary;
  } catch {
    return seedLibrary;
  }
}

function resolveActiveRecord(library: JourneyLibraryState) {
  return library.activeRecordId === library.personalRecord.userId
    ? library.personalRecord
    : library.historicalRecords.find(record => record.userId === library.activeRecordId) ?? library.personalRecord;
}

function buildHistoricalRecord(
  record: UserJourneyRecord,
  currentLibrary: JourneyLibraryState,
  preserveId = true,
): UserJourneyRecord {
  const usedIds = new Set<string>([
    currentLibrary.personalRecord.userId,
    ...currentLibrary.historicalRecords
      .filter(existingRecord => existingRecord.userId !== record.userId)
      .map(existingRecord => existingRecord.userId),
  ]);
  const normalized = normalizeRecord(record, 'historical', 'custom');
  const nextId = preserveId && record.userId && !usedIds.has(record.userId) && record.userId !== DEFAULT_USER_RECORD.userId
    ? record.userId
    : createHistoricalRecordId(normalized.userName, usedIds, normalized.userId);

  return {
    ...normalized,
    userId: nextId,
    kind: 'historical',
    source: 'custom',
  };
}

export function useJourneyStore() {
  const [library, setLibrary] = useState<JourneyLibraryState>(loadLibraryFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    localStorage.removeItem(LEGACY_RECORD_STORAGE_KEY);
    localStorage.removeItem(ARCHIVE_STORAGE_KEY);
  }, [library]);

  const activeRecord = useMemo(() => resolveActiveRecord(library), [library]);
  const journeys = useMemo(() => activeRecord.journeys, [activeRecord.journeys]);

  const updateActiveRecord = (updater: (record: UserJourneyRecord) => UserJourneyRecord) => {
    setLibrary(current => {
      if (current.activeRecordId === current.personalRecord.userId) {
        return {
          ...current,
          personalRecord: normalizeRecord(updater(current.personalRecord), 'personal'),
        };
      }

      return {
        ...current,
        historicalRecords: current.historicalRecords.map(record => (
          record.userId === current.activeRecordId
            ? normalizeRecord(updater(record), 'historical')
            : record
        )),
      };
    });
  };

  const setActiveRecord = (recordId: string) => {
    setLibrary(current => {
      const availableIds = new Set([
        current.personalRecord.userId,
        ...current.historicalRecords.map(record => record.userId),
      ]);

      return {
        ...current,
        activeRecordId: availableIds.has(recordId) ? recordId : current.personalRecord.userId,
      };
    });
  };

  const createHistoricalRecord = (userName: string, description = '') => {
    let createdRecordId = '';

    setLibrary(current => {
      const nextRecord = buildHistoricalRecord({
        userId: '',
        userName,
        kind: 'historical',
        source: 'custom',
        description,
        birthplace: null,
        passengerName: '',
        journeys: [],
      }, current, false);
      createdRecordId = nextRecord.userId;

      return {
        ...current,
        historicalRecords: [nextRecord, ...current.historicalRecords],
        activeRecordId: nextRecord.userId,
      };
    });

    return createdRecordId;
  };

  const importHistoricalRecord = (record: UserJourneyRecord) => {
    let importedRecordId = '';

    setLibrary(current => {
      const shouldUpdateExisting = Boolean(
        record.userId
        && record.userId !== current.personalRecord.userId
        && current.historicalRecords.some(existingRecord => existingRecord.userId === record.userId),
      );
      const nextRecord = buildHistoricalRecord(record, current, shouldUpdateExisting);
      importedRecordId = nextRecord.userId;
      const existingIndex = current.historicalRecords.findIndex(existingRecord => existingRecord.userId === nextRecord.userId);
      const historicalRecords = existingIndex === -1
        ? [nextRecord, ...current.historicalRecords]
        : current.historicalRecords.map(existingRecord => (
            existingRecord.userId === nextRecord.userId ? nextRecord : existingRecord
          ));

      return {
        ...current,
        historicalRecords,
        activeRecordId: nextRecord.userId,
      };
    });

    return importedRecordId;
  };

  const deleteHistoricalRecord = (recordId: string) => {
    setLibrary(current => {
      const targetRecord = current.historicalRecords.find(record => record.userId === recordId);
      if (!targetRecord) return current;

      const historicalRecords = current.historicalRecords.filter(record => record.userId !== recordId);
      const dismissedPresetRecordIds = new Set(current.dismissedPresetRecordIds ?? []);

      if (targetRecord.source === 'preset' || FAMOUS_JOURNEY_PRESETS.some(record => record.userId === recordId)) {
        dismissedPresetRecordIds.add(recordId);
      }

      return {
        ...current,
        historicalRecords,
        activeRecordId: current.activeRecordId === recordId
          ? (historicalRecords[0]?.userId ?? current.personalRecord.userId)
          : current.activeRecordId,
        dismissedPresetRecordIds: [...dismissedPresetRecordIds],
      };
    });
  };

  const importHistoricalRecordFromJson = (rawText: string) => {
    try {
      const parsed = JSON.parse(rawText) as unknown;

      if (isUserJourneyRecord(parsed)) {
        const recordId = importHistoricalRecord({
          ...parsed,
          kind: 'historical',
        });

        return {
          ok: true,
          recordId,
        };
      }

      if (
        parsed
        && typeof parsed === 'object'
        && 'record' in parsed
        && isUserJourneyRecord((parsed as { record: unknown }).record)
      ) {
        const recordId = importHistoricalRecord({
          ...(parsed as { record: UserJourneyRecord }).record,
          kind: 'historical',
        });

        return {
          ok: true,
          recordId,
        };
      }

      return {
        ok: false,
        error: 'JSON 需要是单个人物档案对象，至少包含 userName 和 journeys。',
      };
    } catch {
      return {
        ok: false,
        error: 'JSON 解析失败，请检查格式后再导入。',
      };
    }
  };

  const addJourney = (journey: Omit<Journey, 'id'>) => {
    const newJourney = cloneJourney({
      ...journey,
      id: crypto.randomUUID(),
    });

    updateActiveRecord(current => ({
      ...current,
      journeys: [newJourney, ...current.journeys],
    }));
  };

  const updateJourney = (id: string, journey: Omit<Journey, 'id'>) => {
    updateActiveRecord(current => ({
      ...current,
      journeys: current.journeys.map(existingJourney => (
        existingJourney.id === id
          ? cloneJourney({
              ...existingJourney,
              ...journey,
            })
          : existingJourney
      )),
    }));
  };

  const deleteJourney = (id: string) => {
    updateActiveRecord(current => ({
      ...current,
      journeys: current.journeys.filter(journey => journey.id !== id),
    }));
  };

  const setBirthplace = (birthplace: JourneyLocation | null) => {
    updateActiveRecord(current => ({
      ...current,
      birthplace: birthplace ? cloneLocation(birthplace) : null,
    }));
  };

  const setPassengerName = (passengerName: string) => {
    updateActiveRecord(current => ({
      ...current,
      passengerName,
    }));
  };

  const exportRecord = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(activeRecord, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${activeRecord.userId || 'travel-record'}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const availableRecords = useMemo(
    () => [
      {
        id: library.personalRecord.userId,
        name: library.personalRecord.userName,
        kind: 'personal' as const,
        description: library.personalRecord.description?.trim() ?? '',
        journeyCount: library.personalRecord.journeys.length,
      },
      ...library.historicalRecords.map(record => ({
        id: record.userId,
        name: record.userName,
        kind: 'historical' as const,
        description: record.description?.trim() ?? '',
        journeyCount: record.journeys.length,
      })),
    ],
    [library.historicalRecords, library.personalRecord],
  );

  return {
    library,
    record: activeRecord,
    activeRecord,
    activeRecordId: activeRecord.userId,
    activeRecordKind: activeRecord.kind ?? 'personal',
    activeRecordName: activeRecord.userName,
    activeRecordDescription: activeRecord.description?.trim() ?? '',
    availableRecords,
    userId: activeRecord.userId,
    userName: activeRecord.userName,
    birthplace: activeRecord.birthplace ?? null,
    passengerName: activeRecord.passengerName?.trim() ?? '',
    journeys,
    setActiveRecord,
    createHistoricalRecord,
    importHistoricalRecord,
    importHistoricalRecordFromJson,
    deleteHistoricalRecord,
    addJourney,
    updateJourney,
    deleteJourney,
    setBirthplace,
    setPassengerName,
    exportRecord,
  };
}
