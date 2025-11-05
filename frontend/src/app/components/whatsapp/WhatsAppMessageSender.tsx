'use client';

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

interface Contact {
  id: string;
  name: string;
  number: string;
  messageCount: number;
  spamCount: number;
  firstSeen: string;
  lastSeen: string;
  recentMessages: number[];
  spamPercentage?: string;
  isBusiness?: boolean;
  isEnterprise?: boolean;
  verifiedName?: string;
  isMyContact?: boolean;
  isBlocked?: boolean;
}

interface WhatsAppData {
  messages: any[];
  contacts: { [key: string]: Contact };
  stats: {
    totalMessages: number;
    spamMessages: number;
    uniqueContacts: number;
    lastUpdate: string;
  };
}

export default function WhatsAppMessageSender() {
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Fetch contacts on component mount
  useEffect(() => {
    console.log('🚀 WhatsAppMessageSender component mounted');
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    console.log('🔄 Starting to fetch contacts...');
    console.log('🔗 Using API client (credentials: include)');
    setLoadingContacts(true);
    try {
      const result = await api.get<WhatsAppData>('/whatsapp/messages');

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch contacts');
      }

      const data = result.data;
      console.log('📦 Raw API response data:', data);
      console.log('🔍 Checking data structure:', {
        hasData: !!data,
        hasContacts: !!(data && data.contacts),
        contactsKeys: data && data.contacts ? Object.keys(data.contacts) : []
      });

      if (data && data.contacts) {
        const contactsArray = Object.values(data.contacts).map((contact: Contact) => ({
          ...contact,
          spamPercentage: contact.messageCount > 0 ? ((contact.spamCount || 0) / contact.messageCount * 100).toFixed(1) : '0.0'
        }));
        
        console.log('👥 Processed contacts array:', contactsArray);
        
        // Deduplicate contacts by number to prevent duplicate keys
        const uniqueContacts = contactsArray.reduce((acc, contact) => {
          const existingIndex = acc.findIndex((c: Contact) => c.number === contact.number);
          if (existingIndex === -1) {
            acc.push(contact);
          } else {
            // Merge contact data if duplicate found
            acc[existingIndex] = {
              ...acc[existingIndex],
              messageCount: Math.max(acc[existingIndex].messageCount, contact.messageCount),
              spamCount: Math.max(acc[existingIndex].spamCount || 0, contact.spamCount || 0),
              lastSeen: new Date(Math.max(new Date(acc[existingIndex].lastSeen).getTime(), new Date(contact.lastSeen).getTime())).toISOString()
            };
          }
          return acc;
        }, [] as typeof contactsArray);
        
        // Sort by spam count (highest first) then by message count
        const sortedContacts = uniqueContacts.sort((a: any, b: any) => {
          if ((b.spamCount || 0) !== (a.spamCount || 0)) {
            return (b.spamCount || 0) - (a.spamCount || 0);
          }
          return b.messageCount - a.messageCount;
        });
        
        console.log('📋 Final sorted contacts:', sortedContacts);
        setContacts(sortedContacts);
        console.log('✅ Contacts set successfully, count:', sortedContacts.length);
      } else {
        console.warn('⚠️ No contacts data found in response:', data);
        setContacts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
      setStatus(`Error loading contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setRecipient(contact.number);
  };

  const getSpamLevel = (spamCount: number, messageCount: number) => {
    if (spamCount === 0) return 'clean';
    const percentage = (spamCount / messageCount) * 100;
    if (percentage >= 50) return 'high';
    if (percentage >= 20) return 'medium';
    return 'low';
  };

  const getSpamLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSpamLevelText = (level: string) => {
    switch (level) {
      case 'high': return '🚨 High Spam Risk';
      case 'medium': return '⚠️ Medium Spam Risk';
      case 'low': return 'ℹ️ Low Spam Risk';
      default: return '✅ Clean Contact';
    }
  };

  const spamTemplates = [
    {
      name: 'Warning Message',
      message: '⚠️ PERINGATAN: Sistem mendeteksi aktivitas spam dari nomor Anda. Harap kurangi frekuensi pengiriman pesan untuk menghindari pemblokiran.',
      category: 'warning'
    },
    {
      name: 'Block Notice',
      message: '🚫 PEMBERITAHUAN: Akun Anda telah ditandai sebagai spammer. Pengiriman pesan akan dibatasi untuk sementara waktu.',
      category: 'block'
    },
    {
      name: 'Rate Limit Info',
      message: '⏱️ INFO: Sistem membatasi pengiriman pesan maksimal 1 pesan per 6 detik. Mohon menunggu sebelum mengirim pesan berikutnya.',
      category: 'info'
    },
    {
      name: 'Contact Support',
      message: '📞 Jika Anda merasa ini adalah kesalahan, silakan hubungi support kami untuk verifikasi akun.',
      category: 'support'
    }
  ];

  const handleTemplateSelect = (templateMessage: string) => {
    setMessage(templateMessage);
    setShowTemplates(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !recipient.trim()) {
      setStatus('Please fill in both recipient and message');
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      console.log('📤 Sending message via API client...');
      const result = await api.post('/api/messages/outgoing', {
        recipient: recipient,
        message: message,
        type: 'manual_send'
      });

      if (result.success) {
        setStatus('Message sent successfully!');
        setMessage('');
        setRecipient('');
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">📤 Send WhatsApp Message</h3>
        <p className="text-gray-600 mb-6">Send manual messages to any WhatsApp number</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Contact
            </label>
            <div className="relative">
              <select
                value={selectedContact?.number || ''}
                onChange={(e) => {
                  const contact = contacts.find(c => c.number === e.target.value);
                  if (contact) handleContactSelect(contact);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                disabled={loadingContacts}
              >
                <option key="empty-contact" value="">
                  {loadingContacts ? 'Loading contacts...' : `Choose a contact... (${contacts.length} available)`}
                </option>
                {contacts.length > 0 ? contacts.map((contact, index) => {
                  console.log('🎯 Rendering contact:', contact.name, contact.number);
                  const spamLevel = getSpamLevel(contact.spamCount || 0, contact.messageCount);
                  return (
                    <option key={`contact-${contact.number}-${contact.name}-${index}`} value={contact.number}>
                      {contact.name} ({contact.number}) - {contact.spamCount || 0} spam
                    </option>
                  );
                }) : (
                  <option key="no-contacts" disabled>No contacts available</option>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {selectedContact && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{selectedContact.name}</p>
                    <p className="text-xs text-gray-600">{selectedContact.number}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    getSpamLevelColor(getSpamLevel(selectedContact.spamCount || 0, selectedContact.messageCount))
                  }`}>
                    {getSpamLevelText(getSpamLevel(selectedContact.spamCount || 0, selectedContact.messageCount))}
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-600">
                  <span>Total: {selectedContact.messageCount} messages</span>
                  <span className="text-red-600">Spam: {selectedContact.spamCount || 0}</span>
                  <span>Last seen: {new Date(selectedContact.lastSeen).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Enter Number Manually
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setSelectedContact(null); // Clear selection when manual input
              }}
              placeholder="6281234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Include country code without + sign</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {showTemplates ? 'Hide Templates' : 'Show Templates'}
              </button>
            </div>
            
            {showTemplates && (
              <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-2">📝 Spam Handling Templates:</p>
                <div className="grid grid-cols-1 gap-2">
                  {spamTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => handleTemplateSelect(template.message)}
                      className="text-left p-2 bg-white rounded border border-blue-300 hover:bg-blue-100 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-800">{template.name}</div>
                      <div className="text-xs text-gray-600 truncate">{template.message}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {status && (
            <div className={`p-3 rounded-md ${status.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {status}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : '📤 Send Message'}
            </button>

            <button
              onClick={fetchContacts}
              disabled={loadingContacts}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loadingContacts ? 'Loading...' : `Refresh Contacts (${contacts.length})`}
            </button>

            <button
              onClick={() => {
                console.log('🐛 Debug Info:');
                console.log('- Contacts array:', contacts);
                console.log('- Loading state:', loadingContacts);
                console.log('- Selected contact:', selectedContact);
                alert(`Contacts: ${contacts.length}, Loading: ${loadingContacts}`);
              }}
              className="px-4 py-2 border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50"
            >
              Debug Info
            </button>

            <button
              onClick={() => setMessage('Hello! This is a test message from WhatsApp Bot.')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Use Template
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">🐛 Debug Information</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Contacts Count:</strong> {contacts.length}</p>
          <p><strong>Loading:</strong> {loadingContacts ? 'Yes' : 'No'}</p>
          <p><strong>Selected Contact:</strong> {selectedContact ? selectedContact.name : 'None'}</p>
          <p><strong>API Status:</strong> {status || 'No status'}</p>
          <p><strong>Last Update:</strong> {new Date().toLocaleTimeString()}</p>
        </div>
        {contacts.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-700">Available Contacts:</p>
            <ul className="text-xs text-gray-600 ml-2">
              {contacts.map((contact, index) => (
                <li key={`contact-list-${contact.number}-${contact.name}-${index}`}>• {contact.name} ({contact.number}) - {contact.spamCount} spam</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
