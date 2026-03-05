import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Globe from 'react-globe.gl';

interface Globe3DProps {
  visitedCities: { name: string; lat: number; lng: number; province: string }[];
  visitedProvinces: string[];
  visitedCountries: string[];
  onRegionClick?: (type: 'country' | 'province' | 'city', name: string, lat: number, lng: number) => void;
  targetPosition?: { lat: number; lng: number } | null;
  width?: number;
  height?: number;
  isDefaultView?: boolean;
  onEnterInteractive?: () => void;
}

// 多边形数据类型
interface PolygonData {
  id: string;
  name: string;
  geometry: any;
  visited: boolean;
  level: 'country' | 'province';
  lat: number;
  lng: number;
}

// 城市标记数据
interface CityMarker {
  lat: number;
  lng: number;
  name: string;
  province: string;
}

// 悬停状态
interface HoverInfo {
  name: string;
  level: string;
  x: number;
  y: number;
}

export function Globe3D({ 
  visitedCities,
  visitedProvinces,
  visitedCountries,
  onRegionClick, 
  targetPosition,
  width = typeof window !== 'undefined' ? window.innerWidth : 800,
  height = typeof window !== 'undefined' ? window.innerHeight : 600,
  isDefaultView = false,
  onEnterInteractive,
}: Globe3DProps) {
  const globeRef = useRef<any>(null);
  const [polygons, setPolygons] = useState<PolygonData[]>([]);
  const [chinaProvinces, setChinaProvinces] = useState<PolygonData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // 加载世界地图和中国省份数据
  useEffect(() => {
    Promise.all([
      fetch('./world-atlas.json').then(r => r.json()),
      fetch('./china-provinces.json').then(r => r.json()).catch(() => null),
    ]).then(([worldData, chinaData]) => {
      import('topojson-client').then(({ feature }) => {
        // 处理世界地图
        const geoJson = feature(worldData, worldData.objects.countries) as any;
        const countries = geoJson.features || [];
        
        const countryPolygons = countries.map((country: any) => {
          const countryCode = country.id || country.properties?.ISO_A3 || country.properties?.ISO_A2;
          const countryName = country.properties?.NAME || country.properties?.NAME_EN || 'Unknown';
          
          // 计算国家中心点
          const centroid = calculateCentroid(country.geometry);
          
          return {
            id: countryCode || countryName,
            name: countryName,
            geometry: country.geometry,
            visited: false,
            level: 'country' as const,
            lat: centroid.lat,
            lng: centroid.lng,
          };
        });
        
        setPolygons(countryPolygons);
        
        // 处理中国省份
        if (chinaData && chinaData.features) {
          const provincePolygons = chinaData.features.map((f: any) => {
            const centroid = calculateCentroid(f.geometry);
            return {
              id: f.properties?.adcode?.toString() || f.properties?.name,
              name: f.properties?.name,
              geometry: f.geometry,
              visited: false,
              level: 'province' as const,
              lat: centroid.lat,
              lng: centroid.lng,
            };
          });
          
          setChinaProvinces(provincePolygons);
        }
        
        setIsLoaded(true);
      });
    }).catch(err => {
      console.error('Failed to load map data:', err);
      setIsLoaded(true);
    });
  }, []);

  // 计算几何中心点
  const calculateCentroid = (geometry: any): { lat: number; lng: number } => {
    try {
      if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates[0];
        let sumLng = 0, sumLat = 0;
        coords.forEach((c: number[]) => {
          sumLng += c[0];
          sumLat += c[1];
        });
        return { lat: sumLat / coords.length, lng: sumLng / coords.length };
      } else if (geometry.type === 'MultiPolygon') {
        const coords = geometry.coordinates[0][0];
        let sumLng = 0, sumLat = 0;
        coords.forEach((c: number[]) => {
          sumLng += c[0];
          sumLat += c[1];
        });
        return { lat: sumLat / coords.length, lng: sumLng / coords.length };
      }
    } catch (e) {
      console.error('Error calculating centroid:', e);
    }
    return { lat: 0, lng: 0 };
  };

  // 更新访问状态 - 只保留已访问的多边形
  useEffect(() => {
    setPolygons(prev => prev.map(poly => ({
      ...poly,
      visited: visitedCountries.some(name => 
        poly.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(poly.name.toLowerCase())
      ),
    })));
    
    setChinaProvinces(prev => prev.map(poly => ({
      ...poly,
      visited: visitedProvinces.includes(poly.name),
    })));
  }, [visitedCountries, visitedProvinces]);

  // 当目标位置变化时，旋转地球到该位置
  useEffect(() => {
    if (targetPosition && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: targetPosition.lat, lng: targetPosition.lng, altitude: 1.2 },
        1000
      );
    }
  }, [targetPosition]);

  // 处理多边形点击
  const handlePolygonClick = useCallback((polygon: object) => {
    const poly = polygon as PolygonData;
    if (isDefaultView && onEnterInteractive) {
      onEnterInteractive();
      return;
    }
    if (onRegionClick) {
      // 放大到该地区
      if (globeRef.current) {
        globeRef.current.pointOfView(
          { lat: poly.lat, lng: poly.lng, altitude: 0.8 },
          800
        );
      }
      onRegionClick(poly.level, poly.name, poly.lat, poly.lng);
    }
  }, [isDefaultView, onEnterInteractive, onRegionClick]);

  // 处理多边形悬停
  const handlePolygonHover = useCallback((polygon: object | null) => {
    if (polygon) {
      const poly = polygon as PolygonData;
      setHoverInfo({
        name: poly.name,
        level: poly.level === 'country' ? '国家' : '省份',
        x: 0,
        y: 0,
      });
    } else {
      setHoverInfo(null);
    }
  }, []);

  // 处理城市点击
  const handleCityClick = useCallback((marker: object) => {
    const city = marker as CityMarker;
    if (isDefaultView && onEnterInteractive) {
      onEnterInteractive();
      return;
    }
    if (onRegionClick) {
      onRegionClick('city', city.name, city.lat, city.lng);
    }
  }, [isDefaultView, onEnterInteractive, onRegionClick]);

  // 地球加载完成
  const handleGlobeReady = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 35, lng: 105, altitude: 2.5 });
    }
  }, []);

  // 处理地球点击进入交互模式
  const handleGlobeClick = useCallback(() => {
    if (isDefaultView && onEnterInteractive) {
      onEnterInteractive();
    }
  }, [isDefaultView, onEnterInteractive]);

  // 只显示已访问的多边形
  const visitedPolygons = useMemo(() => {
    return [...polygons, ...chinaProvinces].filter(p => p.visited);
  }, [polygons, chinaProvinces]);

  // 城市标记数据
  const cityMarkers: CityMarker[] = visitedCities.map(c => ({
    lat: c.lat,
    lng: c.lng,
    name: c.name,
    province: c.province,
  }));

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        background: 'radial-gradient(ellipse at center, #1a1f3d 0%, #0b0d17 100%)',
        cursor: isDefaultView ? 'pointer' : 'grab',
      }}
      onClick={handleGlobeClick}
    >
      {/* 加载指示器 */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#4cc9f0',
          fontSize: '14px',
          zIndex: 10,
        }}>
          加载地球中...
        </div>
      )}
      
      {/* 悬停提示 */}
      {hoverInfo && (
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.x + 10,
            top: hoverInfo.y - 30,
            background: 'rgba(26, 31, 61, 0.95)',
            border: '1px solid rgba(76, 201, 240, 0.5)',
            borderRadius: '8px',
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <p style={{ color: '#4cc9f0', fontSize: '12px', margin: 0 }}>{hoverInfo.level}</p>
          <p style={{ color: '#f0f2ff', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{hoverInfo.name}</p>
        </div>
      )}
      
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        
        // 地球纹理 - 使用高清地球纹理
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        
        // 背景 - 星空
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // 大气层效果
        atmosphereColor="#4cc9f0"
        atmosphereAltitude={0.1}
        
        // 多边形层 - 只显示已访问的行政区划（半透明覆盖层）
        polygonsData={visitedPolygons}
        polygonGeoJsonGeometry="geometry"
        polygonCapColor={() => 'rgba(247, 37, 133, 0.5)'}
        polygonSideColor={() => 'rgba(247, 37, 133, 0.3)'}
        polygonStrokeColor={() => '#f72585'}
        polygonAltitude={0.01}
        polygonCapCurvatureResolution={2}
        polygonsTransitionDuration={500}
        onPolygonClick={handlePolygonClick}
        onPolygonHover={handlePolygonHover}
        
        // 城市标记点
        pointsData={cityMarkers}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => '#f72585'}
        pointRadius={0.5}
        pointAltitude={0.02}
        pointResolution={16}
        onPointClick={handleCityClick}
        
        // 城市标签
        labelsData={cityMarkers}
        labelLat="lat"
        labelLng="lng"
        labelText="name"
        labelSize={0.5}
        labelColor={() => '#f0f2ff'}
        labelDotRadius={0.3}
        labelAltitude={0.05}
        onLabelClick={handleCityClick}
        
        // 交互配置
        enablePointerInteraction={true}
        onGlobeReady={handleGlobeReady}
      />
    </div>
  );
}

export default Globe3D;
