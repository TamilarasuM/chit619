import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate,
  formatRelativeTime
} from '../../utils/formatters';
import Card from '../common/Card';
import Button from '../common/Button';
import Loading from '../common/Loading';

const UpcomingAuctions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUpcomingAuctions();

    // Refresh every 30 seconds to update countdown
    const interval = setInterval(fetchUpcomingAuctions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingAuctions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/auctions/member/upcoming?memberId=${user._id}`);
      setAuctions(response.data || []);
    } catch (err) {
      console.error('Error fetching upcoming auctions:', err);
      setError(err.response?.data?.message || 'Failed to load upcoming auctions');
    } finally {
      setLoading(false);
    }
  };

  const isEligible = (auction) => {
    // Check if member is in the excluded list
    if (auction.excludedMembers?.some(m => m._id === user._id)) {
      return false;
    }
    // Check if member has already won in this chit
    if (auction.chitGroup?.winners?.some(w => w.member?._id === user._id)) {
      return false;
    }
    return true;
  };

  const getCountdown = (auctionDate) => {
    const now = new Date();
    const auction = new Date(auctionDate);
    const diff = auction - now;

    if (diff < 0) return 'Started';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getTimeUntilStart = (auctionDate) => {
    const now = new Date();
    const auction = new Date(auctionDate);
    const diff = auction - now;

    if (diff < 0) return 0;
    return diff;
  };

  const isStartingSoon = (auctionDate) => {
    const timeUntil = getTimeUntilStart(auctionDate);
    return timeUntil > 0 && timeUntil < 24 * 60 * 60 * 1000; // Less than 24 hours
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Upcoming Auctions</h1>
        <Button onClick={fetchUpcomingAuctions} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* No Auctions */}
      {auctions.length === 0 && !error && (
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Upcoming Auctions</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no scheduled auctions for your chit groups at this time.
            </p>
          </div>
        </Card>
      )}

      {/* Auctions List */}
      {auctions.map((auction) => {
        const eligible = isEligible(auction);
        const startingSoon = isStartingSoon(auction.auctionDate);
        const countdown = getCountdown(auction.auctionDate);

        return (
          <Card
            key={auction._id}
            className={`hover:shadow-lg transition-shadow ${startingSoon ? 'border-2 border-yellow-400' : ''}`}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      {auction.chitGroup?.name}
                    </h3>
                    {startingSoon && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
                        Starting Soon
                      </span>
                    )}
                    {!eligible && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Not Eligible
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Month {auction.monthNumber} • {auction.chitGroup?.totalMembers} Members
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Chit Amount</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(auction.chitGroup?.chitAmount)}
                  </div>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className={`p-4 rounded-lg ${startingSoon ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">
                    {countdown === 'Started' ? 'Auction Started' : 'Time Remaining'}
                  </div>
                  <div className={`text-3xl font-bold ${startingSoon ? 'text-yellow-700' : 'text-blue-700'}`}>
                    {countdown}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatRelativeTime(auction.auctionDate)}
                  </div>
                </div>
              </div>

              {/* Auction Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Auction Date</div>
                  <div className="text-base font-semibold text-gray-900">
                    {formatDate(auction.auctionDate, true)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Venue</div>
                  <div className="text-base font-semibold text-gray-900">
                    {auction.venue || 'To be announced'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Minimum Bid</div>
                  <div className="text-base font-semibold text-gray-900">
                    {formatCurrency(auction.chitGroup?.commissionAmount || 0)}
                  </div>
                </div>
              </div>

              {/* Eligibility Info */}
              {!eligible && (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Not Eligible:</span>{' '}
                    {auction.chitGroup?.winners?.some(w => w.member?._id === user._id)
                      ? 'You have already won in this chit group'
                      : 'You are excluded from this auction'}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <Button
                  onClick={() => navigate(`/auctions/${auction._id}`)}
                  variant="secondary"
                  className="flex-1"
                >
                  View Details
                </Button>
                {eligible && auction.status === 'Scheduled' && (
                  <Button
                    onClick={() => navigate(`/auctions/${auction._id}/bid`)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={getTimeUntilStart(auction.auctionDate) > 24 * 60 * 60 * 1000}
                  >
                    {getTimeUntilStart(auction.auctionDate) > 24 * 60 * 60 * 1000
                      ? 'Bidding Not Started'
                      : 'Place Bid'}
                  </Button>
                )}
                {auction.status === 'Live' && eligible && (
                  <Button
                    onClick={() => navigate(`/auctions/${auction._id}/bid`)}
                    className="flex-1 bg-red-600 hover:bg-red-700 animate-pulse"
                  >
                    Place Bid Now (Live)
                  </Button>
                )}
              </div>

              {/* Additional Info */}
              {eligible && (
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">Remember:</span> You can place only one bid. Make sure to bid carefully.
                    The member with the highest bid wins the auction.
                  </p>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default UpcomingAuctions;
