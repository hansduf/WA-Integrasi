import { spawn } from 'child_process';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from "dotenv";
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { config, validateConfig } from './config/index.js';
import { dataSourceManager } from './core/data-source-manager.js';
import { pluginLoader } from './core/plugin-loader.js';
import db from './lib/database.js';
import { authenticateToken } from './middleware/auth.middleware.js';
import dualAuthMiddleware from './middleware/dual-auth.middleware.js';
import authRoutes from './routes/auth.js';
import dataSourcesRoutes from './routes/data-sources.js';
import databaseRoutes from './routes/database.js';
import messagesRoutes from './routes/messages.js';
import piRoutes from './routes/pi_routes.js';
import securityRoutes from './routes/security.js';
import triggerGroupsRoutes from './routes/trigger-groups.js';
import triggersRoutes from './routes/triggers.js';
import usersRoutes from './routes/users.js';
import { startAllScheduledTasks } from './utils/scheduler.utils.js';

dotenv.config();

// DEBUG: Environment variables check
console.log('');
console.log('🔧 ===== ENVIRONMENT VARIABLES CHECK =====');
console.log('NODE_ENV:', process.env.NODE_ENV || '(not set)');
console.log('FORCE_HTTPS:', process.env.FORCE_HTTPS || '(not set)');
console.log('ALLOW_NGROK_COOKIES:', process.env.ALLOW_NGROK_COOKIES || '(not set)');
console.log('=========================================');
console.log('');

// Validate configuration on startup
validateConfig();

// Global variables for system state
// Note: WhatsApp client is managed by standalone bot in wa/index.js

const app = express();

// Security middleware - Apply helmet for security headers
app.use(helmet());

// Configure CORS with centralized config
app.use(cors(config.cors));

// Parse cookies
app.use(cookieParser());

// Parse JSON bodies
app.use(express.json());

// Add request logging middleware (disabled for cleaner console)
// Uncomment for debugging if needed
// app.use((req, res, next) => {
//   console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
//   next();
// });

// Initialize plugin system
async function initializePluginSystem() {
  try {
    console.log('🔧 Initializing Modular Plugin System...');

    // Load all plugins
    await pluginLoader.loadAllPlugins();
    console.log('✅ Plugin system initialized');

    // CRITICAL: Load and connect ALL data sources on startup (aggressive auto-connect)
    try {
      console.log('🔄 Loading and connecting all data sources (aggressive auto-connect)...');
      const result = await dataSourceManager.loadAndConnectAllDataSources();
      
      console.log(`✅ Connected ${result.success.length}/${result.total} data sources`);
      if (result.failed.length > 0) {
        console.warn(`⚠️ Failed to connect ${result.failed.length} data sources:`);
        result.failed.forEach(f => console.warn(`  - ${f.id}: ${f.error}`));
      }

      // Start health check service (30-second interval)
      dataSourceManager.startHealthCheck();
      console.log('💓 Health check service started (30-second interval)');

      // Get system statistics
      const stats = await dataSourceManager.getStatistics();
      console.log(`📈 System ready: ${stats.total} data sources, ${stats.connected} connected, ${stats.failed} failed`);
    } catch (dataSourceError) {
      console.warn('⚠️ Failed to load data sources:', dataSourceError.message);
      console.log('📊 Continuing with 0 data sources loaded');
    }

  } catch (error) {
    console.error('❌ Failed to initialize plugin system:', error.message);
    console.log('⚠️ Continuing with limited functionality...');
    // Don't throw error, just log it and continue
  }
}

// Initialize AI plugin
async function initializeAIPlugin() {
  try {
    // Remove verbose initialization logging
    // console.log('🤖 Initializing AI Plugin...');

    // Import AI plugin dynamically
    const { AIPlugin } = await import('./plugins/ai/index.js');
    const aiPlugin = new AIPlugin();

    // Initialize AI plugin with app and config
    await aiPlugin.init(app, {});

    // 🔥 FIX: Register AI plugin to plugin loader for health checks
    // This allows dataSourceManager to find the plugin for testing connections
    pluginLoader.plugins.set('AI', aiPlugin);
    // Remove verbose registration logging
    // console.log('✅ AI Plugin registered to plugin loader');

    // Remove verbose success logging
    // console.log('✅ AI Plugin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AI plugin:', error.message);
    // Remove verbose warning logging
    // console.log('⚠️ Continuing without AI functionality...');
  }
}

// Routes
console.log('🔧 Registering routes...');
// ⚠️ IMPORTANT: Specific routes MUST come BEFORE general /api route
app.use('/api/auth', authRoutes); // Authentication routes (no auth required)
app.use('/api/users', usersRoutes); // User management routes (requires auth - has own middleware)
app.use('/api/security', securityRoutes); // Security monitoring routes (admin only)
app.use('/api/database', dualAuthMiddleware, databaseRoutes); // 🔒 DUAL AUTH: Database (JWT OR API Key)
app.use('/api/triggers', authenticateToken, triggersRoutes); // 🔒 PROTECTED: Triggers
app.use('/api/trigger-groups', dualAuthMiddleware, triggerGroupsRoutes); // 🔒 DUAL AUTH: Trigger groups (JWT OR API Key)
app.use('/api/messages', dualAuthMiddleware, messagesRoutes); // 🔒 DUAL AUTH: Messages routes (JWT OR API Key)
app.use('/api', dualAuthMiddleware, dataSourcesRoutes); // 🔒 DUAL AUTH: Data sources (MUST BE LAST - catches remaining /api/* routes)
app.use('/pi', piRoutes); // Bot endpoints (no auth required)

