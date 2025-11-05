'use client';

import ChangePasswordModal from '@/app/components/auth/ChangePasswordModal';
import Modal from '@/app/components/ui/Modal';
import { userApi } from '@/lib/api';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function UsersManagement({ searchTerm = '' }: { searchTerm?: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id: string, username: string} | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await userApi.getAll();
      console.log('📋 Users API response:', response);
      
      // Backend returns { success, users, pagination } directly
      if (response && (response as any).success) {
        const users = (response as any).users || [];
        console.log('✅ Users loaded:', users.length);
        setUsers(users);
      } else {
        const errorMsg = (response as any)?.message || 'Failed to fetch users';
        console.error('❌ Failed to fetch users:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await userApi.toggleStatus(userId, !isActive);
      if (response.success) {
        fetchUsers();
      } else {
        alert(response.message || 'Gagal mengubah status pengguna');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      return;
    }

    try {
      const response = await userApi.delete(userId);
      if (response.success) {
        fetchUsers();
      } else {
        alert(response.message || 'Gagal menghapus pengguna');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    }
  };

  const handleChangePassword = (userId: string, username: string) => {
    setSelectedUser({ id: userId, username });
    setShowChangePasswordModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Manajemen Pengguna</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          + Buat Pengguna Baru
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Memuat pengguna...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {(() => {
            const filteredUsers = users.filter(user => {
              if (!searchTerm) return true;
              const term = searchTerm.toLowerCase();
              return (
                user.username.toLowerCase().includes(term) ||
                (user.full_name && user.full_name.toLowerCase().includes(term)) ||
                (user.email && user.email.toLowerCase().includes(term))
              );
            });

            return (
              <>
                {filteredUsers.length === 0 && searchTerm && (
                  <div className="text-center py-12 text-gray-500">
                    <p>Tidak ada pengguna yang cocok dengan "{searchTerm}"</p>
                  </div>
                )}
                
                {filteredUsers.length > 0 && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nama Pengguna
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nama Lengkap
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Login Terakhir
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {user.is_active ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_login
                              ? new Date(user.last_login).toLocaleDateString('id-ID')
                              : 'Belum Pernah'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleToggleStatus(user.id, user.is_active)}
                                className={user.is_active ? 'text-red-600 hover:text-red-800 underline' : 'text-green-600 hover:text-green-800 underline'}
                              >
                                {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleChangePassword(user.id, user.username)}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Ubah Password
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-800 underline"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            );
          })()}
        </div>
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      {showChangePasswordModal && selectedUser && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => {
            setShowChangePasswordModal(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.id}
          username={selectedUser.username}
          onSuccess={() => {
            setShowChangePasswordModal(false);
            setSelectedUser(null);
            // Optional: Show success message
          }}
        />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password strength validation
  const validatePasswordStrength = (password: string) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Minimal 8 karakter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Harus ada huruf kecil');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Harus ada huruf besar');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Harus ada angka');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Harus ada simbol khusus');
    }
    
    return errors;
  };

  const getPasswordStrength = (password: string) => {
    const errors = validatePasswordStrength(password);
    const strength = 5 - errors.length;
    
    if (strength <= 1) return { level: 'weak', color: 'bg-red-500', text: 'Lemah' };
    if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500', text: 'Sedang' };
    return { level: 'strong', color: 'bg-green-500', text: 'Kuat' };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Password strength validation
    const strengthErrors = validatePasswordStrength(password);
    if (strengthErrors.length > 0) {
      setError(`Password tidak memenuhi syarat: ${strengthErrors.join(', ')}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await userApi.create({
        username,
        password,
        full_name: fullName,
        email: email || undefined,
      });

      if (response.success) {
        onSuccess();
      } else {
        // Check if it's an authentication error
        if (response.error === 'unauthorized' || response.error === 'authentication_required') {
          setError('Sesi berakhir. Silakan refresh halaman dan login kembali.');
        } else {
          setError(response.message || 'Gagal membuat pengguna');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Buat Pengguna Baru"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            form="create-user-form"
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Membuat...' : 'Buat Pengguna'}
          </button>
        </>
      }
    >
      <div>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengguna *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                disabled={isLoading}
                placeholder="Masukkan kata sandi"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(5 - validatePasswordStrength(password).length) * 20}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.level === 'weak' ? 'text-red-600' :
                    passwordStrength.level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {passwordStrength.text}
                  </span>
                </div>
                {validatePasswordStrength(password).length > 0 && (
                  <div className="mt-1 text-xs text-gray-600">
                    Syarat: {validatePasswordStrength(password).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (opsional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}
