// 中国省份和城市数据

export interface CityInfo {
  name: string;
  lat: number;
  lng: number;
}

export interface ProvinceInfo {
  code: string;
  name: string;
  lat: number;
  lng: number;
  cities: CityInfo[];
}

// 中国各省份及主要城市
export const CHINA_PROVINCES: ProvinceInfo[] = [
  {
    code: 'CN-11',
    name: '北京',
    lat: 39.9042,
    lng: 116.4074,
    cities: [
      { name: '北京市', lat: 39.9042, lng: 116.4074 },
    ]
  },
  {
    code: 'CN-12',
    name: '天津',
    lat: 39.0842,
    lng: 117.2009,
    cities: [
      { name: '天津市', lat: 39.0842, lng: 117.2009 },
    ]
  },
  {
    code: 'CN-13',
    name: '河北',
    lat: 38.0428,
    lng: 114.5149,
    cities: [
      { name: '石家庄', lat: 38.0428, lng: 114.5149 },
      { name: '唐山', lat: 39.6292, lng: 118.1802 },
      { name: '秦皇岛', lat: 39.9354, lng: 119.5987 },
      { name: '邯郸', lat: 36.6093, lng: 114.4905 },
      { name: '保定', lat: 38.8739, lng: 115.4646 },
    ]
  },
  {
    code: 'CN-14',
    name: '山西',
    lat: 37.8706,
    lng: 112.5489,
    cities: [
      { name: '太原', lat: 37.8706, lng: 112.5489 },
      { name: '大同', lat: 40.0768, lng: 113.3001 },
      { name: '运城', lat: 35.0264, lng: 111.0070 },
      { name: '晋中', lat: 37.6870, lng: 112.7528 },
    ]
  },
  {
    code: 'CN-15',
    name: '内蒙古',
    lat: 40.8414,
    lng: 111.7519,
    cities: [
      { name: '呼和浩特', lat: 40.8414, lng: 111.7519 },
      { name: '包头', lat: 40.6586, lng: 109.8403 },
      { name: '赤峰', lat: 42.2578, lng: 118.8860 },
      { name: '呼伦贝尔', lat: 49.2116, lng: 119.7657 },
    ]
  },
  {
    code: 'CN-21',
    name: '辽宁',
    lat: 41.8057,
    lng: 123.4315,
    cities: [
      { name: '沈阳', lat: 41.8057, lng: 123.4315 },
      { name: '大连', lat: 38.9140, lng: 121.6147 },
      { name: '鞍山', lat: 41.1086, lng: 122.9943 },
      { name: '抚顺', lat: 41.8797, lng: 124.0472 },
    ]
  },
  {
    code: 'CN-22',
    name: '吉林',
    lat: 43.8171,
    lng: 125.3235,
    cities: [
      { name: '长春', lat: 43.8171, lng: 125.3235 },
      { name: '吉林', lat: 43.8965, lng: 125.3259 },
      { name: '延边', lat: 42.8913, lng: 129.5089 },
    ]
  },
  {
    code: 'CN-23',
    name: '黑龙江',
    lat: 45.8038,
    lng: 126.5349,
    cities: [
      { name: '哈尔滨', lat: 45.8038, lng: 126.5349 },
      { name: '齐齐哈尔', lat: 47.3543, lng: 123.9181 },
      { name: '牡丹江', lat: 44.5516, lng: 129.6331 },
      { name: '大庆', lat: 46.5844, lng: 125.0302 },
    ]
  },
  {
    code: 'CN-31',
    name: '上海',
    lat: 31.2304,
    lng: 121.4737,
    cities: [
      { name: '上海市', lat: 31.2304, lng: 121.4737 },
    ]
  },
  {
    code: 'CN-32',
    name: '江苏',
    lat: 32.0617,
    lng: 118.7632,
    cities: [
      { name: '南京', lat: 32.0617, lng: 118.7632 },
      { name: '苏州', lat: 31.2988, lng: 120.5853 },
      { name: '无锡', lat: 31.5681, lng: 120.2996 },
      { name: '常州', lat: 31.8112, lng: 119.9739 },
      { name: '徐州', lat: 34.2047, lng: 117.2841 },
    ]
  },
  {
    code: 'CN-33',
    name: '浙江',
    lat: 30.2741,
    lng: 120.1550,
    cities: [
      { name: '杭州', lat: 30.2741, lng: 120.1550 },
      { name: '宁波', lat: 29.8683, lng: 121.5439 },
      { name: '温州', lat: 27.9942, lng: 120.6993 },
      { name: '绍兴', lat: 30.0010, lng: 120.5861 },
      { name: '金华', lat: 29.0781, lng: 119.6495 },
    ]
  },
  {
    code: 'CN-34',
    name: '安徽',
    lat: 31.8205,
    lng: 117.2272,
    cities: [
      { name: '合肥', lat: 31.8205, lng: 117.2272 },
      { name: '芜湖', lat: 31.3528, lng: 118.4331 },
      { name: '蚌埠', lat: 32.9162, lng: 117.3897 },
      { name: '黄山', lat: 29.7146, lng: 118.3374 },
    ]
  },
  {
    code: 'CN-35',
    name: '福建',
    lat: 26.0745,
    lng: 119.2965,
    cities: [
      { name: '福州', lat: 26.0745, lng: 119.2965 },
      { name: '厦门', lat: 24.4798, lng: 118.0894 },
      { name: '泉州', lat: 24.8741, lng: 118.6756 },
      { name: '漳州', lat: 24.5132, lng: 117.6473 },
    ]
  },
  {
    code: 'CN-36',
    name: '江西',
    lat: 28.6820,
    lng: 115.8579,
    cities: [
      { name: '南昌', lat: 28.6820, lng: 115.8579 },
      { name: '赣州', lat: 25.8310, lng: 114.9333 },
      { name: '九江', lat: 29.7051, lng: 116.0019 },
      { name: '景德镇', lat: 29.2925, lng: 117.1782 },
    ]
  },
  {
    code: 'CN-37',
    name: '山东',
    lat: 36.6512,
    lng: 117.1200,
    cities: [
      { name: '济南', lat: 36.6512, lng: 117.1200 },
      { name: '青岛', lat: 36.0671, lng: 120.3826 },
      { name: '烟台', lat: 37.4635, lng: 121.4479 },
      { name: '潍坊', lat: 36.7072, lng: 119.1617 },
      { name: '临沂', lat: 35.0518, lng: 118.3119 },
    ]
  },
  {
    code: 'CN-41',
    name: '河南',
    lat: 34.7466,
    lng: 113.6253,
    cities: [
      { name: '郑州', lat: 34.7466, lng: 113.6253 },
      { name: '洛阳', lat: 34.6181, lng: 112.4536 },
      { name: '开封', lat: 34.7973, lng: 114.3073 },
      { name: '南阳', lat: 32.9908, lng: 112.5283 },
    ]
  },
  {
    code: 'CN-42',
    name: '湖北',
    lat: 30.5429,
    lng: 114.3418,
    cities: [
      { name: '武汉', lat: 30.5429, lng: 114.3418 },
      { name: '宜昌', lat: 30.6919, lng: 111.2864 },
      { name: '襄阳', lat: 32.0086, lng: 112.1224 },
      { name: '十堰', lat: 32.6475, lng: 110.7993 },
    ]
  },
  {
    code: 'CN-43',
    name: '湖南',
    lat: 28.2282,
    lng: 112.9388,
    cities: [
      { name: '长沙', lat: 28.2282, lng: 112.9388 },
      { name: '张家界', lat: 29.1170, lng: 110.4791 },
      { name: '株洲', lat: 27.8274, lng: 113.1338 },
      { name: '衡阳', lat: 26.8968, lng: 112.5721 },
    ]
  },
  {
    code: 'CN-44',
    name: '广东',
    lat: 23.1291,
    lng: 113.2644,
    cities: [
      { name: '广州', lat: 23.1291, lng: 113.2644 },
      { name: '深圳', lat: 22.5431, lng: 114.0579 },
      { name: '珠海', lat: 22.2707, lng: 113.5767 },
      { name: '佛山', lat: 23.0215, lng: 113.1214 },
      { name: '东莞', lat: 23.0206, lng: 113.7517 },
    ]
  },
  {
    code: 'CN-45',
    name: '广西',
    lat: 22.8170,
    lng: 108.3665,
    cities: [
      { name: '南宁', lat: 22.8170, lng: 108.3665 },
      { name: '桂林', lat: 25.2735, lng: 110.2901 },
      { name: '柳州', lat: 24.3255, lng: 109.4126 },
      { name: '北海', lat: 21.4812, lng: 109.1192 },
    ]
  },
  {
    code: 'CN-46',
    name: '海南',
    lat: 20.0173,
    lng: 110.3492,
    cities: [
      { name: '海口', lat: 20.0173, lng: 110.3492 },
      { name: '三亚', lat: 18.2528, lng: 109.5119 },
    ]
  },
  {
    code: 'CN-50',
    name: '重庆',
    lat: 29.5630,
    lng: 106.5515,
    cities: [
      { name: '重庆市', lat: 29.5630, lng: 106.5515 },
    ]
  },
  {
    code: 'CN-51',
    name: '四川',
    lat: 30.5728,
    lng: 104.0665,
    cities: [
      { name: '成都', lat: 30.5728, lng: 104.0665 },
      { name: '绵阳', lat: 31.4674, lng: 104.6791 },
      { name: '乐山', lat: 29.5521, lng: 103.7656 },
      { name: '九寨沟', lat: 33.2600, lng: 103.9186 },
    ]
  },
  {
    code: 'CN-52',
    name: '贵州',
    lat: 26.6476,
    lng: 106.6301,
    cities: [
      { name: '贵阳', lat: 26.6476, lng: 106.6301 },
      { name: '遵义', lat: 27.7262, lng: 106.9272 },
      { name: '六盘水', lat: 26.5926, lng: 104.8302 },
    ]
  },
  {
    code: 'CN-53',
    name: '云南',
    lat: 25.0388,
    lng: 102.7183,
    cities: [
      { name: '昆明', lat: 25.0388, lng: 102.7183 },
      { name: '大理', lat: 25.6064, lng: 100.2676 },
      { name: '丽江', lat: 26.8550, lng: 100.2256 },
      { name: '西双版纳', lat: 22.0017, lng: 100.7979 },
    ]
  },
  {
    code: 'CN-54',
    name: '西藏',
    lat: 29.6524,
    lng: 91.1721,
    cities: [
      { name: '拉萨', lat: 29.6524, lng: 91.1721 },
      { name: '日喀则', lat: 29.2662, lng: 88.8805 },
      { name: '林芝', lat: 29.6491, lng: 94.3623 },
    ]
  },
  {
    code: 'CN-61',
    name: '陕西',
    lat: 34.3415,
    lng: 108.9397,
    cities: [
      { name: '西安', lat: 34.3415, lng: 108.9397 },
      { name: '咸阳', lat: 34.3296, lng: 108.7089 },
      { name: '宝鸡', lat: 34.3610, lng: 107.2375 },
      { name: '延安', lat: 36.5854, lng: 109.4897 },
    ]
  },
  {
    code: 'CN-62',
    name: '甘肃',
    lat: 36.0610,
    lng: 103.8343,
    cities: [
      { name: '兰州', lat: 36.0610, lng: 103.8343 },
      { name: '敦煌', lat: 40.1421, lng: 94.6619 },
      { name: '张掖', lat: 38.9259, lng: 100.4498 },
      { name: '天水', lat: 34.5808, lng: 105.7249 },
    ]
  },
  {
    code: 'CN-63',
    name: '青海',
    lat: 36.6171,
    lng: 101.7782,
    cities: [
      { name: '西宁', lat: 36.6171, lng: 101.7782 },
      { name: '海东', lat: 36.5029, lng: 102.1032 },
      { name: '格尔木', lat: 36.4023, lng: 94.9032 },
    ]
  },
  {
    code: 'CN-64',
    name: '宁夏',
    lat: 38.4871,
    lng: 106.2309,
    cities: [
      { name: '银川', lat: 38.4871, lng: 106.2309 },
      { name: '石嘴山', lat: 39.0136, lng: 106.3761 },
      { name: '吴忠', lat: 37.9974, lng: 106.1982 },
    ]
  },
  {
    code: 'CN-65',
    name: '新疆',
    lat: 43.7930,
    lng: 87.6277,
    cities: [
      { name: '乌鲁木齐', lat: 43.7930, lng: 87.6277 },
      { name: '喀什', lat: 39.4704, lng: 75.9897 },
      { name: '伊宁', lat: 43.9168, lng: 81.3241 },
      { name: '吐鲁番', lat: 42.9513, lng: 89.1895 },
    ]
  },
  {
    code: 'CN-71',
    name: '台湾',
    lat: 25.0329,
    lng: 121.5654,
    cities: [
      { name: '台北', lat: 25.0329, lng: 121.5654 },
      { name: '高雄', lat: 22.6272, lng: 120.3014 },
    ]
  },
  {
    code: 'CN-91',
    name: '香港',
    lat: 22.3193,
    lng: 114.1693,
    cities: [
      { name: '香港', lat: 22.3193, lng: 114.1693 },
    ]
  },
  {
    code: 'CN-92',
    name: '澳门',
    lat: 22.1987,
    lng: 113.5438,
    cities: [
      { name: '澳门', lat: 22.1987, lng: 113.5438 },
    ]
  }
];
