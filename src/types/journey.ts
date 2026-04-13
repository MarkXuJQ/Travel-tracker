export type JourneyTransportMode = 'default' | 'train' | 'flight';

export interface JourneyLocation {
  type: 'country' | 'province' | 'city';
  /** GeoJSON-matching name:
   *  country  → Natural Earth name, e.g. "France", "United States of America"
   *  province → full Chinese name, e.g. "四川省", "北京市"
   *  city     → DataV name, e.g. "成都市", "东城区" (district for 直辖市)
   */
  name: string;
  /** Display label shown in the UI (may differ from GeoJSON name) */
  label: string;
  /** Centroid for placing the journey marker [lat, lng] */
  coords?: [number, number];
}

export interface Journey {
  id: string;
  title: string;
  date?: string;
  transportMode?: JourneyTransportMode;
  showEndpoints?: boolean;
  departure?: JourneyLocation | null;
  destination?: JourneyLocation | null;
  locations: JourneyLocation[];
  description?: string;
  url?: string;
}

export interface UserJourneyRecord {
  userId: string;
  userName: string;
  birthplace?: JourneyLocation | null;
  journeys: Journey[];
}
