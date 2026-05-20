import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import './SearchableSelect.css';

interface Option {
  code: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (code: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  id?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  loading = false,
  error,
  label,
  required,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.code === value);

  const filtered = search
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = useCallback((opt: Option) => {
    onChange(opt.code, opt.name);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleToggle = useCallback(() => {
    if (!disabled && !loading) {
      setIsOpen(prev => !prev);
      setSearch('');
    }
  }, [disabled, loading]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
    if (e.key === 'Enter' && filtered.length === 1) {
      handleSelect(filtered[0]);
    }
  }, [filtered, handleSelect]);

  return (
    <div className="searchable-select" ref={containerRef} id={id}>
      {label && (
        <label className="form-label">
          {label} {required && '*'}
        </label>
      )}

      <button
        type="button"
        className={`ss-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${error ? 'has-error' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`ss-value ${!selectedOption ? 'placeholder' : ''}`}>
          {loading ? (
            <span className="ss-loading"><Loader2 size={14} className="ss-spinner" /> Loading...</span>
          ) : selectedOption ? (
            selectedOption.name
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown size={16} className={`ss-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && !disabled && !loading && (
        <div className="ss-dropdown" role="listbox">
          <div className="ss-search-wrapper">
            <Search size={14} className="ss-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="ss-search-input"
              placeholder="Type to search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="ss-options">
            {filtered.length === 0 ? (
              <div className="ss-no-results">No results found</div>
            ) : (
              filtered
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(opt => (
                  <button
                    type="button"
                    key={opt.code}
                    className={`ss-option ${opt.code === value ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt)}
                    role="option"
                    aria-selected={opt.code === value}
                  >
                    {opt.name}
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {error && (
        <span className="form-error ss-error">
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  );
}
