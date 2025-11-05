'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../ui/Modal';

interface AvevaPIPreset {
  id: string;
  name: string;
  queryTemplate: string;
  variables: string[];
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface AvevaPIPresetDropdownProps {
  presets: AvevaPIPreset[];
  selectedPresetId: string | null;
  onPresetSelect: (preset: AvevaPIPreset | null) => void;
  onPresetRename: (presetId: string, newName: string) => void;
  onPresetDelete: (presetId: string) => void;
  onPresetDuplicate: (presetId: string) => void;
  disabled?: boolean;
}

export default function AvevaPIPresetDropdown({
  presets,
  selectedPresetId,
  onPresetSelect,
  onPresetRename,
  onPresetDelete,
  onPresetDuplicate,
  disabled = false
}: AvevaPIPresetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    preset: AvevaPIPreset;
    x: number;
    y: number;
  } | null>(null);
  const [editingPreset, setEditingPreset] = useState<AvevaPIPreset | null>(null);
  const [editName, setEditName] = useState('');
  const [deletePreset, setDeletePreset] = useState<AvevaPIPreset | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPreset = presets.find(p => p.id === selectedPresetId);

  const handlePresetClick = (preset: AvevaPIPreset) => {
    onPresetSelect(preset);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onPresetSelect(null);
    setIsOpen(false);
  };

  const handleContextMenu = (event: React.MouseEvent, preset: AvevaPIPreset) => {
    event.preventDefault();
    setContextMenu({
      preset,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleRename = () => {
    if (contextMenu && contextMenu.preset.name.includes('(Custom)')) {
      setEditingPreset(contextMenu.preset);
      setEditName(contextMenu.preset.name.replace('🔧 ', '').replace(' (Custom)', ''));
      setContextMenu(null);
    }
  };

  const handleRenameSubmit = () => {
    if (editingPreset && editName.trim()) {
      onPresetRename(editingPreset.id, editName.trim());
      setEditingPreset(null);
      setEditName('');
    }
  };

  const handleRenameCancel = () => {
    setEditingPreset(null);
    setEditName('');
  };

  const handleDeleteConfirm = () => {
    if (deletePreset) {
      onPresetDelete(deletePreset.id);
      setDeletePreset(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletePreset(null);
  };

  const handleDelete = () => {
    if (contextMenu && contextMenu.preset.name.includes('(Custom)')) {
      setDeletePreset(contextMenu.preset);
      setContextMenu(null);
    }
  };

  const handleDuplicate = () => {
    if (contextMenu && contextMenu.preset.name.includes('(Custom)')) {
      onPresetDuplicate(contextMenu.preset.id);
      setContextMenu(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Preset Query
      </label>

      
      <div
        className={`relative ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors flex items-center justify-between">
          <span className={selectedPreset ? 'text-gray-900' : 'text-gray-500'}>
            {selectedPreset ? selectedPreset.name : `Pilih preset query... (${presets.length} tersedia)`}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          
          {selectedPreset && (
            <div
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
              onClick={handleClearSelection}
            >
              ❌ Clear Selection
            </div>
          )}

          
          {presets.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 italic">
              Belum ada preset tersimpan
            </div>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                  selectedPresetId === preset.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
                onClick={() => handlePresetClick(preset)}
              >
                <div className="flex-1">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-48">
                    {preset.queryTemplate.length > 40
                      ? `${preset.queryTemplate.substring(0, 40)}...`
                      : preset.queryTemplate
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {preset.usageCount > 0 && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-1 py-0.5 rounded">
                      {preset.usageCount}
                    </span>
                  )}
                  {preset.name.includes('(Custom)') && (
                    <button
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({
                          preset,
                          x: e.currentTarget.getBoundingClientRect().left,
                          y: e.currentTarget.getBoundingClientRect().bottom
                        });
                      }}
                      title="Preset options"
                    >
                      ⋮
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl backdrop-blur-sm py-2 min-w-40 overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors duration-200 flex items-center space-x-3"
            onClick={handleRename}
          >
            <span className="text-blue-500">✏️</span>
            <span>Rename</span>
          </button>
          <button
            className="w-full px-4 py-2 text-sm text-left hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-colors duration-200 flex items-center space-x-3"
            onClick={handleDuplicate}
          >
            <span className="text-purple-500">📋</span>
            <span>Duplicate</span>
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button
            className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors duration-200 flex items-center space-x-3"
            onClick={handleDelete}
          >
            <span className="text-red-500">🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      )}

      
      {editingPreset && (
        <Modal
          title="Rename Preset"
          onClose={handleRenameCancel}
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={handleRenameCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!editName.trim()}
              >
                Rename
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Preset Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Enter new preset name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') handleRenameCancel();
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      
      {deletePreset && (
        <Modal
          title="Konfirmasi Hapus Preset"
          onClose={handleDeleteCancel}
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-200"
              >
                Hapus Preset
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  Apakah Anda yakin ingin menghapus preset <strong className="text-gray-900">{deletePreset.name}</strong>?
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Tindakan ini tidak dapat dibatalkan dan preset akan dihapus secara permanen.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}