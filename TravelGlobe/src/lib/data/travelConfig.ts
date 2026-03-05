export interface Journey {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  coordinates?: [number, number]; // [lat, lng]
}

export interface TravelConfig {
  visitedCountries: string[]; // Country names
  visitedChinaProvinces: string[]; // Province names
  visitedChinaCities: string[]; // City names
  journeys: Journey[];
}

export const travelConfig: TravelConfig = {
  visitedCountries: ['China', 'United States of America', 'France', 'Japan', 'Australia'],
  
  // Provinces in China I have visited
  visitedChinaProvinces: [
    '北京', '上海', '四川', '广东', '浙江'
  ],
  
  // Cities in China I have visited
  visitedChinaCities: [
    '北京市', 
    '上海市', 
    '成都', 
    '广州', '深圳',
    '杭州', '宁波'
  ],

  journeys: [
    {
      id: '1',
      title: '成都美食之旅',
      date: '2024-05-15',
      location: '成都',
      description: '吃了火锅和串串，看了大熊猫。',
      coordinates: [30.5728, 104.0665]
    }
  ]
};

