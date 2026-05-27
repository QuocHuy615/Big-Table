import { useEffect, useRef, useState, useCallback } from 'react';
import { readSearchParam, replaceSearchParam } from '../utils/bankTableParams';

export interface UseSearchParamResult {
  inputValue: string;
  search: string;
  setInputValue: (v: string) => void;
  setSearch: (v: string) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function useSearchParam(paramName = 'search', delay = 500): UseSearchParamResult {
  const initial = readSearchParam(paramName);
  const [inputValue, setInputValue] = useState<string>(initial);
  const [search, setSearch] = useState<string>(initial);
  const timeoutRef = useRef<number | null>(null);

  const updateUrl = useCallback((value: string) => {
    replaceSearchParam(paramName, value);
  }, [paramName]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setSearch(value);
      updateUrl(value);
    }, delay);
  }, [delay, updateUrl]);

  useEffect(() => {
    const handlePop = () => {
      const value = readSearchParam(paramName);
      setInputValue(value);
      setSearch(value);
    };

    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [paramName]);

  return { inputValue, search, setInputValue, setSearch, onInputChange };
}