// Endpoint to get QR code image - MIGRATED TO DATABASE
app.get('/whatsapp/qr', (req, res) => {
  try {
    const statusData = db.getWhatsAppStatus();

    if (statusData && statusData.qr_data) {
      const qrData = JSON.parse(statusData.qr_data);

      if (qrData.qrImage) {
        // Extract base64 data from data URL
        const base64Data = qrData.qrImage.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(imageBuffer);
      } else {
        res.status(404).json({
          success: false,
          message: 'No QR code available - bot may already be connected'
        });
      }
    } else {
      res.status(404).json({
        success: false,
        message: 'Status data not found in database'
      });
    }
  } catch (error) {
    console.error('Error serving QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve QR code'
    });
  }
});

// Simple WhatsApp status endpoint (reads from database - MIGRATED FROM JSON FILE)
app.get('/whatsapp/status', (req, res) => {
  try {
    // First try to read QR from file system (simpler, more reliable)
    let qrData = null;
    try {
      const qrFilePath = path.join(process.cwd(), '..', 'wa', '.status', 'whatsapp-status.json');
      if (fs.existsSync(qrFilePath)) {
        const fileContent = fs.readFileSync(qrFilePath, 'utf8');
        const fileData = JSON.parse(fileContent);
        if (fileData.qrData) {
          qrData = fileData.qrData;
        }
      }
    } catch (fileError) {
      // Silently ignore file errors
    }

    // Then get status from database
    const statusData = db.getWhatsAppStatus();
    
    if (statusData) {
      console.log('📋 WhatsApp status retrieved:', {
        is_ready: statusData.is_ready,
        has_qr_from_file: !!qrData,
        qr_data_preview: qrData ? (typeof qrData === 'string' ? qrData.substring(0, 50) : 'object') : null
      });
      
      // Only parse QR from database if file doesn't have it
      if (!qrData && statusData.qr_data) {
        try {
          qrData = JSON.parse(statusData.qr_data);
        } catch (e) {
          console.warn('⚠️ Failed to parse QR data from database:', e.message);
        }
      }

      // Determine status based on bot state
      let status = 'disconnected';
      if (statusData.is_ready) {
        status = 'authenticated'; // Fully connected
      } else if (qrData && (qrData.qrImage || qrData.qrString)) {
        status = 'scanning_qr'; // QR code available for scanning
      } else if (statusData.is_initializing) {
        status = 'initializing'; // Bot starting up
      }

      res.json({
        success: true,
        status: status,
        data: {
          connected: statusData.is_ready,
          isReady: statusData.is_ready,
          phoneNumber: statusData.phone_number,
          botId: statusData.bot_id,
          readyState: statusData.is_ready ? 'Connected' : 'Disconnected',
          lastUpdate: statusData.last_update,
          qrData: qrData, // QR from file or database
          needsAuth: !statusData.is_ready && !qrData
        },
        message: 'WhatsApp bot status'
      });
    } else {
      res.json({
        success: false,
        status: 'disconnected', // Add status field
        data: {
          connected: false,
          isReady: false,
          phoneNumber: null,
          botId: null,
          readyState: 'Disconnected',
          lastUpdate: null,
          qrData: null,
          needsAuth: true
        },
        message: 'Status data not found in database - bot may not be running'
      });
    }
  } catch (error) {
    console.error('Error reading WhatsApp status:', error);
    res.status(500).json({
      success: false,
      status: 'disconnected',
      error: 'Failed to read WhatsApp status'
    });
  }
});

// Update WhatsApp status in database (called by bot)
app.post('/whatsapp/status/update', (req, res) => {
  try {
    const {
      is_ready,
      is_initializing,
      bot_number,
      phone_number,
      bot_id,
      qr_data,
      last_update,
      reconnect_attempts
    } = req.body;

    console.log('📝 Received WhatsApp status update:', {
      is_initializing,
      has_qr_data: !!qr_data,
      qr_data_length: qr_data ? qr_data.length : 0
    });

    // Update database with bot status - convert snake_case to camelCase
    const result = db.updateWhatsAppStatus({
      isReady: is_ready || false,
      isInitializing: is_initializing || false,
      botNumber: bot_number || null,
      phoneNumber: phone_number || null,
      botId: bot_id || null,
      qrData: qr_data || null,
      lastUpdate: last_update || new Date().toISOString(),
      reconnectAttempts: reconnect_attempts || 0
    });

    console.log('✅ WhatsApp status saved to database:', result);

    res.json({
      success: true,
      message: 'WhatsApp status updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating WhatsApp status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update WhatsApp status',
      details: error.message
    });
  }
});

// Get AI triggers from database - FIXED: Use loadAITriggers to convert field names
app.get('/api/ai/triggers', async (req, res) => {
  try {
    // Import loadAITriggers from AI plugin to ensure field name conversion
    const { default: db } = await import('./lib/database.js');
    const triggers = db.preparedStatements.getAllAiTriggers.all();
    
    // Convert database format to API format (snake_case → camelCase)
    const convertedTriggers = triggers.map(trigger => ({
      id: trigger.id,
      type: trigger.type,
      prefix: trigger.prefix,
      name: trigger.name,
      description: trigger.description,
      enabled: trigger.enabled === 1,
      usageCount: trigger.usage_count,
      lastUsed: trigger.last_used,
      createdAt: trigger.created_at,
      updatedAt: trigger.updated_at
    }));
    
    res.json({
      success: true,
      data: convertedTriggers,
      message: `Found ${convertedTriggers.length} AI triggers`
    });
  } catch (error) {
    console.error('❌ Error getting AI triggers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI triggers',
      details: error.message
    });
  }
});

