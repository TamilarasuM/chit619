import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getRankCategoryColor } from '../../utils/formatters';
import Card from '../common/Card';
import Loading from '../common/Loading';

const MemberRanking = ({ memberId, chitGroupId }) => {
  const { user } = useAuth();
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const effectiveMemberId = memberId || user?._id;

  useEffect(() => {
    if (effectiveMemberId) {
      fetchRanking();
    }
  }, [effectiveMemberId, chitGroupId]);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      setError('');

      const url = chitGroupId
        ? `/payments/member/${effectiveMemberId}?chitGroup=${chitGroupId}`
        : `/payments/member/${effectiveMemberId}`;

      const response = await api.get(url);
      setRanking(response.data);
    } catch (err) {
      console.error('Error fetching member ranking:', err);
      setError(err.response?.data?.message || 'Failed to load ranking');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-yellow-700">No ranking data available</p>
      </div>
    );
  }

  const categoryColor = getRankCategoryColor(ranking.rankCategory);
  const scorePercentage = ranking.rankingScore || 0;

  return (
    <div className="space-y-6">
      {/* Main Ranking Card */}
      <Card>
        <div className="text-center">
          {/* Rank Display */}
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-1">Your Rank</div>
            <div className="text-6xl font-bold text-blue-600">
              {ranking.rank}
              <span className="text-2xl text-gray-400">/{ranking.totalMembers}</span>
            </div>
          </div>

          {/* Category Badge */}
          <div className="mb-4">
            <span className={`inline-block px-6 py-3 text-lg font-semibold rounded-full bg-${categoryColor}-100 text-${categoryColor}-800`}>
              {ranking.rankCategory}
            </span>
          </div>

          {/* Score Bar */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Ranking Score</span>
              <span className="text-sm font-bold text-gray-900">{scorePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`bg-${categoryColor}-600 h-4 rounded-full transition-all duration-500`}
                style={{ width: `${scorePercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Score Categories Legend */}
          <div className="text-xs text-gray-500 mt-2">
            <div className="flex justify-between">
              <span>Poor (0-50)</span>
              <span>Average (51-70)</span>
              <span>Good (71-85)</span>
              <span>Excellent (86-100)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
        <div className="space-y-4">
          {/* On-time Payment Score */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">On-time Payment Rate</span>
              <span className="text-sm font-bold text-gray-900">
                {ranking.onTimePercentage?.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${ranking.onTimePercentage || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {ranking.onTimePayments || 0} on-time out of {ranking.totalPayments || 0} payments
            </div>
          </div>

          {/* Consistency Score */}
          {ranking.consistencyScore !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Payment Consistency</span>
                <span className="text-sm font-bold text-gray-900">
                  {ranking.consistencyScore?.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{ width: `${ranking.consistencyScore || 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Participation Score */}
          {ranking.participationScore !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Participation Rate</span>
                <span className="text-sm font-bold text-gray-900">
                  {ranking.participationScore?.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-500 h-3 rounded-full"
                  style={{ width: `${ranking.participationScore || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-sm text-gray-500">On-time Payments</div>
          <div className="text-3xl font-bold text-green-600">
            {ranking.onTimePayments || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {ranking.onTimePercentage?.toFixed(1)}% of total
          </div>
        </Card>

        <Card>
          <div className="text-sm text-gray-500">Delayed Payments</div>
          <div className="text-3xl font-bold text-red-600">
            {ranking.delayedPayments || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {((ranking.delayedPayments || 0) / (ranking.totalPayments || 1) * 100).toFixed(1)}% of total
          </div>
        </Card>

        <Card>
          <div className="text-sm text-gray-500">Total Payments</div>
          <div className="text-3xl font-bold text-blue-600">
            {ranking.totalPayments || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            All time
          </div>
        </Card>
      </div>

      {/* Delay Statistics */}
      {ranking.avgDelayDays !== undefined && ranking.avgDelayDays > 0 && (
        <Card className="bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-700 mb-1">Average Delay</div>
              <div className="text-2xl font-bold text-red-600">
                {ranking.avgDelayDays.toFixed(1)} days
              </div>
            </div>
            {ranking.maxDelayDays > 0 && (
              <div>
                <div className="text-sm text-gray-700 mb-1">Maximum Delay</div>
                <div className="text-2xl font-bold text-red-700">
                  {ranking.maxDelayDays} days
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Performance Tips */}
      <Card className="bg-blue-50">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Tips to Improve Your Ranking</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          {ranking.rankingScore < 85 && (
            <>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Make payments on or before the due date to improve your on-time rate</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Set up payment reminders to avoid missing due dates</span>
              </li>
            </>
          )}
          {ranking.delayedPayments > 0 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Clear any outstanding payments as soon as possible</span>
            </li>
          )}
          {ranking.rankingScore >= 85 && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Great job! Keep up your excellent payment record</span>
            </li>
          )}
        </ul>
      </Card>

      {/* Ranking Info */}
      <Card className="bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">How Ranking Works</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            Your ranking is calculated based on your payment history and behavior:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>On-time payment percentage (most important factor)</li>
            <li>Payment consistency across all months</li>
            <li>Average delay in days (if any)</li>
            <li>Overall participation in chit activities</li>
          </ul>
          <p className="mt-2">
            A higher ranking demonstrates reliability and may help in future chit group enrollments.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default MemberRanking;
