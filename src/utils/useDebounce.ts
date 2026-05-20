import { useState, useEffect } from 'react';

/**
 * Debounce hook — delays updating the value until after `delay` ms of inactivity.
 * Prevents excessive re-renders from rapid input changes (e.g. search).
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
