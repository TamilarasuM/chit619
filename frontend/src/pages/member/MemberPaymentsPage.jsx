import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const MemberPaymentsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedChitGroup, setSelectedChitGroup] = useState('all');
  const [chitGroups, setChitGroups] = useState([]);

  useEffect(() => {
    fetchPayments();
    fetchChitGroups();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/member/me');
      if (response.success) {
        setPayments(response.data || []);
        setSummary(response.data.summary || {});
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChitGroups = async () => {
    try {
      const response = await api.get('/member/chits');
      if (response.success) {
        setChitGroups(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching chit groups:', err);
    }
  };

  const filteredPayments = selectedChitGroup === 'all'
    ? payments
    : payments.filter(p => p.chitGroupId?._id === selectedChitGroup);

  const getStatusBadge = (status) => {
    const colors = {
      Paid: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Partial: 'bg-blue-100 text-blue-800',
      Overdue: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Payments</h1>
          <button
            onClick={() => navigate('/member/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Due</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalDue || 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Paid</div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalPaid || 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Outstanding</div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {formatCurrency(summary.outstanding || 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Dividends Received</div>
              <div className="mt-2 text-2xl font-bold text-blue-600">
                {formatCurrency(summary.totalDividends || 0)}
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Chit Group
          </label>
          <select
            value={selectedChitGroup}
            onChange={(e) => setSelectedChitGroup(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Chit Groups</option>
            {chitGroups.map(group => (
              <option key={group._id} value={group._id}>{group.name}</option>
            ))}
          </select>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No payments found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chit Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dividend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Paid Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map(payment => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {payment.chitGroupId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.auctionNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(payment.dueAmount || payment.amountDue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      {formatCurrency(payment.dividendReceived || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(payment.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.paymentStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredPayments.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            Showing {filteredPayments.length} of {payments.length} payment(s)
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPaymentsPage;
