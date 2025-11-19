import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface SalesPerson {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  commission?: number;
  isActive?: boolean;
}

export interface SalesPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (salesPerson: SalesPerson) => void;
  salesPersons: SalesPerson[];
  selectedId?: string;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

export const SalesPersonModal: React.FC<SalesPersonModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  salesPersons,
  selectedId,
  title = 'Choose sales representative',
  subtitle = 'On transaction',
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPersons, setFilteredPersons] = useState<SalesPerson[]>(salesPersons);
  const [isClosing, setIsClosing] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const prevIsOpenRef = useRef(isOpen);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      setIsAnimatingIn(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimatingIn(false));
      });
    } else {
      setIsAnimatingIn(false);
    }
  }, [isOpen]);

  const runClosingAnimation = useCallback(
    (afterAnimation?: () => void) => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }

      setIsClosing(true);
      closeTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        closeTimeoutRef.current = null;
        afterAnimation?.();
      }, 300); // Match animation duration
    },
    []
  );

  const handleClose = useCallback(() => {
    runClosingAnimation(onClose);
  }, [onClose, runClosingAnimation]);

  // Handle external close (parent sets isOpen to false)
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    if (!isOpen && wasOpen && !isClosing && isVisible) {
      runClosingAnimation();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, isClosing, isVisible, runClosingAnimation]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  // Filter sales persons based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPersons(salesPersons);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = salesPersons.filter(
        (person) =>
          person.name.toLowerCase().includes(term) ||
          person.code.toLowerCase().includes(term)
      );
      setFilteredPersons(filtered);
    }
  }, [searchTerm, salesPersons]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing, handleClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) && !isClosing) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isClosing, handleClose]);

  const handleSelect = (person: SalesPerson) => {
    onSelect(person);
    handleClose();
  };

  const clearSearch = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Modal Panel - Theme-aware using CSS variables */}
      <div
        ref={modalRef}
          className={`relative flex flex-col shadow-xl h-full transition-transform duration-300 ease-out ${
          isClosing || isAnimatingIn ? 'translate-x-full' : 'translate-x-0'
        }`}
        style={{
          width: '320px',
          maxWidth: '100%',
          backgroundColor: 'var(--color-bg-secondary)',
          animation: isClosing ? undefined : 'slideInFromRight 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3"
          style={{ borderBottom: '1px solid var(--color-border-light)' }}
        >
          <div>
            <h2
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div
          className="p-3"
          style={{ borderBottom: '1px solid var(--color-border-light)' }}
        >
          <label
            className="block text-xs mb-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Scan or find
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pr-16 rounded text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-medium)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="Search by name or code"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="p-1 transition-colors"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  aria-label="Clear search"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <button
                className="p-2 transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}
                aria-label="Search"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sales Persons List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <label
              className="block text-xs mb-2"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Sales representatives
            </label>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--color-primary-500)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : filteredPersons.length === 0 ? (
              <div
                className="text-center py-8 text-sm"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {searchTerm ? 'No results found' : 'No sales persons available'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPersons.map((person) => {
                  const isSelected = selectedId === person.id;
                  return (
                      <button
                      key={person.id}
                      onClick={() => handleSelect(person)}
                      className="w-full text-left p-3 rounded transition-colors shadow-sm"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-warning-strong, #d97706)'
                          : 'var(--color-warning, #facc15)',
                        color: 'var(--color-warning-contrast, var(--color-text-primary, #1a1a1a))',
                        border: isSelected
                          ? '1px solid rgba(255,255,255,0.35)'
                          : '1px solid var(--color-warning-border, rgba(0,0,0,0.1))',
                      }}
                    >
                      <div className="font-semibold text-sm">{person.name}</div>
                      <div
                        className="text-xs opacity-90"
                        style={{
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        {person.code}
                      </div>
                      {(person.email || person.phone) && (
                        <div className="text-[11px] opacity-70">
                          {person.email || person.phone}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <button
            onClick={handleClose}
            className="w-full py-2 px-4 rounded text-sm transition-colors"
            style={{
              border: '1px solid var(--color-border-medium)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesPersonModal;
