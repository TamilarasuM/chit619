// Application Configuration
export const config = {
  // Use mock data (localStorage) instead of backend API
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',

  // API Base URL (used when useMockData is false)
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',

  // Simulate network delay for mock API calls (in ms)
  mockApiDelay: 300,
};

export default config;
