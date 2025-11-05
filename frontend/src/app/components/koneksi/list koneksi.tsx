"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import Modal from '../ui/Modal';
import { useToast } from '../ui/ToastProvider';
import ConnectionForm from './ConnectionForm';
import KoneksiDetail from './KoneksiDetail';

export default function ListKoneksi() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Array<any>>([]);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [selectedModal, setSelectedModal] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [notificationTimeLeft, setNotificationTimeLeft] = useState(0);
  const [isHiding, setIsHiding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (notification) {
      setNotificationTimeLeft(3);
      setIsHiding(false);

      const hideTimer = setTimeout(() => {
        setIsHiding(true);
        setTimeout(() => {
          setNotification(null);
          setNotificationTimeLeft(0);
          setIsHiding(false);
        }, 300); // Wait for fade-out animation
      }, 2700); // Start fade-out 300ms before complete hide

      const countdownTimer = setInterval(() => {
        setNotificationTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(hideTimer);
        clearInterval(countdownTimer);
      };
    }
  }, [notification]);

  const filteredConnections = connections.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.plugin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayData = showAll ? filteredConnections : filteredConnections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = showAll ? 1 : Math.ceil(filteredConnections.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, showAll]);

  async function load() {
    setLoading(true);
    setError(null);
      try {
      const data = await apiFetch('/api/data-sources');
      const list = (data && (data.dataSources || data.data || data)) || [];
      console.log('Loaded connections:', list);
      
      // ✅ Deduplicate by ID (remove temp/duplicate connections)
      const uniqueConnections = list.reduce((acc: any[], curr: any) => {
        if (curr.id?.startsWith('temp-')) {
          console.warn('⚠️ Skipping temp connection:', curr.id);
          return acc;
        }
        if (!acc.find(item => item.id === curr.id)) {
          acc.push(curr);
        } else {
          console.warn('⚠️ Duplicate connection found:', curr.id);
        }
        return acc;
      }, []);
      
      setConnections(uniqueConnections);
      console.log(`✅ Loaded ${uniqueConnections.length} unique connections (filtered from ${list.length})`);
    } catch (err: any) {
      console.error('Load error:', err);
      setError(err.message || 'Gagal memuat koneksi');
      toast.push({ id: String(Date.now()), message: `Load failed: ${err.message || err}`, type: 'error' });
      setNotification({ message: `Gagal memuat koneksi: ${err.message || err}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleTest(id: string) {
    setTesting((s) => ({ ...s, [id]: true }));
    try {
  const res = await apiFetch(`/api/data-sources/${encodeURIComponent(id)}/test`, { method: 'POST' });
  setTestResult(res);
  setShowTestModal(true);
    toast.push({ id: String(Date.now()), message: `Test success: ${JSON.stringify(res)}`, type: 'success' });
    setNotification({ message: `Test berhasil untuk ${id}`, type: 'success' });
  await load();
    } catch (err: any) {
        toast.push({ id: String(Date.now()), message: `Test failed: ${err.message || err}`, type: 'error' });
        setNotification({ message: `Test gagal: ${err.message || err}`, type: 'error' });
    } finally {
      setTesting((s) => ({ ...s, [id]: false }));
    }
  }

  async function handleDelete(id: string) {
  setShowDeleteConfirm(true);
  setEditing({ id });
  }

  function openEdit(item: any) {
    setEditing(item);
    setShowCreate(true);
  }

  function onSaved(item: any) {
    console.log('onSaved called with:', item);
    const displayName = item?.id || item?.name || 'Connection';
    toast.push({ id: String(Date.now()), message: `Saved ${displayName}`, type: 'success' });
    setNotification({ message: `Koneksi tersimpan: ${displayName}`, type: 'success' });
    setShowCreate(false);
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔗 Data Sources</h1>
          <p className="text-gray-600">Kelola koneksi database dan plugin untuk monitoring data</p>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          onClick={() => { setEditing(null); setShowCreate(true); }}
        >
          + Tambah Koneksi
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Daftar Koneksi</h2>
            {!loading && connections.length > 0 && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{connections.length}</span>
                  <span>koneksi</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-medium">{connections.filter(c => c.status === 'connected' || c.connected).length}</span>
                  <span>aktif</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="font-medium">{connections.filter(c => c.status !== 'connected' && !c.connected).length}</span>
                  <span>tidak aktif</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Memuat data...</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada koneksi</h3>
            <p className="text-gray-600 mb-4">Buat koneksi pertama untuk memulai monitoring data</p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              onClick={() => { setEditing(null); setShowCreate(true); }}
            >
              Buat Koneksi Pertama
            </button>
          </div>
        ) : (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <input
                    type="text"
                    placeholder="🔍 Cari koneksi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  />
                </div>
                <button
                  onClick={() => load()}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plugin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Triggers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((c, index) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors" onClick={() => setSelectedModal(c)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[320px] truncate">{c.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[140px] truncate">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (c.plugin === 'mysql' || (c.plugin === 'database' && c.databaseType === 'mysql')) ? 'bg-blue-100 text-blue-800' :
                          (c.plugin === 'database' && c.databaseType === 'oracle') ? 'bg-orange-100 text-orange-800' :
                          c.plugin === 'aveva-pi' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {(c.plugin === 'mysql' || (c.plugin === 'database' && c.databaseType === 'mysql')) && '🗄️'}
                          {(c.plugin === 'database' && c.databaseType === 'oracle') && '🗃️'}
                          {c.plugin === 'aveva-pi' && '🏭'}
                          {c.plugin === 'database' && c.databaseType ? c.databaseType.toUpperCase() : (c.plugin || 'Unknown')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {(c.plugin === 'mysql' || (c.plugin === 'database' && c.databaseType === 'mysql')) && c.config?.database && (
                              <span>DB: {c.config.database}</span>
                            )}
                            {(c.plugin === 'database' && c.databaseType === 'oracle') && c.config && (
                              <span>{c.config.service || c.config.database}@{c.config.host}:{c.config.port}</span>
                            )}
                            {c.plugin === 'aveva-pi' && c.config && (() => {
                              const fullUrl = c.config.url || c.config.endpoint || 
                                             `${c.config.protocol || 'http'}://${c.config.host}:${c.config.port || 6066}/pi/trn`;
                              
                              if (fullUrl.includes('?tag=')) {
                                const baseUrl = fullUrl.split('?')[0];
                                const tagParam = fullUrl.match(/tag=([^&]*)/)?.[1] || '';
                                const dateMatch = fullUrl.match(/Sep\/\d{4}/)?.[0] || '';
                                return `${baseUrl}?tag=${tagParam}${dateMatch ? `...${dateMatch}` : ''}`;
                              }
                              
                              return fullUrl;
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (c.status === 'connected' || c.connected) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            (c.status === 'connected' || c.connected) ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                          {(c.status === 'connected' || c.connected) ? 'Connected' : 'Disconnected'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.triggersCount || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-800 underline"
                            onClick={(e) => { e.stopPropagation(); handleTest(c.id); }}
                            disabled={!!testing[c.id]}
                            title="Test connection"
                          >
                            {testing[c.id] ? 'Testing…' : 'Test'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            className="text-blue-600 hover:text-blue-800 underline"
                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                            title="Edit connection"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            className="text-red-600 hover:text-red-800 underline"
                            onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                            title="Delete connection"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredConnections.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Menampilkan</span>
                      <select
                        value={showAll ? 'all' : itemsPerPage.toString()}
                        onChange={(e) => {
                          if (e.target.value === 'all') {
                            setShowAll(true);
                          } else {
                            setShowAll(false);
                            setItemsPerPage(Number(e.target.value));
                          }
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option key="5" value="5">5</option>
                        <option key="10" value="10">10</option>
                        <option key="20" value="20">20</option>
                        <option key="50" value="50">50</option>
                        <option key="all" value="all">Semua</option>
                      </select>
                      <span>dari {filteredConnections.length} hasil{searchTerm ? ' (terfilter)' : ''}</span>
                    </div>
                  </div>

                  {!showAll && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        ‹ Sebelumnya
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          if (pageNum > totalPages) return null;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 text-sm border rounded-md min-w-[40px] ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Selanjutnya ›
                      </button>

                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-sm text-gray-600">Ke halaman</span>
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = Number(e.target.value);
                            if (page >= 1 && page <= totalPages) {
                              setCurrentPage(page);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const page = Number((e.target as HTMLInputElement).value);
                              if (page >= 1 && page <= totalPages) {
                                setCurrentPage(page);
                              }
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">dari {totalPages}</span>
                      </div>
                    </div>
                  )}

                  {filteredConnections.length > 10 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          showAll
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {showAll ? 'Tampilkan Paginated' : 'Tampilkan Semua'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        {showCreate && (
          <Modal title={editing ? 'Edit Koneksi' : 'Tambah Koneksi'} onClose={() => { setShowCreate(false); setEditing(null); }}>
            <ConnectionForm initial={editing} onSaved={onSaved} onCancel={() => { setShowCreate(false); setEditing(null); }} />
          </Modal>
        )}

        {showTestModal && testResult && (
          <Modal title={`Test Result`} onClose={() => { setShowTestModal(false); setTestResult(null); }}>
            <pre className="text-sm bg-gray-50 p-3 rounded border">{JSON.stringify(testResult, null, 2)}</pre>
          </Modal>
        )}

        {showDeleteConfirm && editing && (
          <Modal title="Konfirmasi Hapus" onClose={() => { setShowDeleteConfirm(false); setEditing(null); }} footer={<div className="flex gap-2 justify-end"><button className="px-3 py-1 bg-gray-100 rounded" onClick={() => { setShowDeleteConfirm(false); setEditing(null); }}>Batal</button><button className="px-3 py-1 bg-red-600 text-white rounded" onClick={async () => { try { await apiFetch(`/api/data-sources/${encodeURIComponent(editing.id)}`, { method: 'DELETE' }); toast.push({ id: String(Date.now()), message: `Deleted ${editing.id}`, type: 'success' }); setNotification({ message: `Koneksi dihapus: ${editing.id}`, type: 'success' }); await load(); setSelectedModal(null); } catch (err: any) { toast.push({ id: String(Date.now()), message: `Delete failed: ${err.message || err}`, type: 'error' }); setNotification({ message: `Hapus gagal: ${err.message || err}`, type: 'error' }); } setShowDeleteConfirm(false); setEditing(null); }}>Hapus</button></div>}>
            <div className="text-sm text-gray-700">Apakah Anda yakin ingin menghapus koneksi <strong>{editing.id}</strong> ?</div>
          </Modal>
        )}

        {selectedModal && (
          <Modal title={`Detail: ${selectedModal.name || selectedModal.id}`} onClose={() => setSelectedModal(null)}>
            <KoneksiDetail item={selectedModal} onEdit={(it) => openEdit(it)} onDelete={(id) => { setEditing({ id }); setShowDeleteConfirm(true); }} />
          </Modal>
        )}
      </div>

      {notification && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg transition-all duration-300 transform animate-in slide-in-from-right-2 fade-in ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white max-w-sm ${isHiding ? 'animate-out fade-out slide-out-to-right-2' : ''}`}>
          <p className="font-medium">{notification.message}</p>
          <p className="text-xs opacity-90 mt-1">
            Menghilang dalam {notificationTimeLeft} detik
          </p>
          <div className="mt-2 w-full bg-white bg-opacity-30 rounded-full h-1">
            <div
              className={`bg-white h-1 rounded-full transition-all duration-1000 ease-linear ${isHiding ? 'animate-pulse' : ''}`}
              style={{ width: `${(notificationTimeLeft / 3) * 100}%` }}
            ></div>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
