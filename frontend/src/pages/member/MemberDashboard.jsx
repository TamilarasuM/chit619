import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common';
import api from '../../services/api';

const MemberDashboard = () => {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/member');
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              My Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name}
              </span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Quick Stats */}
              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">My Chit Groups</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {dashboardData?.stats?.totalChitGroups || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Active Groups</p>
                  <p className="text-3xl font-bold text-green-600">
                    {dashboardData?.stats?.activeChitGroups || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Wins</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {dashboardData?.stats?.totalWins || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Monthly Due</p>
                  <p className="text-3xl font-bold text-red-600">
                    ₹{(dashboardData?.stats?.totalMonthlyDue || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </Card>
            </div>

            {/* My Chit Groups */}
            <Card title="My Chit Groups" className="mb-8">
              {dashboardData?.chitGroups && dashboardData.chitGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.chitGroups.map((chit) => (
                    <div
                      key={chit._id}
                      onClick={() => alert(`${chit.name}\n\n` +
                        `Chit Amount: ₹${chit.chitAmount.toLocaleString('en-IN')}\n` +
                        `Auction Contribution: ₹${chit.monthlyContribution.toLocaleString('en-IN')}\n` +
                        `Status: ${chit.status}\n` +
                        `Progress: ${chit.completedAuctions} / ${chit.duration} auctions (${chit.progressPercentage}%)\n` +
                        `${chit.hasWon ? `✓ Won in Auction #${chit.wonInAuction}` : 'Not won yet'}\n\n` +
                        `Click to view detailed statement (Coming soon in Phase 5!)`)}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md cursor-pointer transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">{chit.name}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          Amount: <span className="font-medium text-gray-900">₹{chit.chitAmount.toLocaleString('en-IN')}</span>
                        </p>
                        <p className="text-gray-600">
                          Monthly: <span className="font-medium text-gray-900">₹{chit.monthlyContribution.toLocaleString('en-IN')}</span>
                        </p>
                        <p className="text-gray-600">
                          Status: <span className={`font-medium ${chit.status === 'Active' ? 'text-green-600' : 'text-gray-900'}`}>{chit.status}</span>
                        </p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{chit.completedAuctions} / {chit.duration}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${chit.progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        {chit.hasWon && (
                          <p className="text-green-600 font-medium mt-2">
                            ✓ Won in Auction #{chit.wonInAuction}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">You are not part of any chit group yet.</p>
              )}
            </Card>

            {/* Monthly Transactions Table */}
            <Card title="My Monthly Transactions" className="mb-8">
              {dashboardData?.paymentTransactions && dashboardData.paymentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Chit Group</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Auction #</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Base Amount</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Dividend</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Net Payable</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Paid</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dashboardData.paymentTransactions.map((txn) => (
                        <tr
                          key={txn.id}
                          className={`hover:bg-gray-50 ${txn.isWinner ? 'bg-green-50' : ''}`}
                        >
                          <td className="px-4 py-3 text-gray-900">
                            {new Date(txn.dueDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900 font-medium">{txn.chitGroupName}</div>
                            {txn.isWinner && (
                              <div className="text-xs text-green-600 font-semibold">
                                ✓ Winner - Received ₹{txn.amountReceived?.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            #{txn.auctionNumber}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            ₹{txn.baseAmount?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600">
                            {txn.dividendReceived > 0 ? `-₹${txn.dividendReceived.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            ₹{txn.dueAmount?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={txn.paidAmount > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                              ₹{txn.paidAmount?.toLocaleString('en-IN')}
                            </span>
                            {txn.outstandingBalance > 0 && (
                              <div className="text-xs text-red-600">
                                Due: ₹{txn.outstandingBalance.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              txn.paymentStatus === 'Paid'
                                ? 'bg-green-100 text-green-800'
                                : txn.paymentStatus === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : txn.paymentStatus === 'Partial'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {txn.paymentStatus}
                            </span>
                            {txn.isOnTime === false && txn.delayDays > 0 && (
                              <div className="text-xs text-red-500 mt-1">
                                +{txn.delayDays}d late
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600 text-xs">
                            {txn.paymentMethod || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-right font-semibold text-gray-700">
                          Total Paid:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ₹{dashboardData.paymentTransactions
                            .filter(t => t.paymentStatus === 'Paid')
                            .reduce((sum, t) => sum + t.paidAmount, 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-right font-semibold text-gray-700">
                          Total Outstanding:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          ₹{dashboardData.paymentTransactions
                            .reduce((sum, t) => sum + t.outstandingBalance, 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600">No transaction history available</p>
              )}
            </Card>

            {/* Upcoming Auctions */}
            <Card title="Upcoming Auctions" className="mb-8">
              {dashboardData?.upcomingAuctions && dashboardData.upcomingAuctions.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.upcomingAuctions.map((auction) => (
                    <div
                      key={auction.id}
                      onClick={() => alert(`Auction Details\n\n` +
                        `Chit Group: ${auction.chitGroup}\n` +
                        `Auction Number: #${auction.auctionNumber}\n` +
                        `Date: ${new Date(auction.scheduledDate).toLocaleDateString('en-IN')}\n` +
                        `Time: ${auction.scheduledTime}\n` +
                        `Starting Bid: ₹${auction.startingBid.toLocaleString('en-IN')}\n\n` +
                        `You will be notified when the auction starts!\n` +
                        `(Live bidding feature coming soon!)`)}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-primary-50 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{auction.chitGroup}</p>
                        <p className="text-sm text-gray-600">Auction #{auction.auctionNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(auction.scheduledDate).toLocaleDateString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-500">{auction.scheduledTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No upcoming auctions</p>
              )}
            </Card>

            {/* Recent Activity */}
            <Card title="Recent Activity">
              {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-1">
                        <p className="text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.time).toLocaleString('en-IN')}
                        </p>
                      </div>
                      {activity.amount && (
                        <p className="font-semibold text-green-600">
                          ₹{activity.amount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No recent activity</p>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default MemberDashboard;
