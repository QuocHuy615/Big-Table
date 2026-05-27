import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BankData } from '../../interfaces/bank.interfaces';
import Row from './Row';
import './TableStyles.css';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { Filters } from '../../interfaces/bank.interfaces';
import useSearchParam from '../../hooks/useSearchParam';
import type { Dayjs } from 'dayjs';
import SearchFilterHeader from './SearchFilterHeader';
import {
  DEFAULT_FILTERS,
  applyFiltersToData,
  buildUrlFromState,
  getDateRangeFromFilters,
  getFiltersFromUrl,
  parseNumberParam,
} from '../../utils/bankTableParams';

export default function Table() {
  const [displayItems, setDisplayItems] = useState<BankData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const allDataRef = useRef<BankData[]>([]);
  const pointerRef = useRef(0);
  const CHUNK_SIZE = 2000;

  const [filteredItems, setFilteredItems] = useState<BankData[]>([]);
  const { inputValue, search, setInputValue, setSearch, onInputChange } = useSearchParam('search', 500);
  const initialFilters = getFiltersFromUrl();
  const [filters, setFilters] = useState<Filters>(() => initialFilters);

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => getDateRangeFromFilters(initialFilters));

  const inputRef = useRef<HTMLInputElement | null>(null);
  const filtersRef = useRef(filters);
  const searchRef = useRef(search);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextUrl = buildUrlFromState(search, filters);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [filters, search]);

  const syncStateFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const nextFilters = {
      fromDate: params.get('fromDate') ?? '',
      toDate: params.get('toDate') ?? '',
      minValue: parseNumberParam(params.get('minValue')),
      maxValue: parseNumberParam(params.get('maxValue')),
    } satisfies Filters;

    const nextSearch = params.get('search') ?? '';

    setInputValue(nextSearch);
    setSearch(nextSearch);
    setFilters(nextFilters);
    setDateRange(getDateRangeFromFilters(nextFilters));
  }, [setInputValue, setSearch]);

  // auto focus input search
  useEffect(() => {
    if (!loadingInitial && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loadingInitial]);

  useEffect(() => {
    const handlePopState = () => {
      syncStateFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncStateFromUrl]);

  // search and filter
  const applySearchAndFilters = useCallback(() => {
    const nextItems = applyFiltersToData(allDataRef.current, filters, search);

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
        const nextItems = applyFiltersToData(parsedDataWithIds, filtersRef.current, searchRef.current);

        setFilteredItems(nextItems);
        setDisplayItems(nextItems.slice(0, CHUNK_SIZE));
        pointerRef.current = Math.min(CHUNK_SIZE, nextItems.length);
      } catch (error) {
        console.error("Lỗi khi đọc file JSON:", error);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchBigData();
  }, []);

  useEffect(() => {
    applySearchAndFilters();
  }, [applySearchAndFilters]);


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

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setInputValue('');
    setSearch('');
    setDateRange(null);
  };
 
  if (loadingInitial) {
    return <div className="loading-screen">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <SearchFilterHeader
        ref={inputRef}
        inputValue={inputValue}
        onInputChange={onInputChange}
        dateRange={dateRange}
        setDateRange={setDateRange}
        filters={filters}
        setFilters={setFilters}
        onReset={handleReset}
      />
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