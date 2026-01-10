/**
 * Indian Number and Currency Formatting Utilities
 * Formats numbers according to Indian standards (₹1,00,000)
 */

/**
 * Format number to Indian currency format
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol (default: true)
 * @returns {string} Formatted currency string
 *
 * Examples:
 * formatCurrency(100000) => "₹1,00,000"
 * formatCurrency(1234567) => "₹12,34,567"
 * formatCurrency(50000.50) => "₹50,000.50"
 */
export function formatCurrency(amount, showSymbol = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹0' : '0';
  }

  const numStr = Math.abs(amount).toFixed(2).toString();
  const [integerPart, decimalPart] = numStr.split('.');

  // Format integer part with Indian comma style
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  // Add decimal part if it's not .00
  const withDecimal = decimalPart !== '00' ? formatted + '.' + decimalPart : formatted;

  const prefix = amount < 0 ? '-' : '';
  const symbol = showSymbol ? '₹' : '';

  return prefix + symbol + withDecimal;
}

/**
 * Format number without currency symbol
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 *
 * Examples:
 * formatNumber(100000) => "1,00,000"
 * formatNumber(1234567) => "12,34,567"
 */
export function formatNumber(num) {
  return formatCurrency(num, false);
}

/**
 * Format date to Indian format (DD/MM/YYYY)
 * @param {Date|string} date - The date to format
 * @param {boolean} includeTime - Whether to include time (default: false)
 * @returns {string} Formatted date string
 *
 * Examples:
 * formatDate(new Date('2025-01-15')) => "15/01/2025"
 * formatDate(new Date('2025-01-15'), true) => "15/01/2025 12:00 PM"
 */
export function formatDate(date, includeTime = false) {
  if (!date) return 'N/A';

  const d = new Date(date);

  if (isNaN(d.getTime())) return 'Invalid Date';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const dateStr = `${day}/${month}/${year}`;

  if (includeTime) {
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${dateStr} ${displayHours}:${minutes} ${ampm}`;
  }

  return dateStr;
}

/**
 * Format date to ISO format for input fields (YYYY-MM-DD)
 * @param {Date|string} date - The date to format
 * @returns {string} ISO formatted date string
 */
export function formatDateForInput(date) {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - The date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const now = new Date();
  const diffMs = d - now;
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isPast = diffMs < 0;
  const suffix = isPast ? 'ago' : 'from now';

  if (diffSec < 60) return `${diffSec} seconds ${suffix}`;
  if (diffMin < 60) return `${diffMin} minutes ${suffix}`;
  if (diffHour < 24) return `${diffHour} hours ${suffix}`;
  if (diffDay < 30) return `${diffDay} days ${suffix}`;

  return formatDate(date);
}

/**
 * Parse Indian currency string to number
 * @param {string} currencyStr - The currency string to parse
 * @returns {number} Parsed number
 *
 * Examples:
 * parseCurrency("₹1,00,000") => 100000
 * parseCurrency("1,00,000") => 100000
 */
export function parseCurrency(currencyStr) {
  if (!currencyStr) return 0;

  // Remove ₹ symbol and commas
  const cleaned = currencyStr.replace(/[₹,]/g, '');

  return parseFloat(cleaned) || 0;
}

/**
 * Format percentage
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 *
 * Examples:
 * formatPercentage(85.5) => "85.5%"
 * formatPercentage(100) => "100.0%"
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return value.toFixed(decimals) + '%';
}

/**
 * Format phone number (Indian format)
 * @param {string} phone - The phone number to format
 * @returns {string} Formatted phone string
 *
 * Examples:
 * formatPhone("9876543210") => "+91 98765-43210"
 */
export function formatPhone(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as Indian phone number
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }

  return phone;
}

/**
 * Truncate text with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get payment status badge color
 * @param {string} status - Payment status (Pending/Partial/Paid/Overdue)
 * @returns {string} Tailwind color class
 */
export function getPaymentStatusColor(status) {
  const colors = {
    Paid: 'green',
    Pending: 'yellow',
    Partial: 'blue',
    Overdue: 'red'
  };

  return colors[status] || 'gray';
}

/**
 * Get auction status badge color
 * @param {string} status - Auction status (Scheduled/Live/Closed)
 * @returns {string} Tailwind color class
 */
export function getAuctionStatusColor(status) {
  const colors = {
    Scheduled: 'blue',
    Live: 'green',
    Closed: 'gray'
  };

  return colors[status] || 'gray';
}

/**
 * Get chit status badge color
 * @param {string} status - Chit status (InProgress/Active/Closed)
 * @returns {string} Tailwind color class
 */
export function getChitStatusColor(status) {
  const colors = {
    InProgress: 'yellow',
    Active: 'green',
    Closed: 'gray'
  };

  return colors[status] || 'gray';
}

/**
 * Get rank category badge color
 * @param {string} category - Rank category (Excellent/Good/Average/Poor)
 * @returns {string} Tailwind color class
 */
export function getRankCategoryColor(category) {
  const colors = {
    Excellent: 'green',
    Good: 'blue',
    Average: 'yellow',
    Poor: 'red'
  };

  return colors[category] || 'gray';
}

/**
 * Capitalize first letter of string
 * @param {string} str - The string to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateForInput,
  formatRelativeTime,
  parseCurrency,
  formatPercentage,
  formatPhone,
  truncateText,
  getPaymentStatusColor,
  getAuctionStatusColor,
  getChitStatusColor,
  getRankCategoryColor,
  capitalize,
  formatFileSize
};
