"use client";

import React from 'react';

type Props = {
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
};

export default function Modal({
  title,
  children,
  onClose,
  footer,
  size = 'xl',
  showCloseButton = true
}: Props) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-400 z-[90]"
      />

      <div className={`relative z-[110] bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-400 border border-gray-200/50 transform transition-all ease-out pointer-events-auto`}>
        {title && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {title}
              </h3>
            </div>
            {showCloseButton && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose?.();
                }}
                className="group flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-gray-700 hover:bg-red-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transform hover:scale-110"
                aria-label="Close modal"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="px-8 py-8 max-h-[calc(95vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-50 hover:scrollbar-thumb-blue-300 transition-colors duration-200">
          <div className="space-y-6">
            {children}
          </div>
        </div>

        {footer && (
          <div className="px-8 py-6 border-t border-gray-100/80 bg-gradient-to-r from-gray-50/80 to-blue-50/60 backdrop-blur-sm pointer-events-auto">
            <div className="flex justify-end space-x-3">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
