import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PendingPayments from '../../components/payments/PendingPayments';

const PendingPaymentsPage = () => {
  return (
    <AdminLayout>
      <PendingPayments />
    </AdminLayout>
  );
};

export default PendingPaymentsPage;
