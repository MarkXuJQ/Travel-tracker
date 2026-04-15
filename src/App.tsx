import TravelTracker, { type TravelTrackerMode } from './components/TravelTracker';
import { Analytics } from '@vercel/analytics/react';

function App() {
  const mode: TravelTrackerMode = (() => {
    if (typeof window === 'undefined') return 'full';

    const searchParams = new URLSearchParams(window.location.search);
    const variant = searchParams.get('variant');

    if (searchParams.get('embed') === '1') return 'embed';
    if (variant === 'plugin' || searchParams.get('public') === '1') return 'plugin';

    return 'full';
  })();

  return (
    <div className="w-full h-full">
      <TravelTracker mode={mode} />
      <Analytics />
    </div>
  );
}

export default App;
