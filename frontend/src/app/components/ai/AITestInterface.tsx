"use client";

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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

export default function AITestInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [triggers, setTriggers] = useState<AITrigger[]>([]);
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('');
  const [isLoadingTriggers, setIsLoadingTriggers] = useState(true);

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    try {
      const resp = await api.get('/api/ai/triggers');
      
      // Backend returns array directly, not wrapped in { success, data }
      if (Array.isArray(resp)) {
        const enabledTriggers = resp.filter((t: AITrigger) => t.enabled);
        setTriggers(enabledTriggers);

        if (enabledTriggers.length > 0) {
          setSelectedTriggerId(enabledTriggers[0].id);
        }
      } else if (resp && (resp as any).success) {
        // Handle wrapped response if backend changes
        const data = (resp as any).data || resp;
        const enabledTriggers = (Array.isArray(data) ? data : []).filter((t: AITrigger) => t.enabled);
        setTriggers(enabledTriggers);

        if (enabledTriggers.length > 0) {
          setSelectedTriggerId(enabledTriggers[0].id);
        }
      } else {
        console.warn('Unexpected response format:', resp);
        setTriggers([]);
      }
    } catch (error) {
      console.error('Failed to load AI triggers for testing:', error);
      setTriggers([]);
    } finally {
      setIsLoadingTriggers(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedTriggerId) return;

    const selectedTrigger = triggers.find(t => t.id === selectedTriggerId);
    if (!selectedTrigger) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `${selectedTrigger.prefix}${inputMessage}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const result = await api.post('/api/ai/chat', {
        message: userMessage.content,
        triggerId: selectedTriggerId
      });

      if (result.success) {
        // Extract response content - handle both string and object formats
        let responseContent = (result as any).response || '🤖 AI Response received';
        
        // If response is an object with output_text, extract the text
        if (typeof responseContent === 'object' && responseContent !== null && 'output_text' in responseContent) {
          responseContent = responseContent.output_text;
        }
        
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: String(responseContent), // Ensure it's always a string
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Kesalahan: ${ (result as any).error || 'Gagal mendapatkan respons AI' }`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Kesalahan jaringan. Silakan periksa koneksi backend.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">🧪 Test</h3>
        <p className="text-gray-600">Uji koneksi AI dengan trigger</p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h4 className="text-lg font-semibold text-gray-800">Antarmuka Uji AI</h4>
              <p className="text-sm text-gray-600">Uji koneksi AI dengan trigger</p>
            </div>
          </div>
          <button
            onClick={() => setMessages([])}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            title="Bersihkan chat"
          >
            🗑️
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Trigger AI
          </label>
          {isLoadingTriggers ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span className="text-sm text-gray-600">Memuat trigger...</span>
            </div>
          ) : triggers.length === 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-600 text-xl">⚠️</span>
                <div>
                  <h4 className="text-red-800 font-medium">Tidak Ada Trigger AI yang Tersedia</h4>
                  <p className="text-red-700 text-sm">Silakan buat trigger di tab "Trigger" terlebih dahulu.</p>
                </div>
              </div>
            </div>
          ) : (
            <select
              value={selectedTriggerId}
              onChange={(e) => setSelectedTriggerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {triggers.map(trigger => (
                <option key={trigger.id} value={trigger.id}>
                  {trigger.prefix} - {trigger.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg h-96 overflow-y-auto p-4 mb-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">💬</div>
              <p>Mulai percakapan untuk menguji koneksi AI Anda</p>
              <p className="text-sm mt-1">Pilih trigger dan ketik pesan untuk memulai</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-sm text-gray-600">AI sedang berpikir...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ketik pesan Anda (tanpa prefix)..."
            disabled={isLoading || triggers.length === 0}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim() || triggers.length === 0}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Kirim</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-blue-600 text-xl">💡</span>
            <h4 className="text-blue-800 font-semibold">Tips Pengujian</h4>
          </div>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Konfigurasikan koneksi AI Anda di tab "Koneksi" terlebih dahulu</li>
            <li>• Buat minimal satu trigger AI di tab "Trigger"</li>
            <li>• Pilih trigger dari dropdown di atas</li>
            <li>• Ketik pesan Anda tanpa prefix (itu akan ditambahkan secara otomatis)</li>
            <li>• Contoh: Ketik "berita hari ini" dengan trigger "+-=" → mengirim "+-=berita hari ini"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}