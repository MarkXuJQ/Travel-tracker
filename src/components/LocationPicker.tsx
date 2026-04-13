import { useEffect, useRef, useState } from 'react';
import { searchLocations } from '../data/locationData';
import type { LocationOption } from '../data/locationData';
import type { JourneyLocation } from '../types/journey';

interface Props {
  value: JourneyLocation[];
  onChange: (locations: JourneyLocation[]) => void;
}

const TYPE_LABEL: Record<JourneyLocation['type'], string> = {
  country: '国家',
  province: '省份',
  city: '城市',
};

const TYPE_DOT: Record<JourneyLocation['type'], string> = {
  country: 'bg-slate-500',
  province: 'bg-stone-400',
  city: 'bg-sky-500/70',
};

export default function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationOption[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(searchLocations(query));
    setOpen(query.trim().length > 0);
  }, [query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (option: LocationOption) => {
    if (value.some(item => item.name === option.name)) return;

    onChange([
      ...value,
      { type: option.type, name: option.name, label: option.label, coords: option.coords },
    ]);

    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (name: string) => onChange(value.filter(item => item.name !== name));

  return (
    <div ref={wrapperRef} className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(location => (
            <span
              key={location.name}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/85 px-3 py-1.5 text-sm text-stone-700 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.5)]"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[location.type]}`} />
              <span className="text-[10px] uppercase tracking-[0.22em] text-stone-400">{TYPE_LABEL[location.type]}</span>
              <span>{location.label}</span>
              <button
                type="button"
                className="ml-1 text-stone-400 transition hover:text-stone-900"
                onClick={() => remove(location.name)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索城市、省份或国家"
          className="w-full rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-stone-900"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
        />

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[22px] border border-stone-200 bg-[#fcfbf8] shadow-[0_22px_40px_-28px_rgba(15,23,42,0.45)]">
            {suggestions.length > 0 ? (
              <div className="max-h-56 overflow-y-auto p-2">
                {suggestions.map(option => (
                  <button
                    key={option.name}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-stone-100/80"
                    onMouseDown={event => {
                      event.preventDefault();
                      select(option);
                    }}
                  >
                    <span className={`h-2 w-2 rounded-full ${TYPE_DOT[option.type]} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.24em] text-stone-400">
                          {TYPE_LABEL[option.type]}
                        </span>
                        <span className="truncate text-sm text-stone-800">{option.label}</span>
                      </div>
                      {option.label !== option.name && (
                        <p className="mt-1 truncate text-xs text-stone-500">{option.name}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-stone-500">没有找到对应地点，可以换一个关键词试试。</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
