import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CreateChitGroup from '../../components/chitgroups/CreateChitGroup';

const CreateChitGroupPage = () => {
  const navigate = useNavigate();

  const handleSuccess = (chitGroup) => {
    // Navigate to the newly created chit group details page
    navigate(`/chitgroups/${chitGroup._id}`);
  };

  const handleCancel = () => {
    // Navigate back to chit groups list
    navigate('/chitgroups');
  };

  return (
    <AdminLayout>
      <CreateChitGroup onSuccess={handleSuccess} onCancel={handleCancel} />
    </AdminLayout>
  );
};

export default CreateChitGroupPage;
