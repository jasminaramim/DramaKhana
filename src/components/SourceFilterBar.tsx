import type { SourceType } from '../types';

export type SourceFilterValue = 'all' | SourceType;

interface SourceFilterBarProps {
  value: SourceFilterValue;
  onChange: (next: SourceFilterValue) => void;
  counts?: { all?: number; youtube?: number; own_upload?: number };
  sortValue?: 'latest' | 'popular';
  onSortChange?: (next: 'latest' | 'popular') => void;
}

export function SourceFilterBar({
  value,
  onChange,
  counts,
  sortValue,
  onSortChange,
}: SourceFilterBarProps) {
  const options: Array<{ key: SourceFilterValue; label: string; count?: number }> = [
    { key: 'all', label: 'All Videos', count: counts?.all },
    { key: 'youtube', label: 'YouTube', count: counts?.youtube },
    { key: 'own_upload', label: 'Own Upload', count: counts?.own_upload },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="inline-flex items-center gap-1 p-1 bg-[#1A211D] border border-white/10 rounded-lg">
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? opt.key === 'youtube'
                    ? 'bg-[#791F35] text-white'
                    : 'bg-[#087F5B] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span className="ml-1.5 font-mono tabular-nums opacity-80">({opt.count})</span>
              )}
            </button>
          );
        })}
      </div>

      {sortValue && onSortChange && (
        <div className="inline-flex items-center gap-1 p-1 bg-[#1A211D] border border-white/10 rounded-lg">
          <button
            type="button"
            onClick={() => onSortChange('latest')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              sortValue === 'latest' ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white'
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => onSortChange('popular')}
            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              sortValue === 'popular' ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white'
            }`}
          >
            Most Popular
          </button>
        </div>
      )}
    </div>
  );
}
