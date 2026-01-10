import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';

const MemberRankingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rankings, setRankings] = useState([]);
  const [chitGroups, setChitGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedChitGroup, setSelectedChitGroup] = useState(searchParams.get('chitGroupId') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChitGroups();
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [selectedChitGroup, selectedCategory]);

  const fetchChitGroups = async () => {
    try {
      const response = await api.get('/chitgroups');
      if (response.success) {
        setChitGroups(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching chit groups:', error);
    }
  };

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedChitGroup) params.chitGroupId = selectedChitGroup;
      if (selectedCategory) params.category = selectedCategory;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/rankings${queryString ? '?' + queryString : ''}`);

      if (response.success) {
        setRankings(response.data || []);
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChitGroupChange = (chitGroupId) => {
    setSelectedChitGroup(chitGroupId);
    if (chitGroupId) {
      setSearchParams({ chitGroupId });
    } else {
      setSearchParams({});
    }
  };

  const getRankBadge = (category) => {
    const badges = {
      Excellent: { bg: 'bg-green-100', text: 'text-green-800', icon: '🏆' },
      Good: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '⭐' },
      Average: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '👍' },
      Poor: { bg: 'bg-red-100', text: 'text-red-800', icon: '⚠️' }
    };
    const badge = badges[category] || badges.Average;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        <span className="mr-1">{badge.icon}</span>
        {category}
      </span>
    );
  };

  const getCompletionRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-blue-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFilteredRankings = () => {
    if (!searchQuery.trim()) return rankings;

    const query = searchQuery.toLowerCase();
    return rankings.filter(
      r =>
        r.memberName.toLowerCase().includes(query) ||
        r.memberId?.name?.toLowerCase().includes(query) ||
        r.memberId?.phone?.includes(query)
    );
  };

  const filteredRankings = getFilteredRankings();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Rankings</h1>
          <p className="text-gray-600 mt-1">
            Track and analyze member payment performance across chit groups
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Chit Group Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Chit Group
              </label>
              <select
                value={selectedChitGroup}
                onChange={(e) => handleChitGroupChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Chit Groups</option>
                {chitGroups.map((chit) => (
                  <option key={chit._id} value={chit._id}>
                    {chit.name} ({chit.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="Excellent">🏆 Excellent</option>
                <option value="Good">⭐ Good</option>
                <option value="Average">👍 Average</option>
                <option value="Poor">⚠️ Poor</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Member
              </label>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Members</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4">
              <div className="text-sm text-green-700 flex items-center">
                <span className="mr-1">🏆</span> Excellent
              </div>
              <div className="text-2xl font-bold text-green-900">{stats.excellent}</div>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-4">
              <div className="text-sm text-blue-700 flex items-center">
                <span className="mr-1">⭐</span> Good
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.good}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow p-4">
              <div className="text-sm text-yellow-700 flex items-center">
                <span className="mr-1">👍</span> Average
              </div>
              <div className="text-2xl font-bold text-yellow-900">{stats.average}</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4">
              <div className="text-sm text-red-700 flex items-center">
                <span className="mr-1">⚠️</span> Poor
              </div>
              <div className="text-2xl font-bold text-red-900">{stats.poor}</div>
            </div>
            <div className="bg-purple-50 rounded-lg shadow p-4">
              <div className="text-sm text-purple-700">Avg On-Time</div>
              <div className="text-2xl font-bold text-purple-900">{stats.avgOnTimeRate}%</div>
            </div>
          </div>
        )}

        {/* Rankings Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No rankings found. Rankings will appear after members make payments.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    {!selectedChitGroup && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chit Group</th>
                    )}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">On-Time</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delayed</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Delay</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRankings.map((ranking) => (
                    <tr key={ranking._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg font-bold text-gray-900">
                            {ranking.rank ? `#${ranking.rank}` : '-'}
                          </span>
                          {ranking.rank === 1 && <span className="ml-2 text-xl">🥇</span>}
                          {ranking.rank === 2 && <span className="ml-2 text-xl">🥈</span>}
                          {ranking.rank === 3 && <span className="ml-2 text-xl">🥉</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ranking.memberId?.name || ranking.memberName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ranking.memberId?.phone}
                          </div>
                        </div>
                      </td>
                      {!selectedChitGroup && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {ranking.chitGroupId?.name || 'N/A'}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getRankBadge(ranking.rankCategory)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">{ranking.rankScore}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-green-600">{ranking.onTimePayments}</span>
                          <span className="text-xs text-gray-500">/ {ranking.totalPaymentsDue}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-red-600">{ranking.delayedPayments}</span>
                          {ranking.totalDelayDays > 0 && (
                            <span className="text-xs text-gray-500">{ranking.totalDelayDays}d total</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-semibold ${getCompletionRateColor(ranking.completionRate)}`}>
                          {ranking.completionRate}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${ranking.completionRate >= 70 ? 'bg-green-600' : ranking.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${ranking.completionRate}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-900">
                          {ranking.averageDelayDays > 0 ? `${ranking.averageDelayDays}d` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-medium ${ranking.outstandingAmount > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                          ₹{ranking.outstandingAmount.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 How Rankings Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-800">
            <div>
              <span className="font-semibold">Score Calculation:</span> Base 1000 points + on-time payments (50pts each) - delayed payments (30pts each) - delay days (5pts each)
            </div>
            <div>
              <span className="font-semibold">Categories:</span> Excellent (1000+), Good (800-999), Average (600-799), Poor (&lt;600)
            </div>
            <div>
              <span className="font-semibold">On-Time Rate:</span> Percentage of payments made on or before due date
            </div>
            <div>
              <span className="font-semibold">Avg Delay:</span> Average days of delay for late payments
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MemberRankingsPage;
