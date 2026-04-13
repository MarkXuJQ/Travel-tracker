import { useState, useEffect } from 'react';
import { travelConfig, type Journey } from '../data/travelConfig';

const STORAGE_KEY = 'travel_globe_journeys';

function loadFromStorage(): Journey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : travelConfig.journeys;
  } catch {
    return travelConfig.journeys;
  }
}

export function useJourneyStore() {
  const [journeys, setJourneys] = useState<Journey[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journeys));
  }, [journeys]);

  const addJourney = (journey: Omit<Journey, 'id'>) => {
    const newJourney: Journey = { ...journey, id: crypto.randomUUID() };
    setJourneys(prev => [newJourney, ...prev]);
  };

  const deleteJourney = (id: string) => {
    setJourneys(prev => prev.filter(j => j.id !== id));
  };

  const exportJourneys = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(journeys, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'my_journeys.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return { journeys, addJourney, deleteJourney, exportJourneys };
}
