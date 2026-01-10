import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AuctionPaymentTracking = ({ auctionId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

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
    if (auctionId) {
      fetchAuctionPayments();
    }
  }, [auctionId]);

  const fetchAuctionPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/payments/auction/${auctionId}`);

      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Error fetching auction payments:', err);
      setError(err.response?.data?.error || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
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
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (amount > selectedPayment.outstandingBalance) {
      alert(`Payment amount cannot exceed outstanding balance of ${formatCurrency(selectedPayment.outstandingBalance)}`);
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
        fetchAuctionPayments(); // Refresh the data
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      alert(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Paid: 'bg-green-100 text-green-800',
      Partial: 'bg-yellow-100 text-yellow-800',
      Pending: 'bg-blue-100 text-blue-800',
      Overdue: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || badges.Pending}`}>
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

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No payment data available for this auction
      </div>
    );
  }

  const { auction, payments, stats } = data;

  return (
    <div className="space-y-6">
      {/* Auction Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Auction #{auction.auctionNumber} - Payment Tracking
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Chit Group:</span>
            <div className="font-medium text-gray-900">{auction.chitGroupName}</div>
          </div>
          <div>
            <span className="text-gray-500">Date:</span>
            <div className="font-medium text-gray-900">{formatDate(auction.scheduledDate)}</div>
          </div>
          <div>
            <span className="text-gray-500">Auction Contribution:</span>
            <div className="font-medium text-gray-900">{formatCurrency(auction.monthlyContribution)}</div>
          </div>
          <div>
            <span className="text-gray-500">Dividend/Member:</span>
            <div className="font-medium text-gray-900">{formatCurrency(auction.dividendPerMember || 0)}</div>
          </div>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Members</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{stats.totalMembers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Paid</div>
          <div className="mt-2 text-2xl font-bold text-green-600">{stats.paidCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{stats.pendingCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Overdue</div>
          <div className="mt-2 text-2xl font-bold text-red-600">{stats.overdueCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Collection Rate</div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{stats.collectionRate}%</div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Total Due</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalDue)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Paid</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Outstanding</div>
            <div className="text-xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Dividends</div>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(stats.totalDividends)}</div>
          </div>
        </div>
      </div>

      {/* Member Payment List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Member Payments</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dividend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                    No payment records found for this auction
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.memberId.name}
                        {payment.isWinner && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Winner
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{payment.memberId.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.baseAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {payment.dividendReceived > 0 ? `-${formatCurrency(payment.dividendReceived)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.dueAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(payment.paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(payment.outstandingBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {payment.paymentStatus !== 'Paid' && payment.outstandingBalance > 0 && (
                        <button
                          onClick={() => handleOpenPaymentModal(payment)}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium"
                        >
                          Record Payment
                        </button>
                      )}
                      {payment.paymentStatus === 'Paid' && (
                        <span className="text-gray-400 text-xs">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-700">Due Amount:</span>
                    <div className="font-bold text-blue-900">{formatCurrency(selectedPayment.dueAmount)}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Outstanding:</span>
                    <div className="font-bold text-red-600">{formatCurrency(selectedPayment.outstandingBalance)}</div>
                  </div>
                </div>
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

export default AuctionPaymentTracking;
