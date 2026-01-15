import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common';
import api from '../../services/api';

const MemberDashboard = () => {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChitGroup, setSelectedChitGroup] = useState('all');

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
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all"
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

                        {/* Last Auction Winner Info */}
                        {chit.lastAuction && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Last Auction (#{chit.lastAuction.auctionNumber})</p>
                            <div className="bg-blue-50 rounded p-2 space-y-1">
                              <p className="text-gray-700">
                                Winner: <span className="font-semibold text-blue-700">{chit.lastAuction.winnerName}</span>
                              </p>
                              <p className="text-gray-700">
                                Winning Bid: <span className="font-semibold text-green-600">₹{chit.lastAuction.winningBid?.toLocaleString('en-IN')}</span>
                              </p>
                              <p className="text-gray-600 text-xs">
                                Dividend: ₹{chit.lastAuction.dividendPerMember?.toLocaleString('en-IN')} per member
                              </p>
                            </div>
                          </div>
                        )}
                        {!chit.lastAuction && chit.completedAuctions === 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 italic">No auctions completed yet</p>
                          </div>
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
                <div>
                  {/* Filter by Chit Group */}
                  <div className="mb-4 flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filter by Chit Group:</label>
                    <select
                      value={selectedChitGroup}
                      onChange={(e) => setSelectedChitGroup(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="all">All Chit Groups</option>
                      {dashboardData.chitGroups?.map((chit) => (
                        <option key={chit._id} value={chit._id}>
                          {chit.name}
                        </option>
                      ))}
                    </select>
                    {selectedChitGroup !== 'all' && (
                      <button
                        onClick={() => setSelectedChitGroup('all')}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>

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
                        {dashboardData.paymentTransactions
                          .filter(txn => selectedChitGroup === 'all' || txn.chitGroupId === selectedChitGroup)
                          .map((txn) => (
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
                        {dashboardData.paymentTransactions.filter(txn => selectedChitGroup === 'all' || txn.chitGroupId === selectedChitGroup).length === 0 && (
                          <tr>
                            <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                              No transactions found for the selected chit group
                            </td>
                          </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-right font-semibold text-gray-700">
                          Total Paid{selectedChitGroup !== 'all' ? ' (filtered)' : ''}:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ₹{dashboardData.paymentTransactions
                            .filter(t => selectedChitGroup === 'all' || t.chitGroupId === selectedChitGroup)
                            .filter(t => t.paymentStatus === 'Paid')
                            .reduce((sum, t) => sum + t.paidAmount, 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-right font-semibold text-gray-700">
                          Total Outstanding{selectedChitGroup !== 'all' ? ' (filtered)' : ''}:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          ₹{dashboardData.paymentTransactions
                            .filter(t => selectedChitGroup === 'all' || t.chitGroupId === selectedChitGroup)
                            .reduce((sum, t) => sum + t.outstandingBalance, 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No transaction history available</p>
              )}
            </Card>

            {/* Upcoming Auctions */}
            <Card title="Upcoming Auctions" className="mb-8">
              {dashboardData?.upcomingAuctions && dashboardData.upcomingAuctions.length > 0 ? (
                <div>
                  {/* Filter for upcoming auctions */}
                  <div className="mb-4 flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filter:</label>
                    <select
                      value={selectedChitGroup}
                      onChange={(e) => setSelectedChitGroup(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="all">All Chit Groups</option>
                      {dashboardData.chitGroups?.map((chit) => (
                        <option key={chit._id} value={chit._id}>
                          {chit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    {dashboardData.upcomingAuctions
                      .filter(auction => selectedChitGroup === 'all' || auction.chitGroupId === selectedChitGroup)
                      .map((auction) => (
                        <div
                          key={auction.id}
                          className={`flex justify-between items-center p-3 rounded transition-colors ${
                            auction.status === 'Live'
                              ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                              : 'bg-gray-50 hover:bg-primary-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{auction.chitGroup}</p>
                              {auction.status === 'Live' && (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">Auction #{auction.auctionNumber}</p>
                            <p className="text-xs text-gray-500">
                              Starting Bid: ₹{auction.startingBid?.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(auction.scheduledDate).toLocaleDateString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-500">{auction.scheduledTime}</p>
                            {auction.status === 'Scheduled' && (
                              <span className="inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded mt-1">
                                Scheduled
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    {dashboardData.upcomingAuctions.filter(auction => selectedChitGroup === 'all' || auction.chitGroupId === selectedChitGroup).length === 0 && (
                      <p className="text-gray-500 text-sm">No upcoming auctions for this chit group</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600">No upcoming auctions scheduled</p>
                  <p className="text-sm text-gray-500 mt-1">All auctions for your chit groups have been completed or none are scheduled yet.</p>
                </div>
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
