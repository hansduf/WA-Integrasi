'use client';

import { useEffect, useState } from 'react';
import SpamSettings from './SpamSettings';
import WhatsAppConnectionForm from './WhatsAppConnectionForm';
import WhatsAppDashboard from './WhatsAppDashboard';
import WhatsAppMessageSender from './WhatsAppMessageSender';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://upgraded-space-guacamole-r4r7rwqxpw652x967-8001.app.github.dev';

export default function WhatsAppHub() {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [isLoading, setIsLoading] = useState(true);

  // Poll WhatsApp status every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/whatsapp/status`);
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status || 'disconnected');
        }
      } catch (error) {
        console.error('Failed to fetch WhatsApp status:', error);
        setConnectionStatus('disconnected');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus(); // Initial fetch
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const subTabs = [
    { id: 'dashboard', label: '📊 Dashboard', component: WhatsAppDashboard },
    { id: 'connection', label: '🔗 Connection', component: WhatsAppConnectionForm },
    { id: 'sender', label: '📤 Message Sender', component: WhatsAppMessageSender },
    { id: 'spam', label: '⚙️ Spam Settings', component: SpamSettings },
  ];

  const ActiveComponent = subTabs.find(tab => tab.id === activeSubTab)?.component || WhatsAppDashboard;

  // Status configuration based on connection status
  const getStatusConfig = () => {
    if (isLoading) {
      return {
        color: 'gray',
        bgColor: 'bg-gray-500',
        textColor: 'text-gray-600',
        label: 'Loading...',
        icon: '⏳'
      };
    }

    switch (connectionStatus) {
      case 'authenticated':
      case 'ready':
        return {
          color: 'green',
          bgColor: 'bg-green-500',
          textColor: 'text-green-600',
          label: 'Connected',
          icon: '✅'
        };
      case 'scanning_qr':
        return {
          color: 'yellow',
          bgColor: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          label: 'Scanning QR',
          icon: '📱'
        };
      case 'initializing':
        return {
          color: 'blue',
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-600',
          label: 'Initializing',
          icon: '🔧'
        };
      case 'disconnected':
      default:
        return {
          color: 'red',
          bgColor: 'bg-red-500',
          textColor: 'text-red-600',
          label: 'Disconnected',
          icon: '❌'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">📱 WhatsApp Integration Hub</h2>
            <p className="text-gray-600">Kelola semua fitur WhatsApp dalam satu tempat</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">WhatsApp Status</div>
            <div className="flex items-center justify-end space-x-2">
              <div className={`w-3 h-3 ${statusConfig.bgColor} rounded-full ${connectionStatus === 'scanning_qr' || connectionStatus === 'initializing' ? 'animate-pulse' : ''}`}></div>
              <span className={`text-sm font-medium ${statusConfig.textColor}`}>
                {statusConfig.icon} {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="flex border-b border-gray-200">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                activeSubTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
