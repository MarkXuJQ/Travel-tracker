import { Analytics } from '@vercel/analytics/react';
import TravelTracker from './components/TravelTracker';

function App() {
  return (
    <div className="w-full h-full">
      <TravelTracker />
      <Analytics />
    </div>
  );
}

export default App;
