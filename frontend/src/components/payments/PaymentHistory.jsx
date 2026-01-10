import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate,
  getPaymentStatusColor
} from '../../utils/formatters';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Loading from '../common/Loading';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [chitGroups, setChitGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    chitGroup: '',
    member: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Stats
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payments, filters, currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [paymentsRes, chitGroupsRes, membersRes] = await Promise.all([
        api.get('/payments'),
        api.get('/chitgroups'),
        api.get('/members')
      ]);

      setPayments(paymentsRes.data.data || []);
      setChitGroups(chitGroupsRes.data.data || []);
      setMembers(membersRes.data.data || []);

      calculateStats(paymentsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err.response?.data?.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const totalPayments = paymentsData.length;
    const totalAmount = paymentsData.reduce((sum, p) => sum + (p.amountDue || 0), 0);
    const paidAmount = paymentsData
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const pendingAmount = paymentsData
      .filter(p => p.status !== 'Paid')
      .reduce((sum, p) => sum + ((p.amountDue || 0) - (p.amountPaid || 0)), 0);

    setStats({ totalPayments, totalAmount, paidAmount, pendingAmount });
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Chit group filter
    if (filters.chitGroup) {
      filtered = filtered.filter(p => p.chitGroup?._id === filters.chitGroup);
    }

    // Member filter
    if (filters.member) {
      filtered = filtered.filter(p => p.member?._id === filters.member);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // Date from filter
    if (filters.dateFrom) {
      filtered = filtered.filter(p =>
        new Date(p.dueDate) >= new Date(filters.dateFrom)
      );
    }

    // Date to filter
    if (filters.dateTo) {
      filtered = filtered.filter(p =>
        new Date(p.dueDate) <= new Date(filters.dateTo)
      );
    }

    // Search filter (member name or transaction ref)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.member?.name?.toLowerCase().includes(searchLower) ||
        p.transactionRef?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPayments(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      chitGroup: '',
      member: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    // Prepare CSV headers
    const headers = [
      'Date',
      'Member',
      'Chit Group',
      'Month',
      'Amount Due',
      'Amount Paid',
      'Status',
      'Payment Method',
      'Transaction Ref',
      'Payment Date'
    ];

    // Prepare CSV rows
    const rows = filteredPayments.map(payment => [
      formatDate(payment.dueDate),
      payment.member?.name || 'N/A',
      payment.chitGroup?.name || 'N/A',
      payment.installmentMonth || 'N/A',
      payment.amountDue || 0,
      payment.amountPaid || 0,
      payment.status,
      payment.paymentMethod || 'N/A',
      payment.transactionRef || 'N/A',
      payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <Button
          onClick={exportToCSV}
          disabled={filteredPayments.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          Export to CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-sm text-gray-500">Total Payments</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalPayments}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Paid Amount</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Pending Amount</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.pendingAmount)}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <Input
              label="Search"
              placeholder="Member name or ref..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Chit Group Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chit Group
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.chitGroup}
              onChange={(e) => handleFilterChange('chitGroup', e.target.value)}
            >
              <option value="">All Chit Groups</option>
              {chitGroups.map((chit) => (
                <option key={chit._id} value={chit._id}>
                  {chit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Member Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.member}
              onChange={(e) => handleFilterChange('member', e.target.value)}
            >
              <option value="">All Members</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <Input
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <Input
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button
              onClick={clearFilters}
              variant="secondary"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Table */}
      <Card>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No payments found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
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
                      Amount Paid
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPayments.map((payment) => {
                    const statusColor = getPaymentStatusColor(payment.status);
                    return (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.dueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.member?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.chitGroup?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.installmentMonth || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(payment.amountDue || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(payment.amountPaid || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.paymentMethod || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => {/* TODO: Open payment details modal */}}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, filteredPayments.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredPayments.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        // Show only a few page numbers around current page
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => goToPage(pageNumber)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNumber
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return (
                            <span
                              key={pageNumber}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentHistory;
