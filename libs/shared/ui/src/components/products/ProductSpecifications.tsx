import React from 'react';
import { ComponentProps } from '../../types.js';

export interface Specification {
  label: string;
  value: string;
}

export interface ProductSpecificationsProps extends ComponentProps {
  specifications?: Specification[];
}

/**
 * ProductSpecifications Component
 * 
 * Displays product specifications in a table format
 * 
 * @example
 * ```tsx
 * <ProductSpecifications
 *   specifications={[
 *     { label: 'Material', value: 'Leather' },
 *     { label: 'Color', value: 'Brown' },
 *   ]}
 * />
 * ```
 */
export function ProductSpecifications({
  specifications = [],
  className = '',
}: ProductSpecificationsProps) {
  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <h2 className="text-sm font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
        Specifications
      </h2>

      {specifications.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No specifications available
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {specifications.map((spec, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="text-sm font-medium w-32" style={{ color: 'var(--color-text-secondary)' }}>
                {spec.label}:
              </span>
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

