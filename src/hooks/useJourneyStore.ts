import { useEffect, useMemo, useState } from 'react';
import type { Journey, UserJourneyRecord } from '../types/journey';

const STORAGE_KEY = 'travel_globe_journeys';
const ARCHIVE_STORAGE_KEY = 'travel_globe_archive';
const DEFAULT_USER_RECORD: UserJourneyRecord = {
  userId: 'me',
  userName: '我',
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

function cloneJourney(journey: Journey): Journey {
  return {
    ...journey,
    locations: journey.locations.map(location => ({ ...location })),
  };
}

function cloneRecord(record: UserJourneyRecord): UserJourneyRecord {
  return {
    userId: record.userId,
    userName: record.userName,
    journeys: record.journeys.map(cloneJourney),
  };
}

function createEmptyRecord(): UserJourneyRecord {
  return cloneRecord(DEFAULT_USER_RECORD);
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

function normalizeRecord(record: UserJourneyRecord): UserJourneyRecord {
  return {
    userId: record.userId.trim() || DEFAULT_USER_RECORD.userId,
    userName: record.userName.trim() || DEFAULT_USER_RECORD.userName,
    journeys: record.journeys.filter(isJourney),
  };
}

function migrateLegacyArchive(archive: LegacyJourneyArchive): UserJourneyRecord {
  const selectedTraveler = archive.travelers.find(traveler => traveler.id === archive.selectedTravelerId) ?? archive.travelers[0];

  if (!selectedTraveler) return createEmptyRecord();

  return normalizeRecord({
    userId: selectedTraveler.id || DEFAULT_USER_RECORD.userId,
    userName: selectedTraveler.name || DEFAULT_USER_RECORD.userName,
    journeys: selectedTraveler.journeys,
  });
}

function loadRecordFromStorage(): UserJourneyRecord {
  const seedRecord = createEmptyRecord();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;

      if (isUserJourneyRecord(parsed)) {
        return normalizeRecord(parsed);
      }

      if (Array.isArray(parsed)) {
        return normalizeRecord({
          ...seedRecord,
          journeys: parsed.filter(isJourney),
        });
      }
    }

    const archiveRaw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (archiveRaw) {
      const parsedArchive = JSON.parse(archiveRaw) as unknown;
      if (isLegacyJourneyArchive(parsedArchive)) {
        return migrateLegacyArchive(parsedArchive);
      }
    }

    return seedRecord;
  } catch {
    return seedRecord;
  }
}

export function useJourneyStore() {
  const [record, setRecord] = useState<UserJourneyRecord>(loadRecordFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    localStorage.removeItem(ARCHIVE_STORAGE_KEY);
  }, [record]);

  const journeys = useMemo(() => record.journeys, [record.journeys]);

  const addJourney = (journey: Omit<Journey, 'id'>) => {
    const newJourney: Journey = { ...journey, id: crypto.randomUUID() };
    setRecord(current => ({
      ...current,
      journeys: [newJourney, ...current.journeys],
    }));
  };

  const deleteJourney = (id: string) => {
    setRecord(current => ({
      ...current,
      journeys: current.journeys.filter(journey => journey.id !== id),
    }));
  };

  const exportRecord = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(record, null, 2))}`;
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${record.userId || 'travel-record'}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return {
    record,
    userId: record.userId,
    userName: record.userName,
    journeys,
    addJourney,
    deleteJourney,
    exportRecord,
  };
}
