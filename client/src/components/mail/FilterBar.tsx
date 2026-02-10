import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { useMailStore } from '@/store';
import { Search, X, Mail, MailOpen } from 'lucide-react';

interface FilterBarProps {
  onFilterChange: () => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const { activeFilter, setFilter, clearFilter } = useMailStore();
  const [searchQuery, setSearchQuery] = useState(activeFilter.query || '');

  // Sync local state when store filter changes (e.g. from AI actions)
  useEffect(() => {
    setSearchQuery(activeFilter.query || '');
  }, [activeFilter.query]);

  const hasActiveFilters = !!(
    activeFilter.query ||
    activeFilter.dateFrom ||
    activeFilter.dateTo ||
    activeFilter.isUnread ||
    activeFilter.datePreset
  );

  const handleSearch = () => {
    setFilter({ ...activeFilter, query: searchQuery || undefined });
    onFilterChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const applyDatePreset = (preset: 'today' | 'week' | 'month') => {
    // If already active, toggle off
    if (activeFilter.datePreset === preset) {
      setFilter({ ...activeFilter, dateFrom: undefined, dateTo: undefined, datePreset: null });
      onFilterChange();
      return;
    }

    const today = new Date();
    let dateFrom: string;
    
    switch (preset) {
      case 'today':
        dateFrom = formatDate(today);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        dateFrom = formatDate(weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        dateFrom = formatDate(monthAgo);
        break;
    }

    setFilter({ 
      ...activeFilter, 
      dateFrom,
      dateTo: undefined,
      datePreset: preset,
    });
    onFilterChange();
  };

  const handleDateFromChange = (value: string | undefined) => {
    setFilter({
      ...activeFilter,
      dateFrom: value,
      datePreset: null,
    });
    onFilterChange();
  };

  const handleDateToChange = (value: string | undefined) => {
    setFilter({
      ...activeFilter,
      dateTo: value,
      datePreset: null,
    });
    onFilterChange();
  };

  const toggleUnread = () => {
    setFilter({ ...activeFilter, isUnread: !activeFilter.isUnread });
    onFilterChange();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    clearFilter();
    onFilterChange();
  };

  const getPresetButtonVariant = (preset: 'today' | 'week' | 'month') => {
    return activeFilter.datePreset === preset ? 'default' : 'outline';
  };

  return (
    <div className="border-b border-border bg-card/50 p-3 space-y-3">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-4"
          />
        </div>
        <Button onClick={handleSearch} size="sm">
          Search
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Presets */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-1">Date:</span>
          <Button
            variant={getPresetButtonVariant('today')}
            size="sm"
            onClick={() => applyDatePreset('today')}
          >
            Today
          </Button>
          <Button
            variant={getPresetButtonVariant('week')}
            size="sm"
            onClick={() => applyDatePreset('week')}
          >
            Last 7 days
          </Button>
          <Button
            variant={getPresetButtonVariant('month')}
            size="sm"
            onClick={() => applyDatePreset('month')}
          >
            Last 30 days
          </Button>
        </div>

        {/* Custom Date Range with DatePicker */}
        <div className="flex items-center gap-1">
          <DatePicker
            value={activeFilter.datePreset ? undefined : activeFilter.dateFrom}
            onChange={handleDateFromChange}
            placeholder="From"
          />
          <span className="text-muted-foreground">-</span>
          <DatePicker
            value={activeFilter.dateTo}
            onChange={handleDateToChange}
            placeholder="To"
          />
        </div>

        {/* Unread Filter */}
        <Button
          variant={activeFilter.isUnread ? 'default' : 'outline'}
          size="sm"
          onClick={toggleUnread}
          className="gap-2"
        >
          {activeFilter.isUnread ? (
            <MailOpen className="h-4 w-4" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          Unread only
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper function to format date for Gmail query
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
