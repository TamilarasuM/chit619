import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency, formatDate, getChitStatusColor } from '../../utils/formatters';

const ChitGroupList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chitGroups, setChitGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);

  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    active: 0,
    closed: 0
  });

  useEffect(() => {
    fetchChitGroups();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, chitGroups]);

  const fetchChitGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/chitgroups');

      if (response.success) {
        const groups = response.data || [];
        setChitGroups(groups);
        calculateStats(groups);
      }
    } catch (err) {
      console.error('Error fetching chit groups:', err);
      setError(err.response?.data?.error || 'Failed to load chit groups');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (groups) => {
    const stats = {
      total: groups.length,
      inProgress: groups.filter(g => g.status === 'InProgress').length,
      active: groups.filter(g => g.status === 'Active').length,
      closed: groups.filter(g => g.status === 'Closed').length
    };
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...chitGroups];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(group => group.status === filters.status);
    }

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchLower) ||
        group.chitAmount.toString().includes(searchLower) ||
        group.totalMembers.toString().includes(searchLower)
      );
    }

    setFilteredGroups(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleViewDetails = (groupId) => {
    navigate(`/chitgroups/${groupId}`);
  };

  const handleEdit = (groupId) => {
    navigate(`/chitgroups/${groupId}/edit`);
  };

  const handleActivate = async (groupId) => {
    if (!window.confirm('Are you sure you want to activate this chit group? This will make it active and start the monthly cycle.')) {
      return;
    }

    try {
      const response = await api.post(`/chitgroups/${groupId}/activate`, {});

      if (response.success) {
        alert('Chit group activated successfully!');
        fetchChitGroups(); // Refresh list
      }
    } catch (err) {
      console.error('Error activating chit group:', err);
      alert(err.response?.data?.error || 'Failed to activate chit group');
    }
  };

  const handleClose = async (groupId) => {
    if (!window.confirm('Are you sure you want to close this chit group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.post(`/chitgroups/${groupId}/close`, {});

      if (response.success) {
        alert('Chit group closed successfully!');
        fetchChitGroups(); // Refresh list
      }
    } catch (err) {
      console.error('Error closing chit group:', err);
      alert(err.response?.data?.error || 'Failed to close chit group');
    }
  };

  const handleDelete = async (groupId, groupName) => {
    if (!window.confirm(`Are you sure you want to delete the chit group "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/chitgroups/${groupId}`);

      if (response.success) {
        alert('Chit group deleted successfully!');
        fetchChitGroups(); // Refresh list
      }
    } catch (err) {
      console.error('Error deleting chit group:', err);
      alert(err.response?.data?.error || 'Failed to delete chit group');
    }
  };

  const getStatusBadge = (status) => {
    const color = getChitStatusColor(status);
    const bgColors = {
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bgColors[color] || bgColors.gray}`}>
        {status}
      </span>
    );
  };

  const getProgressPercentage = (group) => {
    if (group.status === 'InProgress') return 0;
    if (group.status === 'Closed') return 100;

    // For Active status, calculate based on completed auctions
    const completedMonths = group.currentMonth - 1;
    const totalMonths = group.duration;
    return Math.round((completedMonths / totalMonths) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Chit Groups</h1>
        <button
          onClick={() => navigate('/chitgroups/create')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Chit Group
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Groups</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">In Progress</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Closed</div>
          <div className="mt-2 text-3xl font-bold text-gray-600">{stats.closed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by name, amount, or members..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="InProgress">In Progress</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Chit Groups List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No chit groups found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.status !== 'all' || filters.search ? 'Try adjusting your filters' : 'Get started by creating a new chit group'}
            </p>
            {filters.status === 'all' && !filters.search && (
              <div className="mt-6">
                <button
                  onClick={() => navigate('/chitgroups/create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create New Chit Group
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chit Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGroups.map((group) => (
                  <tr key={group._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      <div className="text-sm text-gray-500">Model {group.winnerPaymentModel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(group.chitAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(group.monthlyContribution)}/month
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.members?.length || 0} / {group.totalMembers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{group.duration} months</div>
                      {group.status === 'Active' && (
                        <div className="text-sm text-gray-500">Month {group.currentMonth}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(group.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(group.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${getProgressPercentage(group)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{getProgressPercentage(group)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(group._id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {group.status === 'InProgress' && (
                          <>
                            <button
                              onClick={() => handleEdit(group._id)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleActivate(group._id)}
                              className="text-green-600 hover:text-green-900"
                              title="Activate"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(group._id, group.name)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}

                        {group.status === 'Active' && (
                          <button
                            onClick={() => handleClose(group._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Close"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredGroups.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredGroups.length} of {chitGroups.length} chit group(s)
        </div>
      )}
    </div>
  );
};

export default ChitGroupList;
