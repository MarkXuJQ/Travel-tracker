import { useState } from 'react';
import type { Journey, JourneyLocation } from '../data/travelConfig';
import LocationPicker from './LocationPicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  journeys: Journey[];
  addJourney: (journey: Omit<Journey, 'id'>) => void;
  deleteJourney: (id: string) => void;
  exportJourneys: () => void;
}

const emptyForm = (): Omit<Journey, 'id'> => ({
  title: '',
  date: '',
  locations: [],
  description: '',
  url: '',
});

export default function JourneyPanel({ isOpen, onClose, journeys, addJourney, deleteJourney, exportJourneys }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Journey, 'id'>>(emptyForm);

  const handleSubmit = () => {
    if (!form.title.trim() || form.locations.length === 0) return;
    addJourney({
      title: form.title.trim(),
      date: form.date || undefined,
      locations: form.locations,
      description: form.description?.trim() || undefined,
      url: form.url?.trim() || undefined,
    });
    setForm(emptyForm());
    setShowForm(false);
  };

  const setLocations = (locations: JourneyLocation[]) => setForm(f => ({ ...f, locations }));

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[2000] flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">我的旅程</h2>
        <button className="text-gray-400 hover:text-gray-600 p-1" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showForm ? (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
            {/* Title */}
            <input
              type="text"
              placeholder="旅程标题 *"
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />

            {/* Date (optional) */}
            <input
              type="date"
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none text-gray-600"
              value={form.date ?? ''}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />

            {/* Locations */}
            <div>
              <p className="text-xs text-gray-500 mb-1">地点 <span className="text-red-400">*</span>（可添加多个）</p>
              <LocationPicker value={form.locations} onChange={setLocations} />
            </div>

            {/* Description (optional) */}
            <textarea
              placeholder="备注（选填）"
              className="w-full p-2 border rounded text-sm h-20 focus:ring-2 focus:ring-blue-400 outline-none resize-none"
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />

            {/* URL (optional) */}
            <input
              type="url"
              placeholder="链接（选填，如博客、相册…）"
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={form.url ?? ''}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            />

            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                onClick={handleSubmit}
                disabled={!form.title.trim() || form.locations.length === 0}
              >
                保存
              </button>
              <button
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-300"
                onClick={() => { setForm(emptyForm()); setShowForm(false); }}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加新旅程
          </button>
        )}

        {/* Journey list */}
        <div className="space-y-3 mt-2">
          {journeys.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">还没有旅程记录，开始添加吧！</p>
          ) : (
            journeys.map(journey => (
              <JourneyCard key={journey.id} journey={journey} onDelete={deleteJourney} />
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
        <button
          className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors text-sm"
          onClick={exportJourneys}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出为 JSON 文件
        </button>
      </div>
    </div>
  );
}

const TYPE_COLOR: Record<JourneyLocation['type'], string> = {
  country: 'bg-blue-100 text-blue-700',
  province: 'bg-yellow-100 text-yellow-700',
  city: 'bg-orange-100 text-orange-700',
};

function JourneyCard({ journey, onDelete }: { journey: Journey; onDelete: (id: string) => void }) {
  return (
    <div className="p-3 border rounded-lg hover:shadow-md transition-shadow relative group bg-white">
      <button
        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(journey.id)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Title + optional link */}
      <h3 className="font-bold text-gray-800 pr-6 text-sm leading-snug">
        {journey.url ? (
          <a href={journey.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 underline-offset-2 hover:underline">
            {journey.title}
          </a>
        ) : journey.title}
      </h3>

      {/* Date */}
      {journey.date && (
        <p className="text-xs text-gray-400 mt-0.5">{journey.date}</p>
      )}

      {/* Location tags */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        {journey.locations.map(loc => (
          <span key={loc.name} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[loc.type]}`}>
            {loc.label}
          </span>
        ))}
      </div>

      {/* Description */}
      {journey.description && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2 border-t border-gray-100 pt-2">{journey.description}</p>
      )}
    </div>
  );
}
