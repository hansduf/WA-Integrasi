"use client";

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import AIConnectionForm from './AIConnectionForm';
import AITestInterface from './AITestInterface';
import AITriggerForm from './AITriggerForm';

interface ConnectionStatus {
  endpoint: string;
  enabled: boolean;
  testStatus: string;
}

export default function AIHub() {
  const [activeSubTab, setActiveSubTab] = useState<'koneksi' | 'trigger' | 'test'>('koneksi');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    const loadConnectionStatus = async () => {
      try {
        const resp = await api.get('/api/ai/connections');
        let config: any = null;

        if (resp && (resp as any).success === true) {
          config = (resp as any).config || {};
        } else if (resp && typeof resp === 'object' && ('endpoint' in resp || 'testStatus' in resp)) {
          config = resp as any;
        }

        if (config) {
          setConnectionStatus({
            endpoint: config.endpoint || '',
            enabled: config.enabled || false,
            testStatus: config.testStatus || 'not_tested'
          });
        }
      } catch (error) {
        console.error('Failed to load connection status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadConnectionStatus();
  }, []);

  const isConnectionActive = connectionStatus?.enabled && connectionStatus?.testStatus === 'success';

  // Auto-switch to koneksi tab if connection not active and user is on trigger/test tab
  useEffect(() => {
    if (!isLoadingStatus && !isConnectionActive && (activeSubTab === 'trigger' || activeSubTab === 'test')) {
      setActiveSubTab('koneksi');
    }
  }, [isConnectionActive, isLoadingStatus, activeSubTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">🤖 Hub Integrasi AI</h2>
            <p className="text-gray-600">Kelola koneksi AI, trigger, dan antarmuka pengujian</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveSubTab('koneksi')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === 'koneksi'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔗 Koneksi
            </button>
            <button
              onClick={() => setActiveSubTab('trigger')}
              disabled={!isConnectionActive}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === 'trigger'
                  ? 'border-purple-500 text-purple-600'
                  : !isConnectionActive
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎯 Trigger {!isConnectionActive && '(Dinonaktifkan)'}
            </button>
            <button
              onClick={() => setActiveSubTab('test')}
              disabled={!isConnectionActive}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === 'test'
                  ? 'border-purple-500 text-purple-600'
                  : !isConnectionActive
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🧪 Uji {!isConnectionActive && '(Dinonaktifkan)'}
            </button>
          </nav>
        </div>

        {!isLoadingStatus && !isConnectionActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800">Koneksi AI Diperlukan</h3>
                <p className="text-yellow-700 text-sm">
                  Silakan konfigurasikan dan uji koneksi AI Anda terlebih dahulu sebelum mengelola trigger atau pengujian.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'koneksi' && (
          <AIConnectionForm />
        )}

        {activeSubTab === 'trigger' && isConnectionActive && (
          <AITriggerForm />
        )}

        {activeSubTab === 'test' && isConnectionActive && (
          <AITestInterface />
        )}

        {activeSubTab === 'trigger' && !isConnectionActive && !isLoadingStatus && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Manajemen Trigger Dinonaktifkan</h3>
            <p className="text-gray-600 mb-4">
              Konfigurasikan dan aktifkan koneksi AI Anda terlebih dahulu untuk mengelola trigger.
            </p>
            <button
              onClick={() => setActiveSubTab('koneksi')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Buka Pengaturan Koneksi
            </button>
          </div>
        )}

        {activeSubTab === 'test' && !isConnectionActive && !isLoadingStatus && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🧪</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Antarmuka Uji Dinonaktifkan</h3>
            <p className="text-gray-600 mb-4">
              Konfigurasikan dan aktifkan koneksi AI Anda terlebih dahulu untuk menguji respons AI.
            </p>
            <button
              onClick={() => setActiveSubTab('koneksi')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Buka Pengaturan Koneksi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}