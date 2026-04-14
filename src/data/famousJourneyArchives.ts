import type { UserJourneyRecord } from '../types/journey';

const presetModules = import.meta.glob('./famousJourneys/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, UserJourneyRecord>;

export const FAMOUS_JOURNEY_PRESETS = Object.entries(presetModules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([, record]) => record);
