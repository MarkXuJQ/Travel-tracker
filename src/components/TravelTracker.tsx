import { Suspense, lazy } from 'react';

export type TravelTrackerMode = 'full' | 'plugin' | 'embed';

const TravelTrackerFull = lazy(() => import('./TravelTrackerFull'));
const TravelTrackerPlugin = lazy(() => import('./TravelTrackerPlugin'));

function TravelTrackerFallback() {
  return <div className="h-full w-full bg-transparent" />;
}

export default function TravelTracker({ mode = 'full' }: { mode?: TravelTrackerMode }) {
  return (
    <Suspense fallback={<TravelTrackerFallback />}>
      {mode === 'full' ? (
        <TravelTrackerFull />
      ) : (
        <TravelTrackerPlugin embedMode={mode === 'embed'} />
      )}
    </Suspense>
  );
}
