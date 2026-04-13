import { useState, useRef, useEffect } from 'react';
import { searchLocations } from '../data/locationData';
import type { LocationOption } from '../data/locationData';
import type { JourneyLocation } from '../data/travelConfig';

interface Props {
  value: JourneyLocation[];
  onChange: (locations: JourneyLocation[]) => void;
}

const TYPE_LABEL: Record<JourneyLocation['type'], string> = {
  country: '国家',
  province: '省',
  city: '市',
};

const TYPE_COLOR: Record<JourneyLocation['type'], string> = {
  country: 'bg-blue-100 text-blue-700',
  province: 'bg-yellow-100 text-yellow-700',
  city: 'bg-orange-100 text-orange-700',
};

export default function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationOption[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(searchLocations(query));
    setOpen(query.trim().length > 0);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (opt: LocationOption) => {
    if (value.some(v => v.name === opt.name)) return; // no duplicate
    onChange([...value, { type: opt.type, name: opt.name, label: opt.label, coords: opt.coords }]);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (name: string) => onChange(value.filter(v => v.name !== name));

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(loc => (
            <span
              key={loc.name}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLOR[loc.type]}`}
            >
              <span className="opacity-60">{TYPE_LABEL[loc.type]}</span>
              {loc.label}
              <button
                type="button"
                className="ml-0.5 hover:opacity-70"
                onClick={() => remove(loc.name)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索城市、省份或国家..."
          className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
        />

        {/* Dropdown */}
        {open && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {suggestions.map(opt => (
              <button
                key={opt.name}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                onMouseDown={e => { e.preventDefault(); select(opt); }}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${TYPE_COLOR[opt.type]}`}>
                  {TYPE_LABEL[opt.type]}
                </span>
                <span className="font-medium">{opt.label}</span>
                {opt.label !== opt.name && (
                  <span className="text-gray-400 text-xs truncate">{opt.name}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {open && query.trim() && suggestions.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
            未找到匹配的地点
          </div>
        )}
      </div>
    </div>
  );
}
