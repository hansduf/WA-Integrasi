"use client";

import React from 'react';
import Modal from './Modal';

type Props = {
  open: boolean;
  title?: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isDangerous?: boolean; // Red styling for destructive actions
};

export default function ConfirmModal({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}: Props) {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel} size="md" showCloseButton={false}>
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg ${
            isDangerous 
              ? 'bg-red-100/80 text-red-600' 
              : 'bg-yellow-100/80 text-yellow-600'
          }`}>
            {isDangerous ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 
              bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md 
              focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
              active:scale-95 transform"
          >
            {cancelLabel}
          </button>

          <button
            onClick={() => onConfirm?.()}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 transform
              focus:outline-none focus:ring-offset-2
              active:scale-95
              ${isDangerous 
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-lg shadow-red-500/30 focus:ring-2 focus:ring-red-400'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg shadow-blue-500/30 focus:ring-2 focus:ring-blue-400'
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
