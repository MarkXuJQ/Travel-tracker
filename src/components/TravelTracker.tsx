import { useState } from 'react';
import { useJourneyStore } from '../hooks/useJourneyStore';
import TravelMap from './TravelMap';
import JourneyPanel from './JourneyPanel';

export default function TravelTracker() {
  const { journeys, addJourney, deleteJourney, exportJourneys } = useJourneyStore();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="w-full h-full relative">
      <TravelMap journeys={journeys} />

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
