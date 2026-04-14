import maoZedongJson from './famousJourneys/mao-zedong.json';
import xuXiakeJson from './famousJourneys/xu-xiake.json';
import marcoPoloJson from './famousJourneys/marco-polo.json';
import type { UserJourneyRecord } from '../types/journey';

export const FAMOUS_JOURNEY_PRESETS = [
  maoZedongJson,
  xuXiakeJson,
  marcoPoloJson,
] as UserJourneyRecord[];
