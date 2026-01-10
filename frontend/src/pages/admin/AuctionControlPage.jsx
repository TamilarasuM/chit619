import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import AuctionControl from '../../components/auctions/AuctionControl';

const AuctionControlPage = () => {
  return (
    <AdminLayout>
      <AuctionControl />
    </AdminLayout>
  );
};

export default AuctionControlPage;
