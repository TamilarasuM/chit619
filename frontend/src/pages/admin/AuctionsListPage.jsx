import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';
import { formatCurrency, formatDate, getAuctionStatusColor } from '../../utils/formatters';

const AuctionsListPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auctions, setAuctions] = useState([]);
  const [filteredAuctions, setFilteredAuctions] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    chitGroupId: 'all'
  });
  const [chitGroups, setChitGroups] = useState([]);

  useEffect(() => {
    fetchAuctions();
    fetchChitGroups();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, auctions]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      // Fetch all auctions
      const response = await api.get('/auctions');
      if (response.success) {
        setAuctions(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError(err.message || 'Failed to load auctions');
    } finally {
      setLoading(false);
    }
  };

  const fetchChitGroups = async () => {
    try {
      const response = await api.get('/chitgroups');
      if (response.success) {
        setChitGroups(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching chit groups:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...auctions];

    if (filters.status !== 'all') {
      filtered = filtered.filter(auction => auction.status === filters.status);
    }

    if (filters.chitGroupId !== 'all') {
      filtered = filtered.filter(auction => auction.chitGroupId?._id === filters.chitGroupId);
    }

    setFilteredAuctions(filtered);
  };

  const getStatusBadge = (status) => {
    const colors = {
      Scheduled: 'bg-blue-100 text-blue-800',
      Live: 'bg-green-100 text-green-800',
      Closed: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || colors.Scheduled}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Auctions</h1>
          <button
            onClick={() => navigate('/chitgroups')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Schedule New Auction
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chit Group
              </label>
              <select
                value={filters.chitGroupId}
                onChange={(e) => setFilters(prev => ({ ...prev, chitGroupId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Chit Groups</option>
                {chitGroups.map(group => (
                  <option key={group._id} value={group._id}>{group.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Live">Live</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Auctions List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredAuctions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No auctions found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chit Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Auction #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Scheduled Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bids
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Winner
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAuctions.map(auction => (
                  <tr key={auction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {auction.chitGroupId?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {auction.auctionNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(auction.scheduledDate)}
                      <div className="text-xs">{auction.scheduledTime}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(auction.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {auction.bids?.length || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {auction.winnerName || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => navigate(`/auctions/${auction._id}/control`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View/Control
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AuctionsListPage;
