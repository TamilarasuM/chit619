// localStorage API - Replaces backend API calls with localStorage operations
import mockDataService from './mockDataService';
import config from '../config';

// Simulate network delay
const delay = (ms = config.mockApiDelay) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate API response format
const createResponse = (data, success = true) => ({
  success,
  ...data,
});

// Simulate API error
const createError = (message, status = 400) => {
  return Promise.reject({
    message,
    status,
  });
};

// Auth token simulation
const getCurrentUserId = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user)._id : null;
};

// ==================== AUTH ENDPOINTS ====================

export const authApi = {
  // POST /auth/login
  login: async ({ phone, password }) => {
    await delay();

    // Normalize phone number (remove + and spaces)
    const normalizedPhone = phone.replace(/[\s+-]/g, '');

    const users = mockDataService.getCollection('users');
    const user = users.find(u => {
      const userPhone = u.phone.replace(/[\s+-]/g, '');
      return userPhone === normalizedPhone || userPhone.endsWith(normalizedPhone);
    });

    if (!user) {
      return createError('Invalid phone number or password', 401);
    }

    // In real app, password would be hashed and compared
    // For mock, we accept any password or check if it matches 'admin123' / 'member123'
    const token = 'mock_token_' + user._id;

    // Store token and user in localStorage (authService handles this)
    return createResponse({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  },

  // POST /auth/logout
  logout: async () => {
    await delay();
    return createResponse({ message: 'Logged out successfully' });
  },

  // GET /auth/me
  getMe: async () => {
    await delay();
    const userId = getCurrentUserId();
    if (!userId) {
      return createError('Not authenticated', 401);
    }
    const user = mockDataService.findById('users', userId);
    if (!user) {
      return createError('User not found', 404);
    }
    return createResponse({ user });
  },

  // PUT /auth/change-password
  changePassword: async ({ oldPassword, newPassword }) => {
    await delay();
    const userId = getCurrentUserId();
    if (!userId) {
      return createError('Not authenticated', 401);
    }
    // In real app, would verify old password
    mockDataService.update('users', userId, { password: newPassword });
    return createResponse({ message: 'Password changed successfully' });
  },
};

// ==================== CHIT GROUP ENDPOINTS ====================

export const chitGroupApi = {
  // GET /chitgroups
  getAll: async (params = {}) => {
    await delay();
    let chitGroups = mockDataService.getCollection('chitGroups');

    // Filter by status if provided
    if (params.status) {
      chitGroups = chitGroups.filter(cg => cg.status === params.status);
    }

    // Filter by memberId if provided
    if (params.memberId) {
      chitGroups = chitGroups.filter(cg => cg.members.includes(params.memberId));
    }

    return createResponse({ chitGroups });
  },

  // GET /chitgroups/:id
  getById: async (id) => {
    await delay();
    const chitGroup = mockDataService.findById('chitGroups', id);
    if (!chitGroup) {
      return createError('Chit group not found', 404);
    }

    // Populate members data
    const members = chitGroup.members.map(memberId =>
      mockDataService.findById('users', memberId)
    ).filter(Boolean);

    // Get auctions for this chit group
    const auctions = mockDataService.query('auctions', { chitGroup: id });

    return createResponse({
      chitGroup: { ...chitGroup, membersData: members, auctions },
    });
  },

  // POST /chitgroups
  create: async (data) => {
    await delay();
    const newChitGroup = mockDataService.create('chitGroups', {
      ...data,
      currentMonth: 0,
      createdBy: getCurrentUserId(),
    });
    return createResponse({ chitGroup: newChitGroup });
  },

  // PUT /chitgroups/:id
  update: async (id, data) => {
    await delay();
    const updated = mockDataService.update('chitGroups', id, data);
    if (!updated) {
      return createError('Chit group not found', 404);
    }
    return createResponse({ chitGroup: updated });
  },

  // DELETE /chitgroups/:id
  delete: async (id) => {
    await delay();
    mockDataService.delete('chitGroups', id);
    return createResponse({ message: 'Chit group deleted successfully' });
  },

  // POST /chitgroups/:id/activate
  activate: async (id) => {
    await delay();
    const updated = mockDataService.update('chitGroups', id, { status: 'Active' });
    if (!updated) {
      return createError('Chit group not found', 404);
    }
    return createResponse({ chitGroup: updated });
  },

  // POST /chitgroups/:id/close
  close: async (id) => {
    await delay();
    const updated = mockDataService.update('chitGroups', id, { status: 'Closed' });
    if (!updated) {
      return createError('Chit group not found', 404);
    }
    return createResponse({ chitGroup: updated });
  },
};

// ==================== MEMBER ENDPOINTS ====================

export const memberApi = {
  // GET /members
  getAll: async (params = {}) => {
    await delay();
    let members = mockDataService.getCollection('users').filter(u => u.role === 'member' || !params.status || u.status === params.status);

    if (params.status) {
      members = members.filter(m => m.status === params.status);
    }

    return createResponse({ members });
  },

  // POST /members
  create: async (data) => {
    await delay();
    const newMember = mockDataService.create('users', {
      ...data,
      role: 'member',
      status: 'Active',
    });
    return createResponse({ member: newMember });
  },

  // PUT /members/:id
  update: async (id, data) => {
    await delay();
    const updated = mockDataService.update('users', id, data);
    if (!updated) {
      return createError('Member not found', 404);
    }
    return createResponse({ member: updated });
  },

  // PUT /members/:id/suspend
  suspend: async (id) => {
    await delay();
    const updated = mockDataService.update('users', id, { status: 'Suspended' });
    if (!updated) {
      return createError('Member not found', 404);
    }
    return createResponse({ member: updated });
  },

  // PUT /members/:id/activate
  activate: async (id) => {
    await delay();
    const updated = mockDataService.update('users', id, { status: 'Active' });
    if (!updated) {
      return createError('Member not found', 404);
    }
    return createResponse({ member: updated });
  },
};

// ==================== AUCTION ENDPOINTS ====================

export const auctionApi = {
  // GET /auctions
  getAll: async (params = {}) => {
    await delay();
    let auctions = mockDataService.getCollection('auctions');

    if (params.status) {
      auctions = auctions.filter(a => a.status === params.status);
    }

    // Populate chit group data
    auctions = auctions.map(auction => {
      const chitGroup = mockDataService.findById('chitGroups', auction.chitGroup);
      return { ...auction, chitGroupData: chitGroup };
    });

    return createResponse({ auctions });
  },

  // GET /auctions/:id
  getById: async (id) => {
    await delay();
    const auction = mockDataService.findById('auctions', id);
    if (!auction) {
      return createError('Auction not found', 404);
    }

    const chitGroup = mockDataService.findById('chitGroups', auction.chitGroup);
    return createResponse({ auction: { ...auction, chitGroupData: chitGroup } });
  },

  // POST /auctions
  create: async (data) => {
    await delay();
    const newAuction = mockDataService.create('auctions', {
      ...data,
      status: 'Scheduled',
      bids: [],
    });
    return createResponse({ auction: newAuction });
  },

  // POST /auctions/:id/start
  start: async (id) => {
    await delay();
    const updated = mockDataService.update('auctions', id, {
      status: 'Active',
      startedAt: new Date().toISOString(),
    });
    if (!updated) {
      return createError('Auction not found', 404);
    }
    return createResponse({ auction: updated });
  },

  // POST /auctions/:id/close
  close: async (id, data) => {
    await delay();
    const updated = mockDataService.update('auctions', id, {
      status: 'Completed',
      completedAt: new Date().toISOString(),
      winner: data.winner,
      winningBid: data.winningBid,
      prizeAmount: data.prizeAmount,
    });
    if (!updated) {
      return createError('Auction not found', 404);
    }
    return createResponse({ auction: updated });
  },

  // POST /auctions/:id/bid
  submitBid: async (id, data) => {
    await delay();
    const auction = mockDataService.findById('auctions', id);
    if (!auction) {
      return createError('Auction not found', 404);
    }

    const bids = auction.bids || [];
    bids.push({
      memberId: data.memberId,
      amount: data.amount,
      timestamp: new Date().toISOString(),
    });

    const updated = mockDataService.update('auctions', id, { bids });
    return createResponse({ auction: updated });
  },

  // POST /auctions/:id/exclude-member
  excludeMember: async (id, data) => {
    await delay();
    const auction = mockDataService.findById('auctions', id);
    if (!auction) {
      return createError('Auction not found', 404);
    }

    const excludedMembers = auction.excludedMembers || [];
    if (!excludedMembers.includes(data.memberId)) {
      excludedMembers.push(data.memberId);
    }

    const updated = mockDataService.update('auctions', id, { excludedMembers });
    return createResponse({ auction: updated });
  },

  // DELETE /auctions/:id/exclude-member/:memberId
  removeExcludedMember: async (id, memberId) => {
    await delay();
    const auction = mockDataService.findById('auctions', id);
    if (!auction) {
      return createError('Auction not found', 404);
    }

    const excludedMembers = (auction.excludedMembers || []).filter(mid => mid !== memberId);
    const updated = mockDataService.update('auctions', id, { excludedMembers });
    return createResponse({ auction: updated });
  },

  // DELETE /auctions/:id
  delete: async (id) => {
    await delay();
    mockDataService.delete('auctions', id);
    return createResponse({ message: 'Auction deleted successfully' });
  },

  // GET /auctions/member/upcoming
  getMemberUpcoming: async (params = {}) => {
    await delay();
    const memberId = params.memberId || getCurrentUserId();
    const auctions = mockDataService.getCollection('auctions');

    const upcomingAuctions = auctions.filter(auction => {
      if (auction.status !== 'Scheduled' && auction.status !== 'Active') return false;
      const chitGroup = mockDataService.findById('chitGroups', auction.chitGroup);
      return chitGroup && chitGroup.members.includes(memberId);
    }).map(auction => {
      const chitGroup = mockDataService.findById('chitGroups', auction.chitGroup);
      return { ...auction, chitGroupData: chitGroup };
    });

    return createResponse({ auctions: upcomingAuctions });
  },
};

// ==================== PAYMENT ENDPOINTS ====================

export const paymentApi = {
  // GET /payments
  getAll: async (params = {}) => {
    await delay();
    let payments = mockDataService.getCollection('payments');

    if (params.status) {
      payments = payments.filter(p => p.status === params.status);
    }

    if (params.chitId) {
      payments = payments.filter(p => p.chitGroup === params.chitId);
    }

    // Populate related data
    payments = payments.map(payment => {
      const member = mockDataService.findById('users', payment.member);
      const chitGroup = mockDataService.findById('chitGroups', payment.chitGroup);
      return { ...payment, memberData: member, chitGroupData: chitGroup };
    });

    return createResponse({ payments });
  },

  // GET /payments/:id
  getById: async (id) => {
    await delay();
    const payment = mockDataService.findById('payments', id);
    if (!payment) {
      return createError('Payment not found', 404);
    }

    const member = mockDataService.findById('users', payment.member);
    const chitGroup = mockDataService.findById('chitGroups', payment.chitGroup);

    return createResponse({
      payment: { ...payment, memberData: member, chitGroupData: chitGroup },
    });
  },

  // POST /payments/record
  recordPayment: async (data) => {
    await delay();
    const newPayment = mockDataService.create('payments', {
      ...data,
      paidDate: new Date().toISOString(),
      status: 'Paid',
    });
    return createResponse({ payment: newPayment });
  },

  // POST /payments/:id/record
  recordExisting: async (id, data) => {
    await delay();
    const updated = mockDataService.update('payments', id, {
      ...data,
      paidDate: new Date().toISOString(),
      status: 'Paid',
    });
    if (!updated) {
      return createError('Payment not found', 404);
    }
    return createResponse({ payment: updated });
  },

  // GET /payments/status/pending
  getPending: async (params = {}) => {
    await delay();
    let payments = mockDataService.query('payments', { status: 'Pending' });

    if (params.chitId) {
      payments = payments.filter(p => p.chitGroup === params.chitId);
    }

    // Populate related data
    payments = payments.map(payment => {
      const member = mockDataService.findById('users', payment.member);
      const chitGroup = mockDataService.findById('chitGroups', payment.chitGroup);
      return { ...payment, memberData: member, chitGroupData: chitGroup };
    });

    return createResponse({ payments });
  },

  // GET /payments/auction/:auctionId
  getByAuction: async (auctionId) => {
    await delay();
    const payments = mockDataService.query('payments', { auction: auctionId });

    // Populate related data
    const enrichedPayments = payments.map(payment => {
      const member = mockDataService.findById('users', payment.member);
      const chitGroup = mockDataService.findById('chitGroups', payment.chitGroup);
      return { ...payment, memberData: member, chitGroupData: chitGroup };
    });

    return createResponse({ payments: enrichedPayments });
  },

  // GET /payments/member/me
  getMemberPayments: async () => {
    await delay();
    const memberId = getCurrentUserId();
    const payments = mockDataService.query('payments', { member: memberId });

    // Populate related data
    const enrichedPayments = payments.map(payment => {
      const chitGroup = mockDataService.findById('chitGroups', payment.chitGroup);
      return { ...payment, chitGroupData: chitGroup };
    });

    return createResponse({ payments: enrichedPayments });
  },

  // POST /payments/:id/extend-grace
  extendGrace: async (id, data) => {
    await delay();
    const updated = mockDataService.update('payments', id, {
      gracePeriodExtended: true,
      gracePeriodReason: data.reason,
    });
    if (!updated) {
      return createError('Payment not found', 404);
    }
    return createResponse({ payment: updated });
  },
};

// ==================== DASHBOARD ENDPOINTS ====================

export const dashboardApi = {
  // GET /dashboard/admin
  getAdminDashboard: async () => {
    await delay();
    const chitGroups = mockDataService.getCollection('chitGroups');
    const members = mockDataService.getCollection('users').filter(u => u.role === 'member');
    const auctions = mockDataService.getCollection('auctions');
    const payments = mockDataService.getCollection('payments');

    const activeChitGroups = chitGroups.filter(cg => cg.status === 'Active').length;
    const totalMembers = members.length;
    const upcomingAuctions = auctions.filter(a => a.status === 'Scheduled').length;
    const pendingPayments = payments.filter(p => p.status === 'Pending').length;

    return createResponse({
      stats: {
        activeChitGroups,
        totalMembers,
        upcomingAuctions,
        pendingPayments,
      },
      recentAuctions: auctions.slice(-5).reverse(),
      recentPayments: payments.slice(-10).reverse(),
    });
  },

  // GET /dashboard/member
  getMemberDashboard: async () => {
    await delay();
    const memberId = getCurrentUserId();
    const chitGroups = mockDataService.getCollection('chitGroups')
      .filter(cg => cg.members.includes(memberId));
    const payments = mockDataService.query('payments', { member: memberId });
    const auctions = mockDataService.getCollection('auctions')
      .filter(a => {
        const chitGroup = mockDataService.findById('chitGroups', a.chitGroup);
        return chitGroup && chitGroup.members.includes(memberId);
      });

    return createResponse({
      stats: {
        activeChitGroups: chitGroups.filter(cg => cg.status === 'Active').length,
        totalPayments: payments.length,
        pendingPayments: payments.filter(p => p.status === 'Pending').length,
        upcomingAuctions: auctions.filter(a => a.status === 'Scheduled').length,
      },
      myChitGroups: chitGroups,
      upcomingAuctions: auctions.filter(a => a.status === 'Scheduled'),
    });
  },

  // GET /dashboard/members
  getMembersList: async () => {
    await delay();
    const members = mockDataService.getCollection('users').filter(u => u.role === 'member');
    return createResponse({ members });
  },
};

// ==================== NOTIFICATION ENDPOINTS ====================

export const notificationApi = {
  // GET /notifications
  getAll: async (params = {}) => {
    await delay();
    let notifications = mockDataService.getCollection('notifications');

    if (params.userId) {
      notifications = notifications.filter(n => n.userId === params.userId);
    }

    return createResponse({ notifications });
  },

  // GET /notifications/queue
  getQueue: async () => {
    await delay();
    const notifications = mockDataService.getCollection('notifications')
      .filter(n => n.status === 'pending');
    return createResponse({ queue: notifications });
  },

  // GET /notifications/stats
  getStats: async () => {
    await delay();
    const notifications = mockDataService.getCollection('notifications');
    return createResponse({
      stats: {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'sent').length,
        pending: notifications.filter(n => n.status === 'pending').length,
        failed: notifications.filter(n => n.status === 'failed').length,
      },
    });
  },

  // POST /notifications/send
  send: async (data) => {
    await delay();
    const notification = mockDataService.create('notifications', {
      ...data,
      status: 'sent',
      read: false,
    });
    return createResponse({ notification });
  },

  // POST /notifications/:id/retry
  retry: async (id) => {
    await delay();
    const updated = mockDataService.update('notifications', id, { status: 'sent' });
    if (!updated) {
      return createError('Notification not found', 404);
    }
    return createResponse({ notification: updated });
  },

  // PUT /notifications/:id/read
  markAsRead: async (id) => {
    await delay();
    const updated = mockDataService.update('notifications', id, { read: true });
    if (!updated) {
      return createError('Notification not found', 404);
    }
    return createResponse({ notification: updated });
  },

  // PUT /notifications/mark-all-read
  markAllAsRead: async (data) => {
    await delay();
    const notifications = mockDataService.query('notifications', { userId: data.userId });
    notifications.forEach(n => {
      mockDataService.update('notifications', n._id, { read: true });
    });
    return createResponse({ message: 'All notifications marked as read' });
  },

  // DELETE /notifications/:id
  delete: async (id) => {
    await delay();
    mockDataService.delete('notifications', id);
    return createResponse({ message: 'Notification deleted successfully' });
  },

  // POST /notifications/test
  test: async (data) => {
    await delay();
    return createResponse({ message: 'Test notification sent successfully' });
  },
};

// ==================== OTHER ENDPOINTS ====================

export const otherApi = {
  // GET /audit/logs
  getAuditLogs: async () => {
    await delay();
    const logs = mockDataService.getCollection('auditLogs');
    return createResponse({ logs });
  },

  // GET /settings
  getSettings: async () => {
    await delay();
    const settings = mockDataService.getData().settings;
    // Convert settings object to array format
    const settingsArray = Object.keys(settings).map(key => ({
      key,
      value: settings[key],
    }));
    return createResponse({ settings: settingsArray });
  },

  // PUT /settings/:key
  updateSetting: async (key, data) => {
    await delay();
    const allData = mockDataService.getData();
    allData.settings[key] = data.value;
    mockDataService.saveData(allData);
    return createResponse({ setting: { key, value: data.value } });
  },

  // POST /settings/initialize
  initializeSettings: async () => {
    await delay();
    return createResponse({ message: 'Settings initialized successfully' });
  },

  // GET /member/chits
  getMemberChits: async () => {
    await delay();
    const memberId = getCurrentUserId();
    const chitGroups = mockDataService.getCollection('chitGroups')
      .filter(cg => cg.members.includes(memberId));
    return createResponse({ chitGroups });
  },

  // GET /member/chits/:id/statement
  getMemberStatement: async (id, params = {}) => {
    await delay();
    const memberId = getCurrentUserId();
    const chitGroup = mockDataService.findById('chitGroups', id);

    if (!chitGroup || !chitGroup.members.includes(memberId)) {
      return createError('Chit group not found or access denied', 404);
    }

    const payments = mockDataService.query('payments', {
      chitGroup: id,
      member: memberId,
    });

    const auctions = mockDataService.query('auctions', { chitGroup: id });

    return createResponse({
      chitGroup,
      payments,
      auctions,
    });
  },
};

// Export a combined API object
const localStorageApi = {
  auth: authApi,
  chitGroups: chitGroupApi,
  members: memberApi,
  auctions: auctionApi,
  payments: paymentApi,
  dashboard: dashboardApi,
  notifications: notificationApi,
  other: otherApi,
};

export default localStorageApi;
