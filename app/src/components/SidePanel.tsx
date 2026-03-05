import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Calendar, 
  Link, 
  Plus, 
  Trash2, 
  Clock,
  Globe,
  BarChart3,
  Check,
  Share2,
  X,
  GripVertical,
  Minimize2,
  Maximize2,
  Navigation,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { TravelRecord, Statistics } from '@/types';
import { CHINA_PROVINCES, WORLD_COUNTRIES, getCitiesByProvince } from '@/data/chinaData';

interface SidePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  records: TravelRecord[];
  statistics: Statistics;
  onAddRecord: (record: Omit<TravelRecord, 'id' | 'createdAt'>) => void;
  onDeleteRecord: (id: string) => void;
  onSelectLocation: (lat: number, lng: number) => void;
  shareUrl: string;
  getProvinceStats: (provinceName: string) => { total: number; visited: number; percentage: number };
  selectedLocation?: { name: string; lat: number; lng: number } | null;
}

// 浮动面板位置
interface PanelPosition {
  x: number;
  y: number;
}

// 智能地点选择器
function SmartLocationSelector({ 
  value, 
  onChange,
  onNavigate,
}: { 
  value: { country: string; province?: string; city?: string; lat: number; lng: number };
  onChange: (location: { country: string; province?: string; city?: string; lat: number; lng: number }) => void;
  onNavigate?: (lat: number, lng: number) => void;
}) {
  const [showCustomCoords, setShowCustomCoords] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [customCityName, setCustomCityName] = useState('');
  
  // 获取当前国家的省份列表
  const provinces = value.country === '中国' 
    ? CHINA_PROVINCES 
    : [];
  
  // 获取当前省份的城市列表
  const cities = value.province 
    ? getCitiesByProvince(value.province)
    : [];
  
  // 应用自定义坐标
  const applyCustomCoords = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('请输入有效的经纬度');
      return;
    }
    
    if (!customCityName.trim()) {
      toast.error('请输入城市名称');
      return;
    }
    
    onChange({
      country: value.country,
      province: value.province,
      city: customCityName.trim(),
      lat,
      lng,
    });
    
    toast.success(`已添加自定义位置: ${customCityName}`);
    setShowCustomCoords(false);
    setCustomLat('');
    setCustomLng('');
    setCustomCityName('');
  };
  
  return (
    <div className="space-y-3">
      {/* 国家选择 */}
      <div>
        <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider">国家/地区</Label>
        <select 
          className="w-full mt-1 bg-[rgba(13,15,26,0.6)] border border-[rgba(76,201,240,0.3)] rounded-lg px-3 py-2 text-[#f0f2ff] focus:border-[#4cc9f0] focus:outline-none"
          value={value.country}
          onChange={(e) => {
            const country = WORLD_COUNTRIES.find(c => c.name === e.target.value);
            if (country) {
              onChange({ country: country.name, lat: country.lat, lng: country.lng });
              onNavigate?.(country.lat, country.lng);
            }
          }}
        >
          <option value="">选择国家</option>
          {WORLD_COUNTRIES.map(c => (
            <option key={c.code} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
      
      {/* 中国省份选择 */}
      {value.country === '中国' && (
        <div>
          <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider">省份（可选）</Label>
          <select 
            className="w-full mt-1 bg-[rgba(13,15,26,0.6)] border border-[rgba(76,201,240,0.3)] rounded-lg px-3 py-2 text-[#f0f2ff] focus:border-[#4cc9f0] focus:outline-none"
            value={value.province || ''}
            onChange={(e) => {
              const province = CHINA_PROVINCES.find(p => p.name === e.target.value);
              if (province) {
                onChange({ 
                  country: value.country, 
                  province: province.name, 
                  lat: province.lat, 
                  lng: province.lng 
                });
                onNavigate?.(province.lat, province.lng);
              } else {
                const country = WORLD_COUNTRIES.find(c => c.name === value.country);
                if (country) {
                  onChange({ country: country.name, lat: country.lat, lng: country.lng });
                  onNavigate?.(country.lat, country.lng);
                }
              }
            }}
          >
            <option value="">不选省份（记录整个中国）</option>
            {provinces.map(p => (
              <option key={p.code} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* 城市选择 */}
      {value.province && (
        <div>
          <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider">城市（可选）</Label>
          <select 
            className="w-full mt-1 bg-[rgba(13,15,26,0.6)] border border-[rgba(76,201,240,0.3)] rounded-lg px-3 py-2 text-[#f0f2ff] focus:border-[#4cc9f0] focus:outline-none"
            value={value.city || ''}
            onChange={(e) => {
              const cityName = e.target.value;
              if (cityName === '__custom__') {
                setShowCustomCoords(true);
                return;
              }
              
              const city = cities.find(c => c.name === cityName);
              if (city) {
                onChange({ 
                  country: value.country, 
                  province: value.province,
                  city: city.name, 
                  lat: city.lat, 
                  lng: city.lng 
                });
                onNavigate?.(city.lat, city.lng);
              } else {
                const province = CHINA_PROVINCES.find(p => p.name === value.province);
                if (province) {
                  onChange({ 
                    country: value.country, 
                    province: province.name, 
                    lat: province.lat, 
                    lng: province.lng 
                  });
                  onNavigate?.(province.lat, province.lng);
                }
              }
            }}
          >
            <option value="">不选城市（记录整个省份）</option>
            {cities.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
            <option value="__custom__">+ 添加自定义城市坐标</option>
          </select>
        </div>
      )}
      
      {/* 自定义坐标输入 */}
      {showCustomCoords && (
        <div className="bg-[rgba(13,15,26,0.8)] border border-[rgba(76,201,240,0.3)] rounded-lg p-3 space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-[#4cc9f0] text-xs">自定义城市坐标</Label>
            <button 
              onClick={() => setShowCustomCoords(false)}
              className="text-[#f0f2ff]/50 hover:text-[#f0f2ff]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Input
            placeholder="城市名称"
            value={customCityName}
            onChange={(e) => setCustomCityName(e.target.value)}
            className="bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff]"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="纬度 (lat)"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff]"
            />
            <Input
              placeholder="经度 (lng)"
              value={customLng}
              onChange={(e) => setCustomLng(e.target.value)}
              className="bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff]"
            />
          </div>
          <Button 
            onClick={applyCustomCoords}
            className="w-full bg-[#4cc9f0] hover:bg-[#4cc9f0]/80 text-white text-sm"
          >
            <Navigation className="w-4 h-4 mr-2" />
            添加位置
          </Button>
        </div>
      )}
    </div>
  );
}

// 旅行记录表单
function TravelForm({ onSubmit, onNavigate }: { onSubmit: (record: Omit<TravelRecord, 'id' | 'createdAt'>) => void; onNavigate?: (lat: number, lng: number) => void }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState<{ country: string; province?: string; city?: string; lat: number; lng: number }>({ country: '', lat: 0, lng: 0 });
  const [blogUrl, setBlogUrl] = useState('');
  const [notes, setNotes] = useState('');
  
  // 判断是否为仅月份（通过检查日期字符串长度）
  const isMonthOnly = (date: string) => date.length === 7; // YYYY-MM
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !location.country) {
      toast.error('请填写完整信息');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('开始时间不能晚于结束时间');
      return;
    }
    
    const datePrecision = isMonthOnly(startDate) ? 'month' : 'day';
    
    onSubmit({
      startDate,
      endDate,
      datePrecision,
      location: {
        country: location.country,
        countryCode: '',
        province: location.province,
        city: location.city,
        lat: location.lat,
        lng: location.lng,
      },
      blogUrl: blogUrl || undefined,
      notes: notes || undefined,
    });
    
    // 重置表单
    setStartDate('');
    setEndDate('');
    setLocation({ country: '', lat: 0, lng: 0 });
    setBlogUrl('');
    setNotes('');
    
    toast.success('旅行记录已添加！');
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 日期输入 - 支持年月或年月日 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            开始时间
          </Label>
          <Input 
            type="month"
            value={startDate.length > 7 ? startDate.substring(0, 7) : startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff] focus:border-[#4cc9f0]"
          />
          <label className="flex items-center gap-2 mt-2 text-xs text-[#f0f2ff]/60">
            <input
              type="checkbox"
              checked={startDate.length === 10}
              onChange={(e) => {
                if (e.target.checked) {
                  setStartDate(startDate.substring(0, 7) + '-01');
                } else {
                  setStartDate(startDate.substring(0, 7));
                }
              }}
              className="rounded border-[rgba(76,201,240,0.3)]"
            />
            精确到日
          </label>
          {startDate.length === 10 && (
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff]"
            />
          )}
        </div>
        <div>
          <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            结束时间
          </Label>
          <Input 
            type="month"
            value={endDate.length > 7 ? endDate.substring(0, 7) : endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff] focus:border-[#4cc9f0]"
          />
          <label className="flex items-center gap-2 mt-2 text-xs text-[#f0f2ff]/60">
            <input
              type="checkbox"
              checked={endDate.length === 10}
              onChange={(e) => {
                if (e.target.checked) {
                  setEndDate(endDate.substring(0, 7) + '-01');
                } else {
                  setEndDate(endDate.substring(0, 7));
                }
              }}
              className="rounded border-[rgba(76,201,240,0.3)]"
            />
            精确到日
          </label>
          {endDate.length === 10 && (
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff]"
            />
          )}
        </div>
      </div>
      
      <div>
        <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          旅行地点
        </Label>
        <div className="mt-1">
          <SmartLocationSelector 
            value={{ country: location.country, province: location.province, city: location.city, lat: location.lat, lng: location.lng }}
            onChange={(loc) => setLocation(loc)}
            onNavigate={onNavigate}
          />
        </div>
      </div>
      
      <div>
        <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider flex items-center gap-1">
          <Link className="w-3 h-3" />
          博客/日记链接
        </Label>
        <Input 
          type="url"
          placeholder="https://..."
          value={blogUrl}
          onChange={(e) => setBlogUrl(e.target.value)}
          className="mt-1 bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff] placeholder:text-[#f0f2ff]/30"
        />
      </div>
      
      <div>
        <Label className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider">备注</Label>
        <Textarea 
          placeholder="记录一些美好的回忆..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff] placeholder:text-[#f0f2ff]/30 min-h-[60px]"
        />
      </div>
      
      <Button 
        type="submit"
        className="w-full bg-[#f72585] hover:bg-[#f72585]/80 text-white rounded-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        添加记录
      </Button>
    </form>
  );
}

// 时间线组件
function Timeline({ 
  records, 
  onDelete, 
  onSelect 
}: { 
  records: TravelRecord[];
  onDelete: (id: string) => void;
  onSelect: (lat: number, lng: number) => void;
}) {
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  
  if (sortedRecords.length === 0) {
    return (
      <div className="text-center py-8 text-[#f0f2ff]/50">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>还没有旅行记录</p>
        <p className="text-sm mt-1">去&quot;记录&quot;标签添加你的第一次旅行吧！</p>
      </div>
    );
  }
  
  // 按年份分组
  const groupedByYear: Record<string, TravelRecord[]> = {};
  sortedRecords.forEach(record => {
    const year = new Date(record.startDate).getFullYear().toString();
    if (!groupedByYear[year]) {
      groupedByYear[year] = [];
    }
    groupedByYear[year].push(record);
  });
  
  // 格式化日期显示
  const formatDate = (record: TravelRecord) => {
    if (record.datePrecision === 'month') {
      return record.startDate.substring(0, 7); // YYYY-MM
    }
    return record.startDate;
  };
  
  return (
    <ScrollArea className="h-[calc(100%-120px)]">
      <div className="space-y-6 pr-4">
        {Object.entries(groupedByYear).map(([year, yearRecords]) => (
          <div key={year}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#4cc9f0]/20 flex items-center justify-center">
                <span className="text-[#4cc9f0] text-xs font-bold">{year}</span>
              </div>
              <div className="flex-1 h-px bg-[rgba(76,201,240,0.2)]" />
            </div>
            
            <div className="space-y-3 ml-4 border-l-2 border-[rgba(76,201,240,0.2)] pl-4">
              {yearRecords.map((record) => (
                <div 
                  key={record.id}
                  className="relative bg-[rgba(13,15,26,0.6)] border border-[rgba(76,201,240,0.2)] rounded-lg p-3 hover:border-[#4cc9f0]/50 transition-all cursor-pointer group"
                  onClick={() => onSelect(record.location.lat, record.location.lng)}
                >
                  {/* 时间节点 */}
                  <div className="absolute -left-[21px] top-4 w-3 h-3 rounded-full bg-[#f72585] border-2 border-[#0b0d17]" />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-[#4cc9f0]" />
                        <span className="text-[#f0f2ff] font-medium">
                          {record.location.city || record.location.province || record.location.country}
                        </span>
                        {record.datePrecision === 'month' && (
                          <span className="text-[10px] bg-[#4cc9f0]/20 text-[#4cc9f0] px-1.5 py-0.5 rounded">大致</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#f0f2ff]/60">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(record)}</span>
                      </div>
                      
                      {record.notes && (
                        <p className="text-xs text-[#f0f2ff]/70 mt-2 line-clamp-2">
                          {record.notes}
                        </p>
                      )}
                      
                      {record.blogUrl && (
                        <a 
                          href={record.blogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#4cc9f0] mt-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link className="w-3 h-3" />
                          查看日记
                        </a>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(record.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#f0f2ff]/50 hover:text-[#f72585] transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// 统计面板
function StatisticsPanel({ statistics, getProvinceStats }: { statistics: Statistics; getProvinceStats: (provinceName: string) => { total: number; visited: number; percentage: number } }) {
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);
  
  const stats = [
    { 
      label: '全球探索', 
      value: statistics.global.visited, 
      total: statistics.global.total, 
      percentage: statistics.global.percentage,
      icon: Globe,
      color: '#f72585'
    },
    { 
      label: '中国省份', 
      value: statistics.provinces.visited, 
      total: statistics.provinces.total, 
      percentage: statistics.provinces.percentage,
      icon: MapPin,
      color: '#4cc9f0'
    },
    { 
      label: '中国城市', 
      value: statistics.cities.visited, 
      total: statistics.cities.total, 
      percentage: statistics.cities.percentage,
      icon: MapPin,
      color: '#7209b7'
    },
  ];
  
  return (
    <ScrollArea className="h-[calc(100%-120px)]">
      <div className="space-y-4 pr-4">
        {/* 总旅行天数 */}
        <div className="bg-gradient-to-r from-[#f72585]/20 to-[#4cc9f0]/20 border border-[rgba(76,201,240,0.3)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f72585]/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#f72585]" />
            </div>
            <div>
              <p className="text-[#f0f2ff]/70 text-xs">总旅行天数（精确日期）</p>
              <p className="text-2xl font-bold text-[#f0f2ff]">{statistics.totalDays}</p>
            </div>
          </div>
          <p className="text-[10px] text-[#f0f2ff]/40 mt-2">
            *仅精确到日的记录计入天数，大致日期不计入
          </p>
        </div>
        
        {/* 各项统计 */}
        <div className="space-y-3">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="bg-[rgba(13,15,26,0.6)] border border-[rgba(76,201,240,0.2)] rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  <span className="text-[#f0f2ff]/80 text-sm">{stat.label}</span>
                </div>
                <span className="text-[#f0f2ff] font-bold text-sm">
                  {stat.value}/{stat.total}
                </span>
              </div>
              
              <div className="relative h-2 bg-[rgba(13,15,26,0.8)] rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${stat.percentage}%`,
                    backgroundColor: stat.color
                  }}
                />
              </div>
              
              <p className="text-right text-xs mt-1" style={{ color: stat.color }}>
                已探索 {stat.percentage}%
              </p>
            </div>
          ))}
        </div>
        
        {/* 省份详细统计 */}
        <div>
          <h4 className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider mb-3">省份详细</h4>
          <div className="space-y-2">
            {CHINA_PROVINCES.slice(0, 10).map((province) => {
              const stats = getProvinceStats(province.name);
              const isExpanded = expandedProvince === province.name;
              
              return (
                <div key={province.code} className="bg-[rgba(13,15,26,0.6)] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedProvince(isExpanded ? null : province.name)}
                    className="w-full flex items-center justify-between p-2 text-left"
                  >
                    <span className="text-[#f0f2ff]/80 text-sm">{province.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#f0f2ff]/60">{stats.visited}/{stats.total}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#f0f2ff]/50" /> : <ChevronDown className="w-4 h-4 text-[#f0f2ff]/50" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-2 pb-2">
                      <div className="relative h-1.5 bg-[rgba(13,15,26,0.8)] rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full rounded-full bg-[#4cc9f0]"
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#f0f2ff]/50 mt-1">
                        已点亮 {stats.percentage}% 的城市
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 成就徽章 */}
        <div>
          <h4 className="text-[#f0f2ff]/70 text-xs uppercase tracking-wider mb-3">成就徽章</h4>
          <div className="grid grid-cols-4 gap-2">
            {statistics.global.visited >= 1 && (
              <div className="bg-[rgba(13,15,26,0.6)] border border-[rgba(247,37,133,0.3)] rounded-lg p-2 text-center">
                <div className="text-xl mb-1">🌍</div>
                <p className="text-[9px] text-[#f0f2ff]/70">初出茅庐</p>
              </div>
            )}
            {statistics.global.visited >= 5 && (
              <div className="bg-[rgba(13,15,26,0.6)] border border-[rgba(76,201,240,0.3)] rounded-lg p-2 text-center">
                <div className="text-xl mb-1">✈️</div>
                <p className="text-[9px] text-[#f0f2ff]/70">环球旅行者</p>
              </div>
            )}
            {statistics.global.visited >= 10 && (
              <div className="bg-[rgba(13,15,26,0.6)] border border-[rgba(114,9,183,0.3)] rounded-lg p-2 text-center">
                <div className="text-xl mb-1">🌟</div>
                <p className="text-[9px] text-[#f0f2ff]/70">探险家</p>
              </div>
            )}
            {statistics.provinces.visited >= 5 && (
              <div className="bg-[rgba(13,15,26,0.6)] border border-[rgba(247,37,133,0.3)] rounded-lg p-2 text-center">
                <div className="text-xl mb-1">🏔️</div>
                <p className="text-[9px] text-[#f0f2ff]/70">行者无疆</p>
              </div>
            )}
            {statistics.provinces.visited >= 15 && (
              <div className="bg-[rgba(13,15,26,0.6)] border border-[rgba(76,201,240,0.3)] rounded-lg p-2 text-center">
                <div className="text-xl mb-1">🗺️</div>
                <p className="text-[9px] text-[#f0f2ff]/70">中国通</p>
              </div>
            )}
            {statistics.cities.visited >= 10 && (
              <div className="bg-[rgba(13,15,26,0.6)] border border-[rgba(114,9,183,0.3)] rounded-lg p-2 text-center">
                <div className="text-xl mb-1">🏙️</div>
                <p className="text-[9px] text-[#f0f2ff]/70">城市猎人</p>
              </div>
            )}
            {statistics.totalDays >= 30 && (
              <div className="bg-[rgba(13,15,26,0.6)] border border-[rgba(247,37,133,0.3)] rounded-lg p-2 text-center">
                <div className="text-xl mb-1">🎒</div>
                <p className="text-[9px] text-[#f0f2ff]/70">背包客</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// 主面板组件 - 可拖拽浮动面板
export function SidePanel({
  isOpen,
  onToggle,
  records,
  statistics,
  onAddRecord,
  onDeleteRecord,
  onSelectLocation,
  shareUrl,
  getProvinceStats,
  selectedLocation,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'record' | 'timeline' | 'stats'>('record');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // 当选择地区时自动切换到记录标签
  useEffect(() => {
    if (selectedLocation) {
      setActiveTab('record');
    }
  }, [selectedLocation]);
  
  // 面板位置和拖拽状态
  const [position, setPosition] = useState<PanelPosition>({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panelX: number; panelY: number } | null>(null);
  
  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panelX: position.x,
        panelY: position.y,
      };
      e.preventDefault();
    }
  }, [position]);
  
  // 处理拖拽中
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 360, dragStartRef.current.panelX + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - 200, dragStartRef.current.panelY + deltaY)),
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('分享链接已复制！');
    setShowShareDialog(false);
  };
  
  // 如果面板关闭，只显示一个浮动按钮
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-4 top-20 z-50 w-12 h-12 bg-[rgba(26,31,61,0.95)] border border-[rgba(76,201,240,0.3)] rounded-full flex items-center justify-center text-[#4cc9f0] hover:bg-[rgba(76,201,240,0.2)] transition-all shadow-lg"
      >
        <Globe className="w-5 h-5" />
      </button>
    );
  }
  
  // 最小化状态
  if (isMinimized) {
    return (
      <div
        className="fixed z-50"
        style={{ left: position.x, top: position.y }}
      >
        <div 
          className="bg-[rgba(26,31,61,0.95)] border border-[rgba(76,201,240,0.3)] rounded-xl backdrop-blur-xl shadow-2xl cursor-move"
          onMouseDown={handleDragStart}
        >
          <div className="drag-handle flex items-center gap-2 px-4 py-3">
            <GripVertical className="w-4 h-4 text-[#f0f2ff]/50" />
            <span className="text-[#f0f2ff] font-medium">旅行轨迹</span>
            <div className="flex-1" />
            <button 
              onClick={() => setIsMinimized(false)}
              className="p-1 text-[#f0f2ff]/50 hover:text-[#4cc9f0]"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onToggle}
              className="p-1 text-[#f0f2ff]/50 hover:text-[#f72585]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div
        className="fixed z-50"
        style={{ left: position.x, top: position.y, width: 360 }}
      >
        <div className="bg-[rgba(26,31,61,0.95)] border border-[rgba(76,201,240,0.3)] rounded-xl backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* 拖拽头部 */}
          <div 
            className="drag-handle flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#f72585]/20 to-[#4cc9f0]/20 border-b border-[rgba(76,201,240,0.2)] cursor-move"
            onMouseDown={handleDragStart}
          >
            <GripVertical className="w-4 h-4 text-[#f0f2ff]/50" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f72585] to-[#4cc9f0] flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-[#f0f2ff] font-bold text-sm">旅行轨迹星球</h1>
            </div>
            
            <button 
              onClick={() => setShowShareDialog(true)}
              className="p-1.5 text-[#f0f2ff]/50 hover:text-[#4cc9f0] transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-[#f0f2ff]/50 hover:text-[#4cc9f0] transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onToggle}
              className="p-1.5 text-[#f0f2ff]/50 hover:text-[#f72585] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* 标签页 */}
          <div className="px-4 pt-3">
            <div className="flex bg-[rgba(13,15,26,0.6)] rounded-lg p-1">
              <button
                onClick={() => setActiveTab('record')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs transition-all ${
                  activeTab === 'record' 
                    ? 'bg-[#f72585] text-white' 
                    : 'text-[#f0f2ff]/70 hover:text-[#f0f2ff]'
                }`}
              >
                <Plus className="w-3 h-3" />
                记录
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs transition-all ${
                  activeTab === 'timeline' 
                    ? 'bg-[#4cc9f0] text-white' 
                    : 'text-[#f0f2ff]/70 hover:text-[#f0f2ff]'
                }`}
              >
                <Clock className="w-3 h-3" />
                时间线
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs transition-all ${
                  activeTab === 'stats' 
                    ? 'bg-[#7209b7] text-white' 
                    : 'text-[#f0f2ff]/70 hover:text-[#f0f2ff]'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                统计
              </button>
            </div>
          </div>
          
          {/* 内容区域 */}
          <div className="p-4" style={{ height: 480 }}>
            {activeTab === 'record' && (
              <ScrollArea className="h-full">
                <div className="pr-2">
                  <TravelForm onSubmit={onAddRecord} onNavigate={onSelectLocation} />
                </div>
              </ScrollArea>
            )}
            
            {activeTab === 'timeline' && (
              <Timeline 
                records={records}
                onDelete={onDeleteRecord}
                onSelect={onSelectLocation}
              />
            )}
            
            {activeTab === 'stats' && (
              <StatisticsPanel statistics={statistics} getProvinceStats={getProvinceStats} />
            )}
          </div>
        </div>
      </div>
      
      {/* 分享对话框 */}
      {showShareDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowShareDialog(false)}>
          <div className="bg-[rgba(26,31,61,0.95)] border border-[rgba(76,201,240,0.3)] rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-[#f0f2ff] text-lg font-bold mb-4">分享你的旅行轨迹</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-[#f0f2ff]/70">分享链接</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-[rgba(13,15,26,0.6)] border-[rgba(76,201,240,0.3)] text-[#f0f2ff] text-xs"
                  />
                  <Button onClick={handleCopyShareUrl} className="bg-[#4cc9f0] hover:bg-[#4cc9f0]/80">
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-[#f0f2ff]/50 text-sm">
                复制链接分享给朋友，让他们也能看到你的旅行足迹！
              </p>
              <Button 
                onClick={() => setShowShareDialog(false)} 
                variant="outline"
                className="w-full border-[rgba(76,201,240,0.3)] text-[#f0f2ff]"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SidePanel;
