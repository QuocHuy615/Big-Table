import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseSearchParamResult {
  inputValue: string;
  search: string;
  setInputValue: (v: string) => void;
  setSearch: (v: string) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function useSearchParam(paramName = 'search', delay = 500): UseSearchParamResult {
  const initial = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get(paramName) ?? '') : '';
  const [inputValue, setInputValue] = useState<string>(initial);
  const [search, setSearch] = useState<string>(initial);
  const timeoutRef = useRef<number | null>(null);

  const updateUrl = useCallback((value: string) => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      const qs = params.toString();
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    } catch {
      // ignore
    }
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
      const k = (new URLSearchParams(window.location.search).get(paramName)) ?? '';
      setInputValue(k);
      setSearch(k);
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [paramName]);

  return { inputValue, search, setInputValue, setSearch, onInputChange };
}
