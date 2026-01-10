import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate, formatPhone } from '../../utils/formatters';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Modal from '../common/Modal';
import Loading from '../common/Loading';

const MemberManagement = () => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [members, searchTerm, statusFilter]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/members');
      setMembers(response.data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...members];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower) ||
        m.phone?.includes(searchTerm) ||
        m.membershipId?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredMembers(filtered);
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      await api.post('/members', formData);

      setShowCreateModal(false);
      resetForm();
      fetchMembers();
    } catch (err) {
      console.error('Error creating member:', err);
      setError(err.response?.data?.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      await api.put(`/members/${selectedMember._id}`, formData);

      setShowEditModal(false);
      resetForm();
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      console.error('Error updating member:', err);
      setError(err.response?.data?.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to suspend this member?')) {
      return;
    }

    try {
      await api.put(`/members/${memberId}/suspend`, {});
      fetchMembers();
    } catch (err) {
      console.error('Error suspending member:', err);
      alert('Failed to suspend member');
    }
  };

  const handleActivateMember = async (memberId) => {
    try {
      await api.put(`/members/${memberId}/activate`, {});
      fetchMembers();
    } catch (err) {
      console.error('Error activating member:', err);
      alert('Failed to activate member');
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || '',
      password: '' // Don't pre-fill password
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      password: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading && members.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
          Add New Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-sm text-gray-500">Total Members</div>
          <div className="text-2xl font-bold text-gray-900">{members.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Active Members</div>
          <div className="text-2xl font-bold text-green-600">
            {members.filter(m => m.status === 'Active').length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">Suspended Members</div>
          <div className="text-2xl font-bold text-red-600">
            {members.filter(m => m.status === 'Suspended').length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">New This Month</div>
          <div className="text-2xl font-bold text-blue-600">
            {members.filter(m => {
              const joinDate = new Date(m.joinedDate);
              const now = new Date();
              return joinDate.getMonth() === now.getMonth() &&
                     joinDate.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Search"
            placeholder="Search by name, email, phone, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Members Table */}
      <Card>
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.membershipId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPhone(member.phone)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(member.joinedDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      {member.status === 'Active' ? (
                        <button
                          onClick={() => handleSuspendMember(member._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateMember(member._id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Member Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Member"
        size="md"
        footer={
          <>
            <Button onClick={() => setShowCreateModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleCreateMember} disabled={loading}>
              Create Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMember} className="space-y-4">
          <Input
            label="Full Name *"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
          <Input
            label="Phone *"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
          />
          <Input
            label="Password *"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Member"
        size="md"
        footer={
          <>
            <Button onClick={() => setShowEditModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleEditMember} disabled={loading}>
              Update Member
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditMember} className="space-y-4">
          <Input
            label="Full Name *"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
          <Input
            label="Phone *"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
          />
          <Input
            label="New Password (leave blank to keep current)"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};

export default MemberManagement;
