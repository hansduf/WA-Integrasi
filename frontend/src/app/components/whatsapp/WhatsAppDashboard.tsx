'use client';

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

interface Contact {
  id: string;
  name: string;
  number: string;
  isBusiness: boolean;
  isMyContact: boolean;
  isBlocked: boolean;
  lastMessage: number;
  messageCount: number;
  spamCount: number;
  firstSeen?: string;
  lastSeen?: string;
  isGroup?: boolean;
  recentMessages?: number[];
}

interface Message {
  id: string;
  from: string;
  body: string;
  timestamp: number;
  type: string;
  isGroup: boolean;
  hasMedia: boolean;
  spam: boolean;
  spamReason: string | null;
  contact: Contact;
  processedAt: string;
  isSpam: boolean;
  contactDetails: Contact;
  content?: string; // Alternative field name from backend
  formattedTime?: string; // Pre-formatted timestamp from backend
  createdAt?: string;
}

interface WhatsAppData {
  messages: Message[];
  stats: {
    totalMessages: number;
    spamMessages: number;
    uniqueContacts: number;
    lastUpdate: string;
  };
  contacts: { [key: string]: Contact };
}

export default function WhatsAppDashboard() {
  const [data, setData] = useState<WhatsAppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [messagesPerPage, setMessagesPerPage] = useState(50);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'messages' | 'contacts'>('messages');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const fetchMessages = async () => {
    try {
      console.log('🔄 Fetching WhatsApp messages...');
      console.log('🔗 Using API client (credentials: include)');
      setLoading(true);
  const result = await api.get<WhatsAppData>('/whatsapp/messages');
      console.log('📦 API Response:', result);
      if (result.success && result.data) {
        console.log('✅ Setting data with', (result.data as WhatsAppData).messages?.length || 0, 'messages');
        console.log('📊 Stats:', (result.data as WhatsAppData).stats);
        setData(result.data as WhatsAppData);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('❌ Error fetching WhatsApp messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllMessages = async () => {
    try {
      setLoading(true);
      const result = await api.delete<WhatsAppData>('/whatsapp/messages');
      if (result.success && result.data) {
        setData(result.data);
        setShowDeleteConfirm(false);
      } else {
        throw new Error(result.message || 'Failed to delete messages');
      }
    } catch (err) {
      console.error('Error deleting WhatsApp messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete messages');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  const deleteContact = async () => {
    if (!contactToDelete) return;

    try {
      setLoading(true);
      // Call backend API to delete the contact
      const result = await api.delete<{ remainingMessages: number; messagesDeleted: number }>(`/whatsapp/contacts/${contactToDelete.number}`);

      if (result.success) {
        // Update local state to reflect the deletion
        if (data) {
          const updatedContacts = { ...data.contacts };
          delete updatedContacts[contactToDelete.number];

          setData({
            ...data,
            contacts: updatedContacts,
            stats: {
              ...data.stats,
              uniqueContacts: Object.keys(updatedContacts).length,
              totalMessages: result.data?.remainingMessages ?? data.stats.totalMessages,
              spamMessages: (result.data?.remainingMessages ?? data.stats.totalMessages) > 0 ? Math.floor((result.data?.remainingMessages ?? data.stats.totalMessages) * (data.stats.spamMessages / Math.max(data.stats.totalMessages,1))) : 0
            }
          });
        }

        console.log(`✅ Contact deleted: ${contactToDelete.name} - ${result.data?.messagesDeleted ?? 0} messages removed`);
      } else {
        throw new Error(result.error || 'Failed to delete contact');
      }

      setShowDeleteConfirm(false);
      setContactToDelete(null);
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 WhatsAppDashboard mounted, starting fetch...');
    fetchMessages();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh triggered');
      fetchMessages();
    }, 30000);
    return () => {
      console.log('🛑 Clearing interval');
      clearInterval(interval);
    };
  }, []);

  // Reset to first page when search or pagination settings change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, messagesPerPage, showAll]);

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Kesalahan Memuat Pesan</p>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={fetchMessages}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const messages = data?.messages || [];
  const stats = data?.stats || { totalMessages: 0, spamMessages: 0, uniqueContacts: 0, lastUpdate: '' };

  // Filter messages based on search term
  const filteredMessages = messages.filter(message => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const contactName = (message.contactDetails?.name || message.contact?.name || 'No Name').toLowerCase();
    const contactNumber = (message.contactDetails?.number || message.contact?.number || '').toLowerCase();
    const messageBody = (message.body || message.content || '').toLowerCase();
    return contactName.includes(term) || contactNumber.includes(term) || messageBody.includes(term);
  });

  console.log('📨 Messages:', messages.length, 'Filtered:', filteredMessages.length);

  // Get contacts data for statistics and deduplicate
  const contacts = data?.contacts || {};
  const contactsArray = Object.values(contacts).map(contact => ({
    ...contact,
    spamPercentage: contact.messageCount > 0 ? ((contact.spamCount || 0) / contact.messageCount * 100).toFixed(1) : '0.0'
  }));

  // Deduplicate contacts by number to prevent duplicate keys
  const uniqueContacts = contactsArray.reduce((acc, contact) => {
    const existingIndex = acc.findIndex(c => c.number === contact.number);
    if (existingIndex === -1) {
      acc.push(contact);
    } else {
      // Merge contact data if duplicate found
      acc[existingIndex] = {
        ...acc[existingIndex],
        messageCount: Math.max(acc[existingIndex].messageCount, contact.messageCount),
        spamCount: Math.max(acc[existingIndex].spamCount || 0, contact.spamCount || 0),
        lastSeen: new Date(Math.max(new Date(acc[existingIndex].lastSeen || new Date()).getTime(), new Date(contact.lastSeen || new Date()).getTime())).toISOString()
      };
    }
    return acc;
  }, [] as typeof contactsArray);

  // Sort contacts by message count (descending)
  const sortedContacts = uniqueContacts.sort((a, b) => b.messageCount - a.messageCount);

  // Filter contacts based on search term
  const filteredContacts = sortedContacts.filter(contact => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = contact.name.toLowerCase();
    const number = contact.number.toLowerCase();
    return name.includes(term) || number.includes(term);
  });

  // Pagination logic
  const effectiveMessagesPerPage = showAll ? filteredMessages.length : messagesPerPage;
  const totalPages = showAll ? 1 : Math.ceil(filteredMessages.length / messagesPerPage);
  const startIndex = (currentPage - 1) * messagesPerPage;
  const endIndex = showAll ? filteredMessages.length : startIndex + messagesPerPage;
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  return (
    <div className="p-6">
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <div className="flex gap-4">
          <span>Status: <strong className={loading ? 'text-yellow-600' : 'text-green-600'}>
            {loading ? 'Memuat...' : 'Siap'}
          </strong></span>
          <span>Data: <strong>{data ? 'Dimuat' : 'Tidak ada'}</strong></span>
          <span>Total: <strong>{stats.totalMessages || 0}</strong></span>
          <span>Difilter: <strong>{activeTab === 'messages' ? filteredMessages.length : filteredContacts.length}</strong></span>
          <span>Ditampilkan: <strong>{paginatedMessages.length}</strong></span>
          <span>Refresh Terakhir: <strong>{new Date().toLocaleTimeString('id-ID')}</strong></span>
        </div>
        {error && <div className="mt-2 text-red-600">Kesalahan: {error}</div>}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Pesan WhatsApp</h2>
        <div className="flex gap-6 text-sm">
          <span>Total: <strong>{stats.totalMessages}</strong></span>
          <span>Spam: <strong className="text-red-600">{stats.spamMessages}</strong></span>
          <span>Kontak: <strong>{stats.uniqueContacts}</strong></span>
          <span>Update Terakhir: <strong>{stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString('id-ID') : 'Belum pernah'}</strong></span>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'messages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📨 Pesan
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contacts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Kontak
            </button>
          </nav>
        </div>
      </div>

      <div className="mb-6 bg-gray-50 px-6 py-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <input
              type="text"
              placeholder={activeTab === 'messages' ? "🔍 Cari pesan..." : "🔍 Cari kontak..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMessages}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            {activeTab === 'messages' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md shadow-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Hapus Semua</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'messages' && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Contact</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Message</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Time</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMessages.length > 0 ? (
                  paginatedMessages.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2">
                        <div>
                          <div className={`font-medium text-sm ${message.spam ? 'text-red-600' : 'text-gray-900'}`}>
                            {message.contactDetails?.name || message.contact?.name || 'No Name Available'}
                          </div>
                          <div className="text-xs text-gray-500">{message.contactDetails?.number || message.contact?.number || message.from.split('@')[0]}</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="max-w-xs truncate text-sm">{message.body || message.content}</div>
                        {message.spamReason && (
                          <div className="text-xs text-red-600 mt-1">Reason: {message.spamReason}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-xs">
                        {message.formattedTime || 
                         (message.processedAt ? new Date(message.processedAt).toLocaleString() : 
                         message.timestamp ? new Date(message.timestamp * 1000).toLocaleString() : 
                         'Unknown')}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {message.spam ? (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">SPAM</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Clean</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-gray-300 px-4 py-8 text-center text-gray-500 text-sm">
                      {searchTerm ? 'Tidak ada pesan yang cocok dengan pencarian' : 'Tidak ada pesan ditemukan'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredMessages.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>Menampilkan</span>
                    <select
                      value={showAll ? 'all' : messagesPerPage.toString()}
                      onChange={(e) => {
                        if (e.target.value === 'all') {
                          setShowAll(true);
                        } else {
                          setShowAll(false);
                          setMessagesPerPage(Number(e.target.value));
                        }
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option key="10" value="10">10</option>
                      <option key="25" value="25">25</option>
                      <option key="50" value="50">50</option>
                      <option key="100" value="100">100</option>
                      <option key="all" value="all">Semua ({filteredMessages.length})</option>
                    </select>
                    <span>dari {filteredMessages.length} hasil</span>
                  </div>
                </div>

                {!showAll && totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      ‹ Sebelumnya
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm border rounded-md min-w-[40px] ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Selanjutnya ›
                    </button>

                    {/* Jump to page */}
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-sm text-gray-600">Ke halaman</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = Number(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const page = Number((e.target as HTMLInputElement).value);
                            if (page >= 1 && page <= totalPages) {
                              setCurrentPage(page);
                            }
                          }
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-600">dari {totalPages}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Contacts Statistics Table - Show when contacts tab is active */}
      {activeTab === 'contacts' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Kontak</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Total Pesan</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Spam</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedContacts.length > 0 ? (
                filteredContacts.map((contact, index) => (
                  <tr key={`contact-${contact.number}-${contact.name}-${contact.lastSeen}-${index}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3">
                      <div>
                        <div className="font-medium text-sm">{contact.name}</div>
                        <div className="text-xs text-gray-500">{contact.number}</div>
                        {contact.isGroup && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Grup
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium">
                      {contact.messageCount}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      <span className={`font-medium ${contact.spamCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {contact.spamCount || 0}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteContact(contact)}
                        className="text-red-600 hover:text-red-800 underline"
                        title={`Hapus kontak ${contact.name}`}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    {searchTerm ? 'Tidak ada kontak yang cocok dengan pencarian' : 'Tidak ada kontak ditemukan'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {contactToDelete ? `Hapus Kontak ${contactToDelete.name}` : 'Hapus Semua Pesan'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {contactToDelete
                    ? `Apakah Anda yakin ingin menghapus kontak ${contactToDelete.name} (${contactToDelete.number})? Semua pesan dari kontak ini akan dihapus.`
                    : 'Apakah Anda yakin ingin menghapus semua pesan WhatsApp? Tindakan ini tidak dapat dibatalkan.'
                  }
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setContactToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={contactToDelete ? deleteContact : deleteAllMessages}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Menghapus...' : (contactToDelete ? 'Hapus Kontak' : 'Hapus Semua')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
