export interface Journey {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  coordinates?: [number, number]; // [lat, lng]
}

export interface TravelConfig {
  visitedCountries: string[];
  visitedChinaProvinces: string[];
  visitedChinaCities: string[];
  journeys: Journey[];
}

export const travelConfig: TravelConfig = {
  visitedCountries: ['China', 'United States of America', 'France', 'Japan', 'Australia'],

  visitedChinaProvinces: ['北京', '上海', '四川', '广东', '浙江'],

  // Regular prefecture-level cities use "XXX市" format (matching DataV GeoJSON).
  // 直辖市 (Beijing/Shanghai/Tianjin/Chongqing) are highlighted via visitedChinaProvinces
  // in city mode — all their districts are lit when the province is visited.
  visitedChinaCities: ['成都市', '广州市', '深圳市', '杭州市', '宁波市'],

  journeys: [
    {
      id: '1',
      title: '成都美食之旅',
      date: '2024-05-15',
      location: '成都',
      description: '吃了火锅和串串，看了大熊猫。',
      coordinates: [30.5728, 104.0665],
    },
  ],
};
