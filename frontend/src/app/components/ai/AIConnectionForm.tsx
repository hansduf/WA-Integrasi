"use client";

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import AIConnectionStatus from './AIConnectionStatus';

interface AIConnection {
  endpoint: string;
  apiKey: string;
  enabled: boolean;
  lastTested: string | null;
  testStatus: string;
}

export default function AIConnectionForm() {
  const [connection, setConnection] = useState<AIConnection>({
    endpoint: '',
    apiKey: '',
    enabled: false,
    lastTested: null,
    testStatus: 'not_tested'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConnectionConfig();
  }, []);

  const loadConnectionConfig = async () => {
    try {
      const resp = await api.get('/api/ai/connections');

      // Backend sometimes returns raw config object (no success flag)
      // and sometimes returns { success, config }.
      let config: any = null;

      if (resp && (resp as any).success === true) {
        config = (resp as any).config || {};
      } else if (resp && typeof resp === 'object' && ('endpoint' in resp || 'testStatus' in resp)) {
        config = resp as any;
      }

      if (config) {
        setConnection({
          endpoint: (config.endpoint as string) || '',
          apiKey: (config.apiKey as string) || '',
          enabled: (config.enabled as boolean) || false,
          lastTested: (config.lastTested as string) || null,
          testStatus: (config.testStatus as string) || 'not_tested'
        });
      } else {
        console.warn('Backend not available, using default config');
        setConnection({
          endpoint: '',
          apiKey: '',
          enabled: false,
          lastTested: null,
          testStatus: 'not_tested'
        });
      }
    } catch (error) {
      console.warn('Failed to load AI connection config, backend may not be running:', error);
      setConnection({
        endpoint: '',
        apiKey: '',
        enabled: false,
        lastTested: null,
        testStatus: 'not_tested'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await api.post('/api/ai/test-connection');

      if (result.success) {
        setTestResult({ success: true, message: result.message || '✅ Connection successful!' });
        // ✅ Reload to get latest status from DB (including lastTestedAt)
        await loadConnectionConfig();
      } else {
        setTestResult({ success: false, message: result.message || '❌ Connection failed' });
        // ✅ Reload to show latest failure status in DB
        await loadConnectionConfig();
      }
    } catch (error) {
      setTestResult({ success: false, message: '❌ Network error. Please check backend connection.' });
    } finally {
      setIsTesting(false);
    }
  };

  // Helper to format time ago
  const getTimeAgo = (dateString: string | null): string => {
    if (!dateString) return 'never';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const result = await api.post('/api/ai/connections', {
        endpoint: connection.endpoint,
        apiKey: connection.apiKey,
      });

      if (result.success) {
        alert('✅ Pengaturan koneksi AI berhasil disimpan!');
        await loadConnectionConfig();
      } else {
        alert('❌ Gagal menyimpan pengaturan koneksi');
      }
    } catch (error) {
      alert('❌ Kesalahan jaringan. Silakan periksa koneksi backend.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableConnection = async () => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan koneksi AI? Ini akan menghentikan respons AI.')) {
      return;
    }

    setIsDisabling(true);

    try {
      const result = await api.delete('/api/ai/connections');

      if (result.success) {
        alert('✅ Koneksi AI berhasil dinonaktifkan!');
        await loadConnectionConfig();
      } else {
        alert('❌ Gagal menonaktifkan koneksi');
      }
    } catch (error) {
      alert('❌ Kesalahan jaringan. Silakan periksa koneksi backend.');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus koneksi AI? Ini akan menghapus semua pengaturan.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await api.delete('/api/ai/connections');

      if (result.success) {
        alert('✅ Koneksi AI berhasil dihapus!');
        setConnection({
          endpoint: '',
          apiKey: '',
          enabled: false,
          lastTested: null,
          testStatus: 'not_tested'
        });
      } else {
        alert('❌ Gagal menghapus koneksi');
      }
    } catch (error) {
      alert('❌ Kesalahan jaringan. Silakan periksa koneksi backend.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">🤖 Koneksi AI</h3>
        <p className="text-gray-600">Hubungkan layanan AI Anda untuk mengaktifkan otomasi cerdas</p>
      </div>

      {isLoading && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="text-gray-600">Memuat pengaturan koneksi AI...</span>
          </div>
        </div>
      )}

      {!isLoading && <AIConnectionStatus />}

      {!isLoading && connection.testStatus !== 'success' && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">🔗 Pengaturan Koneksi AI</h4>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-purple-600 text-2xl">🤖</span>
              <div>
                <h4 className="font-semibold text-purple-800">Integrasi AI Perusahaan</h4>
                <p className="text-sm text-purple-600">Penerusan sederhana ke endpoint API AI perusahaan Anda</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint API <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={connection.endpoint}
                onChange={(e) => setConnection(prev => ({ ...prev, endpoint: e.target.value }))}
                placeholder="http://127.0.0.1:5000/chat"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Masukkan URL endpoint API AI perusahaan Anda</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kunci API <span className="text-gray-400">(opsional)</span>
              </label>
              <input
                type="password"
                value={connection.apiKey}
                onChange={(e) => setConnection(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Token Bearer atau kunci API jika diperlukan"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Kosongkan jika API Anda tidak memerlukan autentikasi</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !connection.endpoint}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Menguji...</span>
                    </>
                  ) : (
                    <>
                      <span>🧪</span>
                      <span>Uji Koneksi</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !connection.endpoint}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Simpan Pengaturan</span>
                    </>
                  )}
                </button>
              </div>
              
              {connection.endpoint && (
                <div className="flex gap-2">
                  <button
                    onClick={handleDisableConnection}
                    disabled={isDisabling}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                  >
                    {isDisabling ? '🚫 Menonaktifkan...' : '🚫 Nonaktifkan'}
                  </button>
                  <button
                    onClick={handleDeleteConnection}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
                  >
                    {isDeleting ? '🗑️ Menghapus...' : '🗑️ Hapus'}
                  </button>
                </div>
              )}
            </div>

            {testResult && (
              <div className={`mt-4 p-4 rounded-lg border ${testResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{testResult.success ? '✅' : '❌'}</span>
                  <div>
                    <h4 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.success ? 'Uji Berhasil' : 'Uji Gagal'}
                    </h4>
                    <p className="text-sm">{testResult.message}</p>
                  </div>
                </div>
                {/* Show last tested time */}
                {connection.lastTested && (
                  <p className="text-xs mt-3 opacity-75">
                    Status updated: {getTimeAgo(connection.lastTested)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && connection.testStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-red-600 text-2xl">❌</span>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Koneksi Gagal</h3>
              <p className="text-red-700">Layanan AI saat ini tidak tersedia. Silakan periksa konfigurasi endpoint.</p>
              <p className="text-sm text-red-600 mt-1">
                Endpoint: {connection.endpoint}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isTesting ? 'Menguji...' : 'Uji Kembali'}
            </button>
          </div>
        </div>
      )}

      {!isLoading && connection.testStatus === 'success' && connection.enabled && !testResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-green-600 text-2xl">✅</span>
            <div>
              <h3 className="text-lg font-semibold text-green-800">Koneksi AI Aktif</h3>
              <p className="text-green-700">AI Anda berhasil terhubung dan siap digunakan!</p>
              <p className="text-sm text-green-600 mt-1">
                Endpoint: {connection.endpoint}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConnection(prev => ({ ...prev, testStatus: 'not_tested' }))}
              className="text-green-700 hover:text-green-800 text-sm underline"
            >
              Konfigurasi Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  );
}