import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDateForInput } from '../../utils/formatters';

const CreateChitGroup = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    chitAmount: '',
    totalMembers: '',
    duration: '',
    commissionAmount: '',
    winnerPaymentModel: 'A',
    gracePeriodDays: '3',
    monthlyContribution: '',
    auctionFrequency: '1', // In months: 1=Monthly, 2=Bi-monthly, 3=Quarterly, etc.
    startDate: formatDateForInput(new Date()),
    notes: ''
  });

  const [calculatedEndDate, setCalculatedEndDate] = useState('');

  // Fetch available members
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await api.get('/members?status=active');
      setMembers(response.data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  // Auto-calculate auction contribution and duration when chitAmount or totalMembers changes
  useEffect(() => {
    if (formData.chitAmount && formData.totalMembers) {
      const amount = parseFloat(formData.chitAmount);
      const members = parseInt(formData.totalMembers);
      if (!isNaN(amount) && !isNaN(members) && members > 0) {
        const auctionContribution = Math.round(amount / members);
        setFormData(prev => ({
          ...prev,
          monthlyContribution: auctionContribution.toString(),
          duration: members.toString() // Auto-set duration = totalMembers
        }));
      }
    }
  }, [formData.chitAmount, formData.totalMembers]);

  // Auto-calculate end date based on start date, total members, and auction frequency
  useEffect(() => {
    if (formData.startDate && formData.totalMembers && formData.auctionFrequency) {
      const startDate = new Date(formData.startDate);
      const totalMembers = parseInt(formData.totalMembers);
      const frequencyInMonths = parseInt(formData.auctionFrequency);

      if (!isNaN(totalMembers) && !isNaN(frequencyInMonths) && totalMembers > 0 && frequencyInMonths > 0) {
        // Calculate total months: (totalMembers - 1) × frequency
        // We use (totalMembers - 1) because the first auction happens at start date
        const totalMonths = (totalMembers - 1) * frequencyInMonths;

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + totalMonths);

        setCalculatedEndDate(formatDateForInput(endDate));
      }
    }
  }, [formData.startDate, formData.totalMembers, formData.auctionFrequency]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        // Check if we haven't exceeded total members limit
        const maxMembers = parseInt(formData.totalMembers);
        if (!isNaN(maxMembers) && prev.length >= maxMembers) {
          setError(`Cannot select more than ${maxMembers} members`);
          return prev;
        }
        setError('');
        return [...prev, memberId];
      }
    });
  };

  const validate = () => {
    if (!formData.name.trim()) {
      setError('Please enter chit group name');
      return false;
    }

    if (!formData.chitAmount || parseFloat(formData.chitAmount) <= 0) {
      setError('Please enter valid chit amount');
      return false;
    }

    if (!formData.totalMembers || parseInt(formData.totalMembers) <= 0) {
      setError('Please enter valid number of members');
      return false;
    }

    // Duration is auto-calculated from totalMembers, no need to validate

    if (!formData.commissionAmount || parseFloat(formData.commissionAmount) < 0) {
      setError('Please enter valid commission amount');
      return false;
    }

    if (!formData.monthlyContribution || parseFloat(formData.monthlyContribution) <= 0) {
      setError('Please enter valid auction contribution');
      return false;
    }

    // Duration is auto-set to equal totalMembers, so no need to validate equality
    return true;
  };

  const handleSubmit = async (e) => {
    debugger
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        chitAmount: parseFloat(formData.chitAmount),
        totalMembers: parseInt(formData.totalMembers),
        duration: parseInt(formData.duration),
        commissionAmount: parseFloat(formData.commissionAmount),
        winnerPaymentModel: formData.winnerPaymentModel,
        gracePeriodDays: parseInt(formData.gracePeriodDays) || 3,
        monthlyContribution: parseFloat(formData.monthlyContribution),
        auctionFrequency: parseInt(formData.auctionFrequency),
        startDate: formData.startDate,
        members: selectedMembers,
        notes: formData.notes.trim() || undefined
      };

      console.log('📤 Sending payload to backend:', payload);

      const response = await api.post('/chitgroups', payload);

      console.log('✅ Response received:', response);

      if (response.success) {
        alert('Chit group created successfully!');
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        console.warn('⚠️ Response success is false:', response);
        setError('Failed to create chit group - response not successful');
      }
    } catch (err) {
      console.error('Error creating chit group:', err);
      setError(err.message || err.data?.error || 'Failed to create chit group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Chit Group</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chit Group Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Monthly Chit Jan 2025"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calculated End Date
            </label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
              {calculatedEndDate ? (
                <span className="font-medium">{new Date(calculatedEndDate).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              ) : (
                <span className="text-gray-400">Will be calculated automatically</span>
              )}
            </div>
            {calculatedEndDate && formData.totalMembers && formData.auctionFrequency && (
              <p className="text-xs text-gray-500 mt-1">
                Based on {formData.totalMembers} members with auctions every {formData.auctionFrequency} month(s)
              </p>
            )}
          </div>
        </div>

        {/* Financial Configuration */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">Financial Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chit Amount (₹) *
              </label>
              <input
                type="number"
                name="chitAmount"
                value={formData.chitAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100000"
                min="1"
                required
              />
              {formData.chitAmount && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(parseFloat(formData.chitAmount))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Amount (₹) *
              </label>
              <input
                type="number"
                name="commissionAmount"
                value={formData.commissionAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="5000"
                min="0"
                required
              />
              {formData.commissionAmount && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(parseFloat(formData.commissionAmount))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auction Contribution (₹) *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Amount each member contributes per auction (not necessarily monthly)
              </p>
              <input
                type="number"
                name="monthlyContribution"
                value={formData.monthlyContribution}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Auto-calculated"
                min="1"
                required
              />
              {formData.monthlyContribution && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(parseFloat(formData.monthlyContribution))}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Group Configuration */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">Group Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Members *
              </label>
              <input
                type="number"
                name="totalMembers"
                value={formData.totalMembers}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="20"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auction Frequency *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                How often auctions are held
              </p>
              <select
                name="auctionFrequency"
                value={formData.auctionFrequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="1">Monthly (Every 1 month)</option>
                <option value="2">Bi-monthly (Every 2 months)</option>
                <option value="3">Quarterly (Every 3 months)</option>
                <option value="4">Every 4 months</option>
                <option value="6">Semi-annually (Every 6 months)</option>
                <option value="12">Annually (Every 12 months)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grace Period (Days) *
              </label>
              <input
                type="number"
                name="gracePeriodDays"
                value={formData.gracePeriodDays}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* Payment Model */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">Payment Model *</h3>
          <div className="space-y-3">
            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="winnerPaymentModel"
                value="A"
                checked={formData.winnerPaymentModel === 'A'}
                onChange={handleChange}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">Model A: Winner Pays Full Amount</div>
                <div className="text-sm text-gray-600 mt-1">
                  Winner pays full monthly contribution every remaining month.
                  Does not receive dividend from future auctions.
                  Commission paid only once (when winning).
                </div>
              </div>
            </label>

            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="winnerPaymentModel"
                value="B"
                checked={formData.winnerPaymentModel === 'B'}
                onChange={handleChange}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">Model B: Winner Gets Dividend Always</div>
                <div className="text-sm text-gray-600 mt-1">
                  Winner continues to receive dividend from all future auctions.
                  Monthly payment reduces based on dividends.
                  Still cannot bid again (one win per member).
                  Commission paid only once (when winning).
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Member Selection */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">
            Add Members (Optional)
            {formData.totalMembers && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                {selectedMembers.length} / {formData.totalMembers} selected
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded p-3">
            {members.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-4">
                No active members available
              </p>
            ) : (
              members.map(member => (
                <label
                  key={member._id}
                  className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member._id)}
                    onChange={() => toggleMemberSelection(member._id)}
                    className="mr-3"
                  />
                  <div className="text-sm">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-gray-500">{member.phone}</div>
                  </div>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            You can add members now or later. Members can be added until chit is activated.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Additional notes about this chit group..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Chit Group'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateChitGroup;
