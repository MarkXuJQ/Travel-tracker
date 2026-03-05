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
      { name: '齐齐哈尔', lat: 47.3543, lng: 123.9179 },
      { name: '牡丹江', lat: 44.5513, lng: 129.6332 },
      { name: '大庆', lat: 46.5893, lng: 125.1036 },
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
      { name: '南京', lat: 32.0603, lng: 118.7969 },
      { name: '苏州', lat: 31.2989, lng: 120.5853 },
      { name: '无锡', lat: 31.4912, lng: 120.3119 },
      { name: '常州', lat: 31.8107, lng: 119.9736 },
      { name: '徐州', lat: 34.2058, lng: 117.2841 },
      { name: '扬州', lat: 32.3932, lng: 119.4210 },
      { name: '南通', lat: 31.9802, lng: 120.8943 },
    ]
  },
  {
    code: 'CN-33',
    name: '浙江',
    lat: 29.1416,
    lng: 119.7889,
    cities: [
      { name: '杭州', lat: 30.2741, lng: 120.1551 },
      { name: '宁波', lat: 29.8683, lng: 121.5440 },
      { name: '温州', lat: 27.9938, lng: 120.6994 },
      { name: '绍兴', lat: 30.0023, lng: 120.5792 },
      { name: '嘉兴', lat: 30.7470, lng: 120.7555 },
      { name: '金华', lat: 29.0791, lng: 119.6424 },
      { name: '台州', lat: 28.6564, lng: 121.4206 },
    ]
  },
  {
    code: 'CN-34',
    name: '安徽',
    lat: 31.8206,
    lng: 117.2272,
    cities: [
      { name: '合肥', lat: 31.8206, lng: 117.2272 },
      { name: '芜湖', lat: 31.3529, lng: 118.4331 },
      { name: '黄山', lat: 29.7147, lng: 118.3375 },
      { name: '安庆', lat: 30.5423, lng: 117.0634 },
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
      { name: '泉州', lat: 24.8744, lng: 118.6757 },
      { name: '漳州', lat: 24.5130, lng: 117.6474 },
      { name: '莆田', lat: 25.4541, lng: 119.0077 },
    ]
  },
  {
    code: 'CN-36',
    name: '江西',
    lat: 28.6820,
    lng: 115.8579,
    cities: [
      { name: '南昌', lat: 28.6820, lng: 115.8579 },
      { name: '九江', lat: 29.7051, lng: 116.0019 },
      { name: '景德镇', lat: 29.2690, lng: 117.2074 },
      { name: '赣州', lat: 25.8310, lng: 114.9348 },
    ]
  },
  {
    code: 'CN-37',
    name: '山东',
    lat: 36.6512,
    lng: 117.1201,
    cities: [
      { name: '济南', lat: 36.6512, lng: 117.1201 },
      { name: '青岛', lat: 36.0671, lng: 120.3826 },
      { name: '烟台', lat: 37.4638, lng: 121.4481 },
      { name: '威海', lat: 37.5091, lng: 122.1206 },
      { name: '泰安', lat: 36.2003, lng: 117.0876 },
      { name: '曲阜', lat: 35.5810, lng: 116.9865 },
    ]
  },
  {
    code: 'CN-41',
    name: '河南',
    lat: 34.7466,
    lng: 113.6253,
    cities: [
      { name: '郑州', lat: 34.7466, lng: 113.6253 },
      { name: '洛阳', lat: 34.6197, lng: 112.4540 },
      { name: '开封', lat: 34.7972, lng: 114.3077 },
      { name: '安阳', lat: 36.0976, lng: 114.3924 },
    ]
  },
  {
    code: 'CN-42',
    name: '湖北',
    lat: 30.5928,
    lng: 114.3055,
    cities: [
      { name: '武汉', lat: 30.5928, lng: 114.3055 },
      { name: '宜昌', lat: 30.6919, lng: 111.2864 },
      { name: '襄阳', lat: 32.0090, lng: 112.1225 },
      { name: '荆州', lat: 30.3352, lng: 112.2397 },
    ]
  },
  {
    code: 'CN-43',
    name: '湖南',
    lat: 28.2280,
    lng: 112.9388,
    cities: [
      { name: '长沙', lat: 28.2280, lng: 112.9388 },
      { name: '张家界', lat: 29.1171, lng: 110.4792 },
      { name: '岳阳', lat: 29.3571, lng: 113.1292 },
      { name: '凤凰', lat: 27.9483, lng: 109.5992 },
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
      { name: '珠海', lat: 22.2710, lng: 113.5670 },
      { name: '佛山', lat: 23.0218, lng: 113.1219 },
      { name: '东莞', lat: 23.0489, lng: 113.7447 },
      { name: '惠州', lat: 23.1115, lng: 114.4168 },
      { name: '汕头', lat: 23.3540, lng: 116.7319 },
    ]
  },
  {
    code: 'CN-45',
    name: '广西',
    lat: 22.8155,
    lng: 108.3275,
    cities: [
      { name: '南宁', lat: 22.8155, lng: 108.3275 },
      { name: '桂林', lat: 25.2345, lng: 110.1800 },
      { name: '北海', lat: 21.4813, lng: 109.1203 },
      { name: '柳州', lat: 24.3255, lng: 109.4283 },
    ]
  },
  {
    code: 'CN-46',
    name: '海南',
    lat: 20.0440,
    lng: 110.1999,
    cities: [
      { name: '海口', lat: 20.0440, lng: 110.1999 },
      { name: '三亚', lat: 18.2528, lng: 109.5120 },
    ]
  },
  {
    code: 'CN-50',
    name: '重庆',
    lat: 29.5630,
    lng: 106.5516,
    cities: [
      { name: '重庆市', lat: 29.5630, lng: 106.5516 },
    ]
  },
  {
    code: 'CN-51',
    name: '四川',
    lat: 30.5728,
    lng: 104.0668,
    cities: [
      { name: '成都', lat: 30.5728, lng: 104.0668 },
      { name: '绵阳', lat: 31.4677, lng: 104.6796 },
      { name: '乐山', lat: 29.5820, lng: 103.7654 },
      { name: '峨眉山', lat: 29.6013, lng: 103.4845 },
      { name: '九寨沟', lat: 33.2600, lng: 103.9186 },
    ]
  },
  {
    code: 'CN-52',
    name: '贵州',
    lat: 26.6470,
    lng: 106.6302,
    cities: [
      { name: '贵阳', lat: 26.6470, lng: 106.6302 },
      { name: '遵义', lat: 27.7256, lng: 106.9274 },
      { name: '黄果树', lat: 25.9913, lng: 105.6663 },
    ]
  },
  {
    code: 'CN-53',
    name: '云南',
    lat: 25.0389,
    lng: 102.7183,
    cities: [
      { name: '昆明', lat: 25.0389, lng: 102.7183 },
      { name: '大理', lat: 25.6065, lng: 100.2676 },
      { name: '丽江', lat: 26.8550, lng: 100.2271 },
      { name: '香格里拉', lat: 27.8297, lng: 99.7008 },
      { name: '西双版纳', lat: 22.0073, lng: 100.7978 },
    ]
  },
  {
    code: 'CN-54',
    name: '西藏',
    lat: 29.6500,
    lng: 91.1000,
    cities: [
      { name: '拉萨', lat: 29.6500, lng: 91.1000 },
      { name: '林芝', lat: 29.6491, lng: 94.3615 },
    ]
  },
  {
    code: 'CN-61',
    name: '陕西',
    lat: 34.3416,
    lng: 108.9398,
    cities: [
      { name: '西安', lat: 34.3416, lng: 108.9398 },
      { name: '咸阳', lat: 34.3296, lng: 108.7089 },
      { name: '延安', lat: 36.5853, lng: 109.4898 },
    ]
  },
  {
    code: 'CN-62',
    name: '甘肃',
    lat: 36.0611,
    lng: 103.8343,
    cities: [
      { name: '兰州', lat: 36.0611, lng: 103.8343 },
      { name: '敦煌', lat: 40.1411, lng: 94.6640 },
      { name: '张掖', lat: 38.9259, lng: 100.4498 },
    ]
  },
  {
    code: 'CN-63',
    name: '青海',
    lat: 36.6171,
    lng: 101.7782,
    cities: [
      { name: '西宁', lat: 36.6171, lng: 101.7782 },
      { name: '青海湖', lat: 36.9900, lng: 100.1500 },
    ]
  },
  {
    code: 'CN-64',
    name: '宁夏',
    lat: 38.4872,
    lng: 106.2309,
    cities: [
      { name: '银川', lat: 38.4872, lng: 106.2309 },
    ]
  },
  {
    code: 'CN-65',
    name: '新疆',
    lat: 43.8256,
    lng: 87.6168,
    cities: [
      { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168 },
      { name: '喀什', lat: 39.4704, lng: 75.9897 },
      { name: '伊犁', lat: 43.9169, lng: 81.3242 },
      { name: '吐鲁番', lat: 42.9513, lng: 89.1897 },
    ]
  },
  {
    code: 'CN-71',
    name: '台湾',
    lat: 25.0330,
    lng: 121.5654,
    cities: [
      { name: '台北', lat: 25.0330, lng: 121.5654 },
      { name: '高雄', lat: 22.6273, lng: 120.3014 },
      { name: '台中', lat: 24.1477, lng: 120.6736 },
    ]
  },
  {
    code: 'CN-81',
    name: '香港',
    lat: 22.3193,
    lng: 114.1694,
    cities: [
      { name: '香港', lat: 22.3193, lng: 114.1694 },
    ]
  },
  {
    code: 'CN-82',
    name: '澳门',
    lat: 22.1987,
    lng: 113.5439,
    cities: [
      { name: '澳门', lat: 22.1987, lng: 113.5439 },
    ]
  },
];

