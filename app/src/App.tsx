import { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { SidePanel } from '@/components/SidePanel';
import { useTravelStore } from '@/hooks/useTravelStore';
import { Button } from '@/components/ui/button';
import { MapPin, RotateCcw, Globe2, X, Compass } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Globe3D } from '@/components/Globe3D';
import './App.css';

// 检测是否为移动设备
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

function App() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [globeSize, setGlobeSize] = useState({ width: 800, height: 600 });
  const [isDefaultView, setIsDefaultView] = useState(true); // 默认界面状态
  
  useEffect(() => {
    setMounted(true);
    setIsMobile(isMobileDevice());
    
    const handleResize = () => {
      setIsMobile(isMobileDevice());
      setGlobeSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const store = useTravelStore();
  
  const {
    records,
    visited,
    addRecord,
    deleteRecord,
    getStatistics,
    getProvinceStats,
    getVisitedCities,
    getVisitedProvinces,
    getVisitedCountries,
    importFromShare,
    clearAll,
  } = store;

  const [isPanelOpen, setIsPanelOpen] = useState(false); // 默认界面时面板关闭
  const [shareUrl, setShareUrl] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<string>('');
  const [targetPosition, setTargetPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const statistics = useMemo(() => getStatistics(), [getStatistics, records, visited]);
  const visitedCities = useMemo(() => getVisitedCities(), [getVisitedCities, visited]);
  const visitedProvinces = useMemo(() => getVisitedProvinces().map(p => p.name), [getVisitedProvinces, visited]);
  const visitedCountries = useMemo(() => getVisitedCountries().map(c => c.name), [getVisitedCountries, visited]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin + window.location.pathname;
      const data = { records, visited: { countries: Array.from(visited.countries), provinces: Array.from(visited.provinces), cities: Array.from(visited.cities) }, timestamp: Date.now() };
      try {
        const encoded = btoa(JSON.stringify(data));
        setShareUrl(`${baseUrl}?share=${encoded}`);
      } catch (e) {
        console.error('Failed to encode share URL:', e);
      }
    }
  }, [records, visited]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shareData = params.get('share');
      if (shareData) {
        try {
          const decoded = JSON.parse(atob(shareData));
          if (decoded.records && decoded.visited) {
            setImportData(shareData);
            setShowImportDialog(true);
          }
        } catch (e) {
          toast.error('无效的分享链接');
        }
      }
    }
  }, []);

  const handleImport = () => {
    try {
      const decoded = JSON.parse(atob(importData));
      importFromShare(decoded);
      setShowImportDialog(false);
      toast.success('旅行记录导入成功！');
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      toast.error('导入失败');
    }
  };

  const handleSelectLocation = useCallback((lat: number, lng: number) => {
    setTargetPosition({ lat, lng });
    toast.info(`正在导航到: ${lat.toFixed(2)}, ${lng.toFixed(2)}`);
  }, []);

  const handleRegionClick = useCallback((_type: 'country' | 'province' | 'city', name: string, lat: number, lng: number) => {
    if (isDefaultView) {
      // 默认界面点击进入交互模式
      setIsDefaultView(false);
      setIsPanelOpen(true);
      return;
    }
    // 设置目标位置让地球放大
    setTargetPosition({ lat, lng });
    // 设置选中的位置，让 SidePanel 自动切换到记录标签
    setSelectedLocation({ name, lat, lng });
    toast.info(`已选择: ${name}，请在面板中添加记录`);
  }, [isDefaultView]);

  const handleEnterInteractive = useCallback(() => {
    setIsDefaultView(false);
    setIsPanelOpen(true);
  }, []);

  const handleClearAll = () => {
    if (confirm('确定要清空所有旅行记录吗？')) {
      clearAll();
      toast.success('所有数据已清空');
    }
  };

  const handleBackToDefault = () => {
    setIsDefaultView(true);
    setIsPanelOpen(false);
  };

  // 如果没有挂载，显示加载状态
  if (!mounted) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#0b0d17', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f0f2ff',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Globe2 className="w-12 h-12 text-[#4cc9f0] animate-spin" />
        <div>加载3D地球中...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#0b0d17', 
      position: 'relative', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Toaster position={isMobile ? 'top-center' : 'top-right'} />
      
      {/* 3D地球 */}
      <div style={{ 
        flex: 1, 
        position: 'relative',
      }}>
        <Globe3D 
          visitedCities={visitedCities}
          visitedProvinces={visitedProvinces}
          visitedCountries={visitedCountries}
          onRegionClick={handleRegionClick}
          targetPosition={targetPosition}
          width={globeSize.width}
          height={globeSize.height}
          isDefaultView={isDefaultView}
          onEnterInteractive={handleEnterInteractive}
        />
      </div>

      {/* 默认界面 - 中央标题和统计 */}
      {isDefaultView && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40">
          {/* 中央标题 */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-bold text-[#f0f2ff] mb-4" style={{ textShadow: '0 0 40px rgba(76,201,240,0.5)' }}>
              旅行轨迹星球
            </h1>
            <p className="text-xl text-[#4cc9f0]">记录你的每一次探索</p>
          </div>
          
          {/* 统计卡片 */}
          <div className="flex gap-4 md:gap-8 mb-8">
            <div className="bg-[rgba(26,31,61,0.9)] backdrop-blur-md border border-[rgba(247,37,133,0.3)] rounded-2xl px-6 py-4 text-center">
              <p className="text-3xl md:text-4xl font-bold text-[#f72585]">{statistics.global.visited}</p>
              <p className="text-sm text-[#f0f2ff]/70">个国家</p>
            </div>
            <div className="bg-[rgba(26,31,61,0.9)] backdrop-blur-md border border-[rgba(76,201,240,0.3)] rounded-2xl px-6 py-4 text-center">
              <p className="text-3xl md:text-4xl font-bold text-[#4cc9f0]">{statistics.provinces.visited}</p>
              <p className="text-sm text-[#f0f2ff]/70">个省份</p>
            </div>
            <div className="bg-[rgba(26,31,61,0.9)] backdrop-blur-md border border-[rgba(114,9,183,0.3)] rounded-2xl px-6 py-4 text-center">
              <p className="text-3xl md:text-4xl font-bold text-[#7209b7]">{statistics.cities.visited}</p>
              <p className="text-sm text-[#f0f2ff]/70">个城市</p>
            </div>
          </div>
          
          {/* 点击进入提示 */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-[#f0f2ff]/50 text-sm animate-pulse">
              点击地球进入交互模式
            </p>
            <button
              onClick={handleEnterInteractive}
              className="pointer-events-auto flex items-center gap-2 bg-gradient-to-r from-[#f72585] to-[#4cc9f0] text-white px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[#4cc9f0]/30"
            >
              <Compass className="w-5 h-5" />
              开始探索
            </button>
          </div>
        </div>
      )}

      {/* 交互模式 - 浮动面板 */}
      {!isDefaultView && (
        <SidePanel
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(!isPanelOpen)}
          records={records}
          statistics={statistics}
          onAddRecord={addRecord}
          onDeleteRecord={deleteRecord}
          onSelectLocation={handleSelectLocation}
          shareUrl={shareUrl}
          getProvinceStats={getProvinceStats}
          selectedLocation={selectedLocation}
        />
      )}

      {/* 交互模式 - 顶部统计 */}
      {!isDefaultView && !isMobile && (
        <div style={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          display: 'flex', 
          gap: 8, 
          zIndex: 40 
        }}>
          <div className="bg-[rgba(26,31,61,0.8)] backdrop-blur-md border border-[rgba(247,37,133,0.3)] rounded-full px-4 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#f72585]" />
            <span className="text-[#f0f2ff] text-sm">{statistics.global.visited} 个国家</span>
          </div>
          <div className="bg-[rgba(26,31,61,0.8)] backdrop-blur-md border border-[rgba(76,201,240,0.3)] rounded-full px-4 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#4cc9f0]" />
            <span className="text-[#f0f2ff] text-sm">{statistics.provinces.visited} 个省份</span>
          </div>
          <div className="bg-[rgba(26,31,61,0.8)] backdrop-blur-md border border-[rgba(114,9,183,0.3)] rounded-full px-4 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#7209b7]" />
            <span className="text-[#f0f2ff] text-sm">{statistics.cities.visited} 个城市</span>
          </div>
        </div>
      )}

      {/* 交互模式 - 返回按钮 */}
      {!isDefaultView && (
        <button
          onClick={handleBackToDefault}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-[rgba(26,31,61,0.9)] border border-[rgba(76,201,240,0.3)] rounded-full flex items-center justify-center text-[#f0f2ff] hover:text-[#4cc9f0] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* 移动端统计按钮 */}
      {!isDefaultView && isMobile && (
        <button
          onClick={() => setShowMobileStats(true)}
          className="fixed top-4 right-4 z-40 w-10 h-10 bg-[rgba(26,31,61,0.9)] border border-[rgba(76,201,240,0.3)] rounded-full flex items-center justify-center text-[#4cc9f0]"
        >
          <MapPin className="w-5 h-5" />
        </button>
      )}

      {/* 移动端统计弹窗 */}
      {showMobileStats && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 flex items-end"
          onClick={() => setShowMobileStats(false)}
        >
          <div 
            className="w-full bg-[rgba(26,31,61,0.98)] rounded-t-2xl p-4 border-t border-[rgba(76,201,240,0.3)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#f0f2ff] font-bold">探索统计</h3>
              <button onClick={() => setShowMobileStats(false)} className="text-[#f0f2ff]/50">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[rgba(13,15,26,0.6)] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[#f72585]">{statistics.global.visited}</p>
                <p className="text-xs text-[#f0f2ff]/60">国家</p>
              </div>
              <div className="bg-[rgba(13,15,26,0.6)] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[#4cc9f0]">{statistics.provinces.visited}</p>
                <p className="text-xs text-[#f0f2ff]/60">省份</p>
              </div>
              <div className="bg-[rgba(13,15,26,0.6)] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[#7209b7]">{statistics.cities.visited}</p>
                <p className="text-xs text-[#f0f2ff]/60">城市</p>
              </div>
            </div>
            <p className="text-center text-[#f0f2ff]/50 text-xs mt-3">
              已探索 {statistics.global.percentage}% 的世界
            </p>
          </div>
        </div>
      )}

      {/* 底部操作栏 - 交互模式 */}
      {!isDefaultView && !isMobile && (
        <div style={{ 
          position: 'absolute', 
          bottom: 16, 
          left: 16,
          right: 16, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          zIndex: 40,
        }}>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="bg-[rgba(26,31,61,0.8)] backdrop-blur-md border-[rgba(247,37,133,0.3)] text-[#f0f2ff]/70 hover:text-[#f72585]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置数据
            </Button>
          </div>
          
          <span className="text-[#f0f2ff]/30 text-xs">拖动地球旋转 · 滚轮缩放 · 点击板块查看</span>
        </div>
      )}

      {/* 移动端底部提示 */}
      {!isDefaultView && isMobile && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <div className="bg-[rgba(26,31,61,0.9)] backdrop-blur-md rounded-full px-4 py-2 text-center">
            <span className="text-[#f0f2ff]/50 text-xs">拖动旋转 · 双指缩放 · 点击点亮</span>
          </div>
        </div>
      )}

      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-[rgba(26,31,61,0.95)] border-[rgba(76,201,240,0.3)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#f0f2ff]">导入旅行记录</DialogTitle>
            <DialogDescription className="text-[#f0f2ff]/70">
              检测到分享链接中的旅行记录，是否导入？
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowImportDialog(false)} className="flex-1 border-[rgba(76,201,240,0.3)] text-[#f0f2ff]">
              取消
            </Button>
            <Button onClick={handleImport} className="flex-1 bg-[#4cc9f0] hover:bg-[#4cc9f0]/80 text-white">
              导入
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
