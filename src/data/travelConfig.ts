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
  locations: JourneyLocation[];
  description?: string;
  url?: string;
}

export interface TravelConfig {
  journeys: Journey[];
}

export const travelConfig: TravelConfig = {
  journeys: [
    {
      id: '1',
      title: '成都美食之旅',
      date: '2024-05-15',
      locations: [{ type: 'city', name: '成都市', label: '成都', coords: [30.5728, 104.0665] }],
      description: '吃了火锅和串串，看了大熊猫。',
    },
    {
      id: '2',
      title: '巴黎旅行',
      date: '2023-08-10',
      locations: [{ type: 'country', name: 'France', label: '法国', coords: [46.2276, 2.2137] }],
      description: '登上了埃菲尔铁塔，参观了卢浮宫。',
    },
    {
      id: '3',
      title: '日本行',
      date: '2023-12-20',
      locations: [{ type: 'country', name: 'Japan', label: '日本', coords: [36.2048, 138.2529] }],
    },
    {
      id: '4',
      title: '广深走走',
      date: '2024-02-10',
      locations: [
        { type: 'city', name: '广州市', label: '广州', coords: [23.1291, 113.2644] },
        { type: 'city', name: '深圳市', label: '深圳', coords: [22.5431, 114.0579] },
      ],
    },
    {
      id: '5',
      title: '江南水乡',
      date: '2024-04-05',
      locations: [
        { type: 'city', name: '杭州市', label: '杭州', coords: [30.2741, 120.155] },
        { type: 'city', name: '宁波市', label: '宁波', coords: [29.8683, 121.5439] },
      ],
    },
  ],
};
