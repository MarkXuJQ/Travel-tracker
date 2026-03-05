import { writable, derived } from 'svelte/store';
import { travelConfig, type Journey } from '../data/travelConfig';
import { browser } from '$app/environment';

const STORAGE_KEY = 'travel_globe_journeys';

// Initialize from localStorage if available, otherwise use default config
const initialJourneys = browser 
  ? JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(travelConfig.journeys))
  : travelConfig.journeys;

export const journeyStore = writable<Journey[]>(initialJourneys);

// Save to localStorage whenever the store changes
if (browser) {
  journeyStore.subscribe(value => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });
}

export const addJourney = (journey: Omit<Journey, 'id'>) => {
  const newJourney = {
    ...journey,
    id: crypto.randomUUID()
  };
  journeyStore.update(js => [newJourney, ...js]);
};

export const deleteJourney = (id: string) => {
  journeyStore.update(js => js.filter(j => j.id !== id));
};

export const exportJourneys = () => {
  journeyStore.subscribe(value => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(value, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_journeys.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }).unsubscribe();
};
