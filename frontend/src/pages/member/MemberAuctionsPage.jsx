import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import BidSubmission from '../../components/auctions/BidSubmission';

const MemberAuctionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);

  useEffect(() => {
    fetchMyAuctions();
  }, []);

  const fetchMyAuctions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auctions/member/upcoming');
      if (response.success) {
        setAuctions(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = (auction) => {
    setSelectedAuction(auction);
    setShowBidModal(true);
  };

  const handleBidSuccess = () => {
    setShowBidModal(false);
    setSelectedAuction(null);
    fetchMyAuctions();
  };

  const getStatusBadge = (status) => {
    const colors = {
      Scheduled: 'bg-blue-100 text-blue-800',
      Live: 'bg-green-100 text-green-800',
      Closed: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Auctions</h1>
          <button
            onClick={() => navigate('/member/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Auctions List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {auctions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming auctions</h3>
              <p className="mt-1 text-sm text-gray-500">Check back later for new auctions</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {auctions.map(auction => (
                <div key={auction._id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          {auction.chitGroupId?.name || 'Chit Group'}
                        </h3>
                        <span className="ml-3">{getStatusBadge(auction.status)}</span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Auction #</span>
                          <div className="font-semibold text-gray-900">{auction.auctionNumber}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Date</span>
                          <div className="font-semibold text-gray-900">{formatDate(auction.scheduledDate)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Time</span>
                          <div className="font-semibold text-gray-900">{auction.scheduledTime}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Starting Bid</span>
                          <div className="font-semibold text-gray-900">{formatCurrency(auction.startingBid)}</div>
                        </div>
                      </div>

                      {auction.myBid && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">
                            Your bid: <span className="font-semibold">{formatCurrency(auction.myBid.bidAmount)}</span>
                          </p>
                        </div>
                      )}

                      {auction.status === 'Closed' && auction.winnerId && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800">
                            Winner: <span className="font-semibold">{auction.winnerName}</span>
                            {auction.winnerId === user?._id && ' (You won!)'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {auction.status === 'Live' && !auction.myBid && (
                        <button
                          onClick={() => handlePlaceBid(auction)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Place Bid
                        </button>
                      )}
                      {auction.status === 'Scheduled' && (
                        <span className="text-sm text-gray-500">Upcoming</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bid Submission Modal */}
        {showBidModal && selectedAuction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <BidSubmission
                auction={selectedAuction}
                onSuccess={handleBidSuccess}
                onCancel={() => {
                  setShowBidModal(false);
                  setSelectedAuction(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberAuctionsPage;
