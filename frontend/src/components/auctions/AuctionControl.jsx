import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate,
  getAuctionStatusColor
} from '../../utils/formatters';

const AuctionControl = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auction, setAuction] = useState(null);
  const [chitGroup, setChitGroup] = useState(null);
  const [bids, setBids] = useState([]);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [previousWinners, setPreviousWinners] = useState([]);
  const [manuallyExcluded, setManuallyExcluded] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('bidding');

  // Payment data
  const [paymentData, setPaymentData] = useState(null);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Bid on behalf modal state
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);

  // Exclude member modal state
  const [showExcludeModal, setShowExcludeModal] = useState(false);
  const [memberToExclude, setMemberToExclude] = useState(null);
  const [exclusionReason, setExclusionReason] = useState('');
  const [excludingMember, setExcludingMember] = useState(false);

  // Close auction / winner selection modal state
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [closingAuction, setClosingAuction] = useState(false);
  const [manualDividend, setManualDividend] = useState('');
  const [useManualDividend, setUseManualDividend] = useState(false);

  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetails();

      // Auto-refresh bids every 5 seconds if auction is Live
      const interval = setInterval(() => {
        if (auction?.status === 'Live') {
          fetchAuctionDetails(true); // Silent refresh
        }
      }, 5000);

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [auctionId, auction?.status]);

  useEffect(() => {
    // Fetch payments when switching to payments tab and auction is closed
    if (activeTab === 'payments' && auction?.status === 'Closed') {
      fetchPaymentData();
    }
  }, [activeTab, auction?.status]);

  useEffect(() => {
    // Refresh payment data when the page becomes visible again
    // This handles cases when user navigates back after recording a payment
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === 'payments' && auction?.status === 'Closed') {
        console.log('Page became visible, refreshing payment data...');
        fetchPaymentData();
      }
    };

    const handleFocus = () => {
      if (activeTab === 'payments' && auction?.status === 'Closed') {
        console.log('Window focused, refreshing payment data...');
        fetchPaymentData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab, auction?.status]);

  // Restore scroll position after data loads
  useEffect(() => {
    if (!loading && auction) {
      const savedScrollPosition = sessionStorage.getItem('auctionControlScrollPosition');
      if (savedScrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPosition, 10));
          sessionStorage.removeItem('auctionControlScrollPosition');
        }, 100);
      }
    }
  }, [loading, auction]);

  const fetchAuctionDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await api.get(`/auctions/${auctionId}`);

      if (response.success) {
        const auctionData = response.data;
        setAuction(auctionData);
        setChitGroup(auctionData.chitGroupId);
        setBids(auctionData.bids || []);

        // Calculate eligible members
        calculateEligibleMembers(auctionData);

        // If auction is closed and payments tab is active, fetch payments automatically
        if (auctionData.status === 'Closed' && activeTab === 'payments') {
          fetchPaymentData();
        }
      }
    } catch (err) {
      console.error('Error fetching auction details:', err);
      if (!silent) {
        setError(err.response?.data?.error || 'Failed to load auction details');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchPaymentData = async () => {
    try {
      setLoadingPayments(true);
      console.log('Fetching payment data for auction:', auctionId);

      // Add timestamp to bypass browser cache
      const timestamp = new Date().getTime();
      const response = await api.get(`/payments/auction/${auctionId}?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('Payment data response:', response);

      if (response.success) {
        console.log('Setting payment data:', response.data);
        setPaymentData(response.data);
      } else {
        console.error('Payment data fetch failed:', response);
        setError('Failed to load payment data');
      }
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError(err.response?.data?.error || 'Failed to load payment data');
    } finally {
      setLoadingPayments(false);
    }
  };

  const calculateEligibleMembers = (auctionData) => {
    if (!auctionData.chitGroupId || !auctionData.chitGroupId.members) {
      setEligibleMembers([]);
      setPreviousWinners([]);
      setManuallyExcluded([]);
      return;
    }

    const autoExcludedIds = (auctionData.autoExcludedMembers || []).map(id =>
      id._id?.toString() || id.toString()
    );
    const manualExcludedIds = (auctionData.manualExcludedMembers || []).map(e =>
      e.memberId._id?.toString() || e.memberId?.toString() || e.toString()
    );
    const bidderIds = (auctionData.bids || []).map(b =>
      b.memberId._id?.toString() || b.memberId.toString()
    );

    // Calculate previous winners
    const winners = auctionData.chitGroupId.members
      .filter(member => {
        const memberId = member.memberId._id?.toString() || member.memberId.toString();
        return autoExcludedIds.includes(memberId);
      })
      .map(member => ({
        ...member,
        wonInAuction: member.wonInAuction || 'Previous'
      }));

    // Calculate manually excluded members
    const excluded = auctionData.manualExcludedMembers?.map(exclusion => {
      const member = auctionData.chitGroupId.members.find(m =>
        (m.memberId._id?.toString() || m.memberId.toString()) ===
        (exclusion.memberId._id?.toString() || exclusion.memberId?.toString())
      );
      return {
        ...member,
        exclusionReason: exclusion.reason,
        excludedBy: exclusion.excludedBy
      };
    }).filter(Boolean) || [];

    // Calculate eligible members
    const eligible = auctionData.chitGroupId.members.filter(member => {
      const memberId = member.memberId._id?.toString() || member.memberId.toString();
      return !autoExcludedIds.includes(memberId) && !manualExcludedIds.includes(memberId);
    }).map(member => ({
      ...member,
      hasBid: bidderIds.includes(member.memberId._id?.toString() || member.memberId.toString()),
      isExcluded: false
    }));

    setEligibleMembers(eligible);
    setPreviousWinners(winners);
    setManuallyExcluded(excluded);
  };

  const handleStartAuction = async () => {
    if (!window.confirm('Start this auction? Members will be able to submit bids.')) {
      return;
    }

    try {
      const response = await api.post(`/auctions/${auctionId}/start`, {});

      if (response.success) {
        toast.success('Auction started successfully!');
        fetchAuctionDetails();
      }
    } catch (err) {
      console.error('Error starting auction:', err);
      toast.error(err.response?.data?.error || 'Failed to start auction');
    }
  };

  const handleOpenCloseAuction = () => {
    if (bids.length === 0) {
      toast.warning('Cannot close auction without any bids');
      return;
    }

    // Auto-select highest bidder by default
    const sortedBids = [...bids].sort((a, b) => b.bidAmount - a.bidAmount);
    setSelectedWinner(sortedBids[0].memberId);

    // Reset manual dividend states
    setManualDividend('');
    setUseManualDividend(false);

    setShowWinnerModal(true);
  };

  const handleCloseAuction = async (e) => {
    e.preventDefault();

    if (!selectedWinner) {
      toast.warning('Please select a winner');
      return;
    }

    setClosingAuction(true);

    try {
      const requestBody = {
        winnerId: selectedWinner
      };

      // Include manual dividend if it's being used
      if (useManualDividend && manualDividend) {
        requestBody.manualDividendPerMember = parseFloat(manualDividend);
      }

      const response = await api.post(`/auctions/${auctionId}/close`, requestBody);

      if (response.success) {
        toast.success('Auction closed successfully! Winner has been selected.');
        setShowWinnerModal(false);
        setSelectedWinner(null);
        setManualDividend('');
        setUseManualDividend(false);
        fetchAuctionDetails();
      }
    } catch (err) {
      console.error('Error closing auction:', err);
      toast.error(err.response?.data?.error || 'Failed to close auction');
    } finally {
      setClosingAuction(false);
    }
  };

  const handleOpenBidModal = (member) => {
    setSelectedMember(member);
    setBidAmount('');
    setShowBidModal(true);
  };

  const handleSubmitBid = async (e) => {
    e.preventDefault();

    if (!selectedMember || !bidAmount) {
      toast.warning('Please select a member and enter a bid amount');
      return;
    }

    const bidAmountNum = parseFloat(bidAmount);
    if (isNaN(bidAmountNum) || bidAmountNum < auction.startingBid) {
      toast.warning(`Bid amount must be at least ${formatCurrency(auction.startingBid)}`);
      return;
    }

    setSubmittingBid(true);

    try {
      const response = await api.post(`/auctions/${auctionId}/bid`, {
        memberId: selectedMember.memberId._id,
        bidAmount: bidAmountNum
      });

      if (response.success) {
        toast.success(`Bid submitted successfully for ${selectedMember.memberId.name}`);
        setShowBidModal(false);
        setSelectedMember(null);
        setBidAmount('');
        fetchAuctionDetails();
      }
    } catch (err) {
      console.error('Error submitting bid:', err);
      toast.error(err.response?.data?.error || 'Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleOpenExcludeModal = (member) => {
    setMemberToExclude(member);
    setExclusionReason('');
    setShowExcludeModal(true);
  };

  const handleQuickExclude = async (member, reason) => {
    // Directly exclude without confirmation
    try {
      // Save current scroll position before refresh
      sessionStorage.setItem('auctionControlScrollPosition', window.scrollY.toString());

      const response = await api.post(`/auctions/${auctionId}/exclude-member`, {
        memberId: member.memberId._id,
        reason: reason
      });

      if (response.success) {
        // Silently refresh without showing success alert
        fetchAuctionDetails();
      }
    } catch (err) {
      console.error('Error excluding member:', err);
      toast.error(err.response?.data?.error || 'Failed to exclude member');
      // Clear saved scroll position on error
      sessionStorage.removeItem('auctionControlScrollPosition');
    }
  };

  const handleExcludeMember = async (e) => {
    e.preventDefault();

    if (!memberToExclude || !exclusionReason.trim()) {
      toast.warning('Please provide a reason for exclusion');
      return;
    }

    setExcludingMember(true);

    try {
      const response = await api.post(`/auctions/${auctionId}/exclude-member`, {
        memberId: memberToExclude.memberId._id,
        reason: exclusionReason
      });

      if (response.success) {
        toast.success(`${memberToExclude.memberId.name} has been excluded from this auction`);
        setShowExcludeModal(false);
        setMemberToExclude(null);
        setExclusionReason('');
        fetchAuctionDetails();
      }
    } catch (err) {
      console.error('Error excluding member:', err);
      toast.error(err.response?.data?.error || 'Failed to exclude member');
    } finally {
      setExcludingMember(false);
    }
  };

  const handleRevertExclusion = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to make ${memberName} eligible for this auction again?`)) {
      return;
    }

    try {
      const response = await api.delete(`/auctions/${auctionId}/exclude-member/${memberId}`);

      if (response.success) {
        toast.success(`${memberName} has been made eligible for this auction`);
        fetchAuctionDetails();
      }
    } catch (err) {
      console.error('Error reverting exclusion:', err);
      toast.error(err.response?.data?.error || 'Failed to revert exclusion');
    }
  };

  const handleDeleteAuction = async () => {
    const confirmMessage = auction.status === 'Closed'
      ? `⚠️ WARNING: This will permanently delete Auction #${auction.auctionNumber} and ALL associated data including:\n\n` +
        `• ${paymentData?.payments?.length || 0} payment records\n` +
        `• Notifications\n` +
        `• Chit group statistics\n\n` +
        `This action CANNOT be undone!\n\n` +
        `Type "DELETE" to confirm:`
      : `Are you sure you want to delete Auction #${auction.auctionNumber}?\n\nThis will remove all associated data and cannot be undone.`;

    const userConfirmation = auction.status === 'Closed'
      ? window.prompt(confirmMessage)
      : window.confirm(confirmMessage);

    if (auction.status === 'Closed' && userConfirmation !== 'DELETE') {
      if (userConfirmation !== null) {
        toast.warning('Deletion cancelled. You must type "DELETE" exactly to confirm.');
      }
      return;
    }

    if (!auction.status === 'Closed' && !userConfirmation) {
      return;
    }

    try {
      const response = await api.delete(`/auctions/${auctionId}`);

      if (response.success) {
        toast.success(
          `Auction deleted successfully! Deleted: Auction #${response.data.auction}, ${response.data.paymentsDeleted} payment records, ${response.data.notificationsDeleted} notifications`,
          { autoClose: 5000 }
        );
        navigate('/auctions');
      }
    } catch (err) {
      console.error('Error deleting auction:', err);
      toast.error(err.response?.data?.error || 'Failed to delete auction');
    }
  };

  const getStatusBadge = (status) => {
    const color = getAuctionStatusColor(status);
    const bgColors = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${bgColors[color] || bgColors.gray}`}>
        {status}
      </span>
    );
  };

  const getHighestBid = () => {
    if (bids.length === 0) return null;
    return bids.reduce((max, bid) => bid.bidAmount > max.bidAmount ? bid : max);
  };

  const getLowestBid = () => {
    if (bids.length === 0) return null;
    return bids.reduce((min, bid) => bid.bidAmount < min.bidAmount ? bid : min);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error || 'Auction not found'}
      </div>
    );
  }

  const highestBid = getHighestBid();
  const lowestBid = getLowestBid();

  return (
    <div className="space-y-6">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/auctions')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Auctions List
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Auction Control</h1>
          <div className="mt-2 flex items-center space-x-3">
            {getStatusBadge(auction.status)}
            <span className="text-sm text-gray-500">
              Auction #{auction.auctionNumber} - {formatDate(auction.scheduledDate)}
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          {auction.status === 'Scheduled' && (
            <button
              onClick={handleStartAuction}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Start Auction
            </button>
          )}

          {auction.status === 'Live' && (
            <button
              onClick={handleOpenCloseAuction}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              disabled={bids.length === 0}
            >
              Close Auction & Select Winner
            </button>
          )}

          {auction.status === 'Live' && (
            <button
              onClick={() => fetchAuctionDetails()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {auction.status === 'Closed' && (
            <button
              onClick={() => navigate(`/auctions/${auctionId}/payments`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              View Payment Tracking
            </button>
          )}

          {/* Delete Auction Button */}
          <button
            onClick={handleDeleteAuction}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            title="Delete this auction and all related data"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Chit Group Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2">{chitGroup?.name}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Chit Amount:</span>
            <div className="font-semibold text-blue-900">{formatCurrency(chitGroup?.chitAmount)}</div>
          </div>
          <div>
            <span className="text-blue-700">Commission:</span>
            <div className="font-semibold text-blue-900">{formatCurrency(chitGroup?.commissionAmount)}</div>
          </div>
          <div>
            <span className="text-blue-700">Payment Model:</span>
            <div className="font-semibold text-blue-900">Model {chitGroup?.winnerPaymentModel}</div>
          </div>
          <div>
            <span className="text-blue-700">Auction:</span>
            <div className="font-semibold text-blue-900">
              {auction.auctionNumber} / {chitGroup?.duration}
            </div>
          </div>
        </div>
      </div>

      {/* Bid Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Bids</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{bids.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            of {eligibleMembers.length} eligible
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Highest Bid</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {highestBid ? formatCurrency(highestBid.bidAmount) : '-'}
          </div>
          {highestBid && (
            <div className="text-sm text-gray-500 mt-1">{highestBid.memberName}</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Lowest Bid</div>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {lowestBid ? formatCurrency(lowestBid.bidAmount) : '-'}
          </div>
          {lowestBid && (
            <div className="text-sm text-gray-500 mt-1">{lowestBid.memberName}</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Estimated Dividend</div>
          <div className="mt-2 text-2xl font-bold text-purple-600">
            {highestBid && eligibleMembers.length > 1
              ? formatCurrency(
                  Math.floor(
                    (highestBid.bidAmount - chitGroup?.commissionAmount) /
                    (eligibleMembers.length - 1)
                  )
                )
              : '-'}
          </div>
          <div className="text-sm text-gray-500 mt-1">per non-winner member</div>
        </div>
      </div>

      {/* Live Status Indicator */}
      {auction.status === 'Live' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <span className="font-medium text-green-900">
              Auction is LIVE - Auto-refreshing every 5 seconds
            </span>
          </div>
          <span className="text-sm text-green-700">
            {bids.length} bid(s) received
          </span>
        </div>
      )}

      {/* Tabs (for closed auctions) */}
      {auction.status === 'Closed' && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('bidding')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bidding'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bidding Details
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment Tracking
            </button>
          </nav>
        </div>
      )}

      {/* Payment Tracking Section */}
      {auction.status === 'Closed' && activeTab === 'payments' && (
        <div className="space-y-6">
          {loadingPayments ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="ml-4 text-gray-600">Loading payment data...</p>
            </div>
          ) : paymentData && paymentData.payments && paymentData.payments.length > 0 ? (
            <>
              {/* Payment Summary Header with Refresh Button */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Payment Overview</h3>
                <button
                  onClick={() => fetchPaymentData()}
                  className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={loadingPayments}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loadingPayments ? 'Refreshing...' : 'Refresh Payments'}
                </button>
              </div>

              {/* Payment Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500">Total Members</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{paymentData.stats.totalMembers}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500">Paid</div>
                  <div className="mt-2 text-2xl font-bold text-green-600">{paymentData.stats.paidCount}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500">Pending</div>
                  <div className="mt-2 text-2xl font-bold text-blue-600">{paymentData.stats.pendingCount}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500">Overdue</div>
                  <div className="mt-2 text-2xl font-bold text-red-600">{paymentData.stats.overdueCount}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm font-medium text-gray-500">Collection Rate</div>
                  <div className="mt-2 text-2xl font-bold text-blue-900">{paymentData.stats.collectionRate}%</div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Total Due</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(paymentData.stats.totalDue)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Paid</div>
                    <div className="text-xl font-bold text-green-600">{formatCurrency(paymentData.stats.totalPaid)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Outstanding</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(paymentData.stats.totalOutstanding)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Dividends</div>
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(paymentData.stats.totalDividends)}</div>
                  </div>
                </div>
              </div>

              {/* Pending Payments Section */}
              {paymentData.payments.filter(p =>
                p.paymentStatus === 'Pending' ||
                p.paymentStatus === 'Partial' ||
                p.paymentStatus === 'Overdue'
              ).length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-yellow-500">
                  <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-900">Pending Payments</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          {paymentData.payments.filter(p =>
                            p.paymentStatus === 'Pending' ||
                            p.paymentStatus === 'Partial' ||
                            p.paymentStatus === 'Overdue'
                          ).length} member(s) have outstanding payments
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentData.payments
                          .filter(p =>
                            p.paymentStatus === 'Pending' ||
                            p.paymentStatus === 'Partial' ||
                            p.paymentStatus === 'Overdue'
                          )
                          .map((payment) => (
                            <tr key={payment._id} className={`hover:bg-gray-50 ${
                              payment.paymentStatus === 'Overdue' ? 'bg-red-50' : ''
                            }`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {payment.memberId.name}
                                </div>
                                <div className="text-sm text-gray-500">{payment.memberId.phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(payment.dueAmount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                {formatCurrency(payment.paidAmount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                {formatCurrency(payment.outstandingBalance)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(payment.dueDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  payment.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                  payment.paymentStatus === 'Overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {payment.paymentStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => navigate(`/payments/record?paymentId=${payment._id}&chitGroupId=${payment.chitGroupId}`)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Record Payment
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Member Payment List - All Members */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">All Member Payments</h3>
                  <p className="text-sm text-gray-500 mt-1">Complete list of all members and their payment status</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dividend</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Create a list that includes all chit group members
                        const allMembers = chitGroup?.members || [];
                        const memberPayments = allMembers.map(member => {
                          const memberId = member.memberId._id || member.memberId;
                          const payment = paymentData.payments.find(p =>
                            (p.memberId._id || p.memberId) === memberId
                          );

                          if (payment) {
                            return { ...payment, hasPaymentRecord: true };
                          } else {
                            // Member without payment record
                            return {
                              _id: `no-payment-${memberId}`,
                              memberId: member.memberId,
                              baseAmount: chitGroup.monthlyContribution || 0,
                              dividendReceived: 0,
                              dueAmount: chitGroup.monthlyContribution || 0,
                              paidAmount: 0,
                              outstandingBalance: chitGroup.monthlyContribution || 0,
                              paymentStatus: 'Not Paid',
                              isWinner: false,
                              hasPaymentRecord: false
                            };
                          }
                        });

                        return memberPayments.map((payment) => (
                          <tr key={payment._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {payment.memberId.name}
                                {payment.isWinner && (
                                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Winner
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{payment.memberId.phone}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(payment.baseAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {payment.dividendReceived > 0 ? `-${formatCurrency(payment.dividendReceived)}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(payment.dueAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {formatCurrency(payment.paidAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                              {formatCurrency(payment.outstandingBalance)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                payment.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                                payment.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                payment.paymentStatus === 'Overdue' ? 'bg-red-100 text-red-800' :
                                payment.paymentStatus === 'Not Paid' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {payment.paymentStatus}
                              </span>
                              {!payment.hasPaymentRecord && (
                                <div className="text-xs text-gray-400 mt-1">No record</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {payment.paymentStatus === 'Paid' ? (
                                <button
                                  onClick={() => navigate(`/payments/record?paymentId=${payment._id}&chitGroupId=${chitGroup._id}`)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const params = payment.hasPaymentRecord
                                      ? `paymentId=${payment._id}&chitGroupId=${chitGroup._id}`
                                      : `chitGroupId=${chitGroup._id}&memberId=${payment.memberId._id || payment.memberId}`;
                                    navigate(`/payments/record?${params}`);
                                  }}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  {payment.paymentStatus === 'Partial' ? 'Add Payment' : 'Record Payment'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No Payment Data Available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {paymentData ?
                    'No payment records found for this auction. Payments are automatically created when the auction closes.' :
                    'Failed to load payment data. Please refresh the page or contact support.'}
                </p>
                <button
                  onClick={() => fetchPaymentData()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry Loading Payments
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bidding Content - show for non-closed auctions or when bidding tab is active */}
      {(auction.status !== 'Closed' || activeTab === 'bidding') && (
        <>
      {/* Previous Winners Section */}
      {previousWinners.length > 0 && (auction.status === 'Scheduled' || auction.status === 'Live') && (
        <div className="bg-white rounded-lg shadow border-l-4 border-yellow-500">
          <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
            <h2 className="text-xl font-semibold text-yellow-900">
              Previous Winners - Excluded ({previousWinners.length})
            </h2>
            <p className="text-sm text-yellow-700 mt-1">
              These members have already won in previous auctions and are automatically excluded
            </p>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Member Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Won In Auction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previousWinners.map((member) => (
                    <tr key={member.memberId._id} className="bg-yellow-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {member.memberId.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.memberId.phone}</div>
                        <div className="text-sm text-gray-500">{member.memberId.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-yellow-900">
                          Auction #{member.wonInAuction}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Already Won
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manually Excluded Members Section */}
      {manuallyExcluded.length > 0 && (auction.status === 'Scheduled' || auction.status === 'Live') && (
        <div className="bg-white rounded-lg shadow border-l-4 border-red-500">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <h2 className="text-xl font-semibold text-red-900">
              Manually Excluded Members ({manuallyExcluded.length})
            </h2>
            <p className="text-sm text-red-700 mt-1">
              These members have been excluded by admin for this specific auction
            </p>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Member Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Exclusion Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {manuallyExcluded.map((member) => (
                    <tr key={member.memberId._id} className="bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {member.memberId.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.memberId.phone}</div>
                        <div className="text-sm text-gray-500">{member.memberId.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {member.exclusionReason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Excluded
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleRevertExclusion(member.memberId._id, member.memberId.name)}
                          className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          Make Eligible
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Eligible Members Section */}
      {(auction.status === 'Scheduled' || auction.status === 'Live') && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              Eligible Members ({eligibleMembers.length})
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Members who can participate in this auction (excluding previous winners and manually excluded members)
            </p>
          </div>

          <div className="p-6">
            {eligibleMembers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No eligible members found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Member Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      {auction.status === 'Live' && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eligibleMembers.map((member) => (
                      <tr key={member.memberId._id} className={member.hasBid ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {member.memberId.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.memberId.phone}</div>
                          <div className="text-sm text-gray-500">{member.memberId.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.hasBid ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Bid Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Not Bid Yet
                            </span>
                          )}
                        </td>
                        {auction.status === 'Live' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end gap-2">
                              {!member.hasBid && (
                                <button
                                  onClick={() => handleOpenBidModal(member)}
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Place Bid
                                </button>
                              )}
                              <button
                                onClick={() => handleQuickExclude(member, 'Not interested in bidding')}
                                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                              >
                                Not Participating
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Winner Display (if closed) */}
      {auction.status === 'Closed' && auction.winnerId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">Auction Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-yellow-700">Winner</div>
              <div className="mt-1 text-lg font-bold text-yellow-900">
                {auction.winnerName || 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-yellow-700">Winning Bid</div>
              <div className="mt-1 text-lg font-bold text-yellow-900">
                {formatCurrency(auction.winningBid)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-yellow-700">Dividend per Member</div>
              <div className="mt-1 text-lg font-bold text-yellow-900">
                {formatCurrency(auction.dividendPerMember)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-yellow-700">Commission Collected</div>
              <div className="mt-1 text-base font-semibold text-yellow-900">
                {formatCurrency(auction.commissionCollected)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-yellow-700">Total Dividend Pool</div>
              <div className="mt-1 text-base font-semibold text-yellow-900">
                {formatCurrency(auction.totalDividend)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-yellow-700">Winner Receives</div>
              <div className="mt-1 text-base font-semibold text-yellow-900">
                {formatCurrency(chitGroup?.chitAmount - chitGroup?.commissionAmount - auction.winningBid)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bids List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            Bids Received ({bids.length})
          </h2>
        </div>

        <div className="p-6">
          {bids.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bids yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                {auction.status === 'Scheduled'
                  ? 'Start the auction to allow members to bid'
                  : 'Waiting for members to submit bids'}
              </p>
            </div>
          ) : (
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
                      Bid Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bid Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Placed By
                    </th>
                    {auction.status === 'Closed' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Result
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...bids]
                    .sort((a, b) => b.bidAmount - a.bidAmount)
                    .map((bid, index) => (
                      <tr
                        key={bid._id}
                        className={
                          auction.status === 'Closed' && bid.memberId === auction.winnerId
                            ? 'bg-yellow-50'
                            : index === 0
                            ? 'bg-green-50'
                            : ''
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900">#{index + 1}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {bid.memberName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-bold text-gray-900">
                            {formatCurrency(bid.bidAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(bid.bidTime, true)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {bid.placedByAdmin ? (
                            <div>
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                Admin
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {bid.placedByUserName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Self</span>
                          )}
                        </td>
                        {auction.status === 'Closed' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {bid.memberId === auction.winnerId ? (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                WINNER
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Auction Details */}
      {(auction.venue || auction.notes) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
          {auction.venue && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-500">Venue:</span>
              <div className="mt-1 text-sm text-gray-900">{auction.venue}</div>
            </div>
          )}
          {auction.notes && (
            <div>
              <span className="text-sm font-medium text-gray-500">Notes:</span>
              <div className="mt-1 text-sm text-gray-900">{auction.notes}</div>
            </div>
          )}
        </div>
      )}

      </>
      )}
      {/* End of Bidding Content Wrapper */}

      {/* Bid on Behalf Modal */}
      {showBidModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Place Bid on Behalf of {selectedMember.memberId.name}
              </h3>
              <form onSubmit={handleSubmitBid}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bid Amount
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={auction.startingBid}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Minimum: ${formatCurrency(auction.startingBid)}`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Starting bid: {formatCurrency(auction.startingBid)}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={submittingBid}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {submittingBid ? 'Submitting...' : 'Submit Bid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBidModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Exclude Member Modal */}
      {showExcludeModal && memberToExclude && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Exclude {memberToExclude.memberId.name} from Auction
              </h3>
              <form onSubmit={handleExcludeMember}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Exclusion
                  </label>

                  {/* Quick Reason Buttons */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExclusionReason('Not interested in bidding')}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Not Interested
                    </button>
                    <button
                      type="button"
                      onClick={() => setExclusionReason('Unable to attend auction')}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Can't Attend
                    </button>
                    <button
                      type="button"
                      onClick={() => setExclusionReason('Financial constraints')}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Financial Issue
                    </button>
                    <button
                      type="button"
                      onClick={() => setExclusionReason('Out of station')}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Out of Station
                    </button>
                    <button
                      type="button"
                      onClick={() => setExclusionReason('Already got funds from other source')}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Got Funds
                    </button>
                  </div>

                  <textarea
                    value={exclusionReason}
                    onChange={(e) => setExclusionReason(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Select a preset reason above or type custom reason..."
                    required
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum 200 characters
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={excludingMember}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {excludingMember ? 'Excluding...' : 'Exclude Member'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExcludeModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Winner Selection Modal */}
      {showWinnerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Winner for Auction #{auction.auctionNumber}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose the member who won this auction. The system will calculate dividends and create payment records.
              </p>
              <form onSubmit={handleCloseAuction}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Winner *
                  </label>
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                    {[...bids]
                      .sort((a, b) => b.bidAmount - a.bidAmount)
                      .map((bid, index) => (
                        <label
                          key={bid._id}
                          className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                            selectedWinner === bid.memberId ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="winner"
                            value={bid.memberId}
                            checked={selectedWinner === bid.memberId}
                            onChange={(e) => setSelectedWinner(e.target.value)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium text-gray-900">
                                  {bid.memberName}
                                </span>
                                {index === 0 && (
                                  <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Highest Bid
                                  </span>
                                )}
                                {bid.placedByAdmin && (
                                  <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Placed by Admin
                                  </span>
                                )}
                              </div>
                              <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(bid.bidAmount)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Bid placed: {formatDate(bid.bidTime, true)}
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Total {bids.length} bid(s) received. Highest bidder is pre-selected.
                  </p>
                </div>

                {selectedWinner && (() => {
                  const winningBid = bids.find(b => b.memberId === selectedWinner)?.bidAmount || 0;
                  const winnerReceives = chitGroup?.chitAmount - chitGroup?.commissionAmount - winningBid;
                  const totalDividend = winningBid - chitGroup?.commissionAmount;

                  // Use total members - 1 to get non-winner count
                  const nonWinnerCount = (chitGroup?.totalMembers || 0) - 1;
                  const autoDividendPerMember = nonWinnerCount > 0
                    ? Math.floor(totalDividend / nonWinnerCount)
                    : 0;

                  const finalDividend = useManualDividend && manualDividend
                    ? parseFloat(manualDividend)
                    : autoDividendPerMember;

                  return (
                    <div className="mb-4 space-y-3">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-900">
                          Winner will receive:
                        </p>
                        <p className="text-lg font-bold text-yellow-900">
                          {formatCurrency(winnerReceives)}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Chit Amount - Commission - Winning Bid
                        </p>
                      </div>

                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-green-900">
                            Dividend per non-winner member:
                          </p>
                          <label className="flex items-center text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useManualDividend}
                              onChange={(e) => {
                                setUseManualDividend(e.target.checked);
                                if (e.target.checked && !manualDividend) {
                                  setManualDividend(autoDividendPerMember.toString());
                                }
                              }}
                              className="mr-1"
                            />
                            <span className="text-green-700">Manual Override</span>
                          </label>
                        </div>

                        {useManualDividend ? (
                          <div>
                            <input
                              type="number"
                              value={manualDividend}
                              onChange={(e) => setManualDividend(e.target.value)}
                              className="w-full px-3 py-2 border border-green-300 rounded-md text-lg font-bold text-green-900 bg-white"
                              placeholder="Enter dividend amount"
                            />
                            <p className="text-xs text-green-700 mt-1">
                              Auto-calculated: {formatCurrency(autoDividendPerMember)} (Total: {formatCurrency(totalDividend)} ÷ {nonWinnerCount} members)
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-lg font-bold text-green-900">
                              {formatCurrency(autoDividendPerMember)}
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Total Dividend: {formatCurrency(totalDividend)} ÷ {nonWinnerCount} non-winners (rounded down)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={closingAuction || !selectedWinner}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {closingAuction ? 'Closing Auction...' : 'Confirm & Close Auction'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWinnerModal(false);
                      setSelectedWinner(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionControl;
