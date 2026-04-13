import {
  getCanonicalCountryName,
  getCountryNameForLocation,
  getProvinceGeoNameByCityName,
} from '../data/locationData';
import type { Journey, JourneyRecordFilter } from '../types/journey';

export function journeyMatchesRecordFilter(journey: Journey, filter: JourneyRecordFilter) {
  if (filter.type === 'country') {
    return journey.locations.some(location => getCountryNameForLocation(location) === getCanonicalCountryName(filter.name));
  }

  if (filter.type === 'province') {
    return journey.locations.some(location => {
      if (location.type === 'province') {
        return location.name === filter.name;
      }

      if (location.type === 'city') {
        return getProvinceGeoNameByCityName(location.name) === filter.name;
      }

      return false;
    });
  }

  return journey.locations.some(location => location.type === 'city' && location.name === filter.name);
}

export function filterJourneysByRecordFilter(journeys: Journey[], filter: JourneyRecordFilter | null) {
  if (!filter) return journeys;
  return journeys.filter(journey => journeyMatchesRecordFilter(journey, filter));
}
