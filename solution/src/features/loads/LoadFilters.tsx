import type { BoardFilters } from './useLoadFilters';

const STATUSES = ['AVAILABLE', 'BOOKED', 'IN_TRANSIT', 'DELIVERED'];
const EQUIPMENT = ['DRY_VAN', 'REEFER', 'FLATBED'];
const ORIGIN_STATES = [
  'AR', 'AZ', 'CA', 'CO', 'GA', 'ID', 'IL', 'IN', 'KY', 'MO',
  'NC', 'NE', 'NM', 'OH', 'OR', 'TN', 'TX', 'UT',
];

interface Props {
  filters: BoardFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (changes: Partial<BoardFilters>) => void;
}

export const LoadFilters = ({ filters, searchInput, onSearchChange, onFilterChange }: Props) => (
  <div className="toolbar">
    <input
      type="search"
      placeholder="Search city or load id…"
      value={searchInput}
      onChange={(e) => onSearchChange(e.target.value)}
      aria-label="Search loads"
    />
    <select
      value={filters.status}
      onChange={(e) => onFilterChange({ status: e.target.value })}
      aria-label="Status filter"
    >
      <option value="">Any status</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace('_', ' ')}
        </option>
      ))}
    </select>
    <select
      value={filters.originState}
      onChange={(e) => onFilterChange({ originState: e.target.value })}
      aria-label="Origin state filter"
    >
      <option value="">Any origin state</option>
      {ORIGIN_STATES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
    <select
      value={filters.equipment}
      onChange={(e) => onFilterChange({ equipment: e.target.value })}
      aria-label="Equipment filter"
    >
      <option value="">Any equipment</option>
      {EQUIPMENT.map((s) => (
        <option key={s} value={s}>
          {s.replace('_', ' ')}
        </option>
      ))}
    </select>
  </div>
);
