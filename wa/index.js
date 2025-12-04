const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { execSync } = require('child_process');
require('dotenv').config();

// Load centralized config
// const config = require('../avevapi/config/index.js').config;

// Simple config for WhatsApp bot (to avoid module system conflicts)
// Priority for backend URL resolution:
// 1) Explicit API_BASE_URL env var
// 2) BACKEND_HOST / BACKEND_PORT (global)
// 3) Fallback to localhost:8001
const host = process.env.BACKEND_HOST || 'localhost';
const port = process.env.BACKEND_PORT || process.env.PORT || 8001;
const config = {
    server: {
        host,
        port
    }
};

// UNIVERSAL DATA SYSTEM INTEGRATION
// Allow explicit API_BASE_URL to fully override the computed host/port
const API_BASE_URL = process.env.API_BASE_URL || `http://${config.server.host}:${config.server.port}`;
console.log('🔗 WA bot / API_BASE_URL:', API_BASE_URL);
const API_KEY = process.env.API_KEY || 'universal-api-key-2025';
const PI_API_URL = `${API_BASE_URL}/pi/ask`;
const UPLOAD_URL = `${API_BASE_URL}/pi/upload`;

// Load AI triggers
let aiTriggers = [];
// AI connection status check removed - not needed for trigger matching

let previousAIStatus = null; // Track previous status to detect changes

