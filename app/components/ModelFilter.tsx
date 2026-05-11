'use client';

import type { Category } from '@/data/types';

const COST_OPTIONS = [
  { label: 'Any price', value: null },
  { label: 'Under $8/M', value: 8 },
  { label: 'Under $12/M', value: 12 },
];

interface Props {
  categories: Category[];
  task: string;
  maxCost: number | null;
  onTaskChange: (t: string) => void;
  onMaxCostChange: (v: number | null) => void;
  onClear: () => void;
  hasFilters: boolean;
}

export default function ModelFilter({
  categories,
  task,
  maxCost,
  onTaskChange,
  onMaxCostChange,
  onClear,
  hasFilters,
}: Props) {
  return (
    <div className="model-filter">
      <div className="model-filter-search">
        <span className="model-filter-icon">⌕</span>
        <input
          type="text"
          className="model-filter-input"
          placeholder="What do you need a model for? (e.g. coding, reasoning)"
          value={task}
          onChange={(e) => onTaskChange(e.target.value)}
        />
        {hasFilters && (
          <button className="model-filter-clear" onClick={onClear} aria-label="Clear filters">
            ✕
          </button>
        )}
      </div>

      <div className="model-filter-chips">
        {categories.map((cat) => {
          const keyword = cat.name.split(' ')[0].toLowerCase();
          const active = task.toLowerCase().includes(keyword);
          return (
            <button
              key={cat.name}
              className={`model-filter-chip ${active ? 'model-filter-chip-active' : ''}`}
              style={active ? { borderColor: cat.color, color: cat.color } : {}}
              onClick={() => onTaskChange(active ? '' : keyword)}
            >
              {cat.name}
            </button>
          );
        })}
        <div className="model-filter-divider" />
        {COST_OPTIONS.map((opt) => {
          const active = maxCost === opt.value;
          return (
            <button
              key={opt.label}
              className={`model-filter-chip ${active ? 'model-filter-chip-active' : ''}`}
              style={active ? { borderColor: '#6366F1', color: '#6366F1' } : {}}
              onClick={() => onMaxCostChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
