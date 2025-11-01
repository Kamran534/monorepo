import React, { useState } from 'react';

export function Transactions() {
  const [dateRange, setDateRange] = useState('today');

  const transactions = [
    { id: '#12345', customer: 'John Doe', items: 3, amount: '$125.00', payment: 'Cash', status: 'completed', time: '2 min ago' },
    { id: '#12344', customer: 'Jane Smith', items: 2, amount: '$89.50', payment: 'Card', status: 'completed', time: '5 min ago' },
    { id: '#12343', customer: 'Bob Johnson', items: 5, amount: '$234.99', payment: 'Card', status: 'completed', time: '12 min ago' },
    { id: '#12342', customer: 'Alice Williams', items: 1, amount: '$45.00', payment: 'Cash', status: 'pending', time: '15 min ago' },
    { id: '#12341', customer: 'Charlie Brown', items: 4, amount: '$178.25', payment: 'Card', status: 'completed', time: '18 min ago' },
    { id: '#12340', customer: 'Diana Prince', items: 2, amount: '$99.00', payment: 'Card', status: 'completed', time: '25 min ago' },
    { id: '#12339', customer: 'Ethan Hunt', items: 3, amount: '$156.50', payment: 'Cash', status: 'completed', time: '32 min ago' },
    { id: '#12338', customer: 'Fiona Green', items: 1, amount: '$67.99', payment: 'Card', status: 'refunded', time: '45 min ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-2 text-gray-600">View and manage all transactions</p>
        </div>
        <button className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Transaction
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">$12,450.00</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">247</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Average Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">$50.40</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Refunds</p>
          <p className="text-2xl font-bold text-error mt-1">$125.00</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <select 
            className="input sm:w-48" 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          <select className="input sm:w-48">
            <option>All Status</option>
            <option>Completed</option>
            <option>Pending</option>
            <option>Refunded</option>
          </select>
          <select className="input sm:w-48">
            <option>All Payment Methods</option>
            <option>Cash</option>
            <option>Card</option>
            <option>Mobile Payment</option>
          </select>
          <button className="btn btn-secondary ml-auto">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="table-row">
                  <td className="table-cell font-mono font-semibold">{transaction.id}</td>
                  <td className="table-cell">{transaction.customer}</td>
                  <td className="table-cell">{transaction.items} items</td>
                  <td className="table-cell font-semibold">{transaction.amount}</td>
                  <td className="table-cell">{transaction.payment}</td>
                  <td className="table-cell">
                    <span className={`badge ${
                      transaction.status === 'completed' ? 'badge-success' : 
                      transaction.status === 'pending' ? 'badge-warning' : 
                      'badge-error'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500">{transaction.time}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="View">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="Print">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

