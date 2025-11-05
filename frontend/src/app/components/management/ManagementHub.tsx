'use client';

import { useState } from 'react';
import AuditLogs from './AuditLogs';
import UsersManagement from './UsersManagement';

export default function ManagementHub() {
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">👥 Hub Manajemen</h2>
            <p className="text-gray-600">Kelola pengguna, keamanan, dan audit logs</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Pengguna
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Audit Logs
            </button>
          </nav>
        </div>

        <div className="mb-6 bg-gray-50 px-6 py-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Cari pengguna, email, atau nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {activeTab === 'users' && <UsersManagement searchTerm={searchTerm} />}
        {activeTab === 'audit' && <AuditLogs />}
      </div>
    </div>
  );
}