// Connect to WhatsApp endpoint - MIGRATED TO DATABASE
app.post('/whatsapp/connect', async (req, res) => {
  try {
    console.log('📞 WhatsApp connect request received');

    const waIndexPath = path.join(process.cwd(), '..', 'wa', 'index.js');
    const waDir = path.join(process.cwd(), '..', 'wa');

    // Check if status data exists in database and bot is already connected/running
    const statusData = db.getWhatsAppStatus();
    if (statusData) {
      console.log('📊 Current bot status from database:', statusData);

      // If bot is fully connected and ready
      if (statusData.is_ready && !statusData.disconnected) {
        console.log('✅ Bot already connected');
        return res.json({
          success: true,
          message: 'WhatsApp bot is already connected',
          data: statusData
        });
      }

      // If bot has QR code ready (waiting for scan)
      if (statusData.qr_data && !statusData.is_ready) {
        console.log('📱 QR code already available');
        return res.json({
          success: true,
          message: 'WhatsApp bot is waiting for QR scan.',
          data: {
            status: 'needs_auth',
            qrAvailable: true,
            ...statusData
          }
        });
      }
    }

    // Check if wa/index.js exists
    if (!fs.existsSync(waIndexPath)) {
      console.error('❌ wa/index.js not found at:', waIndexPath);
      return res.status(500).json({
        success: false,
        error: 'WhatsApp bot file not found at: ' + waIndexPath
      });
    }

    // Kill any existing WhatsApp bot processes before starting new one
    console.log('🔄 Checking for existing WhatsApp bot processes...');
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        try {
          execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *wa*" 2>nul', { stdio: 'ignore' });
        } catch (e) {
          // Process might not exist
        }
      } else {
        const { execSync } = require('child_process');
        try {
          execSync('pkill -9 -f "node.*wa/index.js"', { stdio: 'ignore' });
        } catch (e) {
          // Process might not exist
        }
      }
      console.log('✅ Cleanup completed');
    } catch (killError) {
      console.log('⚠️ Cleanup had issues (may be normal):', killError.message);
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clear status data in database to start fresh
    db.updateWhatsAppStatus({
      isReady: false,
      isInitializing: false,
      botNumber: null,
      phoneNumber: null,
      botId: null,
      qrData: null,
      lastUpdate: new Date().toISOString(),
      reconnectAttempts: 0
    });
    console.log('🗑️ Cleared old status data in database');

    // Try to start WhatsApp bot process with proper logging
    console.log('🚀 Starting WhatsApp bot process...');
    try {
      const logFile = path.join(waDir, 'wa-bot.log');
      const errorLogFile = path.join(waDir, 'wa-bot-error.log');

      // Use 'pipe' instead of file streams/descriptors for better compatibility
      const botProcess = spawn('node', [waIndexPath], {
        cwd: waDir,
        detached: false,  // Set to false to track process properly
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Write to log files manually
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });
      const errorStream = fs.createWriteStream(errorLogFile, { flags: 'a' });
      
      botProcess.stdout.pipe(logStream);
      botProcess.stderr.pipe(errorStream);

      // Handle process events
      botProcess.on('error', (error) => {
        console.error('❌ Failed to start WhatsApp bot process:', error);
        errorStream.write(`ERROR: ${error.toString()}\n`);
      });

      botProcess.on('spawn', () => {
        console.log('✅ WhatsApp bot process spawned successfully');
      });

      botProcess.on('exit', (code, signal) => {
        console.log(`⚠️ WhatsApp bot process exited with code: ${code}, signal: ${signal}`);
        logStream.end();
        errorStream.end();
      });

      // Keep reference for later cleanup
      global.whatsappBotProcess = botProcess;

      console.log('✅ Bot process started with PID:', botProcess.pid);

      // Return success response
      res.json({
        success: true,
        message: 'WhatsApp bot connection initiated. Bot is starting up...',
        data: {
          status: 'starting',
          pid: botProcess.pid,
          message: 'Bot is initializing. QR code will appear in 10-20 seconds. Check status endpoint for updates.',
          logFiles: {
            stdout: logFile,
            stderr: errorLogFile
          }
        }
      });

    } catch (spawnError) {
      console.error('❌ Error spawning WhatsApp bot process:', spawnError);
      res.status(500).json({
        success: false,
        error: 'Failed to start WhatsApp bot process: ' + spawnError.message
      });
    }

  } catch (error) {
    console.error('Error in WhatsApp connect endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to WhatsApp: ' + error.message
    });
  }
});

