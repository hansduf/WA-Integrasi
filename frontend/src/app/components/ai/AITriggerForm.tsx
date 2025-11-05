"use client";

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import ConfirmModal from '../ui/ConfirmModal';
import InfoModal from '../ui/InfoModal';
import Modal from '../ui/Modal';

interface AITrigger {
  id: string;
  type: string;
  prefix: string;
  name: string;
  description: string;
  enabled: boolean;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
}

export default function AITriggerForm() {
  const [triggers, setTriggers] = useState<AITrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<AITrigger | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    prefix: '',
    name: '',
    description: ''
  });

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; triggerId?: string; triggerName?: string }>({ open: false });
  const [infoModal, setInfoModal] = useState<{ open: boolean; title?: string; message?: string; type?: 'info' | 'success' | 'error' | 'warning' }>({ open: false });

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    try {
      const resp = await api.get('/api/ai/triggers');
      
      // Backend returns array directly, not wrapped in { success, data }
      if (Array.isArray(resp)) {
        setTriggers(resp);
      } else if (resp && (resp as any).success) {
        // Handle wrapped response if backend changes
        const data = (resp as any).data || resp;
        setTriggers(Array.isArray(data) ? data : []);
      } else {
        console.warn('Unexpected response format:', resp);
        setTriggers([]);
      }
    } catch (error) {
      console.error('Failed to load AI triggers:', error);
      setTriggers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      prefix: '',
      name: '',
      description: ''
    });
    setEditingTrigger(null);
  };

  const handleAddTrigger = () => {
    setIsFormOpen(true);
    resetForm();
  };

  const handleEditTrigger = (trigger: AITrigger) => {
    setEditingTrigger(trigger);
    setFormData({
      prefix: trigger.prefix,
      name: trigger.name,
      description: trigger.description
    });
    setIsFormOpen(true);
  };

  const handleSaveTrigger = async () => {
    if (!formData.name || !formData.prefix) {
      setInfoModal({
        open: true,
        type: 'warning',
        title: 'Kesalahan Validasi',
        message: 'Silakan isi nama dan prefix'
      });
      return;
    }

    // Client-side validation: prefix must start with special character
    const prefixValid = /^[^a-zA-Z0-9\s]/.test(formData.prefix);
    if (!prefixValid) {
      setInfoModal({
        open: true,
        type: 'warning',
        title: 'Invalid Prefix',
        message: 'Prefix must start with a special character (e.g., +, -, @, etc.). Example: +ai'
      });
      return;
    }

    // Check duplicate locally to avoid server 400 for duplicate prefix
    const duplicate = triggers.find(t => t.prefix === formData.prefix && (!editingTrigger || t.id !== editingTrigger.id));
    if (duplicate) {
      setInfoModal({
        open: true,
        type: 'warning',
        title: 'Prefix Duplikat',
        message: `Prefix "${formData.prefix}" sudah ada. Pilih prefix yang berbeda.`
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingTrigger) {
        // Update existing trigger
        const result = await api.put(`/api/ai/triggers/${editingTrigger.id}`, {
          prefix: formData.prefix,
          name: formData.name,
          description: formData.description,
          enabled: editingTrigger.enabled
        });

        if (result.success) {
          await loadTriggers();
          setIsFormOpen(false);
          resetForm();
          setInfoModal({
            open: true,
            type: 'success',
            title: 'Sukses',
            message: 'Trigger berhasil diperbarui'
          });
        } else {
          setInfoModal({
            open: true,
            type: 'error',
            title: 'Pembaruan Gagal',
            message: 'Gagal memperbarui trigger'
          });
        }
      } else {
        // Add new trigger
        const result = await api.post('/api/ai/triggers', {
          prefix: formData.prefix,
          name: formData.name,
          description: formData.description
        });

        if (result.success) {
          await loadTriggers();
          setIsFormOpen(false);
          resetForm();
          setInfoModal({
            open: true,
            type: 'success',
            title: 'Sukses',
            message: 'Trigger berhasil dibuat'
          });
        } else {
          const error = (result as any) || {};
          let errorMessage = 'Kesalahan tidak diketahui';

          // Handle specific error types
          if (error.error === 'authentication_required') {
            errorMessage = 'Autentikasi diperlukan. Silakan login kembali.';
          } else if (error.error === 'Prefix already exists') {
            errorMessage = `Prefix "${formData.prefix}" sudah ada. Pilih prefix yang berbeda.`;
          } else if (error.error) {
            errorMessage = error.error;
          } else if (error.message) {
            errorMessage = error.message;
          }

          setInfoModal({
            open: true,
            type: 'error',
            title: 'Pembuatan Gagal',
            message: `Gagal membuat trigger: ${errorMessage}`
          });
        }
      }
    } catch (error) {
      setInfoModal({
        open: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Kesalahan jaringan. Silakan periksa koneksi backend.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrigger = (id: string) => {
    const trigger = triggers.find(t => t.id === id);
    if (trigger) {
      setDeleteModal({ open: true, triggerId: id, triggerName: trigger.name });
    }
  };

  const confirmDelete = async () => {
    const { triggerId } = deleteModal;
    if (!triggerId) return;

    setDeleteModal({ open: false });

    try {
      const result = await api.delete(`/api/ai/triggers/${triggerId}`);

      if (result.success) {
        await loadTriggers();
        setInfoModal({
          open: true,
          type: 'success',
          title: 'Terhapus',
          message: 'Trigger berhasil dihapus'
        });
      } else {
        setInfoModal({
          open: true,
          type: 'error',
          title: 'Penghapusan Gagal',
          message: 'Gagal menghapus trigger'
        });
      }
    } catch (error) {
      setInfoModal({
        open: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Kesalahan jaringan. Silakan periksa koneksi backend.'
      });
    }
  };

  const toggleTrigger = async (id: string) => {
    const trigger = triggers.find(t => t.id === id);
    if (!trigger) return;

    try {
      const result = await api.put(`/api/ai/triggers/${id}`, {
        prefix: trigger.prefix,
        name: trigger.name,
        description: trigger.description,
        enabled: !trigger.enabled
      });

      if (result.success) {
        await loadTriggers();
      }
    } catch (error) {
      setInfoModal({
        open: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Kesalahan jaringan. Silakan periksa koneksi backend.'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">🎯 Trigger AI</h3>
        <p className="text-gray-600">Konfigurasi trigger yang akan mengaktifkan respons AI</p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h4 className="text-lg font-semibold text-gray-800">Manajemen Trigger AI</h4>
              <p className="text-sm text-gray-600">Buat dan kelola trigger respons AI</p>
            </div>
          </div>
          <button
            onClick={handleAddTrigger}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            + Tambah Trigger
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-gray-600">Memuat trigger AI...</span>
            </div>
          </div>
        ) : triggers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Belum Ada Trigger AI</h4>
            <p className="text-gray-600 mb-6">Buat trigger AI pertama Anda untuk mulai chatting dengan AI menggunakan prefix khusus.</p>
            <button
              onClick={handleAddTrigger}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              + Buat Trigger Pertama
            </button>
          </div>
        ) : (
          triggers.map(trigger => (
            <div key={trigger.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-800">{trigger.name}</h4>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      trigger.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {trigger.enabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{trigger.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Prefix: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{trigger.prefix}</code></span>
                    <span>Penggunaan: {trigger.usageCount} kali</span>
                    {trigger.lastUsed && (
                      <span>Terakhir digunakan: {new Date(trigger.lastUsed).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleTrigger(trigger.id)}
                    className={`text-sm underline ${
                      trigger.enabled
                        ? 'text-red-600 hover:text-red-800'
                        : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    {trigger.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleEditTrigger(trigger)}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Edit
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleDeleteTrigger(trigger.id)}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <Modal
          title={editingTrigger ? 'Edit Trigger' : 'Tambah Trigger Baru'}
          onClose={() => {
            setIsFormOpen(false);
          }}
          footer={
            <>
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTrigger}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSaving ? 'Menyimpan...' : (editingTrigger ? 'Perbarui' : 'Tambah') + ' Trigger'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Trigger <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="contoh: Chat AI Umum"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prefix Perintah <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.prefix}
                onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
                placeholder="contoh: +-="
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Harus dimulai dengan karakter khusus (contoh: +, -, @, !)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi <span className="text-gray-400">(opsional)</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi singkat untuk trigger ini"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={deleteModal.open}
        title="Hapus Trigger"
        message={deleteModal.triggerName ? `Apakah Anda yakin ingin menghapus trigger "${deleteModal.triggerName}"? Tindakan ini tidak dapat dibatalkan.` : 'Hapus trigger ini?'}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false })}
      />

      <InfoModal
        open={infoModal.open}
        title={infoModal.title}
        message={infoModal.message}
        type={(infoModal.type || 'info') as 'info' | 'success' | 'error' | 'warning'}
        onOk={() => setInfoModal({ open: false })}
      />
    </div>
  );
}