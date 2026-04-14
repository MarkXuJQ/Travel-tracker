import type { JourneyLocation, UserJourneyRecord } from '../types/journey';

function country(name: string, label: string): JourneyLocation {
  return {
    type: 'country',
    name,
    label,
  };
}

function city(name: string, label: string): JourneyLocation {
  return {
    type: 'city',
    name,
    label,
  };
}

export const FAMOUS_JOURNEY_PRESETS: UserJourneyRecord[] = [
  {
    userId: 'mao-zedong',
    userName: '毛泽东',
    kind: 'historical',
    description: '从湖南出发，辗转长沙、北京、上海、广州、延安与苏联的重要革命行程。',
    birthplace: null,
    passengerName: '',
    journeys: [
      {
        id: 'mao-zedong-1911-xiangtan',
        title: '湘中启程',
        date: '1911',
        locations: [city('湘潭市', '湘潭')],
      },
      {
        id: 'mao-zedong-1913-changsha',
        title: '求学长沙',
        date: '1913',
        locations: [city('长沙市', '长沙')],
      },
      {
        id: 'mao-zedong-1918-beijing',
        title: '初到北京',
        date: '1918',
        locations: [city('北京市', '北京')],
      },
      {
        id: 'mao-zedong-1921-shanghai',
        title: '上海建党时期',
        date: '1921',
        locations: [city('上海市', '上海')],
      },
      {
        id: 'mao-zedong-1924-guangzhou',
        title: '广州活动',
        date: '1924',
        locations: [city('广州市', '广州')],
      },
      {
        id: 'mao-zedong-1935-yanan',
        title: '转赴延安',
        date: '1935',
        locations: [city('延安市', '延安')],
      },
      {
        id: 'mao-zedong-1949-russia',
        title: '访问苏联',
        date: '1949',
        locations: [country('Russia', '俄罗斯')],
      },
    ],
  },
  {
    userId: 'xu-xiake',
    userName: '徐霞客',
    kind: 'historical',
    description: '明代旅行家与地理学者，足迹跨越东南、齐鲁与西南山川。',
    birthplace: null,
    passengerName: '',
    journeys: [
      {
        id: 'xu-xiake-1613-ningbo',
        title: '山海初游',
        date: '1613',
        locations: [city('宁波市', '宁波')],
      },
      {
        id: 'xu-xiake-1616-huangshan',
        title: '黄山问峰',
        date: '1616',
        locations: [city('黄山市', '黄山')],
      },
      {
        id: 'xu-xiake-1618-taian',
        title: '登临泰山',
        date: '1618',
        locations: [city('泰安市', '泰安')],
      },
      {
        id: 'xu-xiake-1632-guilin',
        title: '桂林山水',
        date: '1632',
        locations: [city('桂林市', '桂林')],
      },
      {
        id: 'xu-xiake-1639-baoshan',
        title: '踏入滇西',
        date: '1639',
        locations: [city('保山市', '保山')],
      },
      {
        id: 'xu-xiake-1639-lijiang',
        title: '西南边地',
        date: '1639',
        locations: [city('丽江市', '丽江')],
      },
    ],
  },
  {
    userId: 'marco-polo',
    userName: '马可波罗',
    kind: 'historical',
    description: '从威尼斯出发，经土耳其、伊朗进入中国，又最终返回威尼斯的欧亚游历者。',
    birthplace: null,
    passengerName: '',
    journeys: [
      {
        id: 'marco-polo-1271-italy',
        title: '离开威尼斯',
        date: '1271',
        locations: [country('Italy', '意大利')],
      },
      {
        id: 'marco-polo-1272-turkey',
        title: '东地中海',
        date: '1272',
        locations: [country('Turkey', '土耳其')],
      },
      {
        id: 'marco-polo-1273-iran',
        title: '波斯高原',
        date: '1273',
        locations: [country('Iran', '伊朗')],
      },
      {
        id: 'marco-polo-1275-china',
        title: '抵达东方',
        date: '1275',
        locations: [country('China', '中国')],
      },
      {
        id: 'marco-polo-1276-beijing',
        title: '入见汗廷',
        date: '1276',
        locations: [city('北京市', '北京')],
      },
      {
        id: 'marco-polo-1295-italy',
        title: '归返故里',
        date: '1295',
        locations: [country('Italy', '意大利')],
      },
    ],
  },
];
