'use client';

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

interface ConnectionStatus {
  isConnected: boolean;
  provider: string;
  model: string;
  lastTested: string | null;
  testStatus: string;
  error?: string;
}

export default function AIConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    provider: '',
    model: '',
    lastTested: null,
    testStatus: 'not_tested'
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/ai/connection-status');
      const data = (response as any) || {};
      
      setStatus({
        isConnected: data.status === 'configured' && data.testStatus === 'success',
        provider: data.status === 'configured' ? 'External API' : '',
        model: data.status === 'configured' ? 'Configured' : '',
        lastTested: data.lastTested,
        testStatus: data.testStatus || 'not_tested',
        error: data.status !== 'configured' ? 'Belum ada koneksi AI yang dikonfigurasi' : undefined
      });
    } catch (error) {
      console.error('Error loading AI connection status:', error);
      setStatus({
        isConnected: false,
        provider: '',
        model: '',
        lastTested: null,
        testStatus: 'not_tested',
        error: 'Kesalahan jaringan - backend tidak tersedia'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-600';
    return status.testStatus === 'success' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = () => {
    if (isLoading) return '⏳';
    return status.testStatus === 'success' ? '✅' : '❌';
  };

  const getStatusText = () => {
    if (isLoading) return 'Memeriksa...';
    switch (status.testStatus) {
      case 'success': return 'Terhubung';
      case 'failed': return 'Terputus';
      default: return 'Belum Diuji';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${status.testStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-lg font-medium text-gray-800">Status: {getStatusText()}</span>
        </div>
        <button
          onClick={loadStatus}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          title="Segarkan status"
        >
          🔄
        </button>
      </div>

      {!isLoading && status.testStatus === 'success' && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <h4 className="text-green-800 font-semibold mb-3 flex items-center space-x-2">
            <span>🤖</span>
            <span>Detail Koneksi AI</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-green-700">
                <span className="font-medium">Penyedia:</span> {status.provider || 'External API'}
              </p>
              <p className="text-sm text-green-700">
                <span className="font-medium">Model:</span> {status.model || 'Configured'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-green-700">
                <span className="font-medium">Terakhir Diuji:</span> {status.lastTested ? new Date(status.lastTested).toLocaleString('id-ID') : 'Belum pernah'}
              </p>
              <p className="text-sm text-green-700">
                <span className="font-medium">Status:</span> Aktif
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && status.testStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-xl">❌</span>
            <div>
              <h4 className="text-red-800 font-medium">Koneksi Gagal</h4>
              <p className="text-red-700 text-sm">Layanan AI saat ini tidak tersedia. Silakan periksa konfigurasi endpoint.</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="text-gray-600">Memuat status koneksi AI...</span>
          </div>
        </div>
      )}
    </div>
  );
}