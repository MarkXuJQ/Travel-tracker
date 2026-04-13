#!/usr/bin/env node
// Fetches prefecture-level city boundary GeoJSON from Aliyun DataV for all
// 34 Chinese province-level administrative regions and merges into one file.
// Output: public/china-cities.json (GeoJSON FeatureCollection)
//
// Usage: node scripts/fetch-china-cities.js

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/china-cities.json');

// All 34 province-level adcodes (mainland + HK/Macau/Taiwan)
const PROVINCE_ADCODES = [
  110000, // 北京市
  120000, // 天津市
  130000, // 河北省
  140000, // 山西省
  150000, // 内蒙古自治区
  210000, // 辽宁省
  220000, // 吉林省
  230000, // 黑龙江省
  310000, // 上海市
  320000, // 江苏省
  330000, // 浙江省
  340000, // 安徽省
  350000, // 福建省
  360000, // 江西省
  370000, // 山东省
  410000, // 河南省
  420000, // 湖北省
  430000, // 湖南省
  440000, // 广东省
  450000, // 广西壮族自治区
  460000, // 海南省
  500000, // 重庆市
  510000, // 四川省
  520000, // 贵州省
  530000, // 云南省
  540000, // 西藏自治区
  610000, // 陕西省
  620000, // 甘肃省
  630000, // 青海省
  640000, // 宁夏回族自治区
  650000, // 新疆维吾尔自治区
  710000, // 台湾省
  810000, // 香港特别行政区
  820000, // 澳门特别行政区
];

const BASE_URL = 'https://geo.datav.aliyun.com/areas_v3/bound';

async function fetchProvince(adcode) {
  const url = `${BASE_URL}/${adcode}_full.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  SKIP ${adcode}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  if (!data.features) {
    console.warn(`  SKIP ${adcode}: no features`);
    return [];
  }
  return data.features;
}

async function main() {
  console.log(`Fetching ${PROVINCE_ADCODES.length} provinces from Aliyun DataV...`);

  // Fetch concurrently in batches of 5 to avoid rate limiting
  const BATCH = 5;
  const allFeatures = [];

  for (let i = 0; i < PROVINCE_ADCODES.length; i += BATCH) {
    const batch = PROVINCE_ADCODES.slice(i, i + BATCH);
    process.stdout.write(`  [${i + 1}–${Math.min(i + BATCH, PROVINCE_ADCODES.length)}/${PROVINCE_ADCODES.length}] `);
    const results = await Promise.all(batch.map(fetchProvince));
    const batchFeatures = results.flat();
    allFeatures.push(...batchFeatures);
    console.log(`→ ${batchFeatures.length} features`);
  }

  const geojson = {
    type: 'FeatureCollection',
    features: allFeatures,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(geojson), 'utf-8');
  console.log(`\nWrote ${allFeatures.length} features to ${OUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
