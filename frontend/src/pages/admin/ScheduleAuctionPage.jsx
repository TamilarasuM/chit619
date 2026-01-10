import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import ScheduleAuction from '../../components/auctions/ScheduleAuction';

const ScheduleAuctionPage = () => {
  return (
    <AdminLayout>
      <ScheduleAuction />
    </AdminLayout>
  );
};

export default ScheduleAuctionPage;
