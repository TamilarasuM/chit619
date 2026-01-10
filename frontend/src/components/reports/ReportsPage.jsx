import React, { useState } from 'react';
import ReportSelector from './ReportSelector';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Card from '../common/Card';

const ReportsPage = () => {
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState(null);

  const handleReportGenerate = (type, data) => {
    setReportType(type);
    setReportData(data);
  };

  const renderReportContent = () => {
    if (!reportData || !reportType) {
      return (
        <Card>
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Report Generated</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select report options above and click "Generate Report" to view data.
            </p>
          </div>
        </Card>
      );
    }

    switch (reportType) {
      case 'payment-history':
        return renderPaymentHistory();
      case 'auction-history':
        return renderAuctionHistory();
      case 'outstanding':
        return renderOutstanding();
      case 'dividend-summary':
        return renderDividendSummary();
      case 'member-statement':
        return renderMemberStatement();
      case 'chit-summary':
        return renderChitSummary();
      case 'financial':
        return renderFinancial();
      default:
        return <div>Unknown report type</div>;
    }
  };

  const renderPaymentHistory = () => (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Payment History Report</h3>
      {reportData.payments && reportData.payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chit Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.payments.map((payment, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(payment.paymentDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.chitGroup?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.installmentMonth}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(payment.amountPaid)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No payment history data available</p>
      )}
    </Card>
  );

  const renderAuctionHistory = () => (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Auction History Report</h3>
      {reportData.auctions && reportData.auctions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chit Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bid Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dividend</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.auctions.map((auction, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(auction.auctionDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{auction.chitGroup?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{auction.winner?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(auction.winningBid)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(auction.dividendPerMember)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No auction history data available</p>
      )}
    </Card>
  );

  const renderOutstanding = () => (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Outstanding Payments Report</h3>
      {reportData.outstanding && reportData.outstanding.length > 0 ? (
        <>
          <div className="mb-6 p-4 bg-red-50 rounded">
            <div className="text-lg font-semibold text-red-900">
              Total Outstanding: {formatCurrency(reportData.totalOutstanding || 0)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chit Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.outstanding.map((payment, idx) => (
                  <tr key={idx} className={payment.daysOverdue > 0 ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.member?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.chitGroup?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(payment.dueDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(payment.outstandingAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {payment.daysOverdue || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-gray-500">No outstanding payments</p>
      )}
    </Card>
  );

  const renderDividendSummary = () => (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Dividend Distribution Summary</h3>
      {reportData.dividends && reportData.dividends.length > 0 ? (
        <>
          <div className="mb-6 p-4 bg-green-50 rounded">
            <div className="text-lg font-semibold text-green-900">
              Total Dividends Distributed: {formatCurrency(reportData.totalDividends || 0)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chit Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auction Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dividend Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.dividends.map((dividend, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{dividend.member?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{dividend.chitGroup?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(dividend.auctionDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(dividend.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-gray-500">No dividend data available</p>
      )}
    </Card>
  );

  const renderMemberStatement = () => (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Member Complete Statement</h3>
      {reportData.member && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <div className="text-lg font-semibold text-blue-900">
            {reportData.member.name} - {reportData.member.membershipId}
          </div>
        </div>
      )}
      {reportData.transactions && reportData.transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.transactions.map((txn, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(txn.date)}</td>
                  <td className="px-6 py-4 text-sm">{txn.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                    {txn.type === 'debit' ? formatCurrency(txn.amount) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                    {txn.type === 'credit' ? formatCurrency(txn.amount) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                    {formatCurrency(txn.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No transaction data available</p>
      )}
    </Card>
  );

  const renderChitSummary = () => (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Chit Group Summary Report</h3>
      {reportData.chitGroup && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded">
            <div>
              <div className="text-sm text-gray-600">Chit Name</div>
              <div className="text-lg font-semibold">{reportData.chitGroup.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-lg font-semibold">{formatCurrency(reportData.chitGroup.chitAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-lg font-semibold">{reportData.chitGroup.status}</div>
            </div>
          </div>

          {reportData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Total Members</div>
                <div className="text-2xl font-bold">{reportData.summary.totalMembers}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Total Collected</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.summary.totalCollected)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Total Distributed</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(reportData.summary.totalDistributed)}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Commission Earned</div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(reportData.summary.commissionEarned)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  const renderFinancial = () => (
    <Card>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Financial / Revenue Report</h3>
      {reportData.summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Total Collections</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(reportData.summary.totalCollections)}
              </div>
            </div>
            <div className="p-6 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Total Distributions</div>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(reportData.summary.totalDistributions)}
              </div>
            </div>
            <div className="p-6 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-600">Total Commission</div>
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(reportData.summary.totalCommission)}
              </div>
            </div>
          </div>

          {reportData.byChitGroup && reportData.byChitGroup.length > 0 && (
            <div className="overflow-x-auto">
              <h4 className="text-lg font-semibold mb-3">By Chit Group</h4>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chit Group</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collections</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Distributions</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.byChitGroup.map((chit, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{chit.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                        {formatCurrency(chit.collections)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                        {formatCurrency(chit.distributions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                        {formatCurrency(chit.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <ReportSelector onReportGenerate={handleReportGenerate} />

      {renderReportContent()}
    </div>
  );
};

export default ReportsPage;
