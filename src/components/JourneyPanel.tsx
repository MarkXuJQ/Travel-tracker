import { useState } from 'react';
import type { Journey } from '../data/travelConfig';

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
  date: new Date().toISOString().split('T')[0],
  location: '',
  description: '',
  coordinates: undefined,
});

export default function JourneyPanel({ isOpen, onClose, journeys, addJourney, deleteJourney, exportJourneys }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Journey, 'id'>>(emptyForm);

  const handleSubmit = () => {
    if (form.title && form.location) {
      addJourney(form);
      setForm(emptyForm());
      setShowForm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[2000] flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
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
            <input
              type="text"
              placeholder="旅程标题"
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <input
              type="date"
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <input
              type="text"
              placeholder="地点 (如：成都)"
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
            <textarea
              placeholder="简单描述一下..."
              className="w-full p-2 border rounded text-sm h-20 focus:ring-2 focus:ring-blue-400 outline-none resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700"
                onClick={handleSubmit}
              >
                保存
              </button>
              <button
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-300"
                onClick={() => setShowForm(false)}
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

        <div className="space-y-3 mt-6">
          {journeys.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">还没有旅程记录，开始添加吧！</p>
          ) : (
            journeys.map(journey => (
              <div key={journey.id} className="p-3 border rounded-lg hover:shadow-md transition-shadow relative group">
                <button
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteJourney(journey.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <h3 className="font-bold text-gray-800 pr-6">{journey.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{journey.date}</span>
                  <span>@{journey.location}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{journey.description}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <button
          className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors text-sm"
          onClick={exportJourneys}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出为 JSON 文件
        </button>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          导出的文件可手动更新至 travelConfig.ts 以永久保存。
        </p>
      </div>
    </div>
  );
}
