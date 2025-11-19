import { useState, useCallback } from 'react';
import { useKeyboardShortcuts } from '../../../hooks/keyboard-shortcuts/src/index.js';

export interface SalesPerson {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  commission?: number;
  isActive?: boolean;
}

export interface UseSalesPersonModalOptions {
  onSelect?: (salesPerson: SalesPerson) => void;
  enabled?: boolean;
}

export interface UseSalesPersonModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  selectedPerson: SalesPerson | null;
  setSelectedPerson: (person: SalesPerson | null) => void;
  handleSelect: (person: SalesPerson) => void;
}

/**
 * Custom hook for managing the sales person modal
 * Includes keyboard shortcut Ctrl+Shift+I to open the modal
 */
export function useSalesPersonModal({
  onSelect,
  enabled = true,
}: UseSalesPersonModalOptions = {}): UseSalesPersonModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<SalesPerson | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (person: SalesPerson) => {
      setSelectedPerson(person);
      if (onSelect) {
        onSelect(person);
      }
    },
    [onSelect]
  );

  // Register keyboard shortcut Ctrl+Shift+I
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'i',
        ctrl: true,
        shift: true,
        action: toggle,
        description: 'Open sales person selector',
        preventDefault: true,
        allowInInputs: false,
      },
    ],
    enabled,
  });

  return {
    isOpen,
    open,
    close,
    toggle,
    selectedPerson,
    setSelectedPerson,
    handleSelect,
  };
}

export default useSalesPersonModal;
