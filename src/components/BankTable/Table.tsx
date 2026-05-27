import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BankData } from '../../interfaces/bank.interfaces';
import Row from './Row';
import './TableStyles.css';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { DatePicker } from 'antd';
import { InputNumber } from 'antd';
import type { Filters } from '../../interfaces/bank.interfaces';
import { Button, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';

export default function Table() {
  const [displayItems, setDisplayItems] = useState<BankData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const allDataRef = useRef<BankData[]>([]);
  const pointerRef = useRef(0);
  const CHUNK_SIZE = 2000;

  const [filteredItems, setFilteredItems] = useState<BankData[]>([]);
  const initialKeyword = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('search') ?? '') : '';
  const [search, setSearch] = useState(initialKeyword);
  const [inputValue, setInputValue] = useState(initialKeyword);
  const debounceTimeout = useRef<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    fromDate: '',
    toDate: '',
    minValue: null,
    maxValue: null,
  });

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { RangePicker } = DatePicker;

  const inputRef = useRef<HTMLInputElement | null>(null);

  // auto focus
  useEffect(() => {
    if (!loadingInitial && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loadingInitial]);

  // search and filter
  const applySearchAndFilters = useCallback(() => {
    let nextItems = allDataRef.current;

    if (filters.fromDate) {
      const fromTimestamp = new Date(filters.fromDate).getTime();
      nextItems = nextItems.filter(item => item.timestamp! >= fromTimestamp);
    }

    if (filters.toDate) {
      const toTimestamp = new Date(filters.toDate).getTime();
      nextItems = nextItems.filter(item => item.timestamp! <= toTimestamp);
    }

    const minValue = filters.minValue;
    if (minValue !== null) {
      nextItems = nextItems.filter(item => item.Value >= minValue);
    }

    const maxValue = filters.maxValue;
    if (maxValue !== null) {
      nextItems = nextItems.filter(item => item.Value <= maxValue);
    }

    const keywords = search.trim().toLowerCase();
    if (keywords !== '') {
      nextItems = nextItems.filter(item => {
        return (
          item.Domain.toLowerCase().includes(keywords) ||
          item.Location.toLowerCase().includes(keywords)
        );
      });
    }

    setFilteredItems(nextItems);
    setDisplayItems(nextItems.slice(0, CHUNK_SIZE));
    pointerRef.current = Math.min(CHUNK_SIZE, nextItems.length);
  }, [filters, search]);

  const loadMoreData = useCallback(() => {
    const currentPointer = pointerRef.current;

    if (currentPointer >= filteredItems.length) {
      return;
    }

    const nextPointer = currentPointer + CHUNK_SIZE;
    
    const newChunk = filteredItems.slice(currentPointer, nextPointer);
    
    if (newChunk.length > 0) {
      setDisplayItems(prev => [...prev, ...newChunk]);
      pointerRef.current = nextPointer; 
    }
  }, [filteredItems]);

  // fetch data
  useEffect(() => {
    const fetchBigData = async () => {
      try {
        setLoadingInitial(true);

        const dataUrl = '/data.json';
        const response = await fetch(dataUrl);
        const parsedData = await response.json();
        const parsedDataWithIds = parsedData.map((item: BankData, index: number) => {
          const utcDays = Math.floor(item.Date - 25569);
          const date = new Date(utcDays * 86400 * 1000);

          return {
            ...item,
            id: index + 1,
            parsedDate: date,
            timestamp: date.getTime(), 
          };
        });
        
        allDataRef.current = parsedDataWithIds; 
        setFilteredItems(parsedDataWithIds);
        
        setDisplayItems(parsedDataWithIds.slice(0,CHUNK_SIZE));

        pointerRef.current = CHUNK_SIZE;
      } catch (error) {
        console.error("Lỗi khi đọc file JSON:", error);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchBigData();
  }, []);

  // debounce search
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setInputValue(value);

    if(debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = window.setTimeout(() => {
      setSearch(value);
      try {
        const params = new URLSearchParams(window.location.search);
        if (value) params.set('search', value);
        else params.delete('search');
        const qs = params.toString();
        const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      } catch {
          // ignore
      }
      console.log('Search triggered for:', value);
    }, 500);
  } 

  useEffect(() => {
    applySearchAndFilters();
  }, [applySearchAndFilters]);

  // sync when browser history changes 
  useEffect(() => {
    const handlePop = () => {
      const k = (new URLSearchParams(window.location.search).get('search')) ?? '';
      setInputValue(k);
      setSearch(k);
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Hàm kích hoạt khi cuộn gần hết 2000 dòng hiện tại
  const handleRowsRendered = useCallback(({ stopIndex: visibleStopIndex }: { stopIndex: number }) => {
    if (
      visibleStopIndex >= displayItems.length - 200 && 
      displayItems.length < filteredItems.length
    ) {
      loadMoreData();
    }
  }, [displayItems.length, filteredItems.length, loadMoreData]);

  const handleDragEnd = ( event: DragEndEvent ) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const sorted = [...displayItems].sort(
      (a, b) => a.order - b.order
    );

    const oldIndex = sorted.findIndex(
      item => item.id === active.id
    );

    const newIndex = sorted.findIndex(
      item => item.id === over.id
    );

    const reordered = arrayMove(
      sorted,
      oldIndex,
      newIndex
    );

    const movedItem = reordered[newIndex];

    const prevItem = reordered[newIndex - 1];
    const nextItem = reordered[newIndex + 1];

    const newOrder = getNewOrder(
      prevItem?.order,
      nextItem?.order
    );

    setDisplayItems(prev =>
      prev.map(item => item.id === movedItem.id
        ? {
            ...item,
            order: newOrder
          }
        : item
      )
    );
  };

  // sort display items by order before rendering
  const sortedDisplayItems = useMemo(() => {
    return [...displayItems].sort(
      (a, b) => a.order - b.order
    );
  }, [displayItems]);

  const rowVirtualizer = useVirtualizer({
    count: sortedDisplayItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 46,
    overscan: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const lastVirtualRow = virtualRows[virtualRows.length - 1];

  useEffect(() => {
    if (!lastVirtualRow) {
      return;
    }

    handleRowsRendered({ stopIndex: lastVirtualRow.index });
  }, [handleRowsRendered, lastVirtualRow]);

  const getNewOrder = (
    prevOrder?: number,
    nextOrder?: number
  ) => {
    if (prevOrder == null && nextOrder != null) {
      return nextOrder - 1000;
    }

    if (prevOrder != null && nextOrder == null) {
      return prevOrder + 1000;
    }

    return (prevOrder! + nextOrder!) / 2;
  };
 
  if (loadingInitial) {
    return <div className="loading-screen">Đang tải dữ liệu...</div>;
  }

  return (
    <>
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
              minValue: typeof value === 'number' ? value : null
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
              maxValue: typeof value === 'number' ? value : null
            }))
          }
        />

        <Tooltip title="Reset filters">
          <Button 
            onClick={() => {
              setFilters({
                fromDate: '',
                toDate: '',
                minValue: null,
                maxValue: null,
              });
              setInputValue('');
              setSearch('');
              setDateRange(null);
              try {
                const params = new URLSearchParams(window.location.search);
                params.delete('keyword');
                const qs = params.toString();
                const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
                window.history.replaceState(null, '', newUrl);
              } catch {
                // ignore
              }
            }}
          >
            Reset
          </Button>
        </Tooltip>
      </div>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <div className="table-container">
          <div className="table-header">
            <div className="col">ID</div>
            <div className="col">Ngày</div>
            <div className="col">Domain</div>
            <div className="col">Vị trí</div>
            <div className="col align-right">Doanh thu</div>
            <div className="col align-right">Số giao dịch</div>
          </div>

          <SortableContext
            items={sortedDisplayItems.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
          <div ref={parentRef} className="table-body">
            <div
              className="table-viewport"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {virtualRows.map(virtualRow => {
                const item = sortedDisplayItems[virtualRow.index];

                if(!item) return null;

                return (
                  <Row
                    key={item.id}
                    item={item}
                    style={{
                      position: 'absolute',
                      top: virtualRow.start,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                    }}
                  />
                );
              })}
            </div>
          </div>
          </SortableContext>
        </div>
      </DndContext>
    </>
  );
}