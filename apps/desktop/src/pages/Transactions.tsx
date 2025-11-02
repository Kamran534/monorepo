import { useState } from 'react';
import {
  TransactionLines,
  TransactionNumpad,
  TransactionActions,
  type LineItem,
  type ActionButton,
} from '@monorepo/shared-ui';
import {
  Gift,
  ShoppingBag,
  X,
  RotateCcw,
  Equal,
  DollarSign,
  User,
  Heart,
  CreditCard,
  Banknote,
} from 'lucide-react';

export function Transactions() {
  const [activeTab, setActiveTab] = useState<'lines' | 'payments'>('lines');
  const [selectedItem, setSelectedItem] = useState<string>('3');
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [activeSection, setActiveSection] = useState<string>('actions');
  const [lineItems] = useState<LineItem[]>([
    {
      id: '1',
      name: 'Youth Accessory Combo Set',
      quantity: 1,
      price: 69.99,
      total: 69.99,
    },
    {
      id: '2',
      name: 'Adult Helmet Accessory Combo Set',
      quantity: 2,
      price: 79.98,
      total: 79.98,
    },
    {
      id: '3',
      name: 'Signature Mountain Bike Tire',
      quantity: 1,
      price: 34.99,
      total: 34.99,
    },
  ]);

  const actionButtons: ActionButton[] = [
    // Orange/Reddish-Brown Section
    {
      id: 'set-quantity',
      label: 'Set quantity',
      color: 'bg-orange-600',
      onClick: () => console.log('Set quantity'),
    },
    {
      id: 'return-product',
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="14" height="14" rx="2" />
            <path d="M8 12h8M12 8l-4 4 4 4" />
          </svg>
        </div>
      ),
      label: 'Return product',
      color: 'bg-orange-600',
      square: true,
      rowSpan: 2,
      onClick: () => console.log('Return product'),
    },
    {
      id: 'change-unit',
      label: 'Change unit of measure',
      color: 'bg-orange-600',
      onClick: () => console.log('Change unit'),
    },
    {
      id: 'line-comment',
      label: 'Line comment',
      color: 'bg-orange-600',
      onClick: () => console.log('Line comment'),
    },
    {
      id: 'inventory-lookup',
      label: 'Inventory lookup',
      color: 'bg-orange-600',
      onClick: () => console.log('Inventory lookup'),
    },
    // Dark Gray Section
    {
      id: 'gift-cards',
      icon: <Gift className="w-5 h-5" />,
      label: 'Gift cards',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: () => console.log('Gift cards'),
    },
    {
      id: 'transaction-options',
      icon: <ShoppingBag className="w-5 h-5" />,
      label: 'Transaction options',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: () => console.log('Transaction options'),
    },
    {
      id: 'voids',
      icon: <X className="w-6 h-6" />,
      label: 'Voids',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: () => console.log('Voids'),
    },
    {
      id: 'tax-overrides',
      icon: <RotateCcw className="w-5 h-5" />,
      label: 'Tax overrides',
      color: 'bg-gray-700',
      square: true,
      rectangular: true,
      onClick: () => console.log('Tax overrides'),
    },
    // Green Section - Small square buttons
    {
      id: 'equals',
      icon: <Equal className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Equals'),
    },
    {
      id: 'dollars',
      icon: (
        <div className="relative w-4 h-4">
          <DollarSign className="w-4 h-4 absolute" style={{ transform: 'translateX(-2px)' }} />
          <DollarSign className="w-4 h-4 absolute" />
          <DollarSign className="w-4 h-4 absolute" style={{ transform: 'translateX(2px)' }} />
        </div>
      ),
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Dollars'),
    },
    {
      id: 'profile',
      icon: <User className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Profile'),
    },
    {
      id: 'heart',
      icon: <Heart className="w-4 h-4" />,
      label: '',
      color: 'bg-green-700',
      square: true,
      onClick: () => console.log('Heart'),
    },
    // Green Section - Payment buttons
    {
      id: 'pay-cash',
      icon: <Banknote className="w-5 h-5" />,
      label: 'Pay cash',
      color: 'bg-green-600',
      square: true,
      onClick: () => console.log('Pay cash'),
    },
    {
      id: 'pay-card',
      icon: <CreditCard className="w-5 h-5" />,
      label: 'Pay card',
      color: 'bg-green-600',
      square: true,
      onClick: () => console.log('Pay card'),
    },
  ];

  return (
    <div
      className="h-full w-full flex overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <TransactionLines
        lineItems={lineItems}
        selectedItem={selectedItem}
        onItemSelect={setSelectedItem}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddCustomer={() => console.log('Add customer')}
      />

      <TransactionNumpad
        value={numpadValue}
        onValueChange={setNumpadValue}
        onAddCustomer={() => console.log('Add customer')}
      />

      <TransactionActions 
        actions={actionButtons}
        activeSection={activeSection}
        onSectionClick={(section) => {
          setActiveSection(section);
          console.log('Section:', section);
        }}
      />
    </div>
  );
}
