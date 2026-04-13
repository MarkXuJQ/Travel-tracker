import { useEffect, useState } from 'react';
import type { JourneyLocation } from '../types/journey';
import type { BaseMapMode } from './TravelMap';
import LocationPicker from './LocationPicker';

interface Props {
  isOpen: boolean;
  baseMap: BaseMapMode;
  showProvinceHighlights: boolean;
  birthplace: JourneyLocation | null;
  onClose: () => void;
  onBaseMapChange: (mode: BaseMapMode) => void;
  onProvinceHighlightChange: (enabled: boolean) => void;
  onBirthplaceChange: (birthplace: JourneyLocation | null) => void;
}

const BASE_MAP_OPTIONS: Array<{ key: BaseMapMode; label: string; description: string }> = [
  { key: 'liberty', label: '彩色', description: '层次更丰富，适合日间浏览。' },
  { key: 'bright', label: '明亮', description: '信息更清爽，适合查看路线。' },
  { key: 'night', label: '夜间', description: '纯黑夜景，更适合暗光环境。' },
];

export default function SettingsModal({
  isOpen,
  baseMap,
  showProvinceHighlights,
  birthplace,
  onClose,
  onBaseMapChange,
  onProvinceHighlightChange,
  onBirthplaceChange,
}: Props) {
  const [isEditingHometown, setIsEditingHometown] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditingHometown(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsEditingHometown(false);
  }, [birthplace]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="关闭设置"
        className="fixed inset-0 z-[2150] bg-slate-950/34 backdrop-blur-[8px]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 sm:p-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="设置"
          className="relative w-full max-w-[38rem] overflow-hidden border border-stone-200/80 bg-[#f6f1e8] text-stone-800 shadow-[0_36px_90px_-40px_rgba(15,23,42,0.45)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.04)_24%,rgba(255,255,255,0)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0)_38%)]" />

          <div className="relative flex items-start justify-between border-b border-stone-200/80 px-6 py-6 sm:px-7">
            <div className="max-w-[28rem]">
              <p className="text-[10px] uppercase tracking-[0.34em] text-stone-500">Settings</p>
              <h2 className="font-editorial mt-3 text-[2rem] leading-none text-stone-900">地图与记录设置</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                把底图、家乡和省域显示放到同一个地方，后续想调整时会更直观。
              </p>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white/82 text-stone-500 transition hover:border-stone-300 hover:text-stone-900"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative space-y-6 px-6 py-6 sm:px-7">
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4 border-b border-stone-200/70 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Base Map</p>
                  <h3 className="mt-2 text-base font-medium text-stone-900">地图图层</h3>
                </div>
                <p className="max-w-[13rem] text-right text-xs leading-5 text-stone-500">
                  选择最适合当前浏览环境的底图。
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {BASE_MAP_OPTIONS.map(option => {
                  const selected = option.key === baseMap;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        selected
                          ? 'border-stone-900 bg-stone-900 text-white shadow-[0_14px_24px_-22px_rgba(15,23,42,0.55)]'
                          : 'border-stone-200 bg-white/82 text-stone-700 hover:border-stone-300 hover:bg-white'
                      }`}
                      onClick={() => onBaseMapChange(option.key)}
                      aria-pressed={selected}
                    >
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className={`mt-2 text-xs leading-5 ${selected ? 'text-stone-200' : 'text-stone-500'}`}>
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-4 border-b border-stone-200/70 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Province Glow</p>
                  <h3 className="mt-2 text-base font-medium text-stone-900">省域高亮</h3>
                </div>

                <button
                  type="button"
                  className={`inline-flex h-10 items-center rounded-full border px-4 text-sm transition ${
                    showProvinceHighlights
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                  onClick={() => onProvinceHighlightChange(!showProvinceHighlights)}
                  aria-pressed={showProvinceHighlights}
                >
                  {showProvinceHighlights ? '已开启' : '已关闭'}
                </button>
              </div>

              <p className="text-sm leading-6 text-stone-600">
                添加某省第一座城市时，会自动把对应省域用更淡的颜色点亮。这里可以随时开关。
              </p>
            </section>

            <section className="space-y-3">
              <div className="border-b border-stone-200/70 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Hometown</p>
                  <h3 className="mt-2 text-base font-medium text-stone-900">家乡</h3>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white/72 px-4 py-3">
                <p className="text-sm text-stone-600">
                  家乡：
                  <span className="ml-1 text-base text-stone-900">
                    {birthplace?.label ?? '暂未设置'}
                  </span>
                </p>

                <button
                  type="button"
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition ${
                    isEditingHometown
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
                  }`}
                  onClick={() => setIsEditingHometown(current => !current)}
                  aria-pressed={isEditingHometown}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.862 4.487a1.875 1.875 0 112.651 2.651L8.25 18.401 4 19.5l1.099-4.25L16.862 4.487z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 6.75l2.25 2.25" />
                  </svg>
                  <span>{birthplace ? '修改' : '设置'}</span>
                </button>
              </div>

              {isEditingHometown && (
                <div className="rounded-2xl border border-stone-200/80 bg-white/72 px-4 py-4">
                  <LocationPicker
                    value={birthplace ? [birthplace] : []}
                    onChange={locations => onBirthplaceChange(locations[0] ?? null)}
                    allowedTypes={['country', 'city']}
                    maxSelections={1}
                    placeholder="一次搜索并选择你的家乡城市或国家"
                    helperText={null}
                    showOrderHint={false}
                    compact
                  />
                </div>
              )}

              <p className="text-xs leading-5 text-stone-500">
                家乡不会生成旅程记录，只用来保留起点所在国家的原始底图。
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
