import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';
import { formatCurrency, formatDate, getPaymentStatusColor } from '../../utils/formatters';

const PaymentHistoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [chitGroups, setChitGroups] = useState([]);
  const [filters, setFilters] = useState({
    chitGroupId: 'all',
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchChitGroups();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments');
      if (response.success) {
        setPayments(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchChitGroups = async () => {
    try {
      const response = await api.get('/chitgroups');
      if (response.success) {
        setChitGroups(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching chit groups:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];

    if (filters.chitGroupId !== 'all') {
      filtered = filtered.filter(payment => payment.chitGroupId?._id === filters.chitGroupId);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(payment => payment.paymentStatus === filters.status);
    }

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.memberName?.toLowerCase().includes(searchLower) ||
        payment.memberId?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPayments(filtered);
  };

  const getStatusBadge = (status) => {
    const colors = {
      Paid: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Partial: 'bg-blue-100 text-blue-800',
      Overdue: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || colors.Pending}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/payments/pending')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              View Pending Payments
            </button>
            <button
              onClick={() => navigate('/payments/record')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Record Payment
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chit Group
              </label>
              <select
                value={filters.chitGroupId}
                onChange={(e) => setFilters(prev => ({ ...prev, chitGroupId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Chit Groups</option>
                {chitGroups.map(group => (
                  <option key={group._id} value={group._id}>{group.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Member
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by member name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
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
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chit Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Auction #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Amount
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map(payment => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {payment.memberName || payment.memberId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.chitGroupId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.auctionNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(payment.dueAmount || payment.amountDue)}
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
                    <td className="px-6 py-4 text-right text-sm">
                      {payment.paymentStatus !== 'Paid' && (
                        <button
                          onClick={() => navigate(`/payments/record?paymentId=${payment._id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Record Payment
                        </button>
                      )}
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
    </AdminLayout>
  );
};

export default PaymentHistoryPage;