const loadAISettings = async (silent = false) => {
  try {
    // Load AI triggers from database via API
    try {
      const triggersResponse = await axios.get(`${API_BASE_URL}/api/ai/triggers`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      // API response format: { success, data: [...], message }
      if (triggersResponse.data && triggersResponse.data.data && Array.isArray(triggersResponse.data.data)) {
        aiTriggers = triggersResponse.data.data;
        if (!silent) console.log(`🤖 Loaded ${aiTriggers.length} AI triggers from database`);
        if (!silent) aiTriggers.forEach(t => console.log(`   - Prefix: "${t.prefix}" → ${t.name}`));
      } else {
        if (!silent) console.log('🤖 No AI triggers found in database');
        aiTriggers = [];
      }
    } catch (triggerError) {
      if (!silent) console.warn('⚠️ Failed to load AI triggers from database:', triggerError.message);
      aiTriggers = [];
    }

    // AI connection status check removed - backend manages this internally
    // Bot only needs triggers, not connection status
  } catch (error) {
    if (!silent) console.error('❌ Error loading AI settings:', error.message);
    aiTriggers = [];
  }
};

// Spam frequency config - MUST BE LOADED FROM DATABASE ONLY
global.frequencyConfig = null; // Will be set from database or bot will refuse to work

const loadSpamConfig = async (silent = false) => {
  try {
    if (!silent) console.log('📖 Loading spam config from database via API...');
    
    // Load config from database via API
    const response = await axios.get(`${API_BASE_URL}/api/wa/spam/config`, {
      headers: { 'x-api-key': API_KEY },
      timeout: 5000
    });

    if (response.data.success && response.data.config) {
      // Remove verbose raw config logging
      // console.log('📥 Raw config from database API:', response.data.config);
      
      // STRICT: All values must come from database, no fallbacks
      if (!response.data.config.warningMessage) {
        throw new Error('Database ERROR: warningMessage is required but not found in database');
      }
      
      global.frequencyConfig = {
        windowSeconds: response.data.config.windowSeconds,
        maxMessagesPerWindow: response.data.config.maxMessagesPerWindow,
        warningThreshold: response.data.config.warningThreshold,
        warningMessage: response.data.config.warningMessage,
        cooldownMinutes: response.data.config.cooldownMinutes
      };
      
      if (!silent) {
        console.log('✅ Spam frequency config loaded from database (DATABASE-ONLY MODE)');
        // Remove detailed config logging
        // console.log('🔍 WARNING MESSAGE FROM DATABASE:', global.frequencyConfig.warningMessage);
      }
    } else {
      throw new Error('Database ERROR: Failed to load spam config from database - bot cannot operate without database config');
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR: Cannot load spam config from database:', error.message);
    console.error('🚨 BOT CANNOT OPERATE WITHOUT DATABASE - STOPPING SPAM CONFIG LOAD');
    throw new Error(`DATABASE DEPENDENCY FAILED: ${error.message}`);
  }
};

// Reload spam config function (for hot reload from database)
async function reloadFrequencyConfig() {
  try {
    // Silent reload - log only on startup or errors
    // console.log('🔄 Reloading spam config from database...');
    
    // Load fresh config from database via API
    const response = await axios.get(`${API_BASE_URL}/api/wa/spam/config`, {
      headers: { 'x-api-key': API_KEY },
      timeout: 5000
    });

    if (!response.data.success) {
      throw new Error('API response unsuccessful');
    }

    const config = response.data.config;
    
    // Validate config (API should already validate, but double-check)
    if (config.windowSeconds < 3 || config.windowSeconds > 10) {
      throw new Error('windowSeconds must be between 3-10');
    }
    if (config.maxMessagesPerWindow < 1 || config.maxMessagesPerWindow > 5) {
      throw new Error('maxMessagesPerWindow must be between 1-5');
    }
    if (config.warningThreshold < 2 || config.warningThreshold > 10) {
      throw new Error('warningThreshold must be between 2-10');
    }
    if (!config.warningMessage || config.warningMessage.length === 0 || config.warningMessage.length > 500) {
      throw new Error('warningMessage must be between 1-500 characters');
    }
    
    // Apply new config
    global.frequencyConfig = {
      windowSeconds: config.windowSeconds,
      maxMessagesPerWindow: config.maxMessagesPerWindow,
      warningThreshold: config.warningThreshold,
      warningMessage: config.warningMessage,
      cooldownMinutes: config.cooldownMinutes || 1
    };
    
    // Silent reload - only log on errors or startup
    // console.log('✅ Frequency settings reloaded from database:', global.frequencyConfig);
    
    return { success: true, config: global.frequencyConfig };
  } catch (error) {
    console.error('❌ Config reload from database failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Auto warning function for high-level spam
// Track last warning sent to each contact (cooldown mechanism)
const warningCooldown = new Map();

async function sendAutoWarning(to, warningMessage) {
  try {
    // CRITICAL: Must have database config loaded
    if (!global.frequencyConfig) {
      console.error('🚨 [AUTO WARNING] Cannot send warning - database config not loaded');
      return;
    }

    // Check cooldown from database config (DATABASE-ONLY MODE)
    const cooldownMs = global.frequencyConfig.cooldownMinutes * 60 * 1000;
    const now = Date.now();
    const lastWarningTime = warningCooldown.get(to);

    if (lastWarningTime && (now - lastWarningTime) < cooldownMs) {
      console.log(`⏱️  [AUTO WARNING] Cooldown active for ${to.split('@')[0]} (${Math.round((cooldownMs - (now - lastWarningTime)) / 1000)}s remaining)`);
      return; // Skip sending if still in cooldown
    }

    // Queue message via API
    try {
      const response = await axios.post(`${API_BASE_URL}/api/messages/outgoing`, {
        recipient: to,
        message: warningMessage,
        type: 'auto_warning'
      }, {
        headers: { 'x-api-key': API_KEY },
        timeout: 5000
      });

      if (response.data.success) {
        // Update cooldown tracker
        warningCooldown.set(to, now);
        console.log(`🚨 [AUTO WARNING] Queued warning message for ${to.split('@')[0]} (cooldown: ${global.frequencyConfig.cooldownMinutes}m)`);
      } else {
        console.error('❌ [AUTO WARNING] API error:', response.data.error);
      }
    } catch (apiError) {
      console.error('❌ [AUTO WARNING] Failed to queue via API:', apiError.message);
    }

  } catch (error) {
    console.error('❌ Error sending auto warning:', error.message);
  }
}

// Initial load (silent mode) - MUST wait for triggers to load
(async () => {
  await loadAISettings(true); // ✅ Await to ensure triggers are loaded before bot processes messages
  await loadSpamConfig(true); // silent = true
})();

// Set up periodic config refresh (every 30 seconds)
setInterval(async () => {
  try {
    await reloadFrequencyConfig();
  } catch (error) {
    console.error('❌ Periodic config refresh failed:', error.message);
  }
}, 30000);

// Note: AI connection status polling removed - not needed
// Bot trigger matching doesn't depend on connection status
// Backend manages AI connection internally

console.log('==============================');
console.log('🚀 WhatsApp Bot UNIVERSAL DATA SYSTEM Starting...');
console.log('Mode: UNIVERSAL DATA INTEGRATION');
console.log('Start time:', new Date().toLocaleString());
console.log('==============================');

const processedMessages = new Set();
let isClientReady = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3; // Reduced from 5 for faster recovery

// Status file for API communication
const STATUS_FILE = './.status/whatsapp-status.json';
// Track initialization state
let isInitializing = false;

const updateStatusFile = () => {
    // Get existing QR data from API if exists
    let existingQrData = null;
    try {
        // Call backend API to get current status
        const statusResponse = axios.get(`${API_BASE_URL}/whatsapp/status`);
        // This is async but we're in sync function, so skip for now
    } catch (error) {
        // Ignore error
    }
    
    // Update database via API call
    try {
        axios.post(`${API_BASE_URL}/whatsapp/status/update`, {
            is_ready: isClientReady,
            is_initializing: isInitializing,
            bot_number: botNumber,
            phone_number: client?.info?.me?.user || null,
            bot_id: client?.info?.me?._serialized || null,
            last_update: new Date().toISOString(),
            reconnect_attempts: reconnectAttempts
        }).catch(err => {
            console.error('⚠️ Failed to update status via API:', err.message);
        });
    } catch (error) {
        console.error('❌ Failed to update WhatsApp status:', error.message);
    }
    
    // Also write to filesystem for backward compatibility
    try {
        const status = {
            isReady: isClientReady,
            isInitializing: isInitializing,
            botNumber: botNumber,
            phoneNumber: client?.info?.me?.user || null,
            botId: client?.info?.me?._serialized || null,
            lastUpdate: new Date().toISOString(),
            reconnectAttempts: reconnectAttempts
        };
        
        const statusDir = './.status';
        if (!fs.existsSync(statusDir)) {
            fs.mkdirSync(statusDir, { recursive: true });
        }
        
        fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    } catch (error) {
        console.error('❌ Failed to update status file:', error.message);
    }
};

// Simple Puppeteer config - minimal args to avoid Session closed error
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: { 
        args: [
            '--no-sandbox',
            '--disable-gpu',
            '--disable-web-resources',
            '--disable-extensions'
        ],
        headless: 'new',
        timeout: 150000
    },
    authTimeoutMs: 150000,
    restartOnAuthFail: true,
    qrTimeoutMs: 120000
});

let botNumber = null;

// QR Code generation
client.on('qr', async (qr) => {
    console.log('📱 Scan this QR code to connect:');
    qrcode.generate(qr, { small: true });
    
    try {
        // Generate QR code as base64 image for frontend
        const qrImage = await QRCode.toDataURL(qr, { 
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        // Save QR code data to database AND file
        const qrData = {
            qrString: qr,
            qrImage: qrImage,
            qrGeneratedAt: new Date().toISOString(),
            needsAuth: true
        };
        
        // Write to database via API (PRIORITY)
        axios.post(`${API_BASE_URL}/whatsapp/status/update`, {
            is_ready: isClientReady,
            is_initializing: isInitializing,
            bot_number: botNumber,
            phone_number: client?.info?.me?.user || null,
            bot_id: client?.info?.me?._serialized || null,
            qr_data: JSON.stringify(qrData),
            last_update: new Date().toISOString(),
            reconnect_attempts: reconnectAttempts
        }).then(response => {
            console.log('✅ QR code saved to database via API');
        }).catch(apiError => {
            console.error('❌ Failed to save QR via API:', apiError.response?.status, apiError.message);
        });
        
        // Also write to file for backward compatibility
        try {
            const status = {
                isReady: isClientReady,
                botNumber: botNumber,
                phoneNumber: client?.info?.me?.user || null,
                botId: client?.info?.me?._serialized || null,
                lastUpdate: new Date().toISOString(),
                reconnectAttempts: reconnectAttempts,
                qrData: qrData
            };
            
            const statusDir = './.status';
            if (!fs.existsSync(statusDir)) {
                fs.mkdirSync(statusDir, { recursive: true });
            }
            
            fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
            console.log('✅ QR code saved to file');
        } catch (fileError) {
            console.error('❌ Failed to save QR to file:', fileError.message);
        }
        
    } catch (error) {
        console.error('❌ Failed to generate QR code for frontend:', error.message);
        updateStatusFile(); // Fallback to regular status update
    }
});

// Authentication events
client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated successfully');
    
    // Clear QR data from database since authentication is successful
    try {
        axios.post(`${API_BASE_URL}/whatsapp/status/update`, {
            is_ready: isClientReady,
            is_initializing: isInitializing,
            bot_number: botNumber,
            phone_number: client?.info?.me?.user || null,
            bot_id: client?.info?.me?._serialized || null,
            qr_data: null, // Clear QR
            last_update: new Date().toISOString(),
            reconnect_attempts: reconnectAttempts
        }).then(response => {
            console.log('✅ QR data cleared from database');
        }).catch(apiError => {
            console.error('⚠️ Failed to clear QR from API:', apiError.message);
        });
    } catch (error) {
        console.error('❌ Failed to clear QR from database:', error.message);
    }
    
    // Also clear from file for backward compatibility
    try {
        if (fs.existsSync(STATUS_FILE)) {
            const status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
            delete status.qrData;
            fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
        }
    } catch (error) {
        console.error('❌ Failed to clear QR from file:', error.message);
    }
    updateStatusFile(); // Update status file
    // Add timeout to detect if ready event doesn't fire
    setTimeout(() => {
        if (!isClientReady) {
            console.log('⚠️ Client authenticated but not ready after 45 seconds');
            console.log('💡 This might indicate a stuck connection');
        }
    }, 45000);
});

client.on('change_state', (state) => {
    console.log('🔄 Connection state changed to:', state);
    updateStatusFile(); // Update status file
});

client.on('change_battery', (batteryInfo) => {
    console.log('🔋 Phone battery:', batteryInfo.battery + '%', batteryInfo.plugged ? '(charging)' : '(not charging)');
    updateStatusFile(); // Update status file
});

client.on('ready', () => {
    botNumber = client.info.me._serialized;
    isClientReady = true;
    reconnectAttempts = 0;
    updateStatusFile(); // Update status file
    console.log('');
    console.log('🎉🎉🎉 SUCCESS! WhatsApp Bot AVEVA PI is READY! 🎉🎉🎉');
    console.log('✅ Status: CONNECTED & ACTIVE');
    console.log('🤖 Bot ID:', botNumber);
    console.log('📞 Bot Number:', client.info.me.user);
    console.log('⚡ Ready to receive messages!');
    console.log('🔗 Backend API:', PI_API_URL);
    console.log('==========================================');
});

client.on('auth_failure', (msg) => {
    console.log('❌ Authentication failed:', msg);
    console.log('🔄 Please scan the QR code again...');
    isClientReady = false;
    updateStatusFile(); // Update status file
});

// Disconnection handling
client.on('disconnected', async (reason) => {
    console.log('📵 Client disconnected. Reason:', reason);
    isClientReady = false;
    updateStatusFile(); // Update status file
    
    // Only auto-reconnect if it's not a logout
    if (reason !== 'LOGOUT') {
        console.log('🔄 Attempting to reconnect...');
        await handleReconnect();
    } else {
        console.log('🚪 Client logged out. Clearing sessions and restarting bot...');
        
        // 🔧 FIX: Destroy client gracefully instead of killing all Chrome processes
        // Previous approach killed ALL Chrome instances including user's browser
        try {
            console.log('� Destroying WhatsApp client gracefully...');
            if (client && client.pupBrowser) {
                await client.destroy();
                console.log('✅ WhatsApp client destroyed');
            }
        } catch (destroyError) {
            console.log('⚠️ Error destroying client:', destroyError.message);
            // Fallback: Only kill if destroy fails AND we can identify the specific PID
            // NOTE: We no longer use taskkill /IM chrome.exe as it kills ALL Chrome instances
        }
        
        // Wait for file handles to be released
        console.log('⏳ Waiting 3 seconds for file handles to release...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to clean up session with enhanced retry logic
        try {
            const sessionDirs = ['./sessions', './.wwebjs_auth', './.wwebjs_cache'];
            for (const dir of sessionDirs) {
                try {
                    if (fs.existsSync(dir)) {
                        await removeDirectoryWithRetry(dir, 5);
                    }
                } catch (dirError) {
                    console.log(`⚠️ Could not fully remove ${dir}: ${dirError.message}`);
                }
            }
        } catch (cleanupError) {
            console.log('⚠️ Session cleanup had issues:', cleanupError.message);
        }
        
        console.log('♻️ Bot will restart in 2 seconds...');
        console.log('🔄 Reinitializing client...');
        
        // Don't exit, just restart the client
        setTimeout(() => {
            console.log('� Restarting WhatsApp client initialization...');
            isClientReady = false;
            isInitializing = false;
            client.initialize().catch(error => {
                console.error('❌ Failed to reinitialize after logout:', error.message);
                console.log('💡 Restarting process...');
                process.exit(0);
            });
        }, 2000);
    }
});

// Helper function to remove directory with retry logic
async function removeDirectoryWithRetry(dirPath, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Wait progressively longer before retry
            if (attempt > 1) {
                const waitTime = 2000 * attempt; // 2s, 4s, 6s, 8s, 10s
                console.log(`⏳ Waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            console.log(`🗑️ Attempting to remove ${dirPath} (attempt ${attempt}/${maxRetries})...`);
            
            // Try multiple removal strategies
            if (fs.existsSync(dirPath)) {
                // Strategy 1: Try fs.rmSync with aggressive retry
                try {
                    fs.rmSync(dirPath, { 
                        recursive: true, 
                        force: true, 
                        maxRetries: 5, 
                        retryDelay: 2000 
                    });
                    console.log(`✅ Successfully removed ${dirPath}`);
                    return; // Success
                } catch (rmsyncError) {
                    // Strategy 2: Try manual recursive deletion for stubborn files
                    if (rmsyncError.code === 'EBUSY' && attempt < maxRetries) {
                        console.log(`⚠️ EBUSY on ${dirPath}, trying manual file-by-file removal...`);
                        try {
                            await removeFilesRecursively(dirPath);
                            console.log(`✅ Successfully removed ${dirPath} (manual method)`);
                            return; // Success
                        } catch (manualError) {
                            throw rmsyncError; // Use original error
                        }
                    }
                    throw rmsyncError;
                }
            } else {
                console.log(`✅ ${dirPath} already removed`);
                return; // Already removed
            }
        } catch (error) {
            console.log(`⚠️ Retry ${attempt}/${maxRetries} for ${dirPath}: ${error.message}`);
            
            if (attempt === maxRetries) {
                console.error(`❌ Failed to remove ${dirPath} after ${maxRetries} attempts`);
                console.log(`💡 Manual cleanup required: Delete "${path.resolve(dirPath)}" manually`);
                // Don't throw - allow bot to continue cleanup of other dirs
                return;
            }
        }
    }
}

// Manual recursive file deletion for stubborn directories
async function removeFilesRecursively(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            // Recursively remove subdirectory
            await removeFilesRecursively(fullPath);
            try {
                fs.rmdirSync(fullPath);
            } catch (err) {
                // Ignore errors on directory removal, try again later
            }
        } else {
            // Remove file with retry
            for (let i = 0; i < 3; i++) {
                try {
                    fs.unlinkSync(fullPath);
                    break; // Success
                } catch (err) {
                    if (i === 2) {
                        // Skip this file if it's really locked
                        console.log(`⚠️ Skipping locked file: ${fullPath}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    }
    
    // Try to remove the directory itself
    try {
        fs.rmdirSync(dirPath);
    } catch (err) {
        // If still not empty, try rmSync as final attempt
        try {
            fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
        } catch (finalErr) {
            throw finalErr;
        }
    }
}

// Message handling - relay semua ke backend
client.on('message', async message => {
    if (!isClientReady) {
        console.log('⏸️ Client not ready, skipping message');
        return;
    }
    
    updateStatusFile(); // Update status file on message activity
    
    try {
        const messageId = `${message.id._serialized}_${message.timestamp}_${message.from}`;
        if (processedMessages.has(messageId)) return;
        
        processedMessages.add(messageId);
        if (processedMessages.size > 1000) {
            const oldMessages = Array.from(processedMessages).slice(0, 500);
            oldMessages.forEach(id => processedMessages.delete(id));
        }
        
        if (message.isStatus || message.from === botNumber) return;
        
        const isGroup = message.from.endsWith('@g.us');
        // For group messages, use the actual sender's JID from message.author
        const sender = isGroup && message.author ? message.author : message.from;
        
        console.log('📨 New message received from:', sender.split('@')[0]);
        console.log('💬 Message:', message.body);
        
        // Save message data to SQLite database via API
        const apiSuccess = await saveMessageDataToAPI(message, sender, isGroup);
        if (!apiSuccess) {
            console.log('❌ Failed to save message to database');
        }
        
        if (isGroup) {
            const mentions = await message.getMentions();
            const botNum = client.info.me.user;
            const isBotMentioned = mentions.some(contact => contact.number === botNum);
            if (!isBotMentioned) {
                console.log('👥 Group message but bot not mentioned, skipping');
                return;
            }
            console.log('� Group message with bot mention, processing...');
        }
        
        await handleMessage(message, sender, isGroup);
    } catch (error) {
        console.error('❌ Error handling message:', error);
        if (isClientReady) {
            try {
                await message.reply('😅 Maaf, terjadi kesalahan. Silakan coba lagi.');
            } catch (replyError) {
                console.error('❌ Failed to send error reply:', replyError);
            }
        }
    }
});

async function handleMessage(message, sender, isGroup = false) {
    let messageBody = message.body.trim();

    // Remove bot mention from group messages ONLY (keep other @ symbols)
    // Bot mention looks like: @256817720475733 or @USERNAME (at word boundary)
    const botMentionPattern = /@256817720475733\b|@\d+\b/g;
    messageBody = messageBody.replace(botMentionPattern, '').trim();

    // 🔍 AI TRIGGER CHECKING - Find best matching trigger by prefix
    // Use longest prefix match to handle cases like "+ai=" vs "+"
    let triggerMatched = false;
    let bestMatchTrigger = null;
    let bestMatchLength = 0;

    for (const aiTrigger of aiTriggers) {
      if (aiTrigger.enabled && messageBody.startsWith(aiTrigger.prefix)) {
        // Use longest prefix match (to prefer "+ai=" over "+" if both exist)
        if (aiTrigger.prefix.length > bestMatchLength) {
          bestMatchTrigger = aiTrigger;
          bestMatchLength = aiTrigger.prefix.length;
        }
      }
    }

    if (bestMatchTrigger) {
      console.log(`🤖 AI Trigger matched: "${bestMatchTrigger.prefix}" for trigger "${bestMatchTrigger.name}"`);
      triggerMatched = true;
      
      try {
        // Extract message content after prefix (remove trailing spaces after prefix)
        const aiMessage = messageBody.substring(bestMatchTrigger.prefix.length).trim();
          
          if (!aiMessage) {
            await message.reply('🤖 Silakan tulis pesan setelah prefix AI (contoh: =halo ai)');
            return;
          }

          // Forward to AI API
          const aiResponse = await axios.post(`${API_BASE_URL}/api/ai/chat`, {
            message: aiMessage,
            triggerId: bestMatchTrigger.id,
            sender: sender
          }, {
              timeout: 30000, // 30 second timeout for AI
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': API_KEY
                            }
            });

            if (aiResponse.data && aiResponse.data.success && aiResponse.data.response) {
              let responseText = aiResponse.data.response;
              
              // Handle both string and object formats from backend
              if (typeof responseText === 'object' && responseText !== null && 'output_text' in responseText) {
                responseText = responseText.output_text;
              }
              
              // Ensure it's a string before replying
              responseText = String(responseText || '🤖 Maaf, respons AI kosong.');
              
              await message.reply(responseText);
              console.log('✅ AI response sent successfully:', responseText.substring(0, 50) + '...');
              
              // ✅ Note: Trigger usage count is updated server-side via /api/ai/chat endpoint
              // No need to call /api/ai/triggers/:id/usage here to avoid double-increment
            } else {
              await message.reply('🤖 Maaf, AI sedang tidak dapat memproses pesan Anda. Coba lagi nanti.');
            }
            
            return; // Exit after AI processing
            
                    } catch (error) {
                        // Include response status/body when available to aid debugging (e.g. 401)
                        try {
                            if (error.response) {
                                const status = error.response.status;
                                let body = null;
                                try { body = JSON.stringify(error.response.data); } catch (_) { body = String(error.response.data); }
                                console.error('❌ AI API error:', `status=${status}`, body);
                            } else {
                                console.error('❌ AI API error:', error.message);
                            }
                        } catch (logErr) {
                            console.error('❌ AI API error (and failed to log response):', logErr.message);
                        }
                        await message.reply('🤖 Maaf, AI sedang mengalami gangguan. Silakan coba lagi nanti.');
                        return;
                    }
    }
    
    // If no AI trigger matched, process as normal message    // UNIVERSAL DATA SYSTEM: Handle data requests
    const normalizedMessage = messageBody.toLowerCase().trim();

    // Handle special commands
    if (normalizedMessage === 'halo' || normalizedMessage === 'help' || normalizedMessage === 'menu') {
        try {
            const response = await axios.post(`${API_BASE_URL}/pi/ask`, {
                message: messageBody
            });
            await message.reply(response.data.answer);
            return;
        } catch (error) {
            console.error('❌ API error:', error.message);
            await message.reply('❌ Sistem sedang mengalami gangguan. Silakan coba lagi.');
            return;
        }
    }

    // Handle data queries - relay to universal backend
    try {
        console.log('📊 UNIVERSAL DATA REQUEST:', normalizedMessage);

        const response = await axios.post(`${API_BASE_URL}/pi/ask`, {
            message: messageBody
        });

        if (response.data && response.data.answer) {
            await message.reply(response.data.answer);
            console.log('✅ Universal data response sent successfully');
        } else {
            await message.reply('❌ Tidak ada data ditemukan untuk permintaan tersebut.');
        }
        return;
    } catch (error) {
        console.error('❌ Universal API error:', error.message);
        await message.reply('❌ Gagal mengambil data. Sistem sedang mengalami gangguan.');
        return;
    }

    // Handle file uploads
    if (message.hasMedia) {
        return await handleFileUpload(message, sender);
    }
    
    try {
        const piApiUrl = PI_API_URL;
        console.log('--- Relay to AVEVAPI ---');
        console.log('Endpoint:', piApiUrl);
        console.log('Sender:', sender);
        console.log('Message:', message.body);

        // Semua pesan (termasuk !update, update trigger, halo, dsb) di-relay ke backend 
        // agar logic tetap terpusat di backend
        const response = await axios.post(piApiUrl, {
            message: message.body,
            sender: sender
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('AVEVAPI Response:', response.data);
        if (response.data && response.data.answer && isClientReady) {
            await message.reply(response.data.answer);
        }
        // Jika tidak ada answer, bot tidak membalas apa pun
    } catch (err) {
        console.error('PI relay handler error:', err.message);
        if (isClientReady) {
            try {
                await message.reply('❌ Gagal menghubungi backend.');
            } catch (replyError) {
                console.error('❌ Failed to send backend error reply:', replyError);
            }
        }
    }
}

// Note: Local JSON storage removed - all data now saved to SQLite database via API

async function handleFileUpload(message, sender) {
    if (!isClientReady) return;
    
    try {
        await message.reply('📁 Sedang memproses file...');
        const media = await message.downloadMedia();
        if (!media) {
            return await message.reply('❌ Gagal mengunduh file.');
        }
        
        const fileBuffer = Buffer.from(media.data, 'base64');
        const form = new FormData();
        form.append('file', fileBuffer, {
            filename: `wa_upload_${Date.now()}`,
            contentType: media.mimetype
        });
        form.append('sender', sender);
        
        const piApiUrl = UPLOAD_URL;
        const uploadResponse = await axios.post(piApiUrl, form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000
        });
        
        const successText = `✅ *File berhasil diupload ke AVEVA PI!*\n📄 Filename: ${uploadResponse.data.filename || '-'}\n� Status: ${uploadResponse.data.status || '-'}\n`;
        if (isClientReady) {
            await message.reply(successText);
        }
    } catch (error) {
        console.error('File upload error:', error);
        if (isClientReady) {
            try {
                await message.reply('❌ Gagal mengupload file ke backend.');
            } catch (replyError) {
                console.error('❌ Failed to send upload error reply:', replyError);
            }
        }
    }
}

async function handleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached. Please restart manually.');
        console.error('');
        console.error('💡 Manual recovery steps:');
        console.error('1. Stop the bot process (Ctrl+C)');
        console.error('2. Delete session folder: del /s /q sessions\\');
        console.error('3. Restart bot: npm run dev');
        console.error('');
        console.error('⚠️ WARNING: Do NOT use "taskkill /F /IM chrome.exe" as it will');
        console.error('   close ALL Chrome windows including your personal browser!');
        updateStatusFile(); // Update status file
        return;
    }
    
    reconnectAttempts++;
    updateStatusFile(); // Update status file
    const delay = reconnectAttempts * 5000; // Progressive delay
    console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay/1000} seconds...`);
    
    setTimeout(async () => {
        try {
            await client.destroy();
        } catch (error) {
            console.log('⚠️ Error destroying client:', error.message);
        }
        
        // Clean up corrupted cache files on reconnect
        console.log('🧹 Cleaning up before reconnect...');
        try {
            const lockFile = path.join('./sessions/Default', 'SingletonLock');
            if (fs.existsSync(lockFile)) {
                fs.rmSync(lockFile, { force: true });
                console.log('✅ Removed stale lock file');
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        
        setTimeout(() => {
            initializeClient();
        }, 2000);
    }, delay);
}

async function initializeClient() {
    try {
        console.log('⚡ Initializing WhatsApp client...');
        console.log('🔄 Please wait while connecting to WhatsApp servers...');
        isInitializing = true;
        updateStatusFile(); // Update status file with initializing flag
        
        // Check if session is corrupted before initialization
        const sessionPath = './sessions';
        if (fs.existsSync(sessionPath)) {
            // Check for corrupted session files
            const lockFile = path.join(sessionPath, 'Default', 'SingletonLock');
            if (fs.existsSync(lockFile)) {
                console.log('🔍 Found stale session lock file - cleaning up...');
                try {
                    fs.rmSync(lockFile, { force: true });
                    console.log('✅ Removed stale lock file');
                } catch (e) {
                    console.warn('⚠️ Could not remove lock file:', e.message);
                }
            }
        }
        
        // Simplified initialization without complex timeout handling
        await client.initialize();
        
        isInitializing = false;
        updateStatusFile(); // Clear initializing flag
        
    } catch (error) {
        isInitializing = false;
        console.error('❌ Failed to initialize client:', error.message);
        
        // Handle specific error types
        if (error.message.includes('Failed to launch the browser process')) {
            console.log('🔴 CRITICAL: Browser process failed to launch!');
            console.log('');
            console.log('⚠️  Troubleshooting steps:');
            console.log('1. ✅ Check if Chrome/Chromium is installed');
            console.log('   - Windows: Check C:\\Program Files\\Google\\Chrome');
            console.log('   - Or install from: https://www.google.com/chrome');
            console.log('');
            console.log('2. ✅ Free up memory and resources');
            console.log('   - Close other browser windows');
            console.log('   - Restart your computer if needed');
            console.log('');
            console.log('3. ✅ Clear WhatsApp cache');
            console.log('   - Delete ./sessions folder');
            console.log('   - Restart bot');
            console.log('');
            console.log('4. ✅ Run as Administrator');
            console.log('   - Right-click cmd.exe → Run as Administrator');
            console.log('   - Run: npm run dev');
            console.log('');
            
            // Try to provide more details
            console.log('🔧 Additional info:');
            console.log('   Node version:', process.version);
            console.log('   Platform:', process.platform);
            console.log('   Architecture:', process.arch);
            console.log('   Available memory:', Math.round(require("os").freemem() / 1024 / 1024), 'MB');
        } else if (error.message.includes('Protocol error') || error.message.includes('Session closed')) {
            console.log('🔴 Protocol error - Session was closed unexpectedly');
            console.log('');
            console.log('⚠️  This usually means:');
            console.log('1. Browser crashed during initialization');
            console.log('2. System ran out of memory');
            console.log('3. Session data is corrupted');
            console.log('');
            console.log('💡 AUTO-FIX: Cleaning corrupted sessions...');
            
            // Attempt auto-cleanup
            try {
                const sessionDirs = ['./sessions', './.wwebjs_auth', './.wwebjs_cache'];
                for (const dir of sessionDirs) {
                    if (fs.existsSync(dir)) {
                        console.log(`   Removing ${dir}...`);
                        fs.rmSync(dir, { recursive: true, force: true });
                    }
                }
                console.log('✅ Session cleanup completed - will retry');
            } catch (cleanupError) {
                console.log('⚠️ Auto-cleanup failed:', cleanupError.message);
            }
        } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
            console.log('⏰ Connection timeout - WhatsApp servers may be slow');
            console.log('');
            console.log('💡 Common causes:');
            console.log('   1. WhatsApp servers are experiencing issues');
            console.log('   2. Network connectivity problems');
            console.log('   3. Firewall blocking connection');
            console.log('');
            console.log('💡 Solution: Retry automatically...');
        }
        
        updateStatusFile(); // Update status file
        await handleReconnect();
    }
}

// Error handling
client.on('error', (error) => {
    console.error('❌ WhatsApp client error:', error);
    updateStatusFile(); // Update status file
});

// Enhanced error handling
process.on('unhandledRejection', (error) => {
    // Suppress noisy errors during shutdown
    if (error.message && (
        error.message.includes('Protocol error') ||
        error.message.includes('Target closed') ||
        error.message.includes('Session closed') ||
        error.message.includes('getResponseBody')
    )) {
        // Silently ignore - these are normal during shutdown
        return;
    }
    
    console.error('❌ Unhandled promise rejection:', error.message);
    
    // Check if it's EBUSY error
    if (error.message && error.message.includes('EBUSY')) {
        console.log('💡 EBUSY error detected - file/directory is locked');
        console.log('💡 This is usually harmless - Windows is still releasing file handles');
        console.log('💡 The process will continue...');
        return;
    }
});

process.on('uncaughtException', (error) => {
    // Suppress noisy errors during shutdown
    if (error.message && (
        error.message.includes('Protocol error') ||
        error.message.includes('Target closed') ||
        error.message.includes('Session closed')
    )) {
        return; // Silently ignore
    }
    
    console.error('❌ Uncaught exception:', error.message);
    
    // Check if it's EBUSY error
    if (error.message && error.message.includes('EBUSY')) {
        console.log('💡 EBUSY error detected - file/directory is locked');
        console.log('💡 Continuing operation...');
        return;
    }
});

// Message data saving function for dashboard - MIGRATED TO DATABASE API
async function saveMessageDataToAPI(message, sender, isGroup) {
    console.log('📤 [API] Starting to save message data to API...');
    try {
        // Get contact information - for group messages, get the actual sender's contact
        let contactInfo = null;
        try {
            let contact;
            if (isGroup && message.author) {
                // For group messages, get the contact of the actual sender
                contact = await client.getContactById(message.author);
            } else {
                // For private messages, use the regular method
                contact = await message.getContact();
            }
            contactInfo = {
                id: contact.id._serialized,
                name: contact.name || contact.pushname || contact.number || 'Unknown',
                number: contact.number,
                isBusiness: contact.isBusiness || false,
                isEnterprise: contact.isEnterprise || false,
                verifiedName: contact.verifiedName || null,
                isMyContact: contact.isMyContact !== undefined ? contact.isMyContact : false,
                isBlocked: contact.isBlocked || false
            };
        } catch (error) {
            console.error('❌ Error getting contact info:', error.message);
            // Fallback contact info
            contactInfo = {
                id: sender,
                name: 'Unknown',
                number: sender.split('@')[0],
                isBusiness: false,
                isEnterprise: false,
                verifiedName: null,
                isMyContact: false,
                isBlocked: false
            };
        }

        // Spam detection based on message frequency (DATABASE-ONLY MODE)
        const now = Date.now();
        
        // CRITICAL: Must have database config loaded
        if (!global.frequencyConfig) {
            console.error('🚨 CRITICAL: Spam config not loaded from database - attempting to reload...');
            try {
                await loadSpamConfig();
                if (!global.frequencyConfig) {
                    throw new Error('Database config still not available after reload attempt');
                }
                console.log('✅ Emergency spam config reload successful');
            } catch (reloadError) {
                console.error('❌ EMERGENCY RELOAD FAILED - cannot perform spam detection:', reloadError.message);
                // Skip spam detection but allow message processing to continue
                const msgData = {
                    timestamp: now,
                    sender: sender,
                    senderName: senderName,
                    text: body,
                    isGroup: isGroup,
                    isSpam: false,
                    spamReason: 'SPAM DETECTION DISABLED - DATABASE CONFIG UNAVAILABLE',
                    isBlocked: false
                };
                return msgData;
            }
        }
        const windowMs = global.frequencyConfig.windowSeconds * 1000;
        const windowAgo = now - windowMs;

        // Initialize contact tracking if not exists
        if (!global.recentMessagesTracker) {
            global.recentMessagesTracker = {};
        }
        
        if (!global.recentMessagesTracker[sender]) {
            global.recentMessagesTracker[sender] = [];
        }

        // Add current message timestamp
        global.recentMessagesTracker[sender].push(now);

        // Remove messages older than window
        global.recentMessagesTracker[sender] = global.recentMessagesTracker[sender]
            .filter(timestamp => timestamp > windowAgo);

        // Check if this is spam (exceeds maxMessagesPerWindow)
        const isSpam = global.recentMessagesTracker[sender].length > global.frequencyConfig.maxMessagesPerWindow;
        let spamReason = null;

        if (isSpam) {
            spamReason = `Too many messages (${global.recentMessagesTracker[sender].length} in ${global.frequencyConfig.windowSeconds} seconds)`;
            
            // Auto warning for high-level spam (exceeds warningThreshold)
            if (global.recentMessagesTracker[sender].length >= global.frequencyConfig.warningThreshold) {
                const warningMessage = global.frequencyConfig.warningMessage;
                try {
                    await client.sendMessage(sender, warningMessage);
                    console.log(`⚠️  Auto warning sent to ${sender} for high-frequency messages`);
                } catch (warningError) {
                    console.error('❌ Error sending auto warning:', warningError.message);
                }
            }
        }

        // Create message metadata
        const metadata = {
            isGroup: isGroup,
            hasMedia: message.hasMedia || false,
            spam: isSpam,
            spamReason: spamReason,
            contact: contactInfo,
            timestamp: message.timestamp
        };

        let messageSaved = false;
        let contactSaved = false;

        // Save message to API
        try {
            await axios.post(`${API_BASE_URL}/api/messages`, {
                id: message.id.id,
                type: message.type,
                content: message.body,
                sender: sender,
                recipient: message.to,
                status: 'sent',
                metadata: metadata
            }, {
                headers: {
                    'X-API-Key': 'universal-api-key-2025',
                    'Content-Type': 'application/json'
                }
            });
            console.log('💾 Message saved to database via API');
            messageSaved = true;
        } catch (apiError) {
            console.error('❌ Error saving message via API:', apiError.message);
            return false; // Return false immediately if message save fails
        }

        // Save/update contact to API
        try {
            // Normalize phone number before sending to backend to avoid sending WID or suffixes
            function normalizePhone(input) {
                if (!input) return '';
                // If input looks like a JID (contains @), strip suffix first
                const cleaned = String(input).replace(/@.*$/, '');
                // Remove any non-digit characters
                const digits = cleaned.replace(/\D+/g, '');
                return digits;
            }

            const phoneToSend = normalizePhone(contactInfo.number || sender);

            await axios.post(`${API_BASE_URL}/api/messages/contacts`, {
                id: sender,
                name: contactInfo.name,
                phone: phoneToSend,
                metadata: {
                    isBusiness: contactInfo.isBusiness,
                    isEnterprise: contactInfo.isEnterprise,
                    verifiedName: contactInfo.verifiedName,
                    isMyContact: contactInfo.isMyContact,
                    isBlocked: contactInfo.isBlocked
                }
            }, {
                headers: {
                    'X-API-Key': 'universal-api-key-2025',
                    'Content-Type': 'application/json'
                }
            });
            console.log('💾 Contact saved to database via API (phone:', phoneToSend || 'N/A', ')');
            contactSaved = true;
        } catch (apiError) {
            // Provide more detailed logging from the API when available
            try {
                const status = apiError.response?.status;
                const data = apiError.response?.data;
                console.error('❌ Error saving contact via API:', apiError.message, 'status=', status, 'response=', data);
            } catch (logErr) {
                console.error('❌ Error saving contact via API:', apiError.message);
            }
            // Contact save failure doesn't fail the whole operation
        }

        return messageSaved; // Return success status

    } catch (error) {
        console.error('❌ Error saving message data:', error.message);
        return false;
    }
}

// Spam detection function
function detectSpam(messageBody) {
    if (!messageBody) return { isSpam: false, reason: null };
    
    const text = messageBody.toLowerCase();
    
    // URL detection
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    if (urlPattern.test(text)) {
        return { isSpam: true, reason: 'Contains URL' };
    }
    
    // Profanity detection (basic)
    const profanity = ['fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard'];
    for (const word of profanity) {
        if (text.includes(word)) {
            return { isSpam: true, reason: 'Contains profanity' };
        }
    }
    
    // Repeated characters
    const repeatedChars = /(.)\1{4,}/;
    if (repeatedChars.test(text)) {
        return { isSpam: true, reason: 'Contains repeated characters' };
    }
    
    // All caps
    if (text.length > 10 && text === text.toUpperCase()) {
        return { isSpam: true, reason: 'All caps message' };
    }
    
    // Short messages - only flag if extremely short (less than 2 characters)
    // Allow common short words and names
    if (text.length < 2 && !/^[a-zA-Z]$/.test(text)) {
        return { isSpam: true, reason: 'Extremely short message' };
    }
    
    return { isSpam: false, reason: null };
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n📴 Shutting down WhatsApp bot...');
    isClientReady = false;
    updateStatusFile(); // Update status file
    try {
        if (client.pupBrowser) {
            await client.destroy();
        }
        // Wait for resources to be released
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n📴 Shutting down WhatsApp bot...');
    isClientReady = false;
    updateStatusFile(); // Update status file
    try {
        if (client.pupBrowser) {
            await client.destroy();
        }
        // Wait for resources to be released
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
    }
    process.exit(0);
});

// Function to add a message to the outgoing queue via API
async function addOutgoingMessage(to, message) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/messages/outgoing`, {
            recipient: to,
            message: message,
            type: 'manual'
        }, {
            headers: { 'x-api-key': API_KEY },
            timeout: 5000
        });

        if (response.data.success) {
            console.log(`📝 Message queued via API for ${to}`);
            return true;
        } else {
            console.error('❌ API error:', response.data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to queue message via API:', error.message);
        return false;
    }
}

// Function to process outgoing messages from database via API
async function processOutgoingMessages() {
    if (!isClientReady) {
        return; // Skip if client is not ready
    }

    try {
        // Get pending messages from API
        const response = await axios.get(`${API_BASE_URL}/api/messages/outgoing?status=pending`, {
            headers: { 'x-api-key': API_KEY },
            timeout: 5000
        });

        if (!response.data.success) {
            console.error('❌ Failed to get pending messages:', response.data.error);
            return;
        }

        const messages = response.data.data || [];

        if (messages.length === 0) {
            return; // No messages to process
        }

        console.log(`📋 Processing ${messages.length} outgoing message(s)`);

        // Process each message
        for (const messageData of messages) {
            try {
                console.log(`📤 Sending message to ${messageData.recipient}`);

                // Format recipient for WhatsApp (add @c.us if not already present)
                let whatsappId = messageData.recipient;
                if (!whatsappId.includes('@')) {
                    whatsappId = `${messageData.recipient}@c.us`;
                }
                console.log(`🔄 Formatted WhatsApp ID: ${whatsappId}`);

                // Send message with detailed logging
                console.log(`📱 Attempting to send via WhatsApp client...`);
                console.log(`🔍 Message preview: "${messageData.message.substring(0, 50)}..."`);
                
                const result = await client.sendMessage(whatsappId, messageData.message);
                console.log(`✅ Message sent successfully to ${messageData.recipient}`);
                console.log(`📊 Send result:`, result.id?.id || 'No ID returned');

                // Update status to sent
                await axios.put(`${API_BASE_URL}/api/messages/outgoing/${messageData.id}`, {
                    status: 'sent'
                }, {
                    headers: { 'x-api-key': API_KEY },
                    timeout: 5000
                });

            } catch (error) {
                console.error(`❌ Failed to send message to ${messageData.recipient}:`, error.message);
                console.error(`🔍 Error details:`, {
                    name: error.name,
                    message: error.message,
                    stack: error.stack?.substring(0, 200) + '...'
                });
                
                // Update status to failed with retry count
                try {
                    await axios.put(`${API_BASE_URL}/api/messages/outgoing/${messageData.id}`, {
                        status: 'failed',
                        error_message: error.message,
                        retry_count: (messageData.retry_count || 0) + 1
                    }, {
                        headers: { 'x-api-key': API_KEY },
                        timeout: 5000
                    });
                } catch (updateError) {
                    console.error('❌ Failed to update message status:', updateError.message);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error processing outgoing messages:', error.message);
    }
}

// Database-based message queue processing
console.log('👀 Using database-based outgoing message queue');

// Debug: Log current spam config
console.log('🔍 DEBUG: Current spam config in memory:', JSON.stringify(global.frequencyConfig, null, 2));



// Check immediately on startup
setTimeout(() => {
    processOutgoingMessages();
}, 2000); // Wait 2 seconds for client to be ready

// Then check every 5 seconds
const messageScanner = setInterval(() => {
    processOutgoingMessages();
}, 10000);

console.log('🚀 Message scanner started (checks database every 10 seconds)');

// Start the client
initializeClient();

// Initialize status file
updateStatusFile();

// Force reload spam config after 3 seconds (ensure API is ready) - silent mode
setTimeout(async () => {
  try {
    await loadSpamConfig(true); // silent = true
    // Remove verbose startup logging
    // console.log('✅ STARTUP: Spam config force reload completed');
    // console.log('🔍 Current warning message in memory:', global.frequencyConfig.warningMessage);
  } catch (error) {
    console.error('❌ STARTUP: Force reload failed:', error.message);
  }
}, 3000);