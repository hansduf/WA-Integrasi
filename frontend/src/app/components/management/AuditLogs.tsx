'use client';

import { securityApi } from '@/lib/api';
import React, { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalLogs: number;
  limit: number;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  const loadLogs = async (page: number = 1) => {
    setLoading(true);
    try {
      const result: any = await securityApi.getAuditLogs({
        ...filters,
        page,
        limit: pagination.limit,
      });

      if (result.success) {
        setLogs(result.logs || []);
        if (result.pagination) {
          setPagination({
            currentPage: result.pagination.page,
            totalPages: result.pagination.totalPages,
            totalLogs: result.pagination.total,
            limit: result.pagination.limit,
          });
        }
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    loadLogs(1);
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      startDate: '',
      endDate: '',
    });
    setTimeout(() => loadLogs(1), 100);
  };

  const formatDate = (dateString: string, details?: string) => {
    try {
      let dateToFormat = new Date(dateString);
      
      // Jika ada details JSON dengan timestamp, gunakan itu (lebih akurat)
      if (details) {
        try {
          const parsed = JSON.parse(details);
          if (parsed.timestamp) {
            dateToFormat = new Date(parsed.timestamp);
          }
        } catch {
          // Jika parse gagal, gunakan dateString default
        }
      }
      
      // Gunakan Intl untuk formatting lebih detail dengan timezone lokal browser
      const dateFormatter = new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
        // Tidak perlu timeZone - gunakan timezone browser user
      });
      return dateFormatter.format(dateToFormat);
    } catch {
      return dateString;
    }
  };

  const getIPInfo = (ipAddress: string) => {
    if (!ipAddress) {
      return { type: 'Unknown', icon: '❓', desc: 'IP not available' };
    }
    if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
      return { type: 'Localhost', icon: '🏠', desc: 'Local Machine' };
    } else if (ipAddress.includes('192.168') || ipAddress.includes('10.0') || ipAddress.includes('172.')) {
      return { type: 'Private Network', icon: '🔒', desc: 'Internal Network' };
    }
    return { type: 'Public IP', icon: '🌐', desc: 'External Network' };
  };

  const getActionColor = (action: string) => {
    if (!action) return 'text-gray-600 bg-gray-50';
    if (action.includes('LOGIN')) return 'text-blue-600 bg-blue-50';
    if (action.includes('LOGOUT')) return 'text-gray-600 bg-gray-50';
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE')) return 'text-yellow-600 bg-yellow-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    if (action.includes('UNLOCK')) return 'text-purple-600 bg-purple-50';
    if (action.includes('TERMINATE')) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getActionIcon = (action: string) => {
    if (!action) return '📝';
    if (action.includes('LOGIN')) return '🔓';
    if (action.includes('LOGOUT')) return '🚪';
    if (action.includes('CREATE')) return '➕';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('UNLOCK')) return '🔓';
    if (action.includes('TERMINATE')) return '⛔';
    return '📝';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Log Audit</h3>
        <div className="text-sm text-gray-600">
          Total: {pagination.totalLogs} logs
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">🔍 Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">All Actions</option>
              <option value="USER_LOGIN_SUCCESS">Login Success</option>
              <option value="USER_LOGIN_FAILED">Login Failed</option>
              <option value="USER_LOGOUT">Logout</option>
              <option value="USER_CREATED">User Created</option>
              <option value="USER_UPDATED">User Updated</option>
              <option value="USER_DELETED">User Deleted</option>
              <option value="USER_PASSWORD_CHANGED">Password Changed</option>
              <option value="ACCOUNT_UNLOCKED">Account Unlocked</option>
              <option value="SESSION_TERMINATED">Session Terminated</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">User ID</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Enter user ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSearch}
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            Cari
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearFilters}
            className="text-gray-600 hover:text-gray-800 underline text-sm"
          >
            Bersihkan Filter
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Memuat log audit...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada log audit yang ditemukan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waktu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alamat IP
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                        <td className="px-4 py-3 text-sm text-center">
                          <button className="text-gray-400 hover:text-gray-600">
                            {expandedLogId === log.id ? '▼' : '▶'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(log.timestamp, log.details)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {log.user_id ? `${log.user_id.slice(0, 8)}...` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action || 'UNKNOWN')}`}>
                            {getActionIcon(log.action || 'UNKNOWN')} {log.action || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>{getIPInfo(log.ip_address || '').icon}</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{log.ip_address || 'N/A'}</span>
                          </div>
                        </td>
                      </tr>
                      {expandedLogId === log.id && (
                        <tr className="bg-blue-50 border-l-4 border-blue-500">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">🌐 Alamat IP</h4>
                                <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getIPInfo(log.ip_address || '').icon}</span>
                                    <div>
                                      <div className="font-mono font-bold">{log.ip_address || 'N/A'}</div>
                                      <div className="text-xs text-gray-500">
                                        {getIPInfo(log.ip_address || '').type} - {getIPInfo(log.ip_address || '').desc}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">📱 User Agent</h4>
                                <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                  <code className="text-xs">{log.user_agent || 'N/A'}</code>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">📋 Detail</h4>
                                <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                    {(() => {
                                      try {
                                        return JSON.stringify(JSON.parse(log.details), null, 2);
                                      } catch {
                                        return log.details;
                                      }
                                    })()}
                                  </pre>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="font-semibold text-gray-600">Log ID:</span>
                                  <div className="text-gray-700 font-mono">{log.id}</div>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-600">Timestamp:</span>
                                  <div className="text-gray-700 font-mono">{log.timestamp}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages} 
                {' • '}
                Showing {logs.length} of {pagination.totalLogs} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadLogs(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => loadLogs(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          pageNum === pagination.currentPage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => loadLogs(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