// Disconnect WhatsApp endpoint - Kill bot process and clear session - MIGRATED TO DATABASE
app.post('/whatsapp/disconnect', (req, res) => {
  try {
    console.log('🔌 Disconnecting WhatsApp bot...');

    const waDir = path.join(process.cwd(), '..', 'wa');

    // 1. Kill any running WhatsApp bot processes more reliably
    try {
      if (process.platform === 'win32') {
        // Windows: Kill all node processes running wa/index.js
        const { spawn } = require('child_process');
        const killProcess = spawn('taskkill', ['/f', '/im', 'node.exe', '/fi', 'WINDOWTITLE eq *wa/index.js*'], {
          stdio: 'ignore'
        });
        killProcess.on('close', (code) => {
          console.log(`Taskkill wa/index.js processes completed with code: ${code}`);
        });

        // Also try to kill by port if possible
        setTimeout(() => {
          try {
            const netstat = spawn('netstat', ['-ano'], { stdio: 'pipe' });
            let output = '';
            netstat.stdout.on('data', (data) => {
              output += data.toString();
            });
            netstat.on('close', () => {
              // Look for processes using port 8001 (if any)
              const lines = output.split('\n');
              lines.forEach(line => {
                if (line.includes(':8001') && line.includes('LISTENING')) {
                  const parts = line.trim().split(/\s+/);
                  const pid = parts[parts.length - 1];
                  if (pid && pid !== '0') {
                    const killPid = spawn('taskkill', ['/f', '/pid', pid], { stdio: 'ignore' });
                    killPid.on('close', () => console.log(`Killed process ${pid} using port 8001`));
                  }
                }
              });
            });
          } catch (e) {
            // Ignore port killing errors
          }
        }, 1000);

      } else {
        // Unix-like systems: More specific pkill
        const { spawn } = require('child_process');
        const killProcess = spawn('pkill', ['-9', '-f', 'node.*wa/index.js'], {
          stdio: 'ignore'
        });
        killProcess.on('close', (code) => {
          console.log(`Pkill wa/index.js processes completed with code: ${code}`);
        });
      }
    } catch (killError) {
      console.log('⚠️ Could not kill existing processes, continuing with cleanup...');
    }

    // 2. Wait for processes to fully terminate and release file handles
    console.log('⏳ Waiting for processes to terminate...');
    
    // Use setTimeout instead of await for synchronous function
    setTimeout(() => {
      console.log('🗑️ Starting session cleanup...');
    }, 3000);

    // 2.1 Clear WhatsApp session files with retry logic for EBUSY errors
    const sessionDirs = [
      path.join(waDir, 'sessions'),
      path.join(waDir, '.wwebjs_auth'),
      path.join(waDir, '.wwebjs_cache')
    ];

    const cleanupResults = [];
    sessionDirs.forEach(dir => {
      let retries = 3;
      let cleaned = false;
      
      while (retries > 0 && !cleaned) {
        try {
          if (fs.existsSync(dir)) {
            // Try with maxRetries and retryDelay options
            fs.rmSync(dir, { 
              recursive: true, 
              force: true, 
              maxRetries: 3, 
              retryDelay: 1000 
            });
            console.log(`🗑️ Cleared session directory: ${dir}`);
            cleaned = true;
            cleanupResults.push({ dir, status: 'success' });
          } else {
            cleaned = true; // Directory doesn't exist, consider it cleaned
            cleanupResults.push({ dir, status: 'not_found' });
          }
        } catch (error) {
          retries--;
          if (error.message && error.message.includes('EBUSY')) {
            console.log(`⚠️ EBUSY error for ${dir}, ${retries} retries left`);
            // Wait before retry
            const waitTime = (4 - retries) * 2000; // Progressive wait
            const start = Date.now();
            while (Date.now() - start < waitTime) {
              // Busy wait
            }
          } else {
            console.error(`❌ Failed to clear ${dir}: ${error.message}`);
            cleanupResults.push({ dir, status: 'error', error: error.message });
            break;
          }
          
          if (retries === 0) {
            console.error(`❌ Final attempt failed for ${dir}: ${error.message}`);
            console.log(`💡 Manual cleanup may be required: ${dir}`);
            cleanupResults.push({ dir, status: 'failed', error: error.message });
          }
        }
      }
    });

    // 3. Clear status data in database and create disconnected status
    try {
      const success = db.updateWhatsAppStatus({
        isReady: false,
        isInitializing: false,
        botNumber: null,
        phoneNumber: null,
        botId: null,
        qrData: null,
        lastUpdate: new Date().toISOString(),
        reconnectAttempts: 0
      });
      if (success) {
        console.log('📝 Updated status data in database to disconnected state');
      } else {
        console.error('❌ Failed to update status data in database');
      }
    } catch (statusError) {
      console.error('❌ Failed to update status data in database:', statusError.message);
    }

    // 4. Clear any cached QR images
    const qrImagePath = path.join(waDir, 'wa-qr.png');
    try {
      if (fs.existsSync(qrImagePath)) {
        fs.unlinkSync(qrImagePath);
        console.log('🖼️ Cleared cached QR image');
      }
    } catch (qrError) {
      console.log('⚠️ Could not clear QR image:', qrError.message);
    }

    // 5. Wait a moment for processes to fully terminate
    setTimeout(() => {
      console.log('✅ WhatsApp bot disconnected successfully');
    }, 2000);

    res.json({
      success: true,
      message: 'WhatsApp bot disconnected successfully. Session cleared.',
      data: {
        status: 'disconnected',
        sessionCleared: true,
        message: 'To reconnect, use the connect endpoint and scan the new QR code.'
      }
    });

  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect WhatsApp: ' + error.message
    });
  }
});

