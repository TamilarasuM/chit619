import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate
} from '../../utils/formatters';
import Button from '../common/Button';
import Card from '../common/Card';
import Loading from '../common/Loading';

const MemberPassbook = ({ memberId }) => {
  const { user } = useAuth();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    chitGroup: '',
    dateFrom: '',
    dateTo: ''
  });

  const effectiveMemberId = memberId || user?._id;

  useEffect(() => {
    if (effectiveMemberId) {
      fetchStatement();
    }
  }, [effectiveMemberId, filter]);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filter.chitGroup) params.append('chitGroup', filter.chitGroup);
      if (filter.dateFrom) params.append('dateFrom', filter.dateFrom);
      if (filter.dateTo) params.append('dateTo', filter.dateTo);

      const response = await api.get(
        `/reports/member-statement/${effectiveMemberId}?${params.toString()}`
      );

      setStatement(response.data);
    } catch (err) {
      console.error('Error fetching member statement:', err);
      setError(err.response?.data?.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.chitGroup) params.append('chitGroup', filter.chitGroup);
      if (filter.dateFrom) params.append('dateFrom', filter.dateFrom);
      if (filter.dateTo) params.append('dateTo', filter.dateTo);
      params.append('format', 'pdf');

      const response = await api.get(
        `/reports/member-statement/${effectiveMemberId}?${params.toString()}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement_${effectiveMemberId}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilter(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilter({
      chitGroup: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Member Passbook / Statement
        </h1>
        <Button
          onClick={downloadPDF}
          disabled={!statement || statement.transactions.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          Download PDF
        </Button>
      </div>

      {/* Member Information */}
      {statement && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Member Name</div>
              <div className="text-lg font-semibold text-gray-900">
                {statement.member?.name || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Member ID</div>
              <div className="text-lg font-semibold text-gray-900">
                {statement.member?.membershipId || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Phone</div>
              <div className="text-lg font-semibold text-gray-900">
                {statement.member?.phone || 'N/A'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Chit Group Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Chit Group
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filter.chitGroup}
              onChange={(e) => handleFilterChange('chitGroup', e.target.value)}
            >
              <option value="">All Chit Groups</option>
              {statement?.chitGroups?.map((chit) => (
                <option key={chit._id} value={chit._id}>
                  {chit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filter.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filter.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* Clear Filters */}
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

      {/* Summary Cards */}
      {statement && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="text-sm text-gray-500">Total Contributions</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(statement.summary?.totalContributions || 0)}
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Total Dividends</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statement.summary?.totalDividends || 0)}
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Prize Amount</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(statement.summary?.prizeAmount || 0)}
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Net Balance</div>
            <div className={`text-2xl font-bold ${
              (statement.summary?.netBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(statement.summary?.netBalance || 0)}
            </div>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Transaction Table */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Transaction History
        </h3>

        {!statement || statement.transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chit Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statement.transactions.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.chitGroup || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description}
                      {transaction.month && (
                        <div className="text-xs text-gray-500">Month: {transaction.month}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {transaction.type === 'debit' ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(transaction.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {transaction.type === 'credit' ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(transaction.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                      <span className={transaction.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(transaction.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    Closing Balance:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                    {formatCurrency(statement.summary?.totalContributions || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                    {formatCurrency(
                      (statement.summary?.totalDividends || 0) + (statement.summary?.prizeAmount || 0)
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                    (statement.summary?.netBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(statement.summary?.netBalance || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Legend */}
      <Card className="bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <span className="text-red-600 font-medium mr-2">Debit:</span>
            <span className="text-gray-600">Monthly contributions paid by you</span>
          </div>
          <div className="flex items-center">
            <span className="text-green-600 font-medium mr-2">Credit:</span>
            <span className="text-gray-600">Dividends received & Prize amount (if won)</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-700 font-medium mr-2">Balance:</span>
            <span className="text-gray-600">Running balance (Credit - Debit)</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-700 font-medium mr-2">Net Balance:</span>
            <span className="text-gray-600">Final balance after all transactions</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MemberPassbook;
