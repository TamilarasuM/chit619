import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

const MemberStatementPage = () => {
  const { chitGroupId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState(null);
  const [chitGroup, setChitGroup] = useState(null);

  useEffect(() => {
    if (chitGroupId) {
      fetchStatement();
    }
  }, [chitGroupId]);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/member/chits/${chitGroupId}/statement`);
      if (response.success) {
        setStatement(response.data);
        setChitGroup(response.data.chitGroup);
      }
    } catch (err) {
      console.error('Error fetching statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/member/chits/${chitGroupId}/statement?format=pdf`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement_${chitGroup?.name || 'chit'}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Statement not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Member Statement</h1>
            <p className="mt-1 text-gray-600">{chitGroup?.name || 'Chit Group'}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Download PDF
            </button>
            <button
              onClick={() => navigate('/member/dashboard')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Total Contributions</div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(statement.summary?.totalContributions || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Dividends</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(statement.summary?.totalDividends || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Net Contributions</div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(statement.summary?.netContributions || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Outstanding</div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(statement.summary?.outstandingAmount || 0)}
              </div>
            </div>
          </div>

          {statement.summary?.auctionWon && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-900">Auction Won</h3>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-green-700">Auction #</div>
                  <div className="font-semibold">{statement.summary.auctionWon.auctionNumber}</div>
                </div>
                <div>
                  <div className="text-green-700">Bid Amount</div>
                  <div className="font-semibold">{formatCurrency(statement.summary.auctionWon.bidAmount)}</div>
                </div>
                <div>
                  <div className="text-green-700">Received</div>
                  <div className="font-semibold">{formatCurrency(statement.summary.auctionWon.receivedAmount)}</div>
                </div>
                <div>
                  <div className="text-green-700">Commission Paid</div>
                  <div className="font-semibold">{formatCurrency(statement.summary.auctionWon.commissionPaid)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Transaction History</h2>
          </div>

          {statement.transactions && statement.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Credit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statement.transactions.map((txn, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(txn.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {txn.auctionNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {txn.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {txn.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-red-600">
                        {txn.debit ? formatCurrency(txn.debit) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-green-600">
                        {txn.credit ? formatCurrency(txn.credit) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(txn.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberStatementPage;
