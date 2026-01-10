import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate,
  getAuctionStatusColor
} from '../../utils/formatters';

const BidSubmission = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [auction, setAuction] = useState(null);
  const [chitGroup, setChitGroup] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [highestBid, setHighestBid] = useState(null);

  const [bidAmount, setBidAmount] = useState('');
  const [confirmBid, setConfirmBid] = useState('');

  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetails();

      // Auto-refresh every 10 seconds if auction is Live
      const interval = setInterval(() => {
        if (auction?.status === 'Live') {
          fetchAuctionDetails(true);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [auctionId, auction?.status]);

  const fetchAuctionDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await api.get(`/auctions/${auctionId}`);

      if (response.success) {
        const auctionData = response.data;
        setAuction(auctionData);
        setChitGroup(auctionData.chitGroupId);

        // Check if current user has already bid
        const userId = localStorage.getItem('userId'); // Assuming userId is stored
        const userBid = auctionData.bids?.find(b => b.memberId._id === userId);
        setMyBid(userBid);

        // Get highest bid
        if (auctionData.bids && auctionData.bids.length > 0) {
          const highest = auctionData.bids.reduce((max, bid) =>
            bid.bidAmount > max.bidAmount ? bid : max
          );
          setHighestBid(highest);
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

  const calculateEstimatedDividend = (bid) => {
    if (!chitGroup) return 0;
    const totalDividend = bid - chitGroup.commissionAmount;
    const recipients = chitGroup.totalMembers - 1; // Exclude winner
    return Math.round(totalDividend / recipients);
  };

  const calculateWinnerReceives = (bid) => {
    if (!chitGroup) return 0;
    return chitGroup.chitAmount - chitGroup.commissionAmount - bid;
  };

  const handleBidAmountChange = (e) => {
    const value = e.target.value;
    setBidAmount(value);
    setError('');
    setConfirmBid('');
  };

  const validate = () => {
    const bid = parseFloat(bidAmount);

    if (!bidAmount || isNaN(bid)) {
      setError('Please enter a valid bid amount');
      return false;
    }

    if (bid <= 0) {
      setError('Bid amount must be greater than zero');
      return false;
    }

    if (bid > chitGroup.chitAmount) {
      setError(`Bid cannot exceed chit amount (${formatCurrency(chitGroup.chitAmount)})`);
      return false;
    }

    if (bid <= chitGroup.commissionAmount) {
      setError(`Bid must be greater than commission (${formatCurrency(chitGroup.commissionAmount)})`);
      return false;
    }

    // Check if bid matches confirmation
    const confirmBidAmount = parseFloat(confirmBid);
    if (bid !== confirmBidAmount) {
      setError('Bid amount and confirmation do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        bidAmount: parseFloat(bidAmount)
      };

      const response = await api.post(`/auctions/${auctionId}/bid`, payload);

      if (response.success) {
        setSuccess('Bid submitted successfully!');
        setBidAmount('');
        setConfirmBid('');
        fetchAuctionDetails(); // Refresh to show updated bid
      }
    } catch (err) {
      console.error('Error submitting bid:', err);
      setError(err.response?.data?.error || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Auction not found
      </div>
    );
  }

  const canBid = auction.status === 'Live' && !myBid;
  const estimatedDividend = bidAmount ? calculateEstimatedDividend(parseFloat(bidAmount)) : 0;
  const winnerReceives = bidAmount ? calculateWinnerReceives(parseFloat(bidAmount)) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/auctions')}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Auctions
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Submit Bid</h1>
        <div className="mt-2 flex items-center space-x-3">
          {getStatusBadge(auction.status)}
          <span className="text-sm text-gray-500">
            {formatDate(auction.auctionDate)}
          </span>
        </div>
      </div>

      {/* Chit Group Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">{chitGroup?.name}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Chit Amount:</span>
            <div className="font-bold text-blue-900 text-lg">{formatCurrency(chitGroup?.chitAmount)}</div>
          </div>
          <div>
            <span className="text-blue-700">Commission:</span>
            <div className="font-bold text-blue-900 text-lg">{formatCurrency(chitGroup?.commissionAmount)}</div>
          </div>
          <div>
            <span className="text-blue-700">Month:</span>
            <div className="font-bold text-blue-900 text-lg">
              {auction.monthNumber} / {chitGroup?.duration}
            </div>
          </div>
          <div>
            <span className="text-blue-700">Total Bids:</span>
            <div className="font-bold text-blue-900 text-lg">{auction.bids?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {auction.status === 'Scheduled' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <strong>Auction Not Started:</strong> This auction is scheduled but hasn't started yet. Please wait for the admin to start the auction.
        </div>
      )}

      {auction.status === 'Closed' && (
        <div className="bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded">
          <strong>Auction Closed:</strong> This auction has been closed. Winner: <strong>{auction.winnerId?.name}</strong> with bid of <strong>{formatCurrency(auction.winningBid)}</strong>
        </div>
      )}

      {myBid && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          <strong>Your Bid Submitted:</strong> You have already submitted a bid of <strong>{formatCurrency(myBid.bidAmount)}</strong> on {formatDate(myBid.bidTime, true)}
        </div>
      )}

      {/* Current Highest Bid */}
      {highestBid && auction.status === 'Live' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Current Highest Bid</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(highestBid.bidAmount)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Estimated dividend: {formatCurrency(calculateEstimatedDividend(highestBid.bidAmount))} per member
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Leading bidder</div>
              <div className="text-base font-medium text-gray-900">{highestBid.memberId?.name || 'Anonymous'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bid Submission Form */}
      {canBid && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold">Place Your Bid</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bid Amount (₹) *
            </label>
            <input
              type="number"
              value={bidAmount}
              onChange={handleBidAmountChange}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your bid amount"
              min={chitGroup?.commissionAmount + 1}
              max={chitGroup?.chitAmount}
              step="1"
              required
            />
            {bidAmount && !isNaN(parseFloat(bidAmount)) && (
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(parseFloat(bidAmount))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Bid Amount (₹) *
            </label>
            <input
              type="number"
              value={confirmBid}
              onChange={(e) => {
                setConfirmBid(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Re-enter your bid amount to confirm"
              min={chitGroup?.commissionAmount + 1}
              max={chitGroup?.chitAmount}
              step="1"
              required
            />
          </div>

          {/* Bid Impact Preview */}
          {bidAmount && !isNaN(parseFloat(bidAmount)) && parseFloat(bidAmount) > chitGroup?.commissionAmount && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-blue-900">If You Win:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-blue-700">You Will Receive</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(winnerReceives)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    = Chit Amount - Commission - Your Bid
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-700">Others Will Receive (Dividend)</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(estimatedDividend)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    = (Your Bid - Commission) ÷ {chitGroup?.totalMembers - 1} members
                  </div>
                </div>
              </div>

              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="text-sm text-blue-700 mb-2">Calculation Breakdown:</div>
                <div className="text-xs text-blue-800 space-y-1">
                  <div>Chit Amount: {formatCurrency(chitGroup?.chitAmount)}</div>
                  <div>Commission: {formatCurrency(chitGroup?.commissionAmount)}</div>
                  <div>Your Bid: {formatCurrency(parseFloat(bidAmount))}</div>
                  <div className="font-semibold pt-1 border-t border-blue-200">
                    You Receive: {formatCurrency(chitGroup?.chitAmount)} - {formatCurrency(chitGroup?.commissionAmount)} - {formatCurrency(parseFloat(bidAmount))} = {formatCurrency(winnerReceives)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Important Notes:</h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Higher bid means more dividend for others, but less receipt for you</li>
              <li>Lower bid means more receipt for you, but less dividend for others</li>
              <li>Bid must be greater than commission amount ({formatCurrency(chitGroup?.commissionAmount)})</li>
              <li>Once submitted, your bid cannot be changed</li>
              <li>The highest bidder wins the auction</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/auctions')}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !bidAmount || !confirmBid}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting Bid...' : 'Submit Bid'}
            </button>
          </div>
        </form>
      )}

      {/* Auction Details */}
      {(auction.venue || auction.notes) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Auction Details</h2>
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
    </div>
  );
};

export default BidSubmission;