// 获取所有城市总数
export const getTotalCities = () => {
  return CHINA_PROVINCES.reduce((sum, p) => sum + p.cities.length, 0);
};

// 根据省份名称获取城市列表
export const getCitiesByProvince = (provinceName: string): CityInfo[] => {
  const province = CHINA_PROVINCES.find(p => p.name === provinceName);
  return province?.cities || [];
};

// 根据国家代码获取省份列表
export const getProvincesByCountry = (countryCode: string): ProvinceInfo[] => {
  if (countryCode === 'CN') return CHINA_PROVINCES;
  return [];
};

// 全球主要国家
export const WORLD_COUNTRIES = [
  { code: 'CN', name: '中国', nameEn: 'China', lat: 35.8617, lng: 104.1954 },
  { code: 'JP', name: '日本', nameEn: 'Japan', lat: 36.2048, lng: 138.2529 },
  { code: 'KR', name: '韩国', nameEn: 'South Korea', lat: 35.9078, lng: 127.7669 },
  { code: 'TH', name: '泰国', nameEn: 'Thailand', lat: 15.8700, lng: 100.9925 },
  { code: 'SG', name: '新加坡', nameEn: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { code: 'MY', name: '马来西亚', nameEn: 'Malaysia', lat: 4.2105, lng: 101.9758 },
  { code: 'VN', name: '越南', nameEn: 'Vietnam', lat: 14.0583, lng: 108.2772 },
  { code: 'ID', name: '印度尼西亚', nameEn: 'Indonesia', lat: -0.7893, lng: 113.9213 },
  { code: 'PH', name: '菲律宾', nameEn: 'Philippines', lat: 12.8797, lng: 121.7740 },
  { code: 'IN', name: '印度', nameEn: 'India', lat: 20.5937, lng: 78.9629 },
  { code: 'US', name: '美国', nameEn: 'United States', lat: 37.0902, lng: -95.7129 },
  { code: 'CA', name: '加拿大', nameEn: 'Canada', lat: 56.1304, lng: -106.3468 },
  { code: 'MX', name: '墨西哥', nameEn: 'Mexico', lat: 23.6345, lng: -102.5528 },
  { code: 'GB', name: '英国', nameEn: 'United Kingdom', lat: 55.3781, lng: -3.4360 },
  { code: 'FR', name: '法国', nameEn: 'France', lat: 46.2276, lng: 2.2137 },
  { code: 'DE', name: '德国', nameEn: 'Germany', lat: 51.1657, lng: 10.4515 },
  { code: 'IT', name: '意大利', nameEn: 'Italy', lat: 41.8719, lng: 12.5674 },
  { code: 'ES', name: '西班牙', nameEn: 'Spain', lat: 40.4637, lng: -3.7492 },
  { code: 'PT', name: '葡萄牙', nameEn: 'Portugal', lat: 39.3999, lng: -8.2245 },
  { code: 'NL', name: '荷兰', nameEn: 'Netherlands', lat: 52.1326, lng: 5.2913 },
  { code: 'BE', name: '比利时', nameEn: 'Belgium', lat: 50.5039, lng: 4.4699 },
  { code: 'CH', name: '瑞士', nameEn: 'Switzerland', lat: 46.8182, lng: 8.2275 },
  { code: 'AT', name: '奥地利', nameEn: 'Austria', lat: 47.5162, lng: 14.5501 },
  { code: 'SE', name: '瑞典', nameEn: 'Sweden', lat: 60.1282, lng: 18.6435 },
  { code: 'NO', name: '挪威', nameEn: 'Norway', lat: 60.4720, lng: 8.4689 },
  { code: 'DK', name: '丹麦', nameEn: 'Denmark', lat: 56.2639, lng: 9.5018 },
  { code: 'FI', name: '芬兰', nameEn: 'Finland', lat: 61.9241, lng: 25.7482 },
  { code: 'RU', name: '俄罗斯', nameEn: 'Russia', lat: 61.5240, lng: 105.3188 },
  { code: 'AU', name: '澳大利亚', nameEn: 'Australia', lat: -25.2744, lng: 133.7751 },
  { code: 'NZ', name: '新西兰', nameEn: 'New Zealand', lat: -40.9006, lng: 174.8869 },
  { code: 'EG', name: '埃及', nameEn: 'Egypt', lat: 26.8206, lng: 30.8025 },
  { code: 'ZA', name: '南非', nameEn: 'South Africa', lat: -30.5595, lng: 22.9375 },
  { code: 'BR', name: '巴西', nameEn: 'Brazil', lat: -14.2350, lng: -51.9253 },
  { code: 'AR', name: '阿根廷', nameEn: 'Argentina', lat: -38.4161, lng: -63.6167 },
  { code: 'CL', name: '智利', nameEn: 'Chile', lat: -35.6751, lng: -71.5430 },
  { code: 'PE', name: '秘鲁', nameEn: 'Peru', lat: -9.1900, lng: -75.0152 },
  { code: 'TR', name: '土耳其', nameEn: 'Turkey', lat: 38.9637, lng: 35.2433 },
  { code: 'AE', name: '阿联酋', nameEn: 'UAE', lat: 23.4241, lng: 53.8478 },
  { code: 'SA', name: '沙特阿拉伯', nameEn: 'Saudi Arabia', lat: 23.8859, lng: 45.0792 },
  { code: 'IL', name: '以色列', nameEn: 'Israel', lat: 31.0461, lng: 34.8516 },
  { code: 'GR', name: '希腊', nameEn: 'Greece', lat: 39.0742, lng: 21.8243 },
  { code: 'CZ', name: '捷克', nameEn: 'Czech Republic', lat: 49.8175, lng: 15.4730 },
  { code: 'HU', name: '匈牙利', nameEn: 'Hungary', lat: 47.1625, lng: 19.5033 },
  { code: 'PL', name: '波兰', nameEn: 'Poland', lat: 51.9194, lng: 19.1451 },
  { code: 'IE', name: '爱尔兰', nameEn: 'Ireland', lat: 53.1424, lng: -7.6921 },
  { code: 'IS', name: '冰岛', nameEn: 'Iceland', lat: 64.9631, lng: -19.0208 },
  { code: 'HR', name: '克罗地亚', nameEn: 'Croatia', lat: 45.1000, lng: 15.2000 },
  { code: 'MA', name: '摩洛哥', nameEn: 'Morocco', lat: 31.7917, lng: -7.0926 },
  { code: 'KE', name: '肯尼亚', nameEn: 'Kenya', lat: -0.0236, lng: 37.9062 },
  { code: 'TZ', name: '坦桑尼亚', nameEn: 'Tanzania', lat: -6.3690, lng: 34.8888 },
];
