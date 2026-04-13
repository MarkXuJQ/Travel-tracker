export type Granularity = 'country' | 'province' | 'city';

interface Props {
  value: Granularity;
  onChange: (g: Granularity) => void;
}

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'country', label: '国家' },
  { value: 'province', label: '省级' },
  { value: 'city', label: '市级' },
];

export default function GranularityControl({ value, onChange }: Props) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
      {OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'px-3 py-1.5 text-sm font-medium transition-colors',
            i > 0 ? 'border-l border-gray-200' : '',
            value === opt.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
