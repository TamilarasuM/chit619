import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [chitGroups, setChitGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [reportParams, setReportParams] = useState({
    chitGroupId: '',
    memberId: '',
    auctionNumber: '',
    fromDate: '',
    toDate: ''
  });

  useEffect(() => {
    fetchChitGroups();
    fetchMembers();
  }, []);

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

  const fetchMembers = async () => {
    try {
      const response = await api.get('/members');
      if (response.success) {
        setMembers(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchAuctions = async (chitGroupId) => {
    if (!chitGroupId) {
      setAuctions([]);
      return;
    }

    try {
      const response = await api.get(`/chitgroups/${chitGroupId}`);
      if (response.success && response.data.auctions) {
        setAuctions(response.data.auctions);
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setAuctions([]);
    }
  };

  useEffect(() => {
    if (reportParams.chitGroupId) {
      fetchAuctions(reportParams.chitGroupId);
    } else {
      setAuctions([]);
    }
  }, [reportParams.chitGroupId]);

  const reportTypes = [
    {
      id: 'chit-summary',
      name: 'Chit Group Summary',
      description: 'Comprehensive report of a chit group including members, auctions, and financial summary',
      requiresChitGroup: true,
      endpoint: '/reports/chit-summary'
    },
    {
      id: 'member-statement',
      name: 'Member Statement',
      description: 'Detailed transaction statement for a specific member',
      requiresMember: true,
      requiresChitGroup: true,
      endpoint: '/reports/member-statement'
    },
    {
      id: 'auction-history',
      name: 'Auction History',
      description: 'Complete auction history with bids and winners',
      requiresChitGroup: true,
      supportsDateRange: true,
      endpoint: '/reports/auction-history'
    },
    {
      id: 'payment-history',
      name: 'Payment Collection Report',
      description: 'Payment collection summary across all or specific chit group',
      requiresChitGroup: false,
      supportsDateRange: true,
      endpoint: '/reports/payment-history'
    },
    {
      id: 'outstanding',
      name: 'Outstanding Payments',
      description: 'List of all pending and overdue payments',
      requiresChitGroup: false,
      endpoint: '/reports/outstanding'
    },
    {
      id: 'financial',
      name: 'Financial/Commission Report',
      description: 'Commission earnings and financial overview',
      supportsDateRange: true,
      endpoint: '/reports/financial'
    },
    {
      id: 'dividend-summary',
      name: 'Dividend Distribution Summary',
      description: 'Dividend distribution details for a chit group',
      requiresChitGroup: true,
      supportsDateRange: true,
      endpoint: '/reports/dividend-summary'
    }
  ];

  const selectedReportType = reportTypes.find(r => r.id === selectedReport);

  const handleGenerateReport = async (format) => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    const reportType = reportTypes.find(r => r.id === selectedReport);

    if (reportType.requiresChitGroup && !reportParams.chitGroupId) {
      alert('Please select a chit group');
      return;
    }

    if (reportType.requiresMember && !reportParams.memberId) {
      alert('Please select a member');
      return;
    }

    try {
      setLoading(true);

      let url = reportType.endpoint;
      const params = new URLSearchParams();
      params.append('format', format);

      // Build URL based on report type
      if (selectedReport === 'chit-summary') {
        url = `/reports/chit-summary/${reportParams.chitGroupId}`;
        if (reportParams.auctionNumber) {
          params.append('auctionNumber', reportParams.auctionNumber);
        }
      } else if (selectedReport === 'member-statement') {
        url = `/reports/member-statement/${reportParams.memberId}`;
        if (reportParams.chitGroupId) params.append('chitId', reportParams.chitGroupId);
      } else if (selectedReport === 'auction-history') {
        params.append('chitId', reportParams.chitGroupId);
      } else if (selectedReport === 'payment-history') {
        if (reportParams.chitGroupId) params.append('chitId', reportParams.chitGroupId);
        if (reportParams.memberId) params.append('memberId', reportParams.memberId);
      } else if (selectedReport === 'outstanding') {
        if (reportParams.chitGroupId) params.append('chitId', reportParams.chitGroupId);
      } else if (selectedReport === 'dividend-summary') {
        params.append('chitId', reportParams.chitGroupId);
      }

      // Add date range if supported
      if (reportType.supportsDateRange) {
        if (reportParams.fromDate) params.append('from', reportParams.fromDate);
        if (reportParams.toDate) params.append('to', reportParams.toDate);
      }

      const fullUrl = `${url}?${params.toString()}`;

      if (format === 'pdf') {
        const response = await api.get(fullUrl, {
          responseType: 'blob'
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${selectedReport}-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        const response = await api.get(fullUrl);
        if (response.success) {
          alert('Report generated successfully! (JSON format displayed in console)');
          console.log('Report Data:', response.data);
        }
      }
    } catch (err) {
      console.error('Error generating report:', err);
      alert(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="mt-1 text-gray-600">Generate comprehensive reports and download as PDF</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Select Report Type</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {reportTypes.map(report => (
                    <button
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report.id);
                        setReportParams({
                          chitGroupId: '',
                          memberId: '',
                          auctionNumber: '',
                          fromDate: '',
                          toDate: ''
                        });
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedReport === report.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{report.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{report.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Report Parameters & Generation */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">
                  {selectedReportType ? selectedReportType.name : 'Report Configuration'}
                </h2>
              </div>

              <div className="p-6">
                {!selectedReport ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Report Selected</h3>
                    <p className="mt-1 text-sm text-gray-500">Select a report type from the left panel</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Chit Group Selection */}
                    {selectedReportType.requiresChitGroup !== false && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chit Group {selectedReportType.requiresChitGroup && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          value={reportParams.chitGroupId}
                          onChange={(e) => setReportParams(prev => ({
                            ...prev,
                            chitGroupId: e.target.value,
                            auctionNumber: '' // Reset auction when chit group changes
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required={selectedReportType.requiresChitGroup}
                        >
                          <option value="">
                            {selectedReportType.requiresChitGroup ? 'Select chit group...' : 'All chit groups'}
                          </option>
                          {chitGroups.map(group => (
                            <option key={group._id} value={group._id}>{group.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Auction Selection (Only for chit-summary) */}
                    {selectedReport === 'chit-summary' && reportParams.chitGroupId && auctions.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Auction
                        </label>
                        <select
                          value={reportParams.auctionNumber}
                          onChange={(e) => setReportParams(prev => ({ ...prev, auctionNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Auctions</option>
                          {auctions
                            .sort((a, b) => a.auctionNumber - b.auctionNumber)
                            .map(auction => (
                              <option key={auction._id} value={auction.auctionNumber}>
                                Auction #{auction.auctionNumber} - {auction.status} - {new Date(auction.scheduledDate).toLocaleDateString('en-IN')}
                              </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Select a specific auction or leave as "All Auctions" for complete report
                        </p>
                      </div>
                    )}

                    {/* Member Selection */}
                    {selectedReportType.requiresMember && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Member <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={reportParams.memberId}
                          onChange={(e) => setReportParams(prev => ({ ...prev, memberId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select member...</option>
                          {members.map(member => (
                            <option key={member._id} value={member._id}>
                              {member.name} ({member.phone})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Date Range */}
                    {selectedReportType.supportsDateRange && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            From Date
                          </label>
                          <input
                            type="date"
                            value={reportParams.fromDate}
                            onChange={(e) => setReportParams(prev => ({ ...prev, fromDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            To Date
                          </label>
                          <input
                            type="date"
                            value={reportParams.toDate}
                            onChange={(e) => setReportParams(prev => ({ ...prev, toDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleGenerateReport('pdf')}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Generating...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download PDF
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleGenerateReport('json')}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Data (JSON)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Report Info */}
            {selectedReportType && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-800">
                      {selectedReportType.name}
                    </h3>
                    <p className="mt-2 text-sm text-blue-700">
                      {selectedReportType.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
