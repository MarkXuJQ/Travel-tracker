import userJourneyRecord from './users/me.json';
import type { UserJourneyRecord } from '../types/journey';

export const currentUserJourney = userJourneyRecord as UserJourneyRecord;
