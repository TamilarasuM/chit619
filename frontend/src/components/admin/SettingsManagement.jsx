import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Loading from '../common/Loading';

const SettingsManagement = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/settings');
      setSettings(response.data || []);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev =>
      prev.map(s => (s.key === key ? { ...s, value } : s))
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await Promise.all(
        settings.map(setting =>
          api.put(`/settings/${setting.key}`, { value: setting.value })
        )
      );

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    if (!window.confirm('This will reset all settings to default values. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/settings/initialize', {});
      fetchSettings();
      setSuccess('Settings initialized successfully');
    } catch (err) {
      console.error('Error initializing settings:', err);
      setError('Failed to initialize settings');
    } finally {
      setLoading(false);
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    const category = setting.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {});

  if (loading && settings.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Settings Management</h1>
        <div className="flex gap-3">
          <Button onClick={initializeDefaults} variant="secondary">
            Initialize Defaults
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600">
            Save Settings
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <Card key={category}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
            {category.replace(/_/g, ' ')} Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categorySettings.map((setting) => (
              <div key={setting.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {setting.label || setting.key}
                </label>
                {setting.description && (
                  <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                )}
                {setting.type === 'boolean' ? (
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.key, e.target.value === 'true')}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : setting.type === 'number' ? (
                  <input
                    type="number"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value))}
                  />
                ) : (
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {settings.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No settings found</p>
            <Button onClick={initializeDefaults}>
              Initialize Default Settings
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SettingsManagement;
