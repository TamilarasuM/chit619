import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Modal from '../common/Modal';
import Loading from '../common/Loading';

const NotificationManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);

  const [sendForm, setSendForm] = useState({
    type: 'general',
    title: '',
    message: '',
    targetType: 'all', // all, specific
    targetUsers: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [notifRes, statsRes] = await Promise.all([
        api.get('/notifications/queue'),
        api.get('/notifications/stats')
      ]);

      setNotifications(notifRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Error fetching notification data:', err);
      setError(err.response?.data?.message || 'Failed to load notification data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      await api.post('/notifications/send', sendForm);

      setShowSendModal(false);
      resetSendForm();
      fetchData();
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/retry`, {});
      fetchData();
    } catch (err) {
      console.error('Error retrying notification:', err);
      alert('Failed to retry notification');
    }
  };

  const handleSendTest = async () => {
    try {
      await api.post('/notifications/test', {
        phone: prompt('Enter test phone number:')
      });
      alert('Test notification sent successfully');
    } catch (err) {
      console.error('Error sending test notification:', err);
      alert('Failed to send test notification');
    }
  };

  const resetSendForm = () => {
    setSendForm({
      type: 'general',
      title: '',
      message: '',
      targetType: 'all',
      targetUsers: []
    });
  };

  if (loading && !stats) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Notification Management</h1>
        <div className="flex gap-3">
          <Button onClick={handleSendTest} variant="secondary">
            Send Test
          </Button>
          <Button onClick={() => setShowSendModal(true)} className="bg-blue-600">
            Send Notification
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="text-sm text-gray-500">Total Sent</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalSent || 0}</div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Delivered</div>
            <div className="text-2xl font-bold text-green-600">{stats.delivered || 0}</div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          </Card>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Notification Queue */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Queue</h2>
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No notifications in queue</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map((notif) => (
                  <tr key={notif._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(notif.createdAt, true)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{notif.type}</td>
                    <td className="px-6 py-4 text-sm">{notif.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{notif.user?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        notif.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        notif.status === 'Failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {notif.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {notif.status === 'Failed' && (
                        <button
                          onClick={() => handleRetryFailed(notif._id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Send Notification Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="Send Notification"
        size="lg"
        footer={
          <>
            <Button onClick={() => setShowSendModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSendNotification} disabled={loading}>
              Send Notification
            </Button>
          </>
        }
      >
        <form onSubmit={handleSendNotification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              value={sendForm.type}
              onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
            >
              <option value="general">General</option>
              <option value="payment">Payment</option>
              <option value="auction">Auction</option>
              <option value="dividend">Dividend</option>
            </select>
          </div>

          <Input
            label="Title"
            value={sendForm.title}
            onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              value={sendForm.message}
              onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              value={sendForm.targetType}
              onChange={(e) => setSendForm({ ...sendForm, targetType: e.target.value })}
            >
              <option value="all">All Members</option>
              <option value="specific">Specific Members</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NotificationManagement;
