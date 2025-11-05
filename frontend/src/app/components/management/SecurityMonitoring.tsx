'use client';

import ConfirmModal from '@/app/components/ui/ConfirmModal';
import InfoModal from '@/app/components/ui/InfoModal';
import { securityApi } from '@/lib/api';
import { useEffect, useState } from 'react';

interface SecurityOverview {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  lockedAccounts: number;
  activeSessions: number;
  failedLogins24h: number;
}

interface FailedLogin {
  id: string;
  username: string;
  ip_address: string;
  user_agent: string;
  reason: string;
  attempted_at: string;
}

interface ActiveSession {
  session_id: string;
  user_id: string;
  username: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
}

interface LockedAccount {
  id: string;
  username: string;
  full_name: string;
  email: string;
  failed_login_count: number;
  locked_at: string;
}

export default function SecurityMonitoring() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeWindow, setTimeWindow] = useState(60); // minutes

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, failedLoginsRes, sessionsRes, lockedRes] = await Promise.all([
        securityApi.getOverview(),
        securityApi.getFailedLogins(timeWindow),
        securityApi.getActiveSessions(),
        securityApi.getLockedAccounts(),
      ]);

        // Debug: log raw API responses to help diagnose empty UI
        try {
          // eslint-disable-next-line no-console
          console.debug('SecurityMonitoring: API responses', {
            timeWindow,
            overviewRes,
            failedLoginsRes,
            sessionsRes,
            lockedRes,
          });
        } catch (e) {
          // ignore console errors in environments that block it
        }
      // Helper to normalize responses that sometimes are nested as { data: { data: ... } }
      const normalizeObject = (res: any) => {
        if (!res) return null;
        if (!res.success) return null;
        if (res.data === undefined || res.data === null) return null;
        // If backend wrapped payload inside another `data` key, unwrap it
        const payload = (res.data as any).data !== undefined ? (res.data as any).data : res.data;
        return payload ?? null;
      };

      const normalizeArray = (res: any) => {
        const payload = normalizeObject(res);
        if (!payload) return [];
        return Array.isArray(payload) ? payload : [];
      };

      const ov = normalizeObject(overviewRes);
      if (ov) {
        setOverview(ov as SecurityOverview);
      } else {
        console.debug('SecurityMonitoring: overview missing or invalid', overviewRes);
      }

      setFailedLogins(normalizeArray(failedLoginsRes));
      setActiveSessions(normalizeArray(sessionsRes));
      setLockedAccounts(normalizeArray(lockedRes));
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeWindow]);

  const handleUnlockAccount = async (userId: string, username: string) => {
    // open confirm modal
    setPendingUnlock({ userId, username });
  };

  const handleTerminateSession = async (sessionId: string, username: string) => {
    setPendingTerminate({ sessionId, username });
  };

  // Modal state
  const [pendingUnlock, setPendingUnlock] = useState<null | { userId: string; username: string }>(null);
  const [pendingTerminate, setPendingTerminate] = useState<null | { sessionId: string; username: string }>(null);
  const [infoModal, setInfoModal] = useState<null | { title?: string; message?: string; type?: 'info' | 'success' | 'error' | 'warning' }>(null);

  const confirmUnlock = async () => {
    if (!pendingUnlock) return;
    const { userId, username } = pendingUnlock;
    setPendingUnlock(null);
    const result = await securityApi.unlockAccount(userId);
    if (result.success) {
      setInfoModal({ title: 'Unlocked', message: 'Account unlocked successfully', type: 'success' });
      loadData(true);
    } else {
      setInfoModal({ title: 'Error', message: `Failed to unlock account: ${result.message || 'unknown'}`, type: 'error' });
    }
  };

  const confirmTerminate = async () => {
    if (!pendingTerminate) return;
    const { sessionId } = pendingTerminate;
    setPendingTerminate(null);
    const result = await securityApi.terminateSession(sessionId, 'Terminated by admin');
    if (result.success) {
      setInfoModal({ title: 'Terminated', message: 'Session terminated successfully', type: 'success' });
      loadData(true);
    } else {
      setInfoModal({ title: 'Error', message: `Failed to terminate session: ${result.message || 'unknown'}`, type: 'error' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading security data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Security Monitoring</h3>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {refreshing ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Total Users</div>
            <div className="text-2xl font-bold text-blue-900">{overview.totalUsers}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Active</div>
            <div className="text-2xl font-bold text-green-900">{overview.activeUsers}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 font-medium">Inactive</div>
            <div className="text-2xl font-bold text-gray-900">{overview.inactiveUsers}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600 font-medium">Locked</div>
            <div className="text-2xl font-bold text-red-900">{overview.lockedAccounts}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Active Sessions</div>
            <div className="text-2xl font-bold text-purple-900">{overview.activeSessions}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-600 font-medium">Failed Logins 24h</div>
            <div className="text-2xl font-bold text-orange-900">{overview.failedLogins24h}</div>
          </div>
        </div>
      )}

      {lockedAccounts.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-red-900 mb-3">🔒 Locked Accounts</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Failed Attempts</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Locked At</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lockedAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{account.username}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{account.full_name}</td>
                    <td className="px-4 py-2 text-sm text-red-600 font-semibold">{account.failed_login_count}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatDate(account.locked_at)}</td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => handleUnlockAccount(account.id, account.username)}
                        className="text-green-600 hover:text-green-800 underline"
                      >
                        Unlock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">👥 Active Sessions ({activeSessions.length})</h4>
        {activeSessions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No active sessions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Browser</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeSessions.map((session) => (
                  <tr key={session.session_id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{session.username}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{session.ip_address}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs" title={session.user_agent}>
                      {session.user_agent.substring(0, 50)}...
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatRelativeTime(session.created_at)}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatRelativeTime(session.last_activity)}</td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => handleTerminateSession(session.session_id, session.username)}
                        className="text-red-600 hover:text-red-800 underline"
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-semibold text-gray-900">⚠️ Failed Login Attempts ({failedLogins.length})</h4>
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={15}>Last 15 min</option>
            <option value={60}>Last 1 hour</option>
            <option value={360}>Last 6 hours</option>
            <option value={1440}>Last 24 hours</option>
          </select>
        </div>
        {failedLogins.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No failed login attempts in this time window</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Browser</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {failedLogins.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{attempt.username}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{attempt.ip_address}</td>
                    <td className="px-4 py-2 text-sm text-red-600">{attempt.reason}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs" title={attempt.user_agent}>
                      {attempt.user_agent.substring(0, 50)}...
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatDate(attempt.attempted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && overview === null && activeSessions.length === 0 && failedLogins.length === 0 && lockedAccounts.length === 0 && (
        <div className="text-center text-sm text-gray-500">No security data returned by backend. Check network / API responses in DevTools console.</div>
      )}

      <ConfirmModal
        open={!!pendingUnlock}
        title="Unlock Account"
        message={pendingUnlock ? `Unlock account for user "${pendingUnlock.username}"?` : undefined}
        confirmLabel="Unlock"
        cancelLabel="Cancel"
        isDangerous={false}
        onConfirm={confirmUnlock}
        onCancel={() => setPendingUnlock(null)}
      />

      <ConfirmModal
        open={!!pendingTerminate}
        title="Terminate Session"
        message={pendingTerminate ? `Terminate session for user "${pendingTerminate.username}"?` : undefined}
        confirmLabel="Terminate"
        cancelLabel="Cancel"
        isDangerous={true}
        onConfirm={confirmTerminate}
        onCancel={() => setPendingTerminate(null)}
      />

      <InfoModal
        open={!!infoModal}
        title={infoModal?.title}
        message={infoModal?.message}
        type={(infoModal?.type || 'info') as 'info' | 'success' | 'error' | 'warning'}
        onOk={() => setInfoModal(null)}
      />
    </div>
  );
}
