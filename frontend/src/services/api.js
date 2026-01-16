import axios from 'axios';
import config from '../config';
import localStorageApi from './localStorageApi';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant header for multi-tenant support
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    // For blob responses (like PDFs), return the full response
    if (response.config.responseType === 'blob') {
      return response;
    }
    // For JSON responses, extract data
    return response.data;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';

      // Handle specific error cases
      if (error.response.status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      return Promise.reject({
        message,
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({
        message: 'No response from server. Please check your internet connection.',
        status: 0,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject({
        message: error.message || 'An error occurred while making the request',
        status: 0,
      });
    }
  }
);

// ==================== API ROUTER ====================
// Routes requests to either axios (backend) or localStorage based on config

const parseEndpoint = (endpoint) => {
  // Remove leading slash
  const path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const parts = path.split('/');
  return { parts, path };
};

const routeRequest = async (method, endpoint, data = null, axiosConfig = {}) => {
  // Use localStorage API if enabled
  if (config.useMockData) {
    const { parts, path } = parseEndpoint(endpoint);
    const [resource, id, action, subId] = parts;

    try {
      // Route to appropriate localStorage API
      switch (resource) {
        case 'auth':
          if (id === 'login') return await localStorageApi.auth.login(data);
          if (id === 'logout') return await localStorageApi.auth.logout();
          if (id === 'me') return await localStorageApi.auth.getMe();
          if (id === 'change-password') return await localStorageApi.auth.changePassword(data);
          break;

        case 'chitgroups':
          if (!id) {
            if (method === 'GET') return await localStorageApi.chitGroups.getAll(axiosConfig.params || {});
            if (method === 'POST') return await localStorageApi.chitGroups.create(data);
          } else {
            if (action === 'activate') return await localStorageApi.chitGroups.activate(id);
            if (action === 'close') return await localStorageApi.chitGroups.close(id);
            if (method === 'GET') return await localStorageApi.chitGroups.getById(id);
            if (method === 'PUT') return await localStorageApi.chitGroups.update(id, data);
            if (method === 'DELETE') return await localStorageApi.chitGroups.delete(id);
          }
          break;

        case 'members':
          if (!id) {
            if (method === 'GET') return await localStorageApi.members.getAll(axiosConfig.params || {});
            if (method === 'POST') return await localStorageApi.members.create(data);
          } else {
            if (action === 'suspend') return await localStorageApi.members.suspend(id);
            if (action === 'activate') return await localStorageApi.members.activate(id);
            if (method === 'PUT') return await localStorageApi.members.update(id, data);
          }
          break;

        case 'auctions':
          if (!id) {
            if (method === 'GET') return await localStorageApi.auctions.getAll(axiosConfig.params || {});
            if (method === 'POST') return await localStorageApi.auctions.create(data);
          } else if (id === 'member' && action === 'upcoming') {
            // /auctions/member/upcoming
            return await localStorageApi.auctions.getMemberUpcoming(axiosConfig.params || {});
          } else if (action === 'start') {
            // /auctions/:id/start
            return await localStorageApi.auctions.start(id);
          } else if (action === 'close') {
            // /auctions/:id/close
            return await localStorageApi.auctions.close(id, data);
          } else if (action === 'bid') {
            // /auctions/:id/bid
            return await localStorageApi.auctions.submitBid(id, data);
          } else if (action === 'exclude-member') {
            // /auctions/:id/exclude-member OR /auctions/:id/exclude-member/:memberId
            if (method === 'DELETE') return await localStorageApi.auctions.removeExcludedMember(id, subId);
            return await localStorageApi.auctions.excludeMember(id, data);
          } else if (action === 'payments') {
            // /auctions/:id/payments
            return await localStorageApi.payments.getByAuction(id);
          } else if (method === 'GET') {
            // /auctions/:id
            return await localStorageApi.auctions.getById(id);
          } else if (method === 'DELETE') {
            // /auctions/:id (DELETE)
            return await localStorageApi.auctions.delete(id);
          }
          break;

        case 'payments':
          if (!id) {
            // /payments (GET)
            return await localStorageApi.payments.getAll(axiosConfig.params || {});
          } else if (id === 'status' && action === 'pending') {
            // /payments/status/pending
            return await localStorageApi.payments.getPending(axiosConfig.params || {});
          } else if (id === 'member' && action === 'me') {
            // /payments/member/me
            return await localStorageApi.payments.getMemberPayments();
          } else if (id === 'auction') {
            // /payments/auction/:auctionId
            return await localStorageApi.payments.getByAuction(action);
          } else if (id === 'record') {
            // /payments/record
            return await localStorageApi.payments.recordPayment(data);
          } else if (action === 'record') {
            // /payments/:id/record
            return await localStorageApi.payments.recordExisting(id, data);
          } else if (action === 'extend-grace') {
            // /payments/:id/extend-grace
            return await localStorageApi.payments.extendGrace(id, data);
          } else if (method === 'GET') {
            // /payments/:id
            return await localStorageApi.payments.getById(id);
          }
          break;

        case 'dashboard':
          if (id === 'admin') return await localStorageApi.dashboard.getAdminDashboard();
          if (id === 'member') return await localStorageApi.dashboard.getMemberDashboard();
          if (id === 'members') return await localStorageApi.dashboard.getMembersList();
          break;

        case 'notifications':
          if (!id) {
            // /notifications (GET)
            return await localStorageApi.notifications.getAll(axiosConfig.params || {});
          } else if (id === 'queue') {
            // /notifications/queue
            return await localStorageApi.notifications.getQueue();
          } else if (id === 'stats') {
            // /notifications/stats
            return await localStorageApi.notifications.getStats();
          } else if (id === 'send') {
            // /notifications/send
            return await localStorageApi.notifications.send(data);
          } else if (id === 'test') {
            // /notifications/test
            return await localStorageApi.notifications.test(data);
          } else if (id === 'mark-all-read') {
            // /notifications/mark-all-read
            return await localStorageApi.notifications.markAllAsRead(data);
          } else if (action === 'retry') {
            // /notifications/:id/retry
            return await localStorageApi.notifications.retry(id);
          } else if (action === 'read') {
            // /notifications/:id/read
            return await localStorageApi.notifications.markAsRead(id);
          } else if (method === 'DELETE') {
            // /notifications/:id (DELETE)
            return await localStorageApi.notifications.delete(id);
          }
          break;

        case 'audit':
          if (id === 'logs') return await localStorageApi.other.getAuditLogs();
          break;

        case 'settings':
          if (!id) {
            if (method === 'GET') return await localStorageApi.other.getSettings();
          } else if (id === 'initialize') {
            return await localStorageApi.other.initializeSettings();
          } else {
            if (method === 'PUT') return await localStorageApi.other.updateSetting(id, data);
          }
          break;

        case 'member':
          if (id === 'chits') {
            if (!action) return await localStorageApi.other.getMemberChits();
            if (subId === 'statement') {
              return await localStorageApi.other.getMemberStatement(action, axiosConfig.params || {});
            }
          }
          break;

        default:
          console.warn(`No localStorage route found for: ${method} ${endpoint}`);
          throw new Error(`Endpoint not implemented in localStorage mode: ${endpoint}`);
      }

      throw new Error(`Endpoint not implemented in localStorage mode: ${method} ${endpoint}`);
    } catch (error) {
      console.error('localStorage API error:', error);
      return Promise.reject(error);
    }
  }

  // Use axios (backend API)
  switch (method) {
    case 'GET':
      return axiosInstance.get(endpoint, axiosConfig);
    case 'POST':
      return axiosInstance.post(endpoint, data, axiosConfig);
    case 'PUT':
      return axiosInstance.put(endpoint, data, axiosConfig);
    case 'DELETE':
      return axiosInstance.delete(endpoint, axiosConfig);
    case 'PATCH':
      return axiosInstance.patch(endpoint, data, axiosConfig);
    default:
      throw new Error(`Unknown HTTP method: ${method}`);
  }
};

// Create API object with same interface as axios
const api = {
  get: (endpoint, config) => routeRequest('GET', endpoint, null, config),
  post: (endpoint, data, config) => routeRequest('POST', endpoint, data, config),
  put: (endpoint, data, config) => routeRequest('PUT', endpoint, data, config),
  delete: (endpoint, config) => routeRequest('DELETE', endpoint, null, config),
  patch: (endpoint, data, config) => routeRequest('PATCH', endpoint, data, config),
};

export default api;
