import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { Card } from '../../components/common';
import axios from 'axios';
import api from '../../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [membersData, setMembersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChitGroup, setSelectedChitGroup] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'members'

  // Modal states
  const [showCreateChitModal, setShowCreateChitModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showScheduleAuctionModal, setShowScheduleAuctionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [quickPaymentMemberSearch, setQuickPaymentMemberSearch] = useState('');
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  const [memberPendingPayments, setMemberPendingPayments] = useState([]);

  // Form states
  const [newChit, setNewChit] = useState({
    name: '',
    chitAmount: '',
    auctionGap: '1',
    membersCount: '',
    paymentModel: 'A',
    commissionRate: '5',
    gracePeriodDays: '3',
    startDate: '',
    selectedMembers: []
  });

  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    password: 'member123',
    languagePreference: 'english'
  });

  const [newAuction, setNewAuction] = useState({
    chitGroupId: '',
    scheduledDate: '',
    scheduledTime: '18:00'
  });

  const [paymentUpdate, setPaymentUpdate] = useState({
    amountPaying: '',
    paymentMethod: 'Cash',
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const [quickPayment, setQuickPayment] = useState({
    memberId: '',
    chitGroupId: '',
    paymentId: '',
    amount: '',
    paymentMethod: 'Cash',
    transactionRef: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
    fetchMembersData();

    // Auto-refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
      fetchMembersData();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/admin');
      setDashboardData(response.data);

      // Auto-select first active chit group
      if (response.data.chitGroupPayments && response.data.chitGroupPayments.length > 0) {
        setSelectedChitGroup(response.data.chitGroupPayments[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchMembersData = async () => {
    try {
      const response = await api.get('/dashboard/members');
      setMembersData(response.data);
    } catch (error) {
      console.error('Error fetching members data:', error);
    }
  };

  const handleChitGroupChange = (e) => {
    const selected = dashboardData.chitGroupPayments.find(
      chit => chit.chitGroupId === e.target.value
    );
    setSelectedChitGroup(selected);
  };

  const calculateMonthlyContribution = () => {
    if (!newChit.chitAmount || !newChit.membersCount) return 0;
    const amount = parseInt(newChit.chitAmount);
    const duration = parseInt(newChit.membersCount); // Duration = Members Count
    if (newChit.paymentModel === 'A') {
      return Math.round(amount / duration);
    } else {
      return Math.round((amount * 1.2) / duration);
    }
  };

  const calculateEndDate = () => {
    if (!newChit.startDate || !newChit.membersCount) return '';
    const start = new Date(newChit.startDate);
    const duration = parseInt(newChit.membersCount); // Duration = Members Count
    const end = new Date(start);
    end.setMonth(end.getMonth() + duration);
    return end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toggleMemberSelection = (memberId) => {
    setNewChit(prev => {
      const isAlreadySelected = prev.selectedMembers.includes(memberId);
      const membersCount = parseInt(prev.membersCount) || 0;

      // If deselecting, allow it
      if (isAlreadySelected) {
        return {
          ...prev,
          selectedMembers: prev.selectedMembers.filter(id => id !== memberId)
        };
      }

      // If selecting, check if limit is reached
      if (membersCount > 0 && prev.selectedMembers.length >= membersCount) {
        alert(`Cannot select more than ${membersCount} members. Please increase the Members Count or deselect other members first.`);
        return prev;
      }

      // Otherwise, add to selection
      return {
        ...prev,
        selectedMembers: [...prev.selectedMembers, memberId]
      };
    });
  };

  const getFilteredMembers = () => {
    if (!membersData) return [];
    if (!memberSearchQuery.trim()) return membersData;

    const query = memberSearchQuery.toLowerCase();
    return membersData.filter(member =>
      member.name.toLowerCase().includes(query) ||
      member.phone.includes(query)
    );
  };

  const getFilteredMembersForQuickPayment = () => {
    if (!membersData) return [];
    if (!quickPaymentMemberSearch.trim()) return membersData;

    const query = quickPaymentMemberSearch.toLowerCase();
    return membersData.filter(member =>
      member.name.toLowerCase().includes(query) ||
      member.phone.includes(query)
    );
  };

  const handleCreateChit = async (e) => {
    e.preventDefault();
    const monthlyContribution = calculateMonthlyContribution();
    const chitAmount = parseInt(newChit.chitAmount);
    const commissionAmount = Math.round((chitAmount * parseInt(newChit.commissionRate)) / 100);

    try {
      const payload = {
        name: newChit.name.trim(),
        chitAmount: chitAmount,
        totalMembers: parseInt(newChit.membersCount),
        duration: parseInt(newChit.membersCount), // Duration equals members count
        commissionAmount: commissionAmount,
        winnerPaymentModel: newChit.paymentModel,
        gracePeriodDays: parseInt(newChit.gracePeriodDays) || 3,
        monthlyContribution: monthlyContribution,
        auctionFrequency: parseInt(newChit.auctionGap) || 1,
        startDate: newChit.startDate,
        members: newChit.selectedMembers
      };

      console.log('📤 Creating chit group with payload:', payload);

      const response = await api.post('/chitgroups', payload);

      if (response.success) {
        alert('Chit group created successfully!');

        // Refresh dashboard data
        fetchDashboardData();
        fetchMembersData();

        setShowCreateChitModal(false);
        setNewChit({
          name: '',
          chitAmount: '',
          auctionGap: '1',
          membersCount: '',
          paymentModel: 'A',
          commissionRate: '5',
          gracePeriodDays: '3',
          startDate: '',
          selectedMembers: []
        });
        setMemberSearchQuery('');
      } else {
        alert('Failed to create chit group: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating chit group:', error);
      alert('Failed to create chit group: ' + (error.message || error.data?.error || 'Unknown error'));
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      // Map language preference to backend format
      const languageMap = {
        'english': 'en',
        'tamil': 'ta',
        'hindi': 'en' // Default to English for Hindi
      };

      const memberData = {
        name: newMember.name,
        phone: newMember.phone,
        password: newMember.password,
        language: languageMap[newMember.languagePreference] || 'en'
      };

      const response = await api.post('/members', memberData);

      if (response.success) {
        alert(`Member created successfully!\n\n` +
          `Name: ${response.data.name}\n` +
          `Phone: ${response.data.phone}\n` +
          `Language: ${response.data.language === 'en' ? 'English' : 'Tamil'}\n` +
          `Default Password: member123\n\n` +
          `The member can now login with their phone number and password.`
        );

        // Refresh members data
        fetchMembersData();
        fetchDashboardData();

        setShowAddMemberModal(false);
        setNewMember({
          name: '',
          phone: '',
          password: 'member123',
          languagePreference: 'english'
        });
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert(`Failed to add member:\n\n${error.message || 'Unknown error occurred'}`);
    }
  };

  const handleScheduleAuction = (e) => {
    e.preventDefault();
    const selectedChit = dashboardData?.activeChitGroups?.find(c => c._id === newAuction.chitGroupId);
    alert(`Scheduling Auction:\n\n` +
      `Chit Group: ${selectedChit?.name || 'N/A'}\n` +
      `Date: ${new Date(newAuction.scheduledDate).toLocaleDateString('en-IN')}\n` +
      `Time: ${newAuction.scheduledTime}\n` +
      `Next Auction #: ${(selectedChit?.completedAuctions || 0) + 1}\n\n` +
      `Note: This is a mock implementation. In Phase 2, this will create a real auction in the database.`
    );
    setShowScheduleAuctionModal(false);
    setNewAuction({
      chitGroupId: '',
      scheduledDate: '',
      scheduledTime: '18:00'
    });
  };

  const handleOpenPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setPaymentUpdate({
      amountPaying: payment.outstandingBalance.toString(),
      paymentMethod: 'Cash',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amountPaying = parseFloat(paymentUpdate.amountPaying);
    const newOutstanding = selectedPayment.outstandingBalance - amountPaying;
    const totalPaid = selectedPayment.paidAmount + amountPaying;

    let newStatus = 'Pending';
    if (newOutstanding === 0) {
      newStatus = 'Paid';
    } else if (newOutstanding < selectedPayment.dueAmount) {
      newStatus = 'Partial';
    } else {
      newStatus = selectedPayment.paymentStatus;
    }

    alert(`Recording Payment:\n\n` +
      `Member: ${selectedPayment.memberName}\n` +
      `Chit Group: ${selectedChitGroup?.chitGroupName}\n` +
      `Auction #: ${selectedPayment.auctionNumber}\n\n` +
      `Payment Details:\n` +
      `Amount Paying: ₹${amountPaying.toLocaleString('en-IN')}\n` +
      `Payment Method: ${paymentUpdate.paymentMethod}\n` +
      `Reference: ${paymentUpdate.referenceNumber || 'N/A'}\n` +
      `Payment Date: ${new Date(paymentUpdate.paymentDate).toLocaleDateString('en-IN')}\n\n` +
      `Updated Summary:\n` +
      `Previous Paid: ₹${selectedPayment.paidAmount.toLocaleString('en-IN')}\n` +
      `Total Paid Now: ₹${totalPaid.toLocaleString('en-IN')}\n` +
      `Outstanding: ₹${newOutstanding.toLocaleString('en-IN')}\n` +
      `New Status: ${newStatus}\n\n` +
      `Note: This is a mock implementation. In Phase 2, this will update the database and refresh the payment list.`
    );

    setShowPaymentModal(false);
    setSelectedPayment(null);
    setPaymentUpdate({
      amountPaying: '',
      paymentMethod: 'Cash',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0]
    });
  };

  const fetchPendingPayments = async (memberId, chitGroupId) => {
    try {
      let url = '/payments/status/pending';
      const params = [];

      if (chitGroupId) {
        params.push(`chitId=${chitGroupId}`);
      }

      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const response = await api.get(url);

      if (response.success) {
        let payments = response.data || [];

        // Filter by member if memberId is provided
        if (memberId) {
          payments = payments.filter(p =>
            (p.memberId._id === memberId || p.memberId === memberId)
          );
        }

        setMemberPendingPayments(payments);
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      setMemberPendingPayments([]);
    }
  };

  const handleQuickPaymentMemberChange = async (memberId) => {
    setQuickPayment({
      ...quickPayment,
      memberId,
      paymentId: '',
      amount: ''
    });

    await fetchPendingPayments(memberId, quickPayment.chitGroupId);
  };

  const handleMemberAutocompleteSelect = async (member) => {
    setQuickPaymentMemberSearch(member.name);
    setShowMemberSuggestions(false);
    setQuickPayment({
      ...quickPayment,
      memberId: member._id,
      paymentId: '',
      amount: ''
    });

    await fetchPendingPayments(member._id, quickPayment.chitGroupId);
  };

  const handleMemberSearchChange = (value) => {
    setQuickPaymentMemberSearch(value);
    setShowMemberSuggestions(value.length > 0);

    // Clear member selection if input is cleared
    if (!value) {
      setQuickPayment({
        ...quickPayment,
        memberId: '',
        paymentId: '',
        amount: ''
      });
      setMemberPendingPayments([]);
    }
  };

  const handleQuickPaymentChitGroupChange = async (chitGroupId) => {
    setQuickPayment({
      ...quickPayment,
      chitGroupId,
      paymentId: '',
      amount: ''
    });

    await fetchPendingPayments(quickPayment.memberId, chitGroupId);
  };

  const handleQuickPaymentSelection = (paymentId) => {
    const payment = memberPendingPayments.find(p => p._id === paymentId);
    if (payment) {
      setQuickPayment({
        ...quickPayment,
        paymentId,
        amount: payment.outstandingBalance.toString()
      });
    } else {
      setQuickPayment({
        ...quickPayment,
        paymentId,
        amount: ''
      });
    }
  };

  const handleQuickPaymentSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        paymentId: quickPayment.paymentId,
        amountPaid: parseFloat(quickPayment.amount),
        paymentDate: quickPayment.paymentDate,
        paymentMethod: quickPayment.paymentMethod,
        transactionRef: quickPayment.transactionRef.trim() || undefined
      };

      const response = await api.post('/payments/record', payload);

      if (response.success) {
        alert('Payment recorded successfully!');

        // Refresh dashboard data
        fetchDashboardData();

        // Reset form and close modal
        setShowQuickPaymentModal(false);
        setQuickPayment({
          memberId: '',
          chitGroupId: '',
          paymentId: '',
          amount: '',
          paymentMethod: 'Cash',
          transactionRef: '',
          paymentDate: new Date().toISOString().split('T')[0]
        });
        setQuickPaymentMemberSearch('');
        setShowMemberSuggestions(false);
        setMemberPendingPayments([]);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    }
  };

  return (
    <AdminLayout>
      {/* View Toggle */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {activeView === 'dashboard' ? 'Dashboard Overview' : 'All Members'}
        </h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('members')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeView === 'members'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Members
          </button>
        </div>
      </div>

      {/* Main Content */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        ) : activeView === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Quick Stats */}
              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Active Chits</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {dashboardData?.stats?.activeChits || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {dashboardData?.stats?.totalMembers || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-3xl font-bold text-green-600">
                    ₹{dashboardData?.stats?.thisMonthCollection?.toLocaleString('en-IN') || 0}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Commission</p>
                  <p className="text-3xl font-bold text-green-600">
                    ₹{dashboardData?.stats?.totalCommission?.toLocaleString('en-IN') || 0}
                  </p>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowCreateChitModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Create New Chit
                </button>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Add Member
                </button>
                <button
                  onClick={() => setShowScheduleAuctionModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Schedule Auction
                </button>
                <button
                  onClick={() => setShowQuickPaymentModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </div>

            {/* Chit Groups Information */}
            {dashboardData?.activeChitGroups && dashboardData.activeChitGroups.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Chit Groups</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.activeChitGroups.map((chit) => (
                    <div
                      key={chit._id}
                      onClick={() => navigate(`/chitgroups/${chit._id}`)}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
                        <h3 className="font-semibold text-lg truncate">{chit.name}</h3>
                        <p className="text-xs text-blue-100 mt-1">
                          {chit.totalMembers} Members • {chit.duration} Months
                        </p>
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-3">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            chit.status === 'Active' ? 'bg-green-100 text-green-800' :
                            chit.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {chit.status}
                          </span>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Auctions Progress</span>
                            <span className="font-semibold text-gray-900">
                              {chit.completedAuctions} / {chit.duration}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${(chit.completedAuctions / chit.duration) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Financial Info */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-xs text-green-700 font-medium">Chit Amount</p>
                            <p className="text-sm font-bold text-green-900">
                              ₹{(chit.chitAmount || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <p className="text-xs text-purple-700 font-medium">Monthly</p>
                            <p className="text-sm font-bold text-purple-900">
                              ₹{(chit.monthlyContribution || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="text-xs text-gray-600 pt-2 border-t">
                          <div className="flex justify-between">
                            <span>Started:</span>
                            <span className="font-medium">{new Date(chit.startDate).toLocaleDateString('en-IN')}</span>
                          </div>
                          {chit.nextAuctionDate && (
                            <div className="flex justify-between mt-1">
                              <span>Next Auction:</span>
                              <span className="font-medium text-blue-600">
                                {new Date(chit.nextAuctionDate).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chitgroups/${chit._id}`);
                          }}
                          className="w-full mt-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm font-medium transition-colors"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chit Group Payment Details with Dropdown */}
            {dashboardData?.chitGroupPayments && dashboardData.chitGroupPayments.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Member Payment Status</h2>

                  {/* Chit Group Dropdown */}
                  <div className="flex items-center gap-3">
                    <label htmlFor="chitGroupSelect" className="text-sm font-medium text-gray-700">
                      Select Chit Group:
                    </label>
                    <select
                      id="chitGroupSelect"
                      value={selectedChitGroup?.chitGroupId || ''}
                      onChange={handleChitGroupChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      {dashboardData.chitGroupPayments.map((chit) => (
                        <option key={chit.chitGroupId} value={chit.chitGroupId}>
                          {chit.chitGroupName} ({chit.totalMembers} members)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedChitGroup && (
                  <Card>
                    {/* Chit Group Info */}
                    <div className="mb-6 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{selectedChitGroup.chitGroupName}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-xs text-blue-600 font-medium">Total Members</p>
                          <p className="text-lg font-bold text-blue-900">{selectedChitGroup.totalMembers}</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <p className="text-xs text-purple-600 font-medium">Completed Auctions</p>
                          <p className="text-lg font-bold text-purple-900">{selectedChitGroup.completedAuctions}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-xs text-green-600 font-medium">Total Paid</p>
                          <p className="text-lg font-bold text-green-900">₹{selectedChitGroup.stats.totalPaid.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <p className="text-xs text-red-600 font-medium">Outstanding</p>
                          <p className="text-lg font-bold text-red-900">₹{selectedChitGroup.stats.totalOutstanding.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-600 font-medium">Payment Status</p>
                          <div className="flex flex-wrap gap-1 text-xs mt-1">
                            {selectedChitGroup.stats.paidCount > 0 && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">✓{selectedChitGroup.stats.paidCount}</span>
                            )}
                            {selectedChitGroup.stats.pendingCount > 0 && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">⏱{selectedChitGroup.stats.pendingCount}</span>
                            )}
                            {selectedChitGroup.stats.overdueCount > 0 && (
                              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded">⚠{selectedChitGroup.stats.overdueCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Member-wise Payment Table */}
                    {selectedChitGroup.payments && selectedChitGroup.payments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Member Name</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-700">Auction #</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Due Date</th>
                              <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount to Pay</th>
                              <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount Paid</th>
                              <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-700">Winner</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedChitGroup.payments.map((payment) => {
                              const isWinner = dashboardData.activeChitGroups
                                ?.find(c => c._id === selectedChitGroup.chitGroupId)
                                ?.winners?.includes(payment.memberId);

                              return (
                                <tr
                                  key={payment.id}
                                  className={`hover:bg-gray-50 cursor-pointer ${isWinner ? 'bg-green-50' : ''}`}
                                  onClick={() => {
                                    if (payment.outstandingBalance > 0) {
                                      handleOpenPaymentModal(payment);
                                    } else {
                                      alert(
                                        `Payment Details\n\n` +
                                        `Member: ${payment.memberName}\n` +
                                        `Auction: #${payment.auctionNumber}\n` +
                                        `Due Date: ${new Date(payment.dueDate).toLocaleDateString('en-IN')}\n` +
                                        `${isWinner ? '🏆 WINNER of this auction!\n' : ''}` +
                                        `\nPayment Breakdown:\n` +
                                        `Base Amount: ₹${payment.baseAmount?.toLocaleString('en-IN')}\n` +
                                        `Dividend: ${payment.dividendReceived > 0 ? `-₹${payment.dividendReceived.toLocaleString('en-IN')}` : 'None'}\n` +
                                        `Amount to Pay: ₹${payment.dueAmount.toLocaleString('en-IN')}\n` +
                                        `Amount Paid: ₹${payment.paidAmount.toLocaleString('en-IN')}\n` +
                                        `Outstanding: ₹${payment.outstandingBalance.toLocaleString('en-IN')}\n` +
                                        `\nStatus: ${payment.paymentStatus}\n` +
                                        `${payment.paidDate ? `Paid On: ${new Date(payment.paidDate).toLocaleDateString('en-IN')}\n` : ''}` +
                                        `${payment.paymentMethod ? `Method: ${payment.paymentMethod}\n` : ''}` +
                                        `${payment.referenceNumber ? `Reference: ${payment.referenceNumber}` : ''}`
                                      );
                                    }
                                  }}
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{payment.memberName}</div>
                                    {payment.delayDays > 0 && (
                                      <div className="text-xs text-red-500">Late by {payment.delayDays} days</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-600 font-medium">#{payment.auctionNumber}</td>
                                  <td className="px-4 py-3 text-gray-900">
                                    {new Date(payment.dueDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="font-semibold text-gray-900">₹{payment.dueAmount?.toLocaleString('en-IN')}</div>
                                    {payment.dividendReceived > 0 && (
                                      <div className="text-xs text-green-600">Dividend: -₹{payment.dividendReceived.toLocaleString('en-IN')}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-green-600">
                                    ₹{payment.paidAmount?.toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`font-semibold ${payment.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                      ₹{payment.outstandingBalance?.toLocaleString('en-IN')}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                      payment.paymentStatus === 'Paid'
                                        ? 'bg-green-100 text-green-800'
                                        : payment.paymentStatus === 'Pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : payment.paymentStatus === 'Partial'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {payment.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {isWinner ? (
                                      <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                        🏆 Winner
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                            <tr>
                              <td colSpan="3" className="px-4 py-3 text-right font-semibold text-gray-700">
                                Totals:
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-blue-900">
                                ₹{selectedChitGroup.stats.totalDue.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-green-900">
                                ₹{selectedChitGroup.stats.totalPaid.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-red-900">
                                ₹{selectedChitGroup.stats.totalOutstanding.toLocaleString('en-IN')}
                              </td>
                              <td colSpan="2"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-8">No payment records available for this chit group</p>
                    )}
                  </Card>
                )}
              </div>
            )}

          </>
        ) : (
          /* Members View */
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">All Members</h2>

            {membersData && membersData.length > 0 ? (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Active Chits</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Paid</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Outstanding</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Overdue</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Rankings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {membersData.map((member) => (
                        <tr
                          key={member._id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => alert(
                            `Member Details\n\n` +
                            `Name: ${member.name}\n` +
                            `Phone: ${member.phone}\n` +
                            `Email: ${member.email || 'N/A'}\n` +
                            `Status: ${member.status}\n` +
                            `Language: ${member.language === 'en' ? 'English' : member.language === 'ta' ? 'Tamil' : member.language}\n` +
                            `Joined: ${new Date(member.createdAt).toLocaleDateString('en-IN')}\n` +
                            `Last Login: ${member.lastLogin ? new Date(member.lastLogin).toLocaleDateString('en-IN') : 'Never'}\n\n` +
                            `Chit Groups: ${member.chitGroups?.length || 0}\n` +
                            `${member.chitGroups?.map(c => `- ${c.name} (${c.status})`).join('\n') || 'No chit groups'}`
                          )}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                          <td className="px-4 py-3 text-gray-600">{member.phone}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              member.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-primary-600">
                            {member.totalChitGroups || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">
                            ₹{(member.stats?.totalPaid || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">
                            ₹{(member.stats?.totalOutstanding || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(member.stats?.overduePayments || 0) > 0 ? (
                              <span className="inline-flex px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                {member.stats.overduePayments}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {member.rankings?.length > 0 ? (
                              <div className="text-xs space-y-1">
                                {member.rankings.map((rank, idx) => (
                                  <div key={idx} className="text-gray-600">
                                    <span className="font-medium">{rank.chitGroup.substring(0, 15)}...</span>: {rank.rank}/{rank.total}
                                    <span className={`ml-1 ${
                                      rank.category === 'Excellent' ? 'text-green-600' :
                                      rank.category === 'Good' ? 'text-blue-600' :
                                      rank.category === 'Fair' ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>({rank.category})</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No rankings</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-gray-600 text-center py-8">No members found</p>
              </Card>
            )}
          </div>
        )}

      {/* Modals */}

      {/* Create Chit Modal */}
      {showCreateChitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Chit Group</h2>
            <form onSubmit={handleCreateChit}>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* Basic Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Basic Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chit Name</label>
                      <input
                        type="text"
                        required
                        value={newChit.name}
                        onChange={(e) => setNewChit({...newChit, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., Monthly Chit April 2025"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chit Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={newChit.chitAmount}
                        onChange={(e) => setNewChit({...newChit, chitAmount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="100000"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Auction Gap (months)
                          <span className="text-xs text-gray-500 ml-1">(e.g., 1 for monthly)</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={newChit.auctionGap}
                          onChange={(e) => setNewChit({...newChit, auctionGap: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="1"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Members Count
                          <span className="text-xs text-gray-500 ml-1">(max members allowed)</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={newChit.membersCount}
                          onChange={(e) => setNewChit({...newChit, membersCount: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="20"
                          min="1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={newChit.startDate}
                        onChange={(e) => setNewChit({...newChit, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Configuration */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Configuration</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Model</label>
                      <select
                        value={newChit.paymentModel}
                        onChange={(e) => setNewChit({...newChit, paymentModel: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="A">Without Commission (Model A - Simple: Amount ÷ Duration)</option>
                        <option value="B">With Commission (Model B - 20% Markup: Amount × 1.2 ÷ Duration)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                        <input
                          type="number"
                          value={newChit.commissionRate}
                          onChange={(e) => setNewChit({...newChit, commissionRate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
                        <input
                          type="number"
                          value={newChit.gracePeriodDays}
                          onChange={(e) => setNewChit({...newChit, gracePeriodDays: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Plan Preview */}
                {newChit.chitAmount && newChit.membersCount && newChit.startDate && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">Payment Plan Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-blue-700">Duration:</p>
                        <p className="font-bold text-blue-900 text-lg">{newChit.membersCount} months</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Auction Contribution:</p>
                        <p className="font-bold text-blue-900 text-lg">₹{calculateMonthlyContribution().toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">End Date:</p>
                        <p className="font-bold text-blue-900 text-lg">{calculateEndDate()}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Total Collection:</p>
                        <p className="font-semibold text-blue-900">
                          ₹{(calculateMonthlyContribution() * parseInt(newChit.membersCount)).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Total Commission:</p>
                        <p className="font-semibold text-blue-900">
                          ₹{Math.round((parseInt(newChit.chitAmount) * parseInt(newChit.commissionRate)) / 100).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    {newChit.auctionGap && (
                      <div className="pt-3 border-t border-blue-200">
                        <p className="text-blue-700 text-xs mb-1">Auction Schedule:</p>
                        <p className="text-blue-900 text-xs">
                          <span className="font-semibold">{newChit.membersCount}</span> auctions, every <span className="font-semibold">{newChit.auctionGap}</span> {newChit.auctionGap === '1' ? 'month' : 'months'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Member Selection */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Select Members ({newChit.selectedMembers.length}
                    {newChit.membersCount ? `/${newChit.membersCount}` : ''} selected)
                    {newChit.membersCount && newChit.selectedMembers.length >= parseInt(newChit.membersCount) && (
                      <span className="ml-2 text-xs font-normal text-green-600">✓ Limit reached</span>
                    )}
                  </h3>

                  {/* Search Input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search members by name or phone..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {membersData && membersData.length > 0 ? (
                      getFilteredMembers().length > 0 ? (
                        getFilteredMembers().map((member) => (
                          <label
                            key={member._id}
                            className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 ${
                              newChit.selectedMembers.includes(member._id) ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={newChit.selectedMembers.includes(member._id)}
                              onChange={() => toggleMemberSelection(member._id)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.phone}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {member.status}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">No members found matching "{memberSearchQuery}"</p>
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">No members available. Add members first.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Create Chit Group
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateChitModal(false);
                    setNewChit({
                      name: '',
                      chitAmount: '',
                      auctionGap: '1',
                      membersCount: '',
                      paymentModel: 'A',
                      commissionRate: '5',
                      gracePeriodDays: '3',
                      startDate: '',
                      selectedMembers: []
                    });
                    setMemberSearchQuery('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newMember.name}
                    onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newMember.phone}
                    onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="9876543220"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language Preference</label>
                  <select
                    value={newMember.languagePreference}
                    onChange={(e) => setNewMember({...newMember, languagePreference: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="english">English</option>
                    <option value="tamil">Tamil</option>
                    <option value="hindi">Hindi</option>
                  </select>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-blue-800">Default password: <strong>member123</strong></p>
                  <p className="text-xs text-blue-600 mt-1">Member will be asked to change password on first login</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Add Member
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Auction Modal */}
      {showScheduleAuctionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule Auction</h2>
            <form onSubmit={handleScheduleAuction}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chit Group</label>
                  <select
                    required
                    value={newAuction.chitGroupId}
                    onChange={(e) => setNewAuction({...newAuction, chitGroupId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Chit Group</option>
                    {dashboardData?.activeChitGroups?.map(chit => (
                      <option key={chit._id} value={chit._id}>
                        {chit.name} (Auction #{chit.completedAuctions + 1})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auction Date</label>
                  <input
                    type="date"
                    required
                    value={newAuction.scheduledDate}
                    onChange={(e) => setNewAuction({...newAuction, scheduledDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auction Time</label>
                  <input
                    type="time"
                    required
                    value={newAuction.scheduledTime}
                    onChange={(e) => setNewAuction({...newAuction, scheduledTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Schedule Auction
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleAuctionModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Record Payment Modal */}
      {showQuickPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Quick Record Payment</h2>
            </div>
            <form onSubmit={handleQuickPaymentSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 p-6 overflow-y-auto flex-1">
                {/* Filters Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Payments</h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Member Autocomplete */}
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        By Member
                      </label>
                      <input
                        type="text"
                        placeholder="Type to search member..."
                        value={quickPaymentMemberSearch}
                        onChange={(e) => handleMemberSearchChange(e.target.value)}
                        onFocus={() => quickPaymentMemberSearch && setShowMemberSuggestions(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />

                      {/* Autocomplete Suggestions */}
                      {showMemberSuggestions && getFilteredMembersForQuickPayment().length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {getFilteredMembersForQuickPayment().map((member) => (
                            <button
                              key={member._id}
                              type="button"
                              onClick={() => handleMemberAutocompleteSelect(member)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                            >
                              <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              <div className="text-xs text-gray-500">{member.phone}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {quickPaymentMemberSearch && getFilteredMembersForQuickPayment().length === 0 && (
                        <p className="text-xs text-red-500 mt-1">No members found</p>
                      )}
                    </div>

                    {/* Chit Group Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        By Chit Group
                      </label>
                      <select
                        value={quickPayment.chitGroupId}
                        onChange={(e) => handleQuickPaymentChitGroupChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      >
                        <option value="">All Chit Groups</option>
                        {dashboardData?.activeChitGroups?.map((chit) => (
                          <option key={chit._id} value={chit._id}>
                            {chit.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payment Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Pending Payment <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={quickPayment.paymentId}
                    onChange={(e) => handleQuickPaymentSelection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Payment</option>
                    {memberPendingPayments.map((payment) => (
                      <option key={payment._id} value={payment._id}>
                        {payment.memberId?.name || payment.memberName || 'Unknown'} - {payment.chitGroupId?.name || 'Unknown Chit'} - Auction #{payment.auctionNumber} - ₹{payment.outstandingBalance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                  {(quickPayment.memberId || quickPayment.chitGroupId) && memberPendingPayments.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">No pending payments found</p>
                  )}
                  {!quickPayment.memberId && !quickPayment.chitGroupId && (
                    <p className="text-xs text-gray-500 mt-1">Select a member or chit group to see pending payments</p>
                  )}
                </div>

                {/* Payment Details - shown after selection */}
                {quickPayment.paymentId && memberPendingPayments.find(p => p._id === quickPayment.paymentId) && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2 text-sm">Payment Details</h3>
                    {(() => {
                      const payment = memberPendingPayments.find(p => p._id === quickPayment.paymentId);
                      return (
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Chit Group:</span>
                            <span className="font-medium text-blue-900">{payment.chitGroupId?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Auction:</span>
                            <span className="font-medium text-blue-900">#{payment.auctionNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Due Date:</span>
                            <span className="font-medium text-blue-900">
                              {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="text-blue-700">Base Amount:</span>
                            <span className="font-medium text-blue-900">₹{payment.baseAmount?.toLocaleString('en-IN')}</span>
                          </div>
                          {payment.dividendReceived > 0 && (
                            <div className="flex justify-between">
                              <span className="text-blue-700">Dividend:</span>
                              <span className="font-medium text-green-700">-₹{payment.dividendReceived.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-blue-700 font-medium">Due Amount:</span>
                            <span className="font-bold text-blue-900">₹{payment.dueAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Outstanding:</span>
                            <span className="font-bold text-red-700">₹{payment.outstandingBalance.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Amount */}
                {quickPayment.paymentId && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Paying (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        value={quickPayment.amount}
                        onChange={(e) => setQuickPayment({...quickPayment, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter amount"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={quickPayment.paymentMethod}
                        onChange={(e) => setQuickPayment({...quickPayment, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>

                    {/* Transaction Reference */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transaction Reference
                      </label>
                      <input
                        type="text"
                        value={quickPayment.transactionRef}
                        onChange={(e) => setQuickPayment({...quickPayment, transactionRef: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Reference number (optional)"
                      />
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={quickPayment.paymentDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setQuickPayment({...quickPayment, paymentDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 p-6 border-t bg-white">
                <button
                  type="submit"
                  disabled={!quickPayment.paymentId || !quickPayment.amount}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickPaymentModal(false);
                    setQuickPayment({
                      memberId: '',
                      chitGroupId: '',
                      paymentId: '',
                      amount: '',
                      paymentMethod: 'Cash',
                      transactionRef: '',
                      paymentDate: new Date().toISOString().split('T')[0]
                    });
                    setQuickPaymentMemberSearch('');
                    setShowMemberSuggestions(false);
                    setMemberPendingPayments([]);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Record Payment</h2>
            <form onSubmit={handleRecordPayment}>
              {/* Payment Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Payment Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member:</span>
                    <span className="font-medium text-gray-900">{selectedPayment.memberName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auction #:</span>
                    <span className="font-medium text-gray-900">#{selectedPayment.auctionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedPayment.dueDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-gray-600">Total Due:</span>
                    <span className="font-semibold text-gray-900">₹{selectedPayment.dueAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Already Paid:</span>
                    <span className="font-semibold text-green-600">₹{selectedPayment.paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-700 font-medium">Outstanding:</span>
                    <span className="font-bold text-red-600">₹{selectedPayment.outstandingBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paying (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedPayment.outstandingBalance}
                    value={paymentUpdate.amountPaying}
                    onChange={(e) => setPaymentUpdate({...paymentUpdate, amountPaying: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={`Max: ${selectedPayment.outstandingBalance}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: ₹{selectedPayment.outstandingBalance.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentUpdate.paymentMethod}
                    onChange={(e) => setPaymentUpdate({...paymentUpdate, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number {paymentUpdate.paymentMethod !== 'Cash' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={paymentUpdate.paymentMethod !== 'Cash'}
                    value={paymentUpdate.referenceNumber}
                    onChange={(e) => setPaymentUpdate({...paymentUpdate, referenceNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={paymentUpdate.paymentMethod === 'UPI' ? 'UPI Transaction ID' :
                                paymentUpdate.paymentMethod === 'Bank Transfer' ? 'NEFT/RTGS Reference' :
                                paymentUpdate.paymentMethod === 'Cheque' ? 'Cheque Number' :
                                'Reference Number'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentUpdate.paymentDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPaymentUpdate({...paymentUpdate, paymentDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Preview */}
                {paymentUpdate.amountPaying && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">After this payment:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">New Outstanding:</span>
                      <span className="font-bold text-blue-900">
                        ₹{(selectedPayment.outstandingBalance - parseFloat(paymentUpdate.amountPaying || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">Status:</span>
                      <span className="font-semibold text-blue-900">
                        {(selectedPayment.outstandingBalance - parseFloat(paymentUpdate.amountPaying || 0)) === 0
                          ? 'Paid ✓'
                          : 'Partial'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                    setPaymentUpdate({
                      amountPaying: '',
                      paymentMethod: 'Cash',
                      referenceNumber: '',
                      paymentDate: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
