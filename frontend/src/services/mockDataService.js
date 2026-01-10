// Mock Data Service - Manages localStorage data for frontend-only development

const STORAGE_KEY = 'chitfund_mock_data';
const VERSION_KEY = 'chitfund_mock_data_version';
const CURRENT_VERSION = '1.0.0';

// Generate unique IDs
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Default seed data
const getDefaultData = () => ({
  users: [
    {
      _id: 'admin001',
      name: 'Admin User',
      phone: '+919876543210',
      password: '$2a$10$XqR8zqZ5H9K2H5H5H5H5H.5H5H5H5H5H5H5H5H5H5H5H5H5H', // 'admin123'
      role: 'admin',
      email: 'admin@chitfund.com',
      status: 'Active',
      createdAt: new Date('2024-01-01').toISOString(),
    },
    {
      _id: 'member001',
      name: 'Rajesh Kumar',
      phone: '+919876543211',
      password: '$2a$10$XqR8zqZ5H9K2H5H5H5H5H.5H5H5H5H5H5H5H5H5H5H5H5H5H', // 'member123'
      role: 'member',
      email: 'rajesh@example.com',
      address: '123 Main St, Chennai',
      aadharNumber: '1234-5678-9012',
      status: 'Active',
      joinedDate: new Date('2024-01-15').toISOString(),
      createdAt: new Date('2024-01-15').toISOString(),
    },
    {
      _id: 'member002',
      name: 'Priya Sharma',
      phone: '+919876543212',
      password: '$2a$10$XqR8zqZ5H9K2H5H5H5H5H.5H5H5H5H5H5H5H5H5H5H5H5H5H',
      role: 'member',
      email: 'priya@example.com',
      address: '456 Park Ave, Chennai',
      aadharNumber: '2345-6789-0123',
      status: 'Active',
      joinedDate: new Date('2024-01-20').toISOString(),
      createdAt: new Date('2024-01-20').toISOString(),
    },
    {
      _id: 'member003',
      name: 'Arun Vijay',
      phone: '+919876543213',
      password: '$2a$10$XqR8zqZ5H9K2H5H5H5H5H.5H5H5H5H5H5H5H5H5H5H5H5H5H',
      role: 'member',
      email: 'arun@example.com',
      address: '789 Lake Road, Chennai',
      aadharNumber: '3456-7890-1234',
      status: 'Active',
      joinedDate: new Date('2024-02-01').toISOString(),
      createdAt: new Date('2024-02-01').toISOString(),
    },
    {
      _id: 'member004',
      name: 'Lakshmi Devi',
      phone: '+919876543214',
      password: '$2a$10$XqR8zqZ5H9K2H5H5H5H5H.5H5H5H5H5H5H5H5H5H5H5H5H5H',
      role: 'member',
      email: 'lakshmi@example.com',
      address: '321 Temple St, Chennai',
      aadharNumber: '4567-8901-2345',
      status: 'Active',
      joinedDate: new Date('2024-02-05').toISOString(),
      createdAt: new Date('2024-02-05').toISOString(),
    },
  ],

  chitGroups: [
    {
      _id: 'chit001',
      name: 'Monthly Chit - 50K',
      totalAmount: 50000,
      duration: 10,
      monthlyContribution: 5000,
      commissionPercentage: 5,
      startDate: new Date('2024-02-01').toISOString(),
      status: 'Active',
      members: ['member001', 'member002', 'member003', 'member004'],
      currentMonth: 3,
      auctionDay: 1,
      gracePeriodDays: 7,
      penaltyPercentage: 2,
      createdBy: 'admin001',
      createdAt: new Date('2024-01-25').toISOString(),
    },
    {
      _id: 'chit002',
      name: 'Premium Chit - 100K',
      totalAmount: 100000,
      duration: 20,
      monthlyContribution: 5000,
      commissionPercentage: 4,
      startDate: new Date('2024-03-01').toISOString(),
      status: 'Active',
      members: ['member001', 'member002', 'member003'],
      currentMonth: 1,
      auctionDay: 15,
      gracePeriodDays: 7,
      penaltyPercentage: 2,
      createdBy: 'admin001',
      createdAt: new Date('2024-02-20').toISOString(),
    },
    {
      _id: 'chit003',
      name: 'Quick Chit - 25K',
      totalAmount: 25000,
      duration: 5,
      monthlyContribution: 5000,
      commissionPercentage: 5,
      startDate: new Date('2024-04-01').toISOString(),
      status: 'Pending',
      members: ['member001', 'member004'],
      currentMonth: 0,
      auctionDay: 10,
      gracePeriodDays: 5,
      penaltyPercentage: 2,
      createdBy: 'admin001',
      createdAt: new Date('2024-03-15').toISOString(),
    },
  ],

  auctions: [
    {
      _id: 'auction001',
      chitGroup: 'chit001',
      month: 1,
      scheduledDate: new Date('2024-02-01T10:00:00').toISOString(),
      status: 'Completed',
      winner: 'member001',
      winningBid: 2500,
      prizeAmount: 47500,
      startedAt: new Date('2024-02-01T10:00:00').toISOString(),
      completedAt: new Date('2024-02-01T10:45:00').toISOString(),
      bids: [
        { memberId: 'member001', amount: 2500, timestamp: new Date('2024-02-01T10:30:00').toISOString() },
        { memberId: 'member002', amount: 2000, timestamp: new Date('2024-02-01T10:25:00').toISOString() },
      ],
      createdAt: new Date('2024-01-28').toISOString(),
    },
    {
      _id: 'auction002',
      chitGroup: 'chit001',
      month: 2,
      scheduledDate: new Date('2024-03-01T10:00:00').toISOString(),
      status: 'Completed',
      winner: 'member002',
      winningBid: 2200,
      prizeAmount: 47800,
      startedAt: new Date('2024-03-01T10:00:00').toISOString(),
      completedAt: new Date('2024-03-01T10:40:00').toISOString(),
      bids: [
        { memberId: 'member002', amount: 2200, timestamp: new Date('2024-03-01T10:28:00').toISOString() },
        { memberId: 'member003', amount: 1800, timestamp: new Date('2024-03-01T10:22:00').toISOString() },
      ],
      createdAt: new Date('2024-02-25').toISOString(),
    },
    {
      _id: 'auction003',
      chitGroup: 'chit001',
      month: 3,
      scheduledDate: new Date('2024-04-01T10:00:00').toISOString(),
      status: 'Scheduled',
      bids: [],
      createdAt: new Date('2024-03-25').toISOString(),
    },
    {
      _id: 'auction004',
      chitGroup: 'chit002',
      month: 1,
      scheduledDate: new Date('2024-03-15T10:00:00').toISOString(),
      status: 'Completed',
      winner: 'member003',
      winningBid: 4000,
      prizeAmount: 96000,
      startedAt: new Date('2024-03-15T10:00:00').toISOString(),
      completedAt: new Date('2024-03-15T10:50:00').toISOString(),
      bids: [
        { memberId: 'member003', amount: 4000, timestamp: new Date('2024-03-15T10:35:00').toISOString() },
        { memberId: 'member001', amount: 3500, timestamp: new Date('2024-03-15T10:30:00').toISOString() },
      ],
      createdAt: new Date('2024-03-10').toISOString(),
    },
  ],

  payments: [
    // Chit001 - Month 1 payments
    {
      _id: 'pay001',
      chitGroup: 'chit001',
      member: 'member001',
      auction: 'auction001',
      month: 1,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-02-01').toISOString(),
      paidDate: new Date('2024-02-01').toISOString(),
      paymentMethod: 'Cash',
      receiptNumber: 'RCT001',
      createdAt: new Date('2024-02-01').toISOString(),
    },
    {
      _id: 'pay002',
      chitGroup: 'chit001',
      member: 'member002',
      auction: 'auction001',
      month: 1,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-02-01').toISOString(),
      paidDate: new Date('2024-02-02').toISOString(),
      paymentMethod: 'Online',
      receiptNumber: 'RCT002',
      createdAt: new Date('2024-02-02').toISOString(),
    },
    {
      _id: 'pay003',
      chitGroup: 'chit001',
      member: 'member003',
      auction: 'auction001',
      month: 1,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-02-01').toISOString(),
      paidDate: new Date('2024-02-01').toISOString(),
      paymentMethod: 'Cash',
      receiptNumber: 'RCT003',
      createdAt: new Date('2024-02-01').toISOString(),
    },
    {
      _id: 'pay004',
      chitGroup: 'chit001',
      member: 'member004',
      auction: 'auction001',
      month: 1,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-02-01').toISOString(),
      paidDate: new Date('2024-02-03').toISOString(),
      paymentMethod: 'Online',
      receiptNumber: 'RCT004',
      createdAt: new Date('2024-02-03').toISOString(),
    },
    // Chit001 - Month 2 payments
    {
      _id: 'pay005',
      chitGroup: 'chit001',
      member: 'member001',
      auction: 'auction002',
      month: 2,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-03-01').toISOString(),
      paidDate: new Date('2024-03-01').toISOString(),
      paymentMethod: 'Cash',
      receiptNumber: 'RCT005',
      createdAt: new Date('2024-03-01').toISOString(),
    },
    {
      _id: 'pay006',
      chitGroup: 'chit001',
      member: 'member002',
      auction: 'auction002',
      month: 2,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-03-01').toISOString(),
      paidDate: new Date('2024-03-02').toISOString(),
      paymentMethod: 'Online',
      receiptNumber: 'RCT006',
      createdAt: new Date('2024-03-02').toISOString(),
    },
    {
      _id: 'pay007',
      chitGroup: 'chit001',
      member: 'member003',
      auction: 'auction002',
      month: 2,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Pending',
      dueDate: new Date('2024-03-01').toISOString(),
      createdAt: new Date('2024-03-01').toISOString(),
    },
    {
      _id: 'pay008',
      chitGroup: 'chit001',
      member: 'member004',
      auction: 'auction002',
      month: 2,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Pending',
      dueDate: new Date('2024-03-01').toISOString(),
      createdAt: new Date('2024-03-01').toISOString(),
    },
    // Chit002 - Month 1 payments
    {
      _id: 'pay009',
      chitGroup: 'chit002',
      member: 'member001',
      auction: 'auction004',
      month: 1,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-03-15').toISOString(),
      paidDate: new Date('2024-03-15').toISOString(),
      paymentMethod: 'Cash',
      receiptNumber: 'RCT007',
      createdAt: new Date('2024-03-15').toISOString(),
    },
    {
      _id: 'pay010',
      chitGroup: 'chit002',
      member: 'member002',
      auction: 'auction004',
      month: 1,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Pending',
      dueDate: new Date('2024-03-15').toISOString(),
      createdAt: new Date('2024-03-15').toISOString(),
    },
    {
      _id: 'pay011',
      chitGroup: 'chit002',
      member: 'member003',
      auction: 'auction004',
      month: 1,
      type: 'Monthly Contribution',
      amount: 5000,
      status: 'Paid',
      dueDate: new Date('2024-03-15').toISOString(),
      paidDate: new Date('2024-03-15').toISOString(),
      paymentMethod: 'Online',
      receiptNumber: 'RCT008',
      createdAt: new Date('2024-03-15').toISOString(),
    },
  ],

  notifications: [
    {
      _id: 'notif001',
      userId: 'member001',
      type: 'auction_reminder',
      title: 'Upcoming Auction',
      message: 'Auction for Monthly Chit - 50K is scheduled for tomorrow at 10:00 AM',
      status: 'sent',
      read: true,
      createdAt: new Date('2024-03-31').toISOString(),
    },
    {
      _id: 'notif002',
      userId: 'member002',
      type: 'payment_reminder',
      title: 'Payment Due',
      message: 'Your payment of ₹5000 for Monthly Chit - 50K is due on 01/04/2024',
      status: 'sent',
      read: false,
      createdAt: new Date('2024-03-30').toISOString(),
    },
    {
      _id: 'notif003',
      userId: 'member003',
      type: 'auction_won',
      title: 'Congratulations!',
      message: 'You won the auction for Premium Chit - 100K with a bid of ₹4000',
      status: 'sent',
      read: true,
      createdAt: new Date('2024-03-15').toISOString(),
    },
  ],

  settings: {
    defaultGracePeriod: 7,
    defaultPenaltyPercentage: 2,
    defaultCommissionPercentage: 5,
    currency: '₹',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
    whatsappEnabled: false,
    emailEnabled: false,
  },

  auditLogs: [
    {
      _id: 'audit001',
      user: 'admin001',
      action: 'CREATE_CHIT_GROUP',
      resource: 'chit001',
      details: 'Created chit group: Monthly Chit - 50K',
      timestamp: new Date('2024-01-25').toISOString(),
    },
    {
      _id: 'audit002',
      user: 'admin001',
      action: 'CREATE_MEMBER',
      resource: 'member001',
      details: 'Created member: Rajesh Kumar',
      timestamp: new Date('2024-01-15').toISOString(),
    },
    {
      _id: 'audit003',
      user: 'admin001',
      action: 'START_AUCTION',
      resource: 'auction001',
      details: 'Started auction for Monthly Chit - 50K Month 1',
      timestamp: new Date('2024-02-01T10:00:00').toISOString(),
    },
  ],
});

