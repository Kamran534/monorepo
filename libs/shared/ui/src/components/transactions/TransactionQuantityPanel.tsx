import { useState, useEffect, useRef } from 'react';
import { SidePanel } from '@monorepo/shared-ui';
import { Package, X as XIcon, CornerDownLeft } from 'lucide-react';

export interface TransactionQuantityPanelProps {
  /**
   * Whether the panel is open
   */
  isOpen: boolean;
  /**
   * Callback when panel should close
   */
  onClose: () => void;
  /**
   * Selected item name
   * @default 'Youth Accessory Combo Set'
   */
  itemName?: string;
  /**
   * Unit of measure
   * @default 'Each'
   */
  unitOfMeasure?: string;
  /**
   * Initial quantity value
   * @default '1'
   */
  initialQuantity?: string;
  /**
   * Callback when quantity is confirmed (Enter is pressed)
   */
  onQuantityConfirm?: (quantity: string) => void;
}

/**
 * TransactionQuantityPanel Component
 * 
 * A quantity input panel with calculator for transactions.
 * Opens with Ctrl+Shift+P keyboard shortcut.
 * 
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * <TransactionQuantityPanel 
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onQuantityConfirm={(qty) => console.log('Quantity:', qty)}
 * />
 * ```
 */
export function TransactionQuantityPanel({
  isOpen,
  onClose,
  itemName = 'Youth Accessory Combo Set',
  unitOfMeasure = 'Each',
  initialQuantity = '1',
  onQuantityConfirm,
}: TransactionQuantityPanelProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset quantity and focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(initialQuantity);
      // Focus input after a short delay to ensure panel is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuantity]);

  const handleNumberClick = (num: string) => {
    setQuantity(prev => prev + num);
  };

  const handleBackspace = () => {
    setQuantity(prev => prev.slice(0, -1) || '');
  };

  const handleEnter = () => {
    onQuantityConfirm?.(quantity || '0');
    onClose();
  };

  // Handle keyboard input for numeric keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow numeric keys (0-9)
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleNumberClick(e.key);
      return;
    }
    
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      return;
    }
    
    // Handle Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
      return;
    }
    
    // Allow arrow keys, delete, tab, escape for navigation
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Tab', 'Escape'].includes(e.key)) {
      return;
    }
    
    // Block other keys
    e.preventDefault();
  };

  // Handle paste and other input events
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    setQuantity(numericValue);
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Change quantity"
      width="320px"
    >
      <div className="flex flex-col h-full">
        {/* Top Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Item Display */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              <div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {itemName}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Unit of measure: {unitOfMeasure}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quantity Input Field and Calculator Pad - Fixed at Bottom */}
        <div className="flex-shrink-0 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
          {/* Quantity Input Field */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Quantity
            </label>
            <div
              className="w-full h-12 px-3 flex items-center justify-between rounded border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              <div></div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={quantity || ''}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  className="text-xl font-mono text-right outline-none bg-transparent border-none flex-1"
                  style={{
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="0"
                  aria-label="Quantity input"
                />
                <span className="text-xl font-mono">x</span>
                {/* <button
                  onClick={() => {
                    setQuantity('');
                    inputRef.current?.focus();
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-secondary)',
                  }}
                  aria-label="Clear"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button> */}
              </div>
            </div>
          </div>

          {/* Calculator Pad */}
          <div className="grid grid-cols-4 gap-1.5" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
            {/* Row 1: 7, 8, 9, Backspace */}
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {num}
              </button>
            ))}
            {/* Backspace */}
            <button
              onClick={handleBackspace}
              className="h-10 rounded flex items-center justify-center hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              ⌫
            </button>

            {/* Row 2: 4, 5, 6, Enter (Enter spans rows 2-4) */}
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {num}
              </button>
            ))}
            {/* Enter button (spans rows 2-4, column 4) */}
            <button
              onClick={handleEnter}
              className="rounded text-base font-medium hover:opacity-90 transition-opacity flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-accent-blue)',
                color: 'var(--color-text-light)',
                gridRow: '2 / 5',
                gridColumn: '4',
              }}
            >
              <CornerDownLeft className="w-5 h-5" />
            </button>

            {/* Row 3: 1, 2, 3 */}
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-light)',
                }}
              >
                {num}
              </button>
            ))}

            {/* Row 4: 0 (span 3 columns) */}
            <button
              onClick={() => handleNumberClick('0')}
              className="col-span-3 h-10 rounded text-base font-medium hover:opacity-80 transition-opacity border"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
            >
              0
            </button>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}

