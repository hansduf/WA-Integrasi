'use client';

import Modal from '@/app/components/ui/Modal';
import { useToast } from '@/app/components/ui/ToastProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onSuccess: () => void;
}

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onSuccess: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  userId,
  username,
  onSuccess
}: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const { push: pushToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!newPassword) {
      setError('Password baru wajib diisi');
      return;
    }

    // Password strength validation
    const strengthErrors = validatePasswordStrength(newPassword);
    if (strengthErrors.length > 0) {
      setError(`Password tidak memenuhi syarat: ${strengthErrors.join(', ')}`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setIsLoading(true);

    try {
      const response = await changePassword(userId, newPassword);
      
      if (response.success) {
        pushToast({
          id: `password-changed-${Date.now()}`,
          message: `Password ${username} berhasil diubah`,
          type: 'success'
        });
        // Reset form
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        onSuccess();
        onClose();
      } else {
        const errorMessage = response.message || 'Gagal mengubah password';
        setError(errorMessage);
        pushToast({
          id: `password-error-${Date.now()}`,
          message: errorMessage,
          type: 'error'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    const errors = validatePasswordStrength(password);
    const strength = 5 - errors.length;
    
    if (strength <= 1) return { level: 'weak', color: 'bg-red-500', text: 'Lemah' };
    if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500', text: 'Sedang' };
    return { level: 'strong', color: 'bg-green-500', text: 'Kuat' };
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  return (
    <Modal
      title={`Ubah Password - ${username}`}
      onClose={handleClose}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Password Baru
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Masukkan password baru"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              disabled={isLoading}
            >
              {showNewPassword ? (
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
                    style={{ width: `${(5 - validatePasswordStrength(newPassword).length) * 20}%` }}
                  ></div>
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength.level === 'weak' ? 'text-red-600' :
                  passwordStrength.level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {passwordStrength.text}
                </span>
              </div>
              {validatePasswordStrength(newPassword).length > 0 && (
                <div className="mt-1 text-xs text-gray-600">
                  Syarat: {validatePasswordStrength(newPassword).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Konfirmasi password baru"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              disabled={isLoading}
            >
              {showConfirmPassword ? (
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
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 font-medium"
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isLoading ? 'Menyimpan...' : 'Ubah Password'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}