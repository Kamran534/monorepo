import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Save, X } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface CustomerFormProps extends ComponentProps {
  customer?: Customer | null;
  onSave: (customer: Omit<Customer, 'id'>) => void;
  onCancel: () => void;
  creating?: boolean;
  updating?: boolean;
}

/**
 * CustomerForm Component
 *
 * Form for adding/editing customer information
 */
export function CustomerForm({
  customer,
  onSave,
  onCancel,
  creating = false,
  updating = false,
  className = '',
}: CustomerFormProps) {
  // Form data state with caching
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>(() => {
    // Try to load cached form data from localStorage
    try {
      const cached = localStorage.getItem('customer-form-cache');
      return cached ? JSON.parse(cached) : {
        name: '',
        email: '',
        phone: '',
        address: '',
      };
    } catch {
      return {
        name: '',
        email: '',
        phone: '',
        address: '',
      };
    }
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Omit<Customer, 'id'>, string>>>({});

  // Cache form data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('customer-form-cache', JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to cache form data:', error);
    }
  }, [formData]);

  // Update form when customer prop changes (for editing)
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || '',
      });
      setErrors({});
    }
  }, [customer]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Omit<Customer, 'id'>, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Clear cached form data and reset form
    try {
      localStorage.removeItem('customer-form-cache');
    } catch (error) {
      console.warn('Failed to clear form cache:', error);
    }

    onSave(formData);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
    setErrors({});
  };

  const handleCancel = () => {
    // Clear cached form data and reset to empty form
    try {
      localStorage.removeItem('customer-form-cache');
    } catch (error) {
      console.warn('Failed to clear form cache:', error);
    }

    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
    setErrors({});
    onCancel();
  };

  const handleInputChange = (field: keyof Omit<Customer, 'id'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div className="flex-shrink-0 mb-4">
        <h2
          className="text-xl font-semibold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {customer ? 'Edit Customer' : 'Add Customer'}
        </h2>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {customer ? 'Update customer information' : 'Fill in the details to add a new customer'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden space-y-4">
        {/* Name Field */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 rounded border text-sm ${
              errors.name ? 'border-red-500' : ''
            }`}
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              borderColor: errors.name ? 'var(--color-error)' : 'var(--color-border-light)',
            }}
            placeholder="Enter customer's full name"
          />
          {errors.name && (
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-error)' }}
            >
              {errors.name}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Email Address *
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full pl-10 pr-3 py-2 rounded border text-sm ${
                errors.email ? 'border-red-500' : ''
              }`}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                borderColor: errors.email ? 'var(--color-error)' : 'var(--color-border-light)',
              }}
              placeholder="customer@example.com"
            />
          </div>
          {errors.email && (
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-error)' }}
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Phone Number *
          </label>
          <div className="relative">
            <Phone
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full pl-10 pr-3 py-2 rounded border text-sm ${
                errors.phone ? 'border-red-500' : ''
              }`}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                borderColor: errors.phone ? 'var(--color-error)' : 'var(--color-border-light)',
              }}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          {errors.phone && (
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-error)' }}
            >
              {errors.phone}
            </p>
          )}
        </div>

        {/* Address Field */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Address
          </label>
          <div className="relative">
            <MapPin
              className="absolute left-3 top-3 w-4 h-4 opacity-50"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full pl-10 pr-3 py-2 rounded border text-sm resize-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
              placeholder="Enter customer address"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={creating || updating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-accent-blue)',
              color: 'var(--color-text-light)',
            }}
          >
            <Save className="w-4 h-4" />
            {creating ? 'Creating...' : updating ? 'Updating...' : customer ? 'Update Customer' : 'Save Customer'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border rounded font-medium transition-colors"
            style={{
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border-light)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
