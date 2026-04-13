import { useState } from 'react';
import { useJourneyStore } from '../hooks/useJourneyStore';
import TravelMap from './TravelMap';
import JourneyPanel from './JourneyPanel';
import type { Journey } from '../data/travelConfig';

export default function TravelTracker() {
  const { journeys, addJourney, deleteJourney, exportJourneys } = useJourneyStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);

  return (
    <div className="w-full h-full relative">
      <TravelMap journeys={journeys} onMarkerClick={setSelectedJourney} />

      {/* Toggle panel button */}
      <button
        className="absolute top-4 right-4 z-[1000] bg-white shadow-md rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-50 border border-gray-200"
        onClick={() => setPanelOpen(o => !o)}
        title="旅程列表"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>

      {/* Journey popup on marker click */}
      {selectedJourney && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-2xl p-4 min-w-[260px] border border-gray-100">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={() => setSelectedJourney(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="font-bold text-blue-700 text-base pr-5">{selectedJourney.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span>📅 {selectedJourney.date}</span>
            <span>📍 {selectedJourney.location}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2 border-t pt-2">{selectedJourney.description}</p>
        </div>
      )}

      <JourneyPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        journeys={journeys}
        addJourney={addJourney}
        deleteJourney={deleteJourney}
        exportJourneys={exportJourneys}
      />
    </div>
  );
}
