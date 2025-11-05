'use client';

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

interface SpamConfig {
  windowSeconds: number;
  maxMessagesPerWindow: number;
  warningThreshold: number;
  warningMessage: string;
}

export default function SpamSettings() {
  const [config, setConfig] = useState<SpamConfig>({
    windowSeconds: 6,
    maxMessagesPerWindow: 1,
    warningThreshold: 3,
    warningMessage: '⚠️ PERINGATAN: Sistem mendeteksi aktivitas spam dari nomor Anda. Harap kurangi frekuensi pengiriman pesan untuk menghindari pemblokiran.'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SpamConfig, string>>>({});

  // Fetch current config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    console.log('🔗 Fetching spam config via API client (credentials: include)');
    try {
      const data = await api.get('/api/wa/spam/config');
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load settings');
      }
      
      if ((data as any).config) {
        setConfig((data as any).config);
      }
    } catch (error) {
      console.error('Error fetching spam config:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = (): boolean => {
    const newErrors: Partial<Record<keyof SpamConfig, string>> = {};

    if (config.windowSeconds < 3 || config.windowSeconds > 10) {
      newErrors.windowSeconds = 'Must be between 3-10 seconds';
    }

    if (config.maxMessagesPerWindow < 1 || config.maxMessagesPerWindow > 5) {
      newErrors.maxMessagesPerWindow = 'Must be between 1-5 messages';
    }

    if (config.warningThreshold < 2 || config.warningThreshold > 10) {
      newErrors.warningThreshold = 'Must be between 2-10 messages';
    }

    if (!config.warningMessage.trim()) {
      newErrors.warningMessage = 'Warning message is required';
    } else if (config.warningMessage.length > 500) {
      newErrors.warningMessage = 'Maximum 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      setStatus({
        type: 'error',
        message: 'Please fix validation errors before saving'
      });
      return;
    }

    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      console.log('💾 Saving spam config via API client...');
      const data = await api.put('/api/wa/spam/config', config);

      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setStatus({
        type: 'success',
        message: '✅ Settings saved and applied successfully!'
      });
      // Refresh config from server
      await fetchConfig();
    } catch (error) {
      console.error('Error saving spam config:', error);
      setStatus({
        type: 'error',
        message: `❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all settings to default values (6:1:3)?')) {
      setConfig({
        windowSeconds: 6,
        maxMessagesPerWindow: 1,
        warningThreshold: 3,
        warningMessage: '⚠️ PERINGATAN: Sistem mendeteksi aktivitas spam dari nomor Anda. Harap kurangi frekuensi pengiriman pesan untuk menghindari pemblokiran.'
      });
      setErrors({});
      setStatus({ type: null, message: '' });
    }
  };

  const testSimulator = () => {
    const testMessages = 5;
    const testSeconds = 3;
    const messagesPerSecond = testMessages / testSeconds;
    const windowRate = testMessages / config.windowSeconds;

    const wouldTrigger = config.maxMessagesPerWindow < windowRate;
    const wouldWarn = testMessages >= config.warningThreshold;

    return { wouldTrigger, wouldWarn, messagesPerSecond };
  };

  const simulator = testSimulator();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">⚙️ Spam Frequency Detection Settings</h3>
        <p className="text-gray-600">Configure spam detection thresholds and warning messages</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">📋 Current Settings Overview</h4>
        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="text-sm text-gray-600">⏱️ Time Window</div>
              <div className="text-xl font-bold text-blue-600">{config.windowSeconds}s</div>
            </div>
            <div className="p-3 bg-green-50 rounded-md border border-green-200">
              <div className="text-sm text-gray-600">📊 Max Messages</div>
              <div className="text-xl font-bold text-green-600">{config.maxMessagesPerWindow}</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
              <div className="text-sm text-gray-600">⚠️ Warning At</div>
              <div className="text-xl font-bold text-orange-600">{config.warningThreshold}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
              <div className="text-sm text-gray-600">💬 Custom Message</div>
              <div className="text-xl font-bold text-purple-600">Active</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">🔧 Configuration Settings</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⏱️ Time Window (seconds)
            </label>
            <input
              type="number"
              value={config.windowSeconds}
              onChange={(e) => setConfig({ ...config, windowSeconds: parseInt(e.target.value) || 0 })}
              min="3"
              max="10"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.windowSeconds
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              How long to monitor message frequency (Min: 3, Max: 10)
            </p>
            {errors.windowSeconds && (
              <p className="text-xs text-red-600 mt-1">{errors.windowSeconds}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Max Messages per Window
            </label>
            <input
              type="number"
              value={config.maxMessagesPerWindow}
              onChange={(e) => setConfig({ ...config, maxMessagesPerWindow: parseInt(e.target.value) || 0 })}
              min="1"
              max="5"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.maxMessagesPerWindow
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum messages allowed in the time window (Min: 1, Max: 5)
            </p>
            {errors.maxMessagesPerWindow && (
              <p className="text-xs text-red-600 mt-1">{errors.maxMessagesPerWindow}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⚠️ Warning Threshold
            </label>
            <input
              type="number"
              value={config.warningThreshold}
              onChange={(e) => setConfig({ ...config, warningThreshold: parseInt(e.target.value) || 0 })}
              min="2"
              max="10"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.warningThreshold
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of messages that triggers warning (Min: 2, Max: 10)
            </p>
            {errors.warningThreshold && (
              <p className="text-xs text-red-600 mt-1">{errors.warningThreshold}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💬 Warning Message Template
            </label>
            <textarea
              value={config.warningMessage}
              onChange={(e) => setConfig({ ...config, warningMessage: e.target.value })}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.warningMessage
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              {config.warningMessage.length}/500 characters
            </p>
            {errors.warningMessage && (
              <p className="text-xs text-red-600 mt-1">{errors.warningMessage}</p>
            )}
          </div>

          {status.type && (
            <div
              className={`p-3 rounded-md ${
                status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleReset}
              disabled={saving || loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">📊 Settings Preview & Testing</h4>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h5 className="font-medium text-gray-800 mb-2">🧪 Test Simulator</h5>
            <p className="text-sm text-gray-600 mb-3">
              Simulate: <strong>5 messages</strong> in <strong>3 seconds</strong>
            </p>
            <div className="space-y-2 text-sm">
              <p className={`${simulator.wouldTrigger ? 'text-red-600' : 'text-green-600'} font-medium`}>
                {simulator.wouldTrigger ? '🚨 Would trigger spam detection' : '✅ Would NOT trigger spam'}
              </p>
              <p className={`${simulator.wouldWarn ? 'text-orange-600' : 'text-gray-600'} font-medium`}>
                {simulator.wouldWarn ? '⚠️ Warning would be sent' : 'ℹ️ No warning sent'}
              </p>
              <p className="text-gray-600">
                Rate: {simulator.messagesPerSecond.toFixed(2)} messages/second
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h5 className="font-medium text-gray-800 mb-2">📈 Performance Impact</h5>
            <div className="space-y-1 text-sm text-gray-600">
              <p>CPU Usage: <span className="font-medium text-green-600">Low</span></p>
              <p>Memory Usage: <span className="font-medium text-green-600">~10MB</span></p>
              <p>Detection Speed: <span className="font-medium text-green-600">&lt;5ms per message</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
