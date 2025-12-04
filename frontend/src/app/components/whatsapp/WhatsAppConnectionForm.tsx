'use client';

import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface WhatsAppStatus {
  connected: boolean;
  phoneNumber?: string;
  botId?: string;
  readyState?: string;
  qrCode?: string;
  profileName?: string;
  profilePicture?: string;
}

export default function WhatsAppConnectionForm() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [botId, setBotId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Check WhatsApp status on component mount
  useEffect(() => {
    checkWhatsAppStatus();
    // Check status every 5 seconds
    const interval = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Continuous QR code refresh when in scanning state
  useEffect(() => {
    if (!isScanning) return;

    console.log('🔄 Starting QR refresh polling...');
    
    const refreshQR = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/whatsapp/status`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': 'universal-api-key-2025'
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Update QR code if available
          if (data.data?.qrData?.qrImage) {
            setQrCode(data.data.qrData.qrImage);
            console.log('✅ QR code refreshed');
          }

          // Stop polling if connected
          if (data.data?.connected || data.data?.isReady) {
            console.log('✅ Connected! Stopping QR refresh');
            setIsScanning(false);
            setIsConnected(true);
            setQrCode(null);
            setConnectionStatus('Connected');
          }
        }
      } catch (error) {
        console.error('QR refresh error:', error);
      }
    };

    // Refresh QR every 3 seconds while scanning
    const interval = setInterval(refreshQR, 3000);
    
    return () => {
      console.log('🛑 Stopping QR refresh polling');
      clearInterval(interval);
    };
  }, [isScanning]);

  const checkWhatsAppStatus = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/whatsapp/status`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': 'universal-api-key-2025'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success) {
        const wasScanning = isScanning;
        const nowConnected = data.data.connected;
        
        setIsConnected(nowConnected);
        setPhoneNumber(data.data.phoneNumber);
        setBotId(data.data.botId);
        setProfileName(data.data.profileName);
        setProfilePicture(data.data.profilePicture);
        setConnectionStatus(data.data.readyState || 'Connected');
        
        // Stop QR refresh if connection established
        if (wasScanning && nowConnected) {
          console.log('✅ Connection detected, stopping QR refresh');
          setIsScanning(false);
          setQrCode(null);
        }
      } else {
        setConnectionStatus('Disconnected');
        setIsConnected(false);
        setIsScanning(false); // Stop scanning if disconnected
      }
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setConnectionStatus('ERROR');
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Start the WhatsApp bot
      const connectResponse = await fetch(`${API_BASE_URL}/whatsapp/connect`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': 'universal-api-key-2025'
        },
      });

      if (!connectResponse.ok) {
        // Try to parse response body to give a better error message
        let bodyText = '';
        try {
          const ct = connectResponse.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const json = await connectResponse.json();
            bodyText = JSON.stringify(json);
          } else {
            bodyText = await connectResponse.text();
          }
        } catch (e) {
          bodyText = '<unreadable response body>';
        }
        const msg = `HTTP ${connectResponse.status}: ${connectResponse.statusText} - ${bodyText}`;
        console.error('Connect failed:', msg);
        throw new Error(msg);
      }

      const connectData = await connectResponse.json();

      if (!connectData.success) {
        const serverMsg = connectData.message || connectData.error || JSON.stringify(connectData);
        console.error('Connect response indicates failure:', serverMsg);
        throw new Error(serverMsg || 'Failed to start WhatsApp bot');
      }

      // Step 2: Poll status until QR code is ready or timeout
      const maxRetries = 60; // 60 retries = 60 seconds max wait (increased for puppeteer init)
      const retryDelay = 1000; // 1 second between retries
      let qrReady = false;

      setConnectionStatus('🚀 Starting bot... Please wait (may take up to 60 seconds)');

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Checking QR status (attempt ${attempt}/${maxRetries})`);

          const statusResponse = await fetch(`${API_BASE_URL}/whatsapp/status`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-API-Key': 'universal-api-key-2025'
            },
          });
          if (!statusResponse.ok) {
            // Log body to help debug server-side 500s
            try {
              const ct = statusResponse.headers.get('content-type') || '';
              const body = ct.includes('application/json') ? await statusResponse.json() : await statusResponse.text();
              console.error(`⚠️ Status check failed (attempt ${attempt}): HTTP ${statusResponse.status}`, body);
            } catch (e) {
              console.error(`⚠️ Status check failed (attempt ${attempt}): HTTP ${statusResponse.status} (failed to read body)`);
            }
            continue;
          }

          const statusData = await statusResponse.json();

          if (statusData.success && statusData.data) {
            // Check if bot is already connected
            if (statusData.data.connected || statusData.data.isReady) {
              setConnectionStatus('Connected');
              setIsConnected(true);
              setQrCode(null);
              qrReady = true;
              break;
            }

            // Check if QR code is available
            if (statusData.data.qrData && statusData.data.qrData.qrImage) {
              setQrCode(statusData.data.qrData.qrImage);
              setConnectionStatus('QR Code Generated - Scan to connect');
              setIsConnected(false);
              setIsScanning(true); // Enable continuous QR refresh
              qrReady = true;
              break;
            }

            // Check if bot needs auth but no QR yet
            if (statusData.data.needsAuth) {
              setConnectionStatus(`⏳ Waiting for QR code... (${attempt}/${maxRetries}s)`);
            } else if (attempt < 20) {
              setConnectionStatus(`🔧 Bot initializing puppeteer... (${attempt}/${maxRetries}s)`);
            } else {
              setConnectionStatus(`⏳ Generating QR code... (${attempt}/${maxRetries}s)`);
            }
          }

          // Wait before next retry
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }

        } catch (statusError) {
          console.log(`⚠️ Status check error (attempt ${attempt}):`, statusError instanceof Error ? statusError.message : String(statusError));
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (!qrReady) {
        throw new Error('⏱️ Timeout: QR code not generated within 60 seconds. Bot may have failed to start. Please check: 1) Backend is running, 2) No firewall blocking, 3) Check wa-bot-error.log for details.');
      }

    } catch (error) {
      console.error('Connection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect');
      setConnectionStatus('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setError(null);
      setIsScanning(false); // Stop QR refresh polling
      const response = await fetch(`/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': 'universal-api-key-2025'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
        setQrCode(null);
        setPhoneNumber(null);
        setBotId(null);
        setProfileName(null);
        setProfilePicture(null);
        setConnectionStatus('Disconnected');
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      setError(error instanceof Error ? error.message : 'Failed to disconnect');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">🔗 WhatsApp Connection</h3>
        <p className="text-gray-600">Connect your WhatsApp account to start receiving messages</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-xl">❌</span>
            <div>
              <h4 className="text-red-800 font-medium">Connection Error</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-lg font-medium text-gray-800">Status: {connectionStatus}</span>
          </div>
          {isConnected && (
            <div className="text-sm text-gray-500">
              Bot ID: {botId || 'Unknown'}
            </div>
          )}
        </div>

        {isConnected && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 mb-4">
            <h4 className="text-green-800 font-semibold mb-3 flex items-center space-x-2">
              <span>✅</span>
              <span>Connected Account Information</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">👤</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {profileName || 'WhatsApp Account'}
                  </p>
                  <p className="text-xs text-green-600">
                    {phoneNumber ? `+${phoneNumber}` : 'Phone number not available'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Bot ID:</span> {botId}
                </p>
                <p className="text-sm text-green-700">
                  <span className="font-medium">Status:</span> {connectionStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>🔗</span>
                  <span>Connect WhatsApp</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <span>🔌</span>
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {qrCode && !isConnected && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <h4 className="text-lg font-semibold text-gray-800">📱 Scan QR Code</h4>
            {isScanning && (
              <span className="flex items-center space-x-1 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Auto-refreshing...</span>
              </span>
            )}
          </div>
          <div className="flex justify-center">
            <div className="bg-gray-100 p-4 rounded-lg relative">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="max-w-full h-auto"
                key={qrCode} // Force re-render when QR changes
              />
              {isScanning && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  🔄 Live
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 text-center mt-4">
            Open WhatsApp on your phone and scan this QR code to connect
          </p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> QR code akan refresh otomatis setiap 3 detik untuk sinkron dengan terminal.
              Scan menggunakan WhatsApp mobile app: WhatsApp → Settings → Linked Devices → Link a Device
            </p>
          </div>
          {isScanning && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 text-center">
                ✅ QR code auto-refresh aktif - Anda akan melihat QR yang sama dengan terminal
              </p>
            </div>
          )}
        </div>
      )}

      {isConnected && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-green-600 text-xl">✅</span>
            <h4 className="text-lg font-semibold text-green-800">Successfully Connected!</h4>
          </div>
          <div className="space-y-2 text-sm text-green-700">
            <p>📞 Phone: {phoneNumber ? `+${phoneNumber}` : 'Not available'}</p>
            <p>🤖 Bot ID: {botId || 'Not available'}</p>
            <p>👤 Profile: {profileName || 'Not available'}</p>
            <p>⚡ Ready to receive messages from backend API</p>
          </div>
        </div>
      )}
    </div>
  );
}
