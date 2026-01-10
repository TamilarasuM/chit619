import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  formatCurrency,
  formatDate,
  getChitStatusColor
} from '../../utils/formatters';
import Card from '../common/Card';
import Button from '../common/Button';
import Loading from '../common/Loading';

const MyChitGroups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chitGroups, setChitGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyChitGroups();
  }, []);

  const fetchMyChitGroups = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/chitgroups?memberId=${user._id}`);
      setChitGroups(response.data || []);
    } catch (err) {
      console.error('Error fetching chit groups:', err);
      setError(err.response?.data?.message || 'Failed to load chit groups');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (chit) => {
    if (!chit.totalDuration) return 0;
    return (chit.currentMonth / chit.totalDuration) * 100;
  };

  const getMyRankInChit = (chit) => {
    const member = chit.members?.find(m => m.member?._id === user._id);
    return member?.rank || 'N/A';
  };

  const getNextPaymentDue = (chit) => {
    // This would typically come from the API
    // For now, we'll calculate a placeholder
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, chit.monthlyDueDate || 5);
    return nextMonth;
  };

  const hasWon = (chit) => {
    return chit.winners?.some(w => w.member?._id === user._id);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Chit Groups</h1>
        <div className="text-sm text-gray-600">
          Total Active Groups: <span className="font-semibold">{chitGroups.length}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* No Chit Groups */}
      {chitGroups.length === 0 && !error && (
        <Card>
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Chit Groups</h3>
            <p className="mt-1 text-sm text-gray-500">
              You are not enrolled in any chit groups yet.
            </p>
          </div>
        </Card>
      )}

      {/* Chit Groups List */}
      {chitGroups.map((chit) => {
        const statusColor = getChitStatusColor(chit.status);
        const progress = getProgressPercentage(chit);
        const nextDue = getNextPaymentDue(chit);
        const memberWon = hasWon(chit);

        return (
          <Card key={chit._id} className="hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              {/* Header Row */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">{chit.name}</h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
                      {chit.status}
                    </span>
                    {memberWon && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Won
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Model {chit.model} • {chit.totalMembers} Members • {chit.totalDuration} Months
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Chit Amount</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(chit.chitAmount)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Month {chit.currentMonth || 0} of {chit.totalDuration}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Auction Contribution</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(chit.monthlyContribution)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Next Payment Due</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatDate(nextDue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">My Rank</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {getMyRankInChit(chit)} / {chit.totalMembers}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Commission</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(chit.commissionAmount)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <Button
                  onClick={() => navigate(`/chitgroups/${chit._id}`)}
                  variant="secondary"
                  className="flex-1"
                >
                  View Details
                </Button>
                <Button
                  onClick={() => navigate(`/member/passbook?chit=${chit._id}`)}
                  variant="secondary"
                  className="flex-1"
                >
                  View Statement
                </Button>
                {chit.status === 'Active' && !memberWon && (
                  <Button
                    onClick={() => navigate(`/auctions?chit=${chit._id}`)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    View Auctions
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MyChitGroups;
