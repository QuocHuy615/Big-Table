import { forwardRef } from 'react';
import { Button, InputNumber, DatePicker, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import type { Filters } from '../../interfaces/bank.interfaces';

interface SearchFilterHeaderProps {
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  setDateRange: (value: [Dayjs | null, Dayjs | null] | null) => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onReset: () => void;
}

const SearchFilterHeader = forwardRef<HTMLInputElement, SearchFilterHeaderProps>(function SearchFilterHeader(
  {
    inputValue,
    onInputChange,
    dateRange,
    setDateRange,
    filters,
    setFilters,
    onReset,
  },
  inputRef,
) {
  const { RangePicker } = DatePicker;

  return (
    <div className="search-container">
      <input
        ref={inputRef}
        type="text"
        placeholder="search"
        value={inputValue}
        onChange={onInputChange}
        className="search-input"
      />

      <RangePicker
        style={{ marginLeft: 16 }}
        value={dateRange}
        onChange={(dates, dateStrings) => {
          setDateRange(dates);
          if (!dates) {
            setFilters(prev => ({
              ...prev,
              fromDate: '',
              toDate: '',
            }));
            return;
          }

          setFilters(prev => ({
            ...prev,
            fromDate: dateStrings[0],
            toDate: dateStrings[1],
          }));
        }}
      />

      <InputNumber
        placeholder="Min value"
        min={0}
        value={filters.minValue !== null ? filters.minValue : undefined}
        onChange={(value) =>
          setFilters(prev => ({
            ...prev,
            minValue: typeof value === 'number' ? value : null,
          }))
        }
      />

      <InputNumber
        placeholder="Max value"
        min={0}
        value={filters.maxValue !== null ? filters.maxValue : undefined}
        onChange={(value) =>
          setFilters(prev => ({
            ...prev,
            maxValue: typeof value === 'number' ? value : null,
          }))
        }
      />

      <Tooltip title="Reset filters">
        <Button onClick={onReset}>Reset</Button>
      </Tooltip>
    </div>
  );
});

export default SearchFilterHeader;
