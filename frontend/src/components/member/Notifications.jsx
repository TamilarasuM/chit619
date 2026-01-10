import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import Card from '../common/Card';
import Button from '../common/Button';
import Loading from '../common/Loading';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, auction, payment, dividend, etc.

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, filter, typeFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/notifications?userId=${user._id}`);
      setNotifications(response.data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Read/Unread filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`, {});

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read', { userId: user._id });

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
      alert('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await api.delete(`/notifications/${notificationId}`);

      // Update local state
      setNotifications(prev =>
        prev.filter(n => n._id !== notificationId)
      );
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      auction: '🔨',
      payment: '💰',
      dividend: '💵',
      winner: '🏆',
      reminder: '⏰',
      welcome: '👋',
      chit: '📋',
      default: '📢'
    };

    return icons[type] || icons.default;
  };

  const getNotificationColor = (type) => {
    const colors = {
      auction: 'blue',
      payment: 'green',
      dividend: 'purple',
      winner: 'yellow',
      reminder: 'red',
      welcome: 'indigo',
      chit: 'gray'
    };

    return colors[type] || 'gray';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchNotifications} variant="secondary">
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} className="bg-blue-600 hover:bg-blue-700">
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Read/Unread Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="auction">Auction</option>
              <option value="payment">Payment</option>
              <option value="dividend">Dividend</option>
              <option value="winner">Winner</option>
              <option value="reminder">Reminder</option>
              <option value="welcome">Welcome</option>
              <option value="chit">Chit Group</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any {filter !== 'all' ? filter : ''} notifications at this time.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const color = getNotificationColor(notification.type);
            const icon = getNotificationIcon(notification.type);

            return (
              <Card
                key={notification._id}
                className={`hover:shadow-md transition-shadow ${
                  !notification.read ? 'border-l-4 border-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center text-2xl`}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-base ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded bg-${color}-100 text-${color}-800`}>
                            {notification.type}
                          </span>
                          {!notification.read && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 ml-4 flex gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            title="Mark as read"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Data Preview */}
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
                        <div className="font-semibold text-gray-700 mb-1">Details:</div>
                        {notification.data.chitGroup && (
                          <div>Chit Group: {notification.data.chitGroup}</div>
                        )}
                        {notification.data.amount && (
                          <div>Amount: ₹{notification.data.amount}</div>
                        )}
                        {notification.data.date && (
                          <div>Date: {formatDate(notification.data.date)}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
