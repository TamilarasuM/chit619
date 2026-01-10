import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import AuctionPaymentTracking from '../../components/auctions/AuctionPaymentTracking';

const AuctionPaymentTrackingPage = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Payment Tracking</h1>
            <p className="mt-2 text-gray-600">Track member payments for this auction</p>
          </div>
        </div>

        <AuctionPaymentTracking auctionId={auctionId} />
      </div>
    </AdminLayout>
  );
};

export default AuctionPaymentTrackingPage;