// Messages endpoint with spam detection and contact details
app.get('/whatsapp/messages', dualAuthMiddleware, (req, res) => {
  try {
    // Read from database
    const messages = db.preparedStatements.getAllMessages.all(10000, 0); // Get up to 10k messages
    const contacts = db.preparedStatements.getAllContacts.all();

    // Create contacts map for easy lookup and calculate message counts
    const contactsMap = {};
    
    // Count messages per contact (normalize IDs)
    const messageCounts = {};
    const spamCounts = {};
    messages.forEach(msg => {
      const metadata = msg.metadata ? JSON.parse(msg.metadata) : {};
      // Normalize sender ID - add @c.us if missing
      const normalizedSender = msg.sender.includes('@') ? msg.sender : `${msg.sender}@c.us`;
      messageCounts[normalizedSender] = (messageCounts[normalizedSender] || 0) + 1;
      if (metadata.spam) {
        spamCounts[normalizedSender] = (spamCounts[normalizedSender] || 0) + 1;
      }
    });
    
    contacts.forEach(contact => {
      const metadata = contact.metadata ? JSON.parse(contact.metadata) : {};
      contactsMap[contact.id] = {
        name: contact.name,
        phone: contact.phone,
        number: contact.phone,
        firstSeen: contact.created_at,
        messageCount: messageCounts[contact.id] || 0,
        spamCount: spamCounts[contact.id] || 0
      };
    });

    // Parse message metadata and enhance with contact details
    const enhancedMessages = messages.map(msg => {
      const metadata = msg.metadata ? JSON.parse(msg.metadata) : {};
      const msgDate = new Date(msg.created_at);
      return {
        id: msg.id,
        type: msg.type,
        content: msg.content,
        from: msg.sender,
        to: msg.recipient,
        timestamp: msgDate.getTime() / 1000, // Unix timestamp in seconds (original format)
        processedAt: msg.created_at, // ISO string
        formattedTime: msgDate.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        isSpam: metadata.spam || false,
        spam: metadata.spam || false,
        spamReason: metadata.spamReason || null,
        isGroup: metadata.isGroup || false,
        author: metadata.author || null,
        contactDetails: contactsMap[msg.sender] || {
          name: 'Unknown',
          number: msg.sender ? msg.sender.split('@')[0] : 'unknown',
          firstSeen: msg.created_at,
          messageCount: 1
        }
      };
    });

    // Calculate stats
    const stats = {
      totalMessages: enhancedMessages.length,
      spamMessages: enhancedMessages.filter(m => m.isSpam).length,
      uniqueContacts: contacts.length,
      lastUpdate: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        messages: enhancedMessages,
        stats,
        contacts: contactsMap
      },
      message: 'WhatsApp messages with spam detection and contact details'
    });

  } catch (error) {
    console.error('Error reading WhatsApp messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read WhatsApp messages'
    });
  }
});

// Delete all WhatsApp messages endpoint
app.delete('/whatsapp/messages', dualAuthMiddleware, (req, res) => {
  try {
    // Delete from database
    const deleteMessagesStmt = db.db.prepare('DELETE FROM messages');
    const deleteContactsStmt = db.db.prepare('DELETE FROM contacts');
    
    const messagesResult = deleteMessagesStmt.run();
    const contactsResult = deleteContactsStmt.run();

    console.log(`🗑️ All WhatsApp messages deleted successfully (${messagesResult.changes} messages, ${contactsResult.changes} contacts)`);

    const emptyData = {
      messages: [],
      contacts: {},
      stats: {
        totalMessages: 0,
        spamMessages: 0,
        uniqueContacts: 0,
        lastUpdate: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      message: 'All WhatsApp messages deleted successfully',
      data: emptyData
    });

  } catch (error) {
    console.error('Error deleting WhatsApp messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete WhatsApp messages'
    });
  }
});

// REMOVED: Deprecated /whatsapp/send endpoint 
// This endpoint used JSON file-based queue which has been replaced with database-based queue
// Frontend now uses /api/messages/outgoing with proper database integration

// GET spam frequency config endpoint (SQLite-based)
app.get('/api/wa/spam/config', dualAuthMiddleware, (req, res) => {
  try {
    // Get spam settings from database
    const settings = db.preparedStatements.getSystemSettingsByCategory.all('spam_detection');
    
    // Default config values
    const defaultConfig = {
      enabled: true,
      windowSeconds: 6,
      maxMessagesPerWindow: 1,
      warningThreshold: 3,
      warningMessage: '⚠️ PERINGATAN: Sistem mendeteksi aktivitas spam dari nomor Anda. Harap kurangi frekuensi pengiriman pesan untuk menghindari pemblokiran.',
      cooldownMinutes: 1
    };
    
    // Build config from database or use defaults
    const config = { ...defaultConfig };
    
    settings.forEach(setting => {
      if (setting.key === 'windowSeconds') {
        config.windowSeconds = parseInt(setting.value) || defaultConfig.windowSeconds;
      } else if (setting.key === 'maxMessagesPerWindow') {
        config.maxMessagesPerWindow = parseInt(setting.value) || defaultConfig.maxMessagesPerWindow;
      } else if (setting.key === 'warningThreshold') {
        config.warningThreshold = parseInt(setting.value) || defaultConfig.warningThreshold;
      } else if (setting.key === 'warningMessage') {
        config.warningMessage = setting.value || defaultConfig.warningMessage;
      } else if (setting.key === 'cooldownMinutes') {
        config.cooldownMinutes = parseInt(setting.value) || defaultConfig.cooldownMinutes;
      } else if (setting.key === 'enabled') {
        config.enabled = setting.value === 'true';
      }
    });
    
    console.log('📖 Spam config loaded from database:', config);
    
    res.json({
      success: true,
      config: config
    });
  } catch (error) {
    console.error('❌ Error fetching spam config from database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spam configuration from database'
    });
  }
});

