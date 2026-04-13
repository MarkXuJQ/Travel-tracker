import { IoAirplane, IoAirplaneOutline } from 'react-icons/io5';
import { TbTrain, TbTrainFilled } from 'react-icons/tb';
import type { JourneyTransportMode } from '../types/journey';

interface Props {
  mode: JourneyTransportMode;
  className?: string;
  tone?: 'light' | 'dark';
}

export default function TransportModeIcon({
  mode,
  className,
  tone = 'light',
}: Props) {
  if (mode === 'flight') {
    const FlightIcon = tone === 'dark' ? IoAirplane : IoAirplaneOutline;
    return <FlightIcon className={className} />;
  }

  if (mode === 'train') {
    const TrainIcon = tone === 'dark' ? TbTrainFilled : TbTrain;
    return <TrainIcon className={className} />;
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 18h14M7 15.5l3.2-7a1 1 0 011.82 0L15 15.5" />
      <circle cx="7" cy="18" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="18" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
