'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import AIHub from './ai/AIHub';
import ListKoneksi from './koneksi/list koneksi';
import ListTriger from './list triger/list triger';
import ManagementHub from './management/ManagementHub';
import WhatsAppHub from './whatsapp/WhatsAppHub';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  activeColor?: 'blue' | 'green' | 'purple';
}

function TabButton({ active, onClick, label, activeColor = 'blue' }: TabButtonProps) {
  const colorClasses = {
    blue: active ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
    green: active ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
    purple: active ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
  };

  return (
    <button
      onClick={onClick}
      className={`py-2 px-1 border-b-2 font-medium text-sm ${colorClasses[activeColor]}`}
      role="tab"
      aria-selected={active}
    >
      {label}
    </button>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'koneksi' | 'triger' | 'whatsapp' | 'ai' | 'management'>('triger');
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            🎯 Universal Data Platform
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              👤 {user?.full_name || user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" role="tablist">
              <TabButton
                active={activeTab === 'triger'}
                onClick={() => setActiveTab('triger')}
                label="🎯 Trigger"
              />
              <TabButton
                active={activeTab === 'koneksi'}
                onClick={() => setActiveTab('koneksi')}
                label="🔗 Koneksi"
              />
              {/* <TabButton
                active={activeTab === 'dashboard'}
                onClick={() => setActiveTab('dashboard')}
                label="📊 Dashboard"
              /> */}
              <TabButton
                active={activeTab === 'whatsapp'}
                onClick={() => setActiveTab('whatsapp')}
                label="📱 WhatsApp"
                activeColor="green"
              />
              <TabButton
                active={activeTab === 'ai'}
                onClick={() => setActiveTab('ai')}
                label="🤖 AI"
                activeColor="purple"
              />
              <TabButton
                active={activeTab === 'management'}
                onClick={() => setActiveTab('management')}
                label="⚙️ Management"
                activeColor="blue"
              />
            </nav>
          </div>
        </div>

        {activeTab === 'triger' && (
          <section className="w-full px-1">
            <ListTriger />
          </section>
        )}

        {activeTab === 'koneksi' && (
          <section className="w-full px-1">
            <ListKoneksi />
          </section>
        )}

        {activeTab === 'whatsapp' && (
          <section className="w-full px-1">
            <WhatsAppHub />
          </section>
        )}

        {activeTab === 'ai' && (
          <section className="w-full px-1">
            <AIHub />
          </section>
        )}

        {activeTab === 'management' && (
          <section className="w-full px-1">
            <ManagementHub />
          </section>
        )}
      </div>
    </div>
  );
}
