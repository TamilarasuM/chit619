import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency, formatDate, formatDateForInput } from '../../utils/formatters';

const ScheduleAuction = () => {
  const { chitGroupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chitGroup, setChitGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [excludedMembers, setExcludedMembers] = useState([]);

  const [formData, setFormData] = useState({
    auctionDate: '',
    auctionTime: '10:00',
    venue: '',
    notes: ''
  });

  useEffect(() => {
    if (chitGroupId) {
      fetchChitGroupDetails();
    }
  }, [chitGroupId]);

  const fetchChitGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chitgroups/${chitGroupId}`);

      if (response.success) {
        // Backend returns { chitGroup, auctions, progress } inside response.data
        const { chitGroup: group, auctions, progress } = response.data;
        setChitGroup(group);

        // Filter members who haven't won yet
        const eligibleMembers = group.members?.filter(m => !m.hasWon) || [];
        setMembers(eligibleMembers);

        console.log('Chit Group:', group.name);
        console.log('Total members:', group.members?.length || 0);
        console.log('Eligible members (not won):', eligibleMembers.length);

        // Set default auction date (first day of next month)
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        setFormData(prev => ({
          ...prev,
          auctionDate: formatDateForInput(nextMonth)
        }));
      }
    } catch (err) {
      console.error('Error fetching chit group:', err);
      setError(err.response?.data?.error || 'Failed to load chit group details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const toggleMemberExclusion = (memberId) => {
    setExcludedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const validate = () => {
    if (!formData.auctionDate) {
      setError('Please select auction date');
      return false;
    }

    const selectedDate = new Date(formData.auctionDate + 'T' + formData.auctionTime);
    const today = new Date();

    if (selectedDate <= today) {
      setError('Auction date must be in the future');
      return false;
    }

    // Check if all members are excluded
    const eligibleCount = members.length - excludedMembers.length;
    if (eligibleCount === 0) {
      setError('At least one member must be eligible to bid');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      // Combine date and time
      const auctionDateTime = new Date(formData.auctionDate + 'T' + formData.auctionTime);

      const payload = {
        chitGroupId: chitGroupId,
        auctionDate: auctionDateTime.toISOString(),
        venue: formData.venue.trim() || undefined,
        excludedMembers: excludedMembers.length > 0 ? excludedMembers : undefined,
        notes: formData.notes.trim() || undefined
      };

      const response = await api.post('/auctions', payload);

      if (response.success) {
        alert('Auction scheduled successfully!');
        navigate(`/chitgroups/${chitGroupId}`);
      }
    } catch (err) {
      console.error('Error scheduling auction:', err);
      setError(err.response?.data?.error || 'Failed to schedule auction');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !chitGroup) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!chitGroup) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Chit group not found
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/chitgroups/${chitGroupId}`)}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Chit Group
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Schedule Auction</h1>
        <p className="mt-2 text-gray-600">{chitGroup.name}</p>
      </div>

      {/* Chit Group Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2">Chit Group Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Chit Amount:</span>
            <div className="font-semibold text-blue-900">{formatCurrency(chitGroup.chitAmount)}</div>
          </div>
          <div>
            <span className="text-blue-700">Current Month:</span>
            <div className="font-semibold text-blue-900">
              {chitGroup.currentMonth} / {chitGroup.duration}
            </div>
          </div>
          <div>
            <span className="text-blue-700">Eligible Members:</span>
            <div className="font-semibold text-blue-900">
              {members.length - excludedMembers.length} / {members.length}
            </div>
          </div>
          <div>
            <span className="text-blue-700">Commission:</span>
            <div className="font-semibold text-blue-900">{formatCurrency(chitGroup.commissionAmount)}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Auction Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Auction Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auction Date *
              </label>
              <input
                type="date"
                name="auctionDate"
                value={formData.auctionDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auction Time *
              </label>
              <input
                type="time"
                name="auctionTime"
                value={formData.auctionTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Venue (Optional)
            </label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Main Office, Community Hall"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Any special instructions or notes for this auction..."
            />
          </div>
        </div>

        {/* Member Eligibility */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Member Eligibility
            <span className="text-sm font-normal text-gray-600 ml-2">
              (Uncheck to exclude members from this auction)
            </span>
          </h2>

          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No eligible members available for auction</p>
              <p className="text-sm mt-2">All members may have already won</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(member => (
                <label
                  key={member._id}
                  className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                    excludedMembers.includes(member.memberId._id)
                      ? 'bg-gray-100 border-gray-300'
                      : 'bg-white border-green-300 hover:bg-green-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!excludedMembers.includes(member.memberId._id)}
                    onChange={() => toggleMemberExclusion(member.memberId._id)}
                    className="mr-3"
                  />
                  <div className="text-sm">
                    <div className="font-medium">{member.memberId.name}</div>
                    <div className="text-gray-500">{member.memberId.phone}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>{members.length - excludedMembers.length}</strong> member(s) will be eligible to bid in this auction.
              {excludedMembers.length > 0 && (
                <span className="ml-1">
                  <strong>{excludedMembers.length}</strong> member(s) excluded.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/chitgroups/${chitGroupId}`)}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || members.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Scheduling...' : 'Schedule Auction'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleAuction;