class MockDataService {
  constructor() {
    this.initializeData();
  }

  // Initialize localStorage with seed data if not exists or version changed
  initializeData() {
    const existingVersion = localStorage.getItem(VERSION_KEY);
    const existingData = localStorage.getItem(STORAGE_KEY);

    if (!existingData || existingVersion !== CURRENT_VERSION) {
      console.log('Initializing mock data...');
      const defaultData = getDefaultData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  }

  // Get all data
  getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultData();
  }

  // Save all data
  saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Reset to default data
  resetData() {
    const defaultData = getDefaultData();
    this.saveData(defaultData);
    return defaultData;
  }

  // Get specific collection
  getCollection(collectionName) {
    const data = this.getData();
    return data[collectionName] || [];
  }

  // Save specific collection
  saveCollection(collectionName, collection) {
    const data = this.getData();
    data[collectionName] = collection;
    this.saveData(data);
  }

  // Generate unique ID
  generateId() {
    return generateId();
  }

  // Find item by ID
  findById(collectionName, id) {
    const collection = this.getCollection(collectionName);
    return collection.find(item => item._id === id);
  }

  // Create item
  create(collectionName, item) {
    const collection = this.getCollection(collectionName);
    const newItem = {
      ...item,
      _id: item._id || this.generateId(),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    collection.push(newItem);
    this.saveCollection(collectionName, collection);
    return newItem;
  }

  // Update item
  update(collectionName, id, updates) {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex(item => item._id === id);
    if (index !== -1) {
      collection[index] = { ...collection[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveCollection(collectionName, collection);
      return collection[index];
    }
    return null;
  }

  // Delete item
  delete(collectionName, id) {
    const collection = this.getCollection(collectionName);
    const newCollection = collection.filter(item => item._id !== id);
    this.saveCollection(collectionName, newCollection);
    return true;
  }

  // Query items
  query(collectionName, filters = {}) {
    const collection = this.getCollection(collectionName);
    return collection.filter(item => {
      return Object.keys(filters).every(key => {
        if (filters[key] === undefined) return true;
        return item[key] === filters[key];
      });
    });
  }
}

// Create singleton instance
const mockDataService = new MockDataService();

export default mockDataService;
