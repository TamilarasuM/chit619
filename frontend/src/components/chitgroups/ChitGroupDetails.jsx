import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate,
  getChitStatusColor,
  getPaymentStatusColor,
  getAuctionStatusColor
} from '../../utils/formatters';

const ChitGroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chitGroup, setChitGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, members, auctions, payments
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [groupedPayments, setGroupedPayments] = useState({});
  const [selectedAuction, setSelectedAuction] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState('all');

  useEffect(() => {
    if (id) {
      fetchChitGroupDetails();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'payments' && id) {
      fetchPayments();
    }
  }, [activeTab, id]);

  const fetchChitGroupDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/chitgroups/${id}`);

      if (response.success) {
        // Backend returns { chitGroup, auctions, progress } inside response.data
        const { chitGroup, auctions, progress } = response.data;

        // Merge auctions into chitGroup for easy access
        setChitGroup({
          ...chitGroup,
          auctions: auctions || [],
          progress: progress || {}
        });
      }
    } catch (err) {
      console.error('Error fetching chit group details:', err);
      setError(err.response?.data?.error || 'Failed to load chit group details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const response = await api.get(`/payments/chitgroup/${id}`);

      if (response.success) {
        setPayments(response.data || []);
        setGroupedPayments(response.groupedByAuction || {});
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!window.confirm('Are you sure you want to activate this chit group?')) {
      return;
    }

    try {
      const response = await api.post(`/chitgroups/${id}/activate`, {});
      if (response.success) {
        alert('Chit group activated successfully!');
        fetchChitGroupDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to activate chit group');
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close this chit group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.post(`/chitgroups/${id}/close`, {});
      if (response.success) {
        alert('Chit group closed successfully!');
        fetchChitGroupDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close chit group');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this chit group? This action cannot be undone and will remove all associated data.')) {
      return;
    }

    try {
      const response = await api.delete(`/chitgroups/${id}`);
      if (response.success) {
        alert('Chit group deleted successfully!');
        navigate('/chitgroups');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete chit group');
    }
  };

  const handleDeleteAuction = async (auctionId, auctionNumber) => {
    if (!window.confirm(`Are you sure you want to delete Auction #${auctionNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/auctions/${auctionId}`);
      if (response.success) {
        alert('Auction deleted successfully!');
        fetchChitGroupDetails();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete auction');
    }
  };

  const getStatusBadge = (status) => {
    const color = getChitStatusColor(status);
    const bgColors = {
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${bgColors[color] || bgColors.gray}`}>
        {status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const color = getPaymentStatusColor(status);
    const bgColors = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      red: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bgColors[color] || bgColors.gray}`}>
        {status}
      </span>
    );
  };

  const getAuctionStatusBadge = (status) => {
    const color = getAuctionStatusColor(status);
    const bgColors = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bgColors[color] || bgColors.gray}`}>
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

  if (error || !chitGroup) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error || 'Chit group not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/chitgroups')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Chit Groups
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{chitGroup.name}</h1>
          <div className="mt-2 flex items-center space-x-3">
            {getStatusBadge(chitGroup.status)}
            <span className="text-sm text-gray-500">
              Created {formatDate(chitGroup.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          {chitGroup.status === 'InProgress' && (
            <>
              <button
                onClick={() => navigate(`/chitgroups/${id}/edit`)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={handleActivate}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Activate
              </button>
            </>
          )}

          {chitGroup.status === 'Active' && (
            <>
              <button
                onClick={() => navigate(`/auctions/schedule/${id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Schedule Auction
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Close Chit
              </button>
            </>
          )}

          {/* Delete button - always visible */}
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Chit Amount</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(chitGroup.chitAmount)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Auction Contribution</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(chitGroup.monthlyContribution)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Per auction</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Members</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {chitGroup.members?.length || 0} / {chitGroup.totalMembers}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Progress</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {chitGroup.status === 'Active' ? `Month ${chitGroup.currentMonth}` : chitGroup.status}
          </div>
          <div className="text-sm text-gray-500">of {chitGroup.duration} months</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {['overview', 'members', 'auctions', 'payments'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Chit Group Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{chitGroup.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(chitGroup.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Duration</dt>
                      <dd className="mt-1 text-sm text-gray-900">{chitGroup.duration} months</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Grace Period</dt>
                      <dd className="mt-1 text-sm text-gray-900">{chitGroup.gracePeriodDays} days</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Payment Model</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        Model {chitGroup.winnerPaymentModel}
                        <span className="text-gray-500 ml-2">
                          {chitGroup.winnerPaymentModel === 'A'
                            ? '(Winner pays full, no dividend)'
                            : '(Winner gets dividend always)'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Financial Details</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Chit Amount</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900">
                        {formatCurrency(chitGroup.chitAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Commission Amount</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatCurrency(chitGroup.commissionAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Auction Contribution</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatCurrency(chitGroup.monthlyContribution)} <span className="text-xs text-gray-500">(per auction)</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Collection (Estimated)</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900">
                        {formatCurrency(chitGroup.chitAmount * chitGroup.duration)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Notes */}
              {chitGroup.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded">
                    {chitGroup.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Members ({chitGroup.members?.length || 0} / {chitGroup.totalMembers})
                </h3>
                {chitGroup.status === 'InProgress' && (
                  <button
                    onClick={() => navigate(`/chitgroups/${id}/add-member`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Add Member
                  </button>
                )}
              </div>

              {chitGroup.members && chitGroup.members.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Join Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Has Won
                        </th>
                        {chitGroup.status === 'InProgress' && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chitGroup.members.map((member) => (
                        <tr key={member._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {member.memberId?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {member.memberId?.phone || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.memberId?.email || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(member.joinedDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {member.hasWon ? (
                              <span className="text-green-600 font-medium">Yes</span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          {chitGroup.status === 'InProgress' && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => {
                                  if (window.confirm('Remove this member?')) {
                                    // Handle remove member
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No members added yet
                </div>
              )}
            </div>
          )}

          {/* Auctions Tab */}
          {activeTab === 'auctions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Auction History</h3>
                {chitGroup.status === 'Active' && (
                  <button
                    onClick={() => navigate(`/auctions/schedule/${id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Schedule New Auction
                  </button>
                )}
              </div>

              {chitGroup.auctions && chitGroup.auctions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Auction #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Winner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Winning Bid
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
                      {chitGroup.auctions.map((auction) => (
                        <tr key={auction._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{auction.auctionNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(auction.scheduledDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {auction.winnerName || 'TBD'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {auction.winningBid ? formatCurrency(auction.winningBid) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getAuctionStatusBadge(auction.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                            <button
                              onClick={() => navigate(`/auctions/${auction._id}/control`)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              {auction.status === 'Closed' ? 'View' : 'View/Control'}
                            </button>
                            {auction.status === 'Scheduled' && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDeleteAuction(auction._id, auction.auctionNumber)}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No auctions conducted yet
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              <div className="mb-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Payment Overview</h3>
                  <button
                    onClick={() => navigate(`/payments/record?chitGroupId=${id}`)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Record Payment
                  </button>
                </div>

                {/* Filters Row */}
                <div className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
                  {/* Auction Filter Dropdown */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Auction:</label>
                    <select
                      value={selectedAuction}
                      onChange={(e) => setSelectedAuction(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="all">All Auctions</option>
                      {Object.keys(groupedPayments).sort((a, b) => parseInt(b) - parseInt(a)).map((auctionNum) => (
                        <option key={auctionNum} value={auctionNum}>
                          Auction #{auctionNum}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Member Filter Dropdown */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Member:</label>
                    <select
                      value={selectedMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
                    >
                      <option value="all">All Members</option>
                      {(() => {
                        // Get unique members from payments
                        const uniqueMembers = Array.from(
                          new Map(
                            payments.map(p => [
                              p.memberId?._id || p.memberId,
                              {
                                id: p.memberId?._id || p.memberId,
                                name: p.memberId?.name || p.memberName || 'Unknown',
                                phone: p.memberId?.phone || ''
                              }
                            ])
                          ).values()
                        ).sort((a, b) => a.name.localeCompare(b.name));

                        return uniqueMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} {member.phone ? `(${member.phone})` : ''}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  {/* Payment Status Filter */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Status:</label>
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>

                  {/* Clear Filters Button */}
                  {(selectedAuction !== 'all' || selectedMember !== 'all' || paymentStatusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSelectedAuction('all');
                        setSelectedMember('all');
                        setPaymentStatusFilter('all');
                      }}
                      className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {paymentsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment records found for this chit group
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Payment Summary */}
                  {(() => {
                    // Filter payments based on selected auction, member, and status
                    const filteredPayments = payments.filter(payment => {
                      const auctionMatch = selectedAuction === 'all' || payment.auctionNumber?.toString() === selectedAuction;
                      const memberMatch = selectedMember === 'all' || (payment.memberId?._id || payment.memberId) === selectedMember;
                      const statusMatch = paymentStatusFilter === 'all' || payment.paymentStatus === paymentStatusFilter;
                      return auctionMatch && memberMatch && statusMatch;
                    });

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-500">Total Due</div>
                          <div className="mt-1 text-xl font-bold text-gray-900">
                            {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.dueAmount, 0))}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {filteredPayments.length} payment(s)
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-500">Total Paid</div>
                          <div className="mt-1 text-xl font-bold text-green-700">
                            {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.paidAmount, 0))}
                          </div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-500">Outstanding</div>
                          <div className="mt-1 text-xl font-bold text-yellow-700">
                            {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.outstandingBalance, 0))}
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-500">Total Dividends</div>
                          <div className="mt-1 text-xl font-bold text-purple-700">
                            {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.dividendReceived, 0))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payments grouped by auction */}
                  {Object.keys(groupedPayments)
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .filter(auctionNum => selectedAuction === 'all' || auctionNum === selectedAuction)
                    .map((auctionNum) => {
                    const auctionPayments = groupedPayments[auctionNum].filter(payment => {
                      const memberMatch = selectedMember === 'all' || (payment.memberId?._id || payment.memberId) === selectedMember;
                      const statusMatch = paymentStatusFilter === 'all' || payment.paymentStatus === paymentStatusFilter;
                      return memberMatch && statusMatch;
                    });

                    // Skip this auction if no payments match the filter
                    if (auctionPayments.length === 0) return null;

                    const auctionTotal = auctionPayments.reduce((sum, p) => sum + p.dueAmount, 0);
                    const auctionPaid = auctionPayments.reduce((sum, p) => sum + p.paidAmount, 0);
                    const auctionOutstanding = auctionPayments.reduce((sum, p) => sum + p.outstandingBalance, 0);

                    // Calculate rankings based on payment timeliness
                    const rankedPayments = auctionPayments.map(payment => {
                      let score = 0;
                      let rankLabel = '';
                      let rankColor = '';

                      if (payment.paymentStatus === 'Paid') {
                        // Check if paid on time (before or on due date)
                        const dueDate = new Date(payment.dueDate);
                        const paidDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();

                        if (paidDate <= dueDate) {
                          score = 100; // Paid on time
                          rankLabel = '⭐ On Time';
                          rankColor = 'text-green-600 bg-green-50';
                        } else {
                          score = 75; // Paid but late
                          rankLabel = '✓ Paid Late';
                          rankColor = 'text-blue-600 bg-blue-50';
                        }
                      } else if (payment.paymentStatus === 'Partial') {
                        score = 50;
                        rankLabel = '◐ Partial';
                        rankColor = 'text-yellow-600 bg-yellow-50';
                      } else if (payment.paymentStatus === 'Overdue') {
                        score = 0;
                        rankLabel = '⚠ Overdue';
                        rankColor = 'text-red-600 bg-red-50';
                      } else {
                        score = 25;
                        rankLabel = '○ Pending';
                        rankColor = 'text-gray-600 bg-gray-50';
                      }

                      return { ...payment, score, rankLabel, rankColor };
                    }).sort((a, b) => b.score - a.score); // Sort by score descending

                    return (
                      <div key={auctionNum} className="border rounded-lg overflow-hidden">
                        {/* Auction Header */}
                        <div className="bg-gray-100 px-6 py-3 border-b">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-gray-900">Auction #{auctionNum}</h4>
                            <div className="flex space-x-6 text-sm">
                              <span className="text-gray-600">
                                Due: <span className="font-medium text-gray-900">{formatCurrency(auctionTotal)}</span>
                              </span>
                              <span className="text-gray-600">
                                Paid: <span className="font-medium text-green-700">{formatCurrency(auctionPaid)}</span>
                              </span>
                              <span className="text-gray-600">
                                Outstanding: <span className="font-medium text-yellow-700">{formatCurrency(auctionOutstanding)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Payments Table */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Rank
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Member
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Due Date
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                  Base Amount
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                  Dividend
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                  Due Amount
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                  Paid
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                  Outstanding
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  Payment Performance
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {rankedPayments.map((payment, index) => (
                                <tr key={payment._id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className={`text-2xl font-bold ${
                                        index === 0 ? 'text-yellow-500' :
                                        index === 1 ? 'text-gray-400' :
                                        index === 2 ? 'text-orange-600' :
                                        'text-gray-300'
                                      }`}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                      {payment.memberId?.name || payment.memberName || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {payment.memberId?.phone || ''}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(payment.dueDate)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                    {formatCurrency(payment.baseAmount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 text-right font-medium">
                                    {formatCurrency(payment.dividendReceived)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                                    {formatCurrency(payment.dueAmount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                                    {formatCurrency(payment.paidAmount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-700 text-right font-medium">
                                    {formatCurrency(payment.outstandingBalance)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {getPaymentStatusBadge(payment.paymentStatus)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${payment.rankColor}`}>
                                      {payment.rankLabel}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    {payment.outstandingBalance > 0 && (
                                      <button
                                        onClick={() => navigate(`/payments/record?paymentId=${payment._id}`)}
                                        className="text-green-600 hover:text-green-900 font-medium"
                                      >
                                        Record
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChitGroupDetails;
