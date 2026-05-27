import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { BankData, Filters } from '../interfaces/bank.interfaces';

export const DEFAULT_FILTERS: Filters = {
  fromDate: '',
  toDate: '',
  minValue: null,
  maxValue: null,
};

export const parseNumberParam = (value: string | null) => {
  if (value == null || value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const readSearchParam = (paramName: string) => {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URLSearchParams(window.location.search).get(paramName) ?? '';
};

export const replaceSearchParam = (paramName: string, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  if (value.trim()) {
    params.set(paramName, value);
  } else {
    params.delete(paramName);
  }

  const qs = params.toString();
  const hash = window.location.hash;
  const newUrl = qs ? `${window.location.pathname}?${qs}${hash}` : `${window.location.pathname}${hash}`;

  window.history.replaceState(null, '', newUrl);
};

export const getFiltersFromUrl = (): Filters => {
  if (typeof window === 'undefined') {
    return DEFAULT_FILTERS;
  }

  const params = new URLSearchParams(window.location.search);

  return {
    fromDate: params.get('fromDate') ?? '',
    toDate: params.get('toDate') ?? '',
    minValue: parseNumberParam(params.get('minValue')),
    maxValue: parseNumberParam(params.get('maxValue')),
  };
};

export const getDateRangeFromFilters = (filters: Filters): [Dayjs | null, Dayjs | null] | null => {
  if (!filters.fromDate && !filters.toDate) {
    return null;
  }

  return [
    filters.fromDate ? dayjs(filters.fromDate) : null,
    filters.toDate ? dayjs(filters.toDate) : null,
  ];
};

export const buildUrlFromState = (search: string, filters: Filters) => {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);

  if (search.trim()) {
    params.set('search', search);
  } else {
    params.delete('search');
  }

  if (filters.fromDate) {
    params.set('fromDate', filters.fromDate);
  } else {
    params.delete('fromDate');
  }

  if (filters.toDate) {
    params.set('toDate', filters.toDate);
  } else {
    params.delete('toDate');
  }

  if (filters.minValue !== null) {
    params.set('minValue', String(filters.minValue));
  } else {
    params.delete('minValue');
  }

  if (filters.maxValue !== null) {
    params.set('maxValue', String(filters.maxValue));
  } else {
    params.delete('maxValue');
  }

  const qs = params.toString();
  const hash = window.location.hash;
  return qs ? `${window.location.pathname}?${qs}${hash}` : `${window.location.pathname}${hash}`;
};

export const applyFiltersToData = (data: BankData[], filters: Filters, search: string) => {
  let nextItems = data;

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

  return nextItems;
};