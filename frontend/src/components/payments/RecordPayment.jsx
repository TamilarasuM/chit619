import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency, formatDate, formatDateForInput } from '../../utils/formatters';

const RecordPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chitGroups, setChitGroups] = useState([]);
  const [currentChitGroup, setCurrentChitGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [formData, setFormData] = useState({
    paymentId: searchParams.get('paymentId') || '',
    chitGroupId: searchParams.get('chitGroupId') || '',
    memberId: searchParams.get('memberId') || '',
    amountPaid: '',
    paymentDate: formatDateForInput(new Date()),
    paymentMethod: 'Cash',
    transactionRef: '',
    notes: ''
  });

  useEffect(() => {
    fetchChitGroups();
  }, []);

  useEffect(() => {
    if (formData.chitGroupId) {
      fetchChitGroupMembers(formData.chitGroupId);
      fetchPendingPayments(formData.chitGroupId);
    }
  }, [formData.chitGroupId]);

  useEffect(() => {
    if (formData.paymentId) {
      fetchPaymentDetails(formData.paymentId);
    }
  }, [formData.paymentId]);

  useEffect(() => {
    // If memberId is provided via URL but no paymentId, try to find their pending payment
    if (formData.memberId && !formData.paymentId && pendingPayments.length > 0) {
      const memberPayment = pendingPayments.find(p =>
        p.memberId._id === formData.memberId || p.memberId === formData.memberId
      );
      if (memberPayment) {
        setSelectedPayment(memberPayment);
        setFormData(prev => ({
          ...prev,
          paymentId: memberPayment._id,
          amountPaid: memberPayment.dueAmount?.toString() || memberPayment.amountDue?.toString() || ''
        }));
      }
    }
  }, [formData.memberId, pendingPayments]);

  useEffect(() => {
    // Pre-fill amount with monthly contribution if member is selected but amount is not set
    if (formData.memberId && !formData.amountPaid && currentChitGroup) {
      setFormData(prev => ({
        ...prev,
        amountPaid: (currentChitGroup.monthlyContribution || 0).toString()
      }));
    }
  }, [formData.memberId, currentChitGroup]);

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

  const fetchChitGroupMembers = async (chitGroupId) => {
    try {
      const response = await api.get(`/chitgroups/${chitGroupId}`);
      if (response.success) {
        setCurrentChitGroup(response.data.chitGroup);
        setMembers(response.data.chitGroup.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchPendingPayments = async (chitGroupId) => {
    try {
      const response = await api.get(`/payments/status/pending?chitId=${chitGroupId}`);
      if (response.success) {
        setPendingPayments(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching pending payments:', err);
    }
  };

  const fetchPaymentDetails = async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}`);
      if (response.success) {
        const payment = response.data;
        setSelectedPayment(payment);

        setFormData(prev => ({
          ...prev,
          chitGroupId: payment.chitGroupId._id || payment.chitGroupId,
          memberId: payment.memberId._id || payment.memberId,
          amountPaid: (payment.dueAmount || payment.amountDue || payment.outstandingBalance || 0).toString()
        }));
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSelectPendingPayment = (payment) => {
    setSelectedPayment(payment);
    setFormData(prev => ({
      ...prev,
      paymentId: payment._id,
      chitGroupId: payment.chitGroupId._id || payment.chitGroupId,
      memberId: payment.memberId._id || payment.memberId,
      amountPaid: (payment.dueAmount || payment.amountDue || payment.outstandingBalance || 0).toString()
    }));
  };

  const validate = () => {
    if (!formData.chitGroupId) {
      setError('Please select a chit group');
      return false;
    }

    if (!formData.memberId) {
      setError('Please select a member');
      return false;
    }

    if (!formData.amountPaid || parseFloat(formData.amountPaid) <= 0) {
      setError('Please enter valid payment amount');
      return false;
    }

    if (!formData.paymentDate) {
      setError('Please select payment date');
      return false;
    }

    if (!formData.paymentMethod) {
      setError('Please select payment method');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        paymentId: formData.paymentId || undefined,
        chitGroupId: formData.chitGroupId,
        memberId: formData.memberId,
        amountPaid: parseFloat(formData.amountPaid),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        transactionRef: formData.transactionRef.trim() || undefined,
        notes: formData.notes.trim() || undefined
      };

      const response = await api.post('/payments/record', payload);

      if (response.success) {
        alert('Payment recorded successfully!');
        navigate('/payments');
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/payments')}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Payments
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
        <p className="mt-2 text-gray-600">Record a payment made by a member for a chit group</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Payments Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Pending Payments</h2>

            {formData.chitGroupId ? (
              pendingPayments.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pendingPayments.map((payment) => (
                    <button
                      key={payment._id}
                      onClick={() => handleSelectPendingPayment(payment)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedPayment?._id === payment._id
                          ? 'bg-blue-50 border-blue-300'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-sm">{payment.memberId?.name || payment.memberName || 'N/A'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Auction/Month {payment.auctionNumber || payment.monthNumber || 'N/A'}
                      </div>
                      <div className="text-sm font-semibold text-blue-600 mt-1">
                        {formatCurrency(payment.dueAmount || payment.amountDue || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Due: {payment.dueDate ? formatDate(payment.dueDate) : 'N/A'}
                      </div>
                      {(payment.paymentStatus === 'Overdue' || payment.status === 'Overdue') && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Overdue
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No pending payments for this chit group
                </p>
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Select a chit group to view pending payments
              </p>
            )}
          </div>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {selectedPayment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Selected Payment</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Member:</span>
                  <div className="font-medium text-blue-900">{selectedPayment.memberId?.name || selectedPayment.memberName || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Amount Due:</span>
                  <div className="font-bold text-blue-900">
                    {formatCurrency(selectedPayment.dueAmount || selectedPayment.amountDue || selectedPayment.outstandingBalance || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700">Auction/Month:</span>
                  <div className="font-medium text-blue-900">{selectedPayment.auctionNumber || selectedPayment.monthNumber || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-blue-700">Due Date:</span>
                  <div className="font-medium text-blue-900">{selectedPayment.dueDate ? formatDate(selectedPayment.dueDate) : 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Chit Group Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chit Group *
              </label>
              <select
                name="chitGroupId"
                value={formData.chitGroupId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Chit Group</option>
                {chitGroups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name} - {formatCurrency(group.chitAmount)}
                  </option>
                ))}
              </select>
            </div>

            {/* Member Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member *
              </label>
              <select
                name="memberId"
                value={formData.memberId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.chitGroupId}
              >
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member._id} value={member.memberId._id}>
                    {member.memberId.name} - {member.memberId.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Details */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    name="amountPaid"
                    value={formData.amountPaid}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    required
                  />
                  {formData.amountPaid && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(parseFloat(formData.amountPaid))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    name="transactionRef"
                    value={formData.transactionRef}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cheque #, UTR, Ref #"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Additional notes about this payment..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecordPayment;