// PUT spam frequency config endpoint
app.put('/api/wa/spam/config', dualAuthMiddleware, (req, res) => {
  try {
    const { windowSeconds, maxMessagesPerWindow, warningThreshold, warningMessage } = req.body;

    // Validation
    if (!windowSeconds || !maxMessagesPerWindow || !warningThreshold || !warningMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (windowSeconds < 3 || windowSeconds > 10) {
      return res.status(400).json({
        success: false,
        error: 'windowSeconds must be between 3-10'
      });
    }

    if (maxMessagesPerWindow < 1 || maxMessagesPerWindow > 5) {
      return res.status(400).json({
        success: false,
        error: 'maxMessagesPerWindow must be between 1-5'
      });
    }

    if (warningThreshold < 2 || warningThreshold > 10) {
      return res.status(400).json({
        success: false,
        error: 'warningThreshold must be between 2-10'
      });
    }

    if (!warningMessage.trim() || warningMessage.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'warningMessage must be between 1-500 characters'
      });
    }

    // Save spam settings to database
    const category = 'spam_detection';
    const timestamp = new Date().toISOString();
    
    try {
      // Save each setting to database
      db.preparedStatements.upsertSystemSetting.run(
        `${category}_enabled`, category, 'enabled', 'true'
      );
      db.preparedStatements.upsertSystemSetting.run(
        `${category}_windowSeconds`, category, 'windowSeconds', windowSeconds.toString()
      );
      db.preparedStatements.upsertSystemSetting.run(
        `${category}_maxMessagesPerWindow`, category, 'maxMessagesPerWindow', maxMessagesPerWindow.toString()
      );
      db.preparedStatements.upsertSystemSetting.run(
        `${category}_warningThreshold`, category, 'warningThreshold', warningThreshold.toString()
      );
      db.preparedStatements.upsertSystemSetting.run(
        `${category}_warningMessage`, category, 'warningMessage', warningMessage
      );
      db.preparedStatements.upsertSystemSetting.run(
        `${category}_cooldownMinutes`, category, 'cooldownMinutes', '1'
      );
      db.preparedStatements.upsertSystemSetting.run(
        `${category}_lastUpdated`, category, 'lastUpdated', timestamp
      );

      console.log('✅ Spam config saved to database successfully');

      // Return success response
      const savedConfig = {
        enabled: true,
        windowSeconds,
        maxMessagesPerWindow,
        warningThreshold,
        warningMessage,
        cooldownMinutes: 1,
        lastUpdated: timestamp
      };

      res.json({
        success: true,
        message: 'Settings updated and saved to database successfully',
        config: savedConfig,
        notice: 'WhatsApp bot will automatically reload config within 30 seconds, or restart bot for immediate effect'
      });
    } catch (dbError) {
      console.error('❌ Database error saving spam config:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('❌ Error updating spam config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update spam configuration'
    });
  }
});

// Delete individual contact endpoint
app.delete('/whatsapp/contacts/:number', dualAuthMiddleware, (req, res) => {
  try {
    const { number } = req.params;

    if (!number) {
      return res.status(400).json({
        success: false,
        error: 'Contact number is required'
      });
    }

    // Check if contact exists in database
    const contact = db.preparedStatements.getContact.get(number);
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    const contactToDelete = {
      name: contact.name,
      phone: contact.phone,
      number: contact.phone
    };

    // Count messages before deletion
    const countStmt = db.db.prepare('SELECT COUNT(*) as count FROM messages WHERE sender = ? OR recipient = ?');
    const { count: originalMessageCount } = countStmt.get(number, number);

    // Delete all messages from this contact (both as sender and recipient)
    const deleteMessagesStmt = db.db.prepare('DELETE FROM messages WHERE sender = ? OR recipient = ?');
    const messagesResult = deleteMessagesStmt.run(number, number);
    const messagesDeleted = messagesResult.changes;

    // Delete contact
    db.preparedStatements.deleteContact.run(number);

    // Get remaining counts
    const remainingContactsStmt = db.db.prepare('SELECT COUNT(*) as count FROM contacts');
    const remainingMessagesStmt = db.db.prepare('SELECT COUNT(*) as count FROM messages');
    const { count: remainingContacts } = remainingContactsStmt.get();
    const { count: remainingMessages } = remainingMessagesStmt.get();

    console.log(`🗑️ Contact deleted: ${contactToDelete.name} (${number}) - ${messagesDeleted} messages removed`);

    res.json({
      success: true,
      message: `Contact ${contactToDelete.name} deleted successfully`,
      data: {
        contactDeleted: contactToDelete,
        messagesDeleted: messagesDeleted,
        remainingContacts: remainingContacts,
        remainingMessages: remainingMessages
      }
    });

  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact'
    });
  }
});

// REMOVED: Old spam detection functions (detectSpam, getSpamReason)
// Spam detection is now handled by WhatsApp bot with frequency-based detection and database configuration
// These content-based detection functions were never called in the codebase

// ==========================================
// AUTOMATIC MESSAGE DELETION SYSTEM
// ==========================================

// Function to get the date for the same day of the week from previous week
function getPreviousWeekSameDay() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate date 7 days ago (previous week same day)
  const previousWeekSameDay = new Date(today);
  previousWeekSameDay.setDate(today.getDate() - 7);

  return previousWeekSameDay;
}

// Function to format date to YYYY-MM-DD for comparison
function formatDateToYYYYMMDD(date) {
  return date.toISOString().split('T')[0];
}

