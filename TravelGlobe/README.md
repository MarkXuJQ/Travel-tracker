# TravelGlobe

一个模块化的旅行地图平台，基于 SvelteKit + TypeScript + Tailwind CSS 构建。

## 功能特性

- **2D/3D 地图支持**: 默认使用 Leaflet (2D)，预留 Cesium (3D) 支持。
- **模块化架构**: 核心功能插件化，易于扩展。
- **响应式设计**: 适配各种屏幕尺寸。
- **地区高亮**: 支持 GeoJSON 数据加载和地区高亮显示。

## 开发指南

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建

```bash
npm run build
```

## 插件化架构

本项目采用插件化架构，所有扩展功能应实现 `MapPlugin` 接口。插件目录位于 `src/lib/plugins`。

示例插件结构：
```typescript
import type { MapPlugin } from '$lib/plugins/types';

export const myPlugin: MapPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  enabled: true,
  onInit: (map, L) => {
    console.log('Plugin initialized');
  }
};
```

## 部署

本项目支持构建为静态站点。

### 构建

```bash
npm run build
```

构建产物位于 `build` 目录，您可以将其上传到任何静态网站托管服务（如 GitHub Pages, Vercel, Netlify 等）。

