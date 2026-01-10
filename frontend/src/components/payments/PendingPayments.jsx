import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate,
  getPaymentStatusColor
} from '../../utils/formatters';

const PendingPayments = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);

  const [filters, setFilters] = useState({
    status: 'all',
    chitGroupId: 'all',
    search: ''
  });

  const [chitGroups, setChitGroups] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0
  });

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'Cash',
    referenceNumber: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchChitGroups();
    fetchPendingPayments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, payments]);

  const fetchChitGroups = async () => {
    try {
      const response = await api.get('/chitgroups?status=Active');
      if (response.success) {
        setChitGroups(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching chit groups:', err);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/payments/status/pending');

      if (response.success) {
        const data = response.data || [];
        setPayments(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      setError(err.response?.data?.error || 'Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      pending: data.filter(p => p.paymentStatus === 'Pending').length,
      overdue: data.filter(p => p.paymentStatus === 'Overdue').length,
      totalAmount: data.reduce((sum, p) => sum + p.outstandingBalance, 0)
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.paymentStatus === filters.status);
    }

    // Chit Group filter
    if (filters.chitGroupId !== 'all') {
      filtered = filtered.filter(p => p.chitGroupId._id === filters.chitGroupId);
    }

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.memberId.name.toLowerCase().includes(searchLower) ||
        p.memberId.phone.includes(searchLower) ||
        p.chitGroupId.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by due date (oldest first)
    filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    setFilteredPayments(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleOpenPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setPaymentForm({
      amount: payment.outstandingBalance.toString(),
      paymentMethod: 'Cash',
      referenceNumber: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
    setPaymentForm({
      amount: '',
      paymentMethod: 'Cash',
      referenceNumber: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handlePaymentFormChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!selectedPayment) return;

    const amount = parseFloat(paymentForm.amount);
    const outstanding = selectedPayment.outstandingBalance;

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (amount > outstanding) {
      alert(`Payment amount cannot exceed outstanding balance of ${formatCurrency(outstanding)}`);
      return;
    }

    try {
      setSubmittingPayment(true);

      const response = await api.post(`/payments/${selectedPayment._id}/record`, {
        amount: amount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber || undefined,
        date: paymentForm.date,
        notes: paymentForm.notes || undefined
      });

      if (response.success) {
        alert('Payment recorded successfully!');
        handleClosePaymentModal();
        fetchPendingPayments(); // Refresh the data
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      alert(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleRecordPayment = (paymentId) => {
    navigate(`/payments/record?paymentId=${paymentId}`);
  };

  const handleExtendGrace = async (paymentId) => {
    const days = prompt('Enter number of days to extend grace period:');
    if (!days || isNaN(days) || parseInt(days) <= 0) {
      return;
    }

    try {
      const response = await api.post(`/payments/${paymentId}/extend-grace`, {
        additionalDays: parseInt(days)
      });

      if (response.success) {
        alert(`Grace period extended by ${days} days`);
        fetchPendingPayments();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to extend grace period');
    }
  };

  const getDaysOverdue = (dueDate, gracePeriodEnd) => {
    const today = new Date();
    const graceEnd = new Date(gracePeriodEnd);

    if (today <= graceEnd) return 0;

    const diffTime = today - graceEnd;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status) => {
    const color = getPaymentStatusColor(status);
    const bgColors = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bgColors[color] || bgColors.yellow}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Payments</h1>
          <p className="mt-2 text-gray-600">Track and manage pending and overdue payments</p>
        </div>
        <button
          onClick={() => navigate('/payments/record')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Record Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Pending</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Due Soon</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Overdue</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{stats.overdue}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Amount</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by member name, phone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Chit Group Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chit Group
            </label>
            <select
              value={filters.chitGroupId}
              onChange={(e) => handleFilterChange('chitGroupId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Chit Groups</option>
              {chitGroups.map(group => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending payments</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.status !== 'all' || filters.chitGroupId !== 'all' || filters.search
                ? 'Try adjusting your filters'
                : 'All payments are up to date'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chit Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => {
                  const daysOverdue = getDaysOverdue(payment.dueDate, payment.gracePeriodEndDate);
                  return (
                    <tr key={payment._id} className={payment.paymentStatus === 'Overdue' ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.memberId.name}
                        </div>
                        <div className="text-sm text-gray-500">{payment.memberId.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{payment.chitGroupId.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.auctionNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(payment.outstandingBalance)}
                        </div>
                        {payment.paidAmount > 0 && (
                          <div className="text-xs text-gray-500">
                            Paid: {formatCurrency(payment.paidAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(payment.dueDate)}</div>
                        {daysOverdue > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            {daysOverdue} days overdue
                          </div>
                        )}
                        {payment.gracePeriodEndDate && (
                          <div className="text-xs text-gray-500">
                            Grace: {formatDate(payment.gracePeriodEndDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.paymentStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleOpenPaymentModal(payment)}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium"
                            title="Record Payment"
                          >
                            Pay
                          </button>
                          <button
                            onClick={() => handleExtendGrace(payment._id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Extend Grace Period"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate(`/members/${payment.memberId._id}/passbook`)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Passbook"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredPayments.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredPayments.length} of {payments.length} pending payment(s)
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
            </div>

            <form onSubmit={handleSubmitPayment} className="px-6 py-4">
              {/* Member Info */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-medium text-blue-900">
                  {selectedPayment.memberId.name}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {selectedPayment.memberId.phone}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {selectedPayment.chitGroupId.name} - Auction #{selectedPayment.auctionNumber}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-700">Total Due:</span>
                    <div className="font-bold text-blue-900">{formatCurrency(selectedPayment.dueAmount)}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Outstanding:</span>
                    <div className="font-bold text-red-600">{formatCurrency(selectedPayment.outstandingBalance)}</div>
                  </div>
                </div>
                {selectedPayment.paidAmount > 0 && (
                  <div className="mt-1 text-xs">
                    <span className="text-green-700">Already Paid: </span>
                    <span className="font-semibold text-green-900">{formatCurrency(selectedPayment.paidAmount)}</span>
                  </div>
                )}
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                    min="0.01"
                    step="0.01"
                    max={selectedPayment.outstandingBalance}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {formatCurrency(selectedPayment.outstandingBalance)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    name="paymentMethod"
                    value={paymentForm.paymentMethod}
                    onChange={handlePaymentFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={paymentForm.date}
                    onChange={handlePaymentFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={paymentForm.referenceNumber}
                    onChange={handlePaymentFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Transaction ID, Cheque #, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={paymentForm.notes}
                    onChange={handlePaymentFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  disabled={submittingPayment}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingPayments;
