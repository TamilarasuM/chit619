import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import ChitGroupList from '../../components/chitgroups/ChitGroupList';

const ChitGroupsPage = () => {
  return (
    <AdminLayout>
      <ChitGroupList />
    </AdminLayout>
  );
};

export default ChitGroupsPage;