// Function to delete messages from a specific date
function deleteMessagesFromDate(targetDate) {
  try {
    const targetDateStr = formatDateToYYYYMMDD(targetDate);

    console.log(`🗑️ Starting automatic deletion for messages from: ${targetDateStr}`);

    // Count messages before deletion
    const countStmt = db.db.prepare('SELECT COUNT(*) as count FROM messages WHERE DATE(created_at) = ?');
    const { count: originalCount } = countStmt.get(targetDateStr);

    if (originalCount === 0) {
      console.log(`⚠️ No messages found for date: ${targetDateStr}`);
      return { success: true, deletedCount: 0, message: 'No messages found for the specified date' };
    }

    // Delete messages from the target date
    const deleteStmt = db.db.prepare('DELETE FROM messages WHERE DATE(created_at) = ?');
    const result = deleteStmt.run(targetDateStr);
    const deletedCount = result.changes;

    // Get remaining message count
    const remainingStmt = db.db.prepare('SELECT COUNT(*) as count FROM messages');
    const { count: remainingMessages } = remainingStmt.get();

    // Delete contacts with no messages
    const deleteOrphanContactsStmt = db.db.prepare(`
      DELETE FROM contacts 
      WHERE id NOT IN (
        SELECT DISTINCT sender FROM messages 
        UNION 
        SELECT DISTINCT recipient FROM messages
      )
    `);
    const orphanResult = deleteOrphanContactsStmt.run();

    console.log(`✅ Automatic deletion completed: ${deletedCount} messages deleted from ${targetDateStr}, ${orphanResult.changes} orphan contacts removed`);

    return {
      success: true,
      deletedCount,
      targetDate: targetDateStr,
      remainingMessages: remainingMessages,
      message: `Deleted ${deletedCount} messages from ${targetDateStr}`
    };

  } catch (error) {
    console.error('❌ Error during automatic message deletion:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error.message,
      message: 'Failed to delete messages automatically'
    };
  }
}

// Function to run daily automatic deletion
function runDailyAutoDeletion() {
  try {
    console.log('🔄 Running daily automatic message deletion...');

    const targetDate = getPreviousWeekSameDay();
    const result = deleteMessagesFromDate(targetDate);

    if (result.success) {
      console.log(`✅ Daily auto-deletion successful: ${result.message}`);
    } else {
      console.error(`❌ Daily auto-deletion failed: ${result.message}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Error in daily auto-deletion:', error);
    return {
      success: false,
      error: error.message,
      message: 'Daily auto-deletion failed'
    };
  }
}

// Schedule daily automatic deletion (runs every 24 hours)
// 🔴 CURRENTLY DISABLED - See line 1257 to enable
// Function ini tidak akan berjalan kecuali dipanggil secara eksplisit
function scheduleDailyAutoDeletion() {
  console.log('⏰ Setting up daily automatic message deletion...');

  // Run immediately on startup
  setTimeout(() => {
    console.log('🚀 Running initial automatic deletion on startup...');
    runDailyAutoDeletion();
  }, 5000); // Wait 5 seconds after startup

  // Then run every 24 hours
  setInterval(() => {
    runDailyAutoDeletion();
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

  console.log('✅ Daily automatic deletion scheduled (runs every 24 hours)');
}

// Manual trigger endpoint for testing
app.post('/whatsapp/auto-delete', (req, res) => {
  try {
    console.log('🔧 Manual trigger for automatic deletion received');

    const result = runDailyAutoDeletion();

    res.json({
      success: result.success,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in manual auto-delete trigger:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to trigger automatic deletion'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-modular',
    features: ['plugin-system', 'modular-data-sources', 'auto-triggers']
  });
});

// Initialize default admin user on startup
async function initializeDefaultAdmin() {
  try {
    console.log('👤 Initializing authentication system...');
    
    // Check if any users exist
    const users = db.preparedStatements.getAllUsers.all();
    
    if (users.length === 0) {
      // SECURITY NOTE: Automatic creation of a default admin has been disabled.
      // Creating an admin account on first startup posed a security risk when
      // fallback credentials were used. To create the first admin user, run
      // the provided one-time setup script (`scripts/create-admin.js`) from the
      // `avevapi` directory. The script supports interactive input or reading
      // the credentials from environment variables `ADMIN_USERNAME` and
      // `ADMIN_PASSWORD`.
      console.warn('🛡️ No users found. Default admin auto-creation is disabled for security.');
      console.log('ℹ️ Create the first admin by running:');
      console.log('   cd avevapi');
      console.log('   node scripts/create-admin.js');
      console.log('Or via env vars (CI):');
      console.log('   ADMIN_USERNAME=admin ADMIN_PASSWORD="$SUPER_SECRET" node scripts/create-admin.js');
      return;
    } else {
      console.log(`✅ Authentication system ready (${users.length} user(s) found)`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize authentication system:', error);
    console.log('⚠️ Continuing without authentication...');
  }
}

const PORT = config.server.port;

// Start server with plugin initialization
app.listen(PORT, async () => {
  console.log(`🚀 Universal Data Platform v2.0.0`);
  console.log(`📡 Server listening on ${config.server.host}:${PORT}`);
  console.log(`🔗 API Base URL: http://${config.server.host}:${PORT}/api`);
  console.log(`� API Key: ${config.api.key}`);
  console.log('');

  // Initialize authentication system first
  await initializeDefaultAdmin();

  console.log('');

  // Initialize plugin system
  await initializePluginSystem();

  // Initialize AI plugin
  await initializeAIPlugin();

  // Initialize automatic message deletion system
  // 🔴 DISABLED: Auto-delete otomatis telah dinonaktifkan
  // Uncomment line berikut untuk mengaktifkan kembali:
  // scheduleDailyAutoDeletion();

  // Start security scheduled tasks
  startAllScheduledTasks();

  // Reduce verbose endpoint listing - only show essential info
  console.log('');
  console.log('🚀 AVEVA PI Server started successfully!');
  console.log(`📡 Server running on port ${config.server.port}`);
  console.log(`🔗 API Base URL: http://localhost:${config.server.port}`);
  console.log(`📋 Total endpoints available: 50+ (use /health for status)`);
  console.log('');

// Remove verbose endpoint listing
/*
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /api/auth/login - User login`);
  console.log(`   POST /api/auth/logout - User logout (requires auth)`);
  console.log(`   GET  /api/auth/me - Get current user (requires auth)`);
  console.log(`   GET  /api/auth/check - Check authentication status`);
  console.log(`   GET  /api/users - List all users (admin only)`);
  console.log(`   GET  /api/users/stats - Get user statistics (admin only)`);
  console.log(`   GET  /api/users/:id - Get user by ID (admin or self)`);
  console.log(`   POST /api/users - Create new user (admin only)`);
  console.log(`   PUT  /api/users/:id - Update user (admin or self)`);
  console.log(`   DELETE /api/users/:id - Delete user (admin only)`);
  console.log(`   PUT  /api/users/:id/password - Change password (admin or self)`);
  console.log(`   PUT  /api/users/:id/status - Toggle user status (admin only)`);
  console.log(`   GET  /api/security/overview - Security dashboard (admin only)`);
  console.log(`   GET  /api/security/failed-logins - Failed login attempts (admin only)`);
  console.log(`   GET  /api/security/sessions - Active sessions (admin only)`);
  console.log(`   DELETE /api/security/sessions/:id - Terminate session (admin only)`);
  console.log(`   GET  /api/security/locked-accounts - Locked accounts (admin only)`);
  console.log(`   POST /api/security/unlock/:userId - Unlock account (admin only)`);
  console.log(`   GET  /api/security/audit-logs - Audit logs with filters (admin only)`);
  console.log(`   POST /api/security/cleanup-sessions - Cleanup expired sessions (admin only)`);
  console.log(`   GET  /api/data-sources - List data sources`);
  console.log(`   POST /api/data-sources - Create data source`);
  console.log(`   GET  /api/data-sources/:id - Get data source`);
  console.log(`   PUT  /api/data-sources/:id - Update data source`);
  console.log(`   DELETE /api/data-sources/:id - Delete data source`);
  console.log(`   POST /api/data-sources/:id/test - Test data source`);
  console.log(`   POST /api/data-sources/:id/query - Execute query on data source`);
  console.log(`   POST /api/data-sources/:id/triggers/:triggerId/execute - Execute trigger`);
  console.log(`   GET  /api/plugins - List available plugins`);
  console.log(`   GET  /api/triggers - List triggers`);
  console.log(`   POST /api/triggers - Create trigger`);
  console.log(`   GET  /api/triggers/:id - Get trigger`);
  console.log(`   PUT  /api/triggers/:id - Update trigger`);
  console.log(`   DELETE /api/triggers/:id - Delete trigger`);
  console.log(`   GET  /api/config - Get current configuration`);
  console.log(`   PUT  /api/config - Update configuration (runtime)`);
  console.log(`   POST /api/setup/connection - Auto-setup new connection`);
  console.log(`   GET  /api/setup/templates - Get connection setup templates`);
  console.log(`   POST /api/database/test - Test database connection`);
  console.log(`   PUT  /api/database/config - Update database config (runtime)`);
  console.log(`   GET  /api/statistics - System statistics`);
  console.log('');
  console.log('🤖 AI Chat Integration:');
  console.log(`   POST /api/ai/chat - Process AI chat with trigger detection`);
  console.log(`   POST /api/ai/test-connection - Test AI API connection`);
  console.log(`   GET  /api/ai/connection-status - Get AI connection status`);
  console.log(`   GET  /api/ai/connections - Get AI connection config`);
  console.log(`   POST /api/ai/connections - Save AI connection config`);
  console.log(`   GET  /api/ai/triggers - Get AI triggers`);
  console.log(`   POST /api/ai/triggers - Create AI trigger`);
  console.log(`   PUT  /api/ai/triggers/:id - Update AI trigger`);
  console.log(`   DELETE /api/ai/triggers/:id - Delete AI trigger`);
  console.log('');
  console.log('🎯 Universal Data System:');
  console.log(`   GET  /pi/triggers - PI trigger management`);
  console.log(`   POST /pi/ask - WhatsApp command processing`);
  console.log(`   GET  /whatsapp/status - WhatsApp bot status`);
  console.log(`   GET  /whatsapp/qr - WhatsApp QR code image`);
  console.log(`   POST /whatsapp/connect - Connect to WhatsApp bot`);
  console.log(`   POST /whatsapp/disconnect - Disconnect WhatsApp bot`);
  console.log(`   GET  /whatsapp/messages - WhatsApp messages with spam detection`);
*/
  console.log(`   DELETE /whatsapp/messages - Delete all WhatsApp messages`);
  console.log(`   DELETE /whatsapp/contacts/:number - Delete individual contact`);
  console.log(`   POST /whatsapp/auto-delete - Manual trigger for auto-deletion`);
  console.log(`   NOTE: Message sending now uses /api/messages/outgoing (database-based queue)`);
  console.log(`   All data sources are accessed through /api/data-sources endpoints`);
});

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  dataSourceManager.stopHealthCheck();
  console.log('✅ Health check stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  dataSourceManager.stopHealthCheck();
  console.log('✅ Health check stopped');
  process.exit(0);
});
