import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Loading from '../common/Loading';

const ReportSelector = ({ onReportGenerate }) => {
  const [reportType, setReportType] = useState('payment-history');
  const [filters, setFilters] = useState({
    chitGroup: '',
    member: '',
    dateFrom: '',
    dateTo: '',
    format: 'json' // json or pdf
  });
  const [chitGroups, setChitGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [chitGroupsRes, membersRes] = await Promise.all([
        api.get('/chitgroups'),
        api.get('/members')
      ]);

      setChitGroups(chitGroupsRes.data.data || []);
      setMembers(membersRes.data.data || []);
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  const reportTypes = [
    { value: 'payment-history', label: 'Member Payment History', requiresMember: true },
    { value: 'auction-history', label: 'Auction History', requiresChit: false },
    { value: 'outstanding', label: 'Outstanding Payments', requiresChit: false },
    { value: 'dividend-summary', label: 'Dividend Distribution Summary', requiresChit: false },
    { value: 'member-statement', label: 'Member Complete Statement', requiresMember: true },
    { value: 'chit-summary', label: 'Chit Group Summary', requiresChit: true },
    { value: 'financial', label: 'Financial / Revenue Report', requiresChit: false }
  ];

  const selectedReport = reportTypes.find(r => r.value === reportType);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate required fields
      if (selectedReport?.requiresMember && !filters.member) {
        setError('Please select a member for this report');
        return;
      }

      if (selectedReport?.requiresChit && !filters.chitGroup) {
        setError('Please select a chit group for this report');
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      if (filters.chitGroup) params.append('chitGroup', filters.chitGroup);
      if (filters.member) params.append('member', filters.member);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('format', filters.format);

      let url = '';
      switch (reportType) {
        case 'payment-history':
          url = `/reports/payment-history?${params.toString()}`;
          break;
        case 'auction-history':
          url = `/reports/auction-history?${params.toString()}`;
          break;
        case 'outstanding':
          url = `/reports/outstanding?${params.toString()}`;
          break;
        case 'dividend-summary':
          url = `/reports/dividend-summary?${params.toString()}`;
          break;
        case 'member-statement':
          url = `/reports/member-statement/${filters.member}?${params.toString()}`;
          break;
        case 'chit-summary':
          url = `/reports/chit-summary/${filters.chitGroup}?${params.toString()}`;
          break;
        case 'financial':
          url = `/reports/financial?${params.toString()}`;
          break;
        default:
          setError('Invalid report type');
          return;
      }

      if (filters.format === 'pdf') {
        // Download PDF
        const response = await api.get(url, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Get JSON data and pass to parent component
        const response = await api.get(url);
        if (onReportGenerate) {
          onReportGenerate(reportType, response.data);
        }
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      chitGroup: '',
      member: '',
      dateFrom: '',
      dateTo: '',
      format: 'json'
    });
  };

  return (
    <Card>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Generate Report</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Type *
          </label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            {reportTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chit Group Filter */}
          {!selectedReport?.requiresChit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chit Group {selectedReport?.requiresChit ? '*' : '(Optional)'}
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={filters.chitGroup}
                onChange={(e) => handleFilterChange('chitGroup', e.target.value)}
              >
                <option value="">All Chit Groups</option>
                {chitGroups.map((chit) => (
                  <option key={chit._id} value={chit._id}>
                    {chit.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedReport?.requiresChit && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chit Group *
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={filters.chitGroup}
                onChange={(e) => handleFilterChange('chitGroup', e.target.value)}
              >
                <option value="">Select Chit Group</option>
                {chitGroups.map((chit) => (
                  <option key={chit._id} value={chit._id}>
                    {chit.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Member Filter */}
          {selectedReport?.requiresMember ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member *
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={filters.member}
                onChange={(e) => handleFilterChange('member', e.target.value)}
              >
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.membershipId})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member (Optional)
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={filters.member}
                onChange={(e) => handleFilterChange('member', e.target.value)}
              >
                <option value="">All Members</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.membershipId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div>
            <Input
              label="From Date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div>
            <Input
              label="To Date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filters.format}
              onChange={(e) => handleFilterChange('format', e.target.value)}
            >
              <option value="json">View Online (JSON)</option>
              <option value="pdf">Download PDF</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? <Loading size="sm" /> : 'Generate Report'}
          </Button>
          <Button onClick={clearFilters} variant="secondary">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Report Description */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          About {selectedReport?.label}
        </h4>
        <p className="text-sm text-blue-800">
          {reportType === 'payment-history' &&
            'View complete payment history for a specific member including all payments made, dates, and status.'}
          {reportType === 'auction-history' &&
            'View all auction details including bids, winners, and dividend calculations.'}
          {reportType === 'outstanding' &&
            'View all pending and overdue payments across all or specific chit groups.'}
          {reportType === 'dividend-summary' &&
            'View detailed dividend distribution summary for all auctions and members.'}
          {reportType === 'member-statement' &&
            'Complete financial statement for a member including all debits, credits, and balance.'}
          {reportType === 'chit-summary' &&
            'Comprehensive summary of a chit group including all financial and member details.'}
          {reportType === 'financial' &&
            'Complete financial report showing revenue, collections, commissions, and more.'}
        </p>
      </div>
    </Card>
  );
};

export default ReportSelector;
