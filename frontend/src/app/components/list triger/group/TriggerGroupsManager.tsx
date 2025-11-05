'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import Modal from '../../ui/Modal';

interface Trigger {
  id: string;
  name: string;
  dataSource: string;
  description: string;
  type: string;
  aliases: string[];
  active?: boolean;
  source?: string;
  dataSourceExists?: boolean;
  groupId?: string;
}

interface TriggerGroup {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  triggerCount?: number;
  groupName?: string;
}

interface TriggerGroupsManagerProps {
  triggers: Trigger[];
  groups: TriggerGroup[];
  onGroupsChange: (groups: TriggerGroup[]) => void;
  onLoadData: () => Promise<void>;
  setSuccessMessage: (message: string) => void;
  setShowSuccessModal: (show: boolean) => void;
  setNotification: (notification: { message: string; type?: 'success' | 'error' } | null) => void;
}

const TriggerGroupsManager = forwardRef<{
  handleEditGroup: (group: TriggerGroup) => void;
  handleDeleteGroup: (group: TriggerGroup) => Promise<void>;
}, TriggerGroupsManagerProps>(({
  triggers,
  groups,
  onGroupsChange,
  onLoadData,
  setSuccessMessage,
  setShowSuccessModal,
  setNotification
}, ref) => {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TriggerGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    triggers: [] as string[],
    active: true
  });

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    handleEditGroup,
    handleDeleteGroup
  }));

  // Handle editing group
  useEffect(() => {
    if (editingGroup) {
      setGroupFormData({
        name: editingGroup.name,
        description: editingGroup.description,
        triggers: editingGroup.triggers || [],
        active: editingGroup.active !== false
      });
    }
  }, [editingGroup]);

  // Group action handlers
  const handleEditGroup = (group: TriggerGroup) => {
    setEditingGroup(group);
    setShowCreateGroupModal(true);
  };

  const handleDeleteGroup = async (group: TriggerGroup) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus group "${group.name}"?`)) return;

    try {
      await apiFetch(`/api/trigger-groups/${group.id}`, {
        method: 'DELETE'
      });
      setSuccessMessage(`Group "${group.name}" berhasil dihapus!`);
      setShowSuccessModal(true);
      await onLoadData();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus group', type: 'error' });
    }
  };

  // Handle group form submit
  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingGroup ? 'PUT' : 'POST';
      const url = editingGroup ? `/api/trigger-groups/${editingGroup.id}` : '/api/trigger-groups';

      await apiFetch(url, {
        method,
        body: JSON.stringify(groupFormData)
      });

      setSuccessMessage(`Group "${groupFormData.name}" berhasil ${editingGroup ? 'diupdate' : 'dibuat'}!`);
      setShowSuccessModal(true);
      setShowCreateGroupModal(false);
      setGroupFormData({ name: '', description: '', triggers: [], active: true });
      setEditingGroup(null);
      await onLoadData();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menyimpan group', type: 'error' });
    }
  };

  const resetGroupForm = () => {
    setGroupFormData({ name: '', description: '', triggers: [], active: true });
    setEditingGroup(null);
  };

  return (
    <>
      <button
        onClick={() => setShowCreateGroupModal(true)}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>Buat Group</span>
      </button>

      {showCreateGroupModal && (
        <Modal
          onClose={() => {
            setShowCreateGroupModal(false);
            resetGroupForm();
          }}
          title={editingGroup ? 'Edit Group' : 'Buat Group Baru'}
        >
          <form onSubmit={handleGroupSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Group
              </label>
              <input
                type="text"
                value={groupFormData.name}
                onChange={(e) => setGroupFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan nama group"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                value={groupFormData.description}
                onChange={(e) => setGroupFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan deskripsi group"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Triggers
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md">
                {triggers.map((trigger) => (
                  <label key={trigger.id} className="flex items-center px-3 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={groupFormData.triggers.includes(trigger.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupFormData(prev => ({
                            ...prev,
                            triggers: [...prev.triggers, trigger.id]
                          }));
                        } else {
                          setGroupFormData(prev => ({
                            ...prev,
                            triggers: prev.triggers.filter(t => t !== trigger.id)
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{trigger.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="group-active"
                checked={groupFormData.active}
                onChange={(e) => setGroupFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="group-active" className="text-sm font-medium text-gray-700">
                Aktif
              </label>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  resetGroupForm();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {editingGroup ? 'Update' : 'Buat'} Group
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
});

TriggerGroupsManager.displayName = 'TriggerGroupsManager';

export default TriggerGroupsManager;