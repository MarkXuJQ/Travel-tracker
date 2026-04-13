import { useEffect, useMemo, useState } from 'react';
import type { Journey, JourneyLocation, UserJourneyRecord } from '../types/journey';
import { normalizeJourneyDate } from '../utils/journeyDate';

const STORAGE_KEY = 'travel_globe_journeys';
const ARCHIVE_STORAGE_KEY = 'travel_globe_archive';
const DEFAULT_USER_RECORD: UserJourneyRecord = {
  userId: 'me',
  userName: '我',
  birthplace: null,
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

function cloneRecord(record: UserJourneyRecord): UserJourneyRecord {
  return {
    userId: record.userId,
    userName: record.userName,
    birthplace: record.birthplace ? cloneLocation(record.birthplace) : null,
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
    (candidate.birthplace === undefined || candidate.birthplace === null || isJourneyLocation(candidate.birthplace)) &&
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
    birthplace: record.birthplace && isJourneyLocation(record.birthplace)
      ? cloneLocation(record.birthplace)
      : null,
    journeys: record.journeys.filter(isJourney).map(cloneJourney),
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
    const newJourney = cloneJourney({
      ...journey,
      id: crypto.randomUUID(),
    });
    setRecord(current => ({
      ...current,
      journeys: [newJourney, ...current.journeys],
    }));
  };

  const updateJourney = (id: string, journey: Omit<Journey, 'id'>) => {
    setRecord(current => ({
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
    setRecord(current => ({
      ...current,
      journeys: current.journeys.filter(journey => journey.id !== id),
    }));
  };

  const setBirthplace = (birthplace: JourneyLocation | null) => {
    setRecord(current => ({
      ...current,
      birthplace: birthplace ? cloneLocation(birthplace) : null,
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
    birthplace: record.birthplace ?? null,
    journeys,
    addJourney,
    updateJourney,
    deleteJourney,
    setBirthplace,
    exportRecord,
  };
}
