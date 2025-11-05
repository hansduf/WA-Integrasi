// avevapi/routes/ai.js
// AI API Routes - Simple forwarding to company AI API

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../lib/database.js';
import {
  logAIChatProcessed,
  logAIMessageSent
} from '../utils/audit.utils.js';
import { getClientIP, getUserAgent } from '../utils/security.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
let aiService = null;

/**
 * Initialize AI routes
 * @param {Object} app - Express app instance
 * @param {Object} service - AI service instance
 */
export async function init(app, service) {
  aiService = service;
  app.use('/api/ai', router);
  console.log('🚀 AI routes initialized');
}

// POST /api/ai/chat - Process AI chat request
router.post('/chat', async (req, res) => {
  try {
    const { message, triggerId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!triggerId) {
      return res.status(400).json({ error: 'Trigger ID is required' });
    }

    // Find trigger
    const triggers = await loadAITriggers();
    const trigger = triggers.find(t => t.id === triggerId);

    if (!trigger) {
      return res.status(404).json({ error: 'AI trigger not found' });
    }

    console.log(`💬 Processing AI chat: "${message}" with trigger: ${trigger.prefix}`);

    // Process with AI service
    const result = await aiService.processAIRequest(message, trigger);

    // Update usage count on success
    if (result.success) {
      try {
        const { default: db } = await import('../lib/database.js');
        db.db.prepare('UPDATE ai_triggers SET usage_count = usage_count + 1, last_used = ? WHERE id = ?')
          .run(new Date().toISOString(), triggerId);
      } catch (e) { /* ignore */ }
    }

    // Audit logging for AI chat processing
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logAIChatProcessed(userId, triggerId, message, result, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log AI chat processing:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json(result);
  } catch (error) {
    console.error('❌ AI chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/test-connection - Test AI connection
router.post('/test-connection', async (req, res) => {
  try {
    console.log('🧪 Testing AI connection via API (manual test)');

    const result = await aiService.testConnection(false); // silent = false for manual test
    const userId = req.user?.id;
    const now = new Date().toISOString();

    // ✅ UPDATE DATABASE dengan hasil manual test (instant status update)
    try {
      const connectionStatus = result.success ? 'connected' : 'disconnected';
      const testStatus = result.success ? 'success' : 'failed';
      const errorMsg = result.success ? null : (result.message || 'Connection test failed');

      db.db.prepare(`
        UPDATE data_sources
        SET connection_status = ?,
            last_tested_at = ?,
            test_status = ?,
            test_error_message = ?,
            updated_at = ?
        WHERE id = ?
      `).run(connectionStatus, now, testStatus, errorMsg, now, 'ai-connection');

      console.log(`✅ Manual test result saved to DB: ${connectionStatus}`);
    } catch (dbError) {
      console.error('⚠️ Failed to save test result to DB:', dbError.message);
      // Don't fail the API call, but log warning
    }

    // Audit logging for AI connection test
    try {
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logAIMessageSent(userId, 'test-connection', 
        { action: 'manual-test', result: result.success, timestamp: now }, 
        ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log AI connection test:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({ 
      ...result, 
      statusUpdated: true,
      lastTestedAt: now,
      connectionStatus: result.success ? 'connected' : 'disconnected'
    });
  } catch (error) {
    console.error('❌ AI test connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/connection-status - Get connection status (REAL-TIME from database)
router.get('/connection-status', async (req, res) => {
  try {
    // 🔥 FIX: Read from database connection_status (real-time from health check)
    // instead of config JSON (which is stale)
    const { default: db } = await import('../lib/database.js');
    const row = db.preparedStatements.getDataSource.get('ai-connection');
    
    if (!row) {
      return res.json({
        status: 'not_configured',
        lastTested: null,
        testStatus: 'not_tested',
        endpoint: 'not_configured'
      });
    }
    
    const config = JSON.parse(row.config || '{}');
    const status = config.endpoint ? 'configured' : 'not_configured';
    
    // Use connection_status from database (updated by health check)
    // Map database connection_status to testStatus for frontend compatibility
    let testStatus = 'not_tested';
    if (row.connection_status === 'connected') {
      testStatus = 'success';
    } else if (row.connection_status === 'disconnected' || row.connection_status === 'error') {
      testStatus = 'failed';
    }

    res.json({
      status,
      lastTested: row.last_tested_at || config.lastTested,
      testStatus: testStatus, // Real-time status from health check
      endpoint: config.endpoint ? 'configured' : 'not_configured',
      connectionStatus: row.connection_status, // Include raw status for debugging
      errorMessage: row.test_error_message || null
    });
  } catch (error) {
    console.error('❌ AI connection status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET/POST /api/ai/connections - Manage AI connections
router.get('/connections', async (req, res) => {
  try {
    // 🔥 FIX: Read real-time status from database
    const { default: db } = await import('../lib/database.js');
    const row = db.preparedStatements.getDataSource.get('ai-connection');
    
    if (!row) {
      return res.json({
        endpoint: '',
        apiKey: '',
        enabled: false,
        lastTested: null,
        testStatus: 'not_tested'
      });
    }
    
    const config = JSON.parse(row.config || '{}');
    
    // Map database connection_status to testStatus
    let testStatus = 'not_tested';
    if (row.connection_status === 'connected') {
      testStatus = 'success';
    } else if (row.connection_status === 'disconnected' || row.connection_status === 'error') {
      testStatus = 'failed';
    }
    
    // Return config with apiKey as empty string (don't expose actual key)
    const safeConfig = {
      endpoint: config.endpoint || '',
      apiKey: '', // Always return empty string for security
      enabled: config.enabled || false,
      lastTested: row.last_tested_at || config.lastTested || null,
      testStatus: testStatus // Real-time from health check
    };

    res.json(safeConfig);
  } catch (error) {
    console.error('❌ AI get connections error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/connections', async (req, res) => {
  try {
    const { endpoint, apiKey, enabled } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Basic URL validation
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: 'Invalid endpoint URL format' });
    }

    const config = {
      endpoint,
      apiKey: apiKey || '',
      enabled: enabled !== undefined ? enabled : true,
      lastTested: new Date().toISOString(),
      testStatus: 'pending'
    };

    await aiService.saveAIConfig(config);

    console.log('💾 AI connection config saved');

    // Audit logging for AI connection configuration
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logAIMessageSent(userId, 'configure-connection', { endpoint, enabled, action: 'configure' }, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log AI connection configuration:', auditError);
      // Don't fail the request if audit logging fails
    }

    // Return config without API key
    const safeConfig = { ...config };
    delete safeConfig.apiKey;

    res.json({
      success: true,
      message: 'AI connection configured successfully',
      config: safeConfig
    });
  } catch (error) {
    console.error('❌ AI save connections error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ai/connections - Update AI connection
router.put('/connections', async (req, res) => {
  try {
    const { endpoint, apiKey, enabled } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Basic URL validation
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: 'Invalid endpoint URL format' });
    }

    const config = {
      endpoint,
      apiKey: apiKey || '',
      enabled: enabled !== undefined ? enabled : true,
      lastTested: new Date().toISOString(),
      testStatus: 'pending'
    };

    await aiService.saveAIConfig(config);

    console.log('💾 AI connection config updated');

    // Return config without API key
    const safeConfig = { ...config };
    delete safeConfig.apiKey;

    res.json({ success: true, message: 'AI connection updated successfully', config: safeConfig });
  } catch (error) {
    console.error('❌ AI update connections error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/ai/connections - Disable AI connection
router.delete('/connections', async (req, res) => {
  try {
    const config = {
      endpoint: '',
      apiKey: '',
      enabled: false,
      lastTested: null,
      testStatus: 'not_tested'
    };

    await aiService.saveAIConfig(config);

    console.log('🚫 AI connection disabled');

    res.json({ success: true, message: 'AI connection disabled successfully' });
  } catch (error) {
    console.error('❌ AI disable connections error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET/POST /api/ai/triggers - Manage AI triggers
router.get('/triggers', async (req, res) => {
  try {
    const triggers = await loadAITriggers();
    // ✅ Return in expected format: { success, data: [...] }
    res.json({ 
      success: true, 
      data: triggers,
      message: `Loaded ${triggers.length} AI triggers`
    });
  } catch (error) {
    console.error('❌ AI get triggers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/triggers', async (req, res) => {
  try {
    const { prefix, name, description } = req.body;

    if (!prefix) {
      return res.status(400).json({ error: 'Prefix is required' });
    }

    // Validate prefix format (should start with special character)
    if (!prefix.match(/^[^a-zA-Z0-9\s]/)) {
      return res.status(400).json({ error: 'Prefix must start with a special character (e.g., +, -, @, etc.)' });
    }

    // Check for duplicate prefix
    const existingTriggers = await loadAITriggers();
    const duplicate = existingTriggers.find(t => t.prefix === prefix);
    if (duplicate) {
      return res.status(400).json({ error: `Prefix "${prefix}" already exists` });
    }

    const newTrigger = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      prefix,
      name: name || 'AI Chat',
      description: description || 'Chat dengan AI perusahaan',
      enabled: true,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString()
    };

    // Save only the new trigger to database

    const dbTrigger = {
      id: newTrigger.id,
      type: newTrigger.type,
      prefix: newTrigger.prefix,
      name: newTrigger.name,
      description: newTrigger.description,
      enabled: newTrigger.enabled ? 1 : 0,
      usage_count: newTrigger.usageCount,
      last_used: newTrigger.lastUsed,
      created_at: newTrigger.createdAt,
      updated_at: new Date().toISOString()
    };

    try {
      db.preparedStatements.insertAiTrigger.run(
        dbTrigger.id,
        dbTrigger.type,
        dbTrigger.prefix,
        dbTrigger.name,
        dbTrigger.description,
        dbTrigger.enabled,
        dbTrigger.usage_count,
        dbTrigger.last_used,
        dbTrigger.created_at,
        dbTrigger.updated_at
      );

      console.log(`➕ AI trigger created: ${prefix} - ${name}`);
      res.json(newTrigger);
    } catch (dbError) {
      console.error('❌ Database error creating AI trigger:', dbError);
      throw new Error(`Database error: ${dbError.message || 'Failed to save trigger'}`);
    }
  } catch (error) {
    console.error('❌ AI create trigger error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Provide more specific error message
    let errorMessage = 'Unknown error occurred';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      errorMessage = `Database error: ${error.code}`;
    }

    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE /api/ai/triggers/:id - Delete AI trigger
router.delete('/triggers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { default: db } = await import('../lib/database.js');

    // Check if trigger exists
    const existingTrigger = db.preparedStatements.getAiTrigger.get(id);
    if (!existingTrigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // Delete from database
    const deleteStmt = db.db.prepare('DELETE FROM ai_triggers WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    console.log(`🗑️ AI trigger deleted from database: ${id}`);

    res.json({ success: true, message: 'Trigger deleted successfully' });
  } catch (error) {
    console.error('❌ AI delete trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ai/triggers/:id - Update AI trigger
router.put('/triggers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { prefix, name, description, enabled } = req.body;

    const triggers = await loadAITriggers();
    const trigger = triggers.find(t => t.id === id);

    if (!trigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // Update fields
    if (prefix !== undefined) trigger.prefix = prefix;
    if (name !== undefined) trigger.name = name;
    if (description !== undefined) trigger.description = description;
    if (enabled !== undefined) trigger.enabled = enabled;

    await saveAITriggers(triggers);

    console.log(`✏️ AI trigger updated: ${id}`);

    res.json(trigger);
  } catch (error) {
    console.error('❌ AI update trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ai/triggers/:id/usage - Update trigger usage count
router.put('/triggers/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { default: db } = await import('../lib/database.js');

    // Direct database update - faster and cleaner
    const now = new Date().toISOString();
    
    const stmt = db.db.prepare(`
      UPDATE ai_triggers 
      SET usage_count = usage_count + 1, 
          last_used = ?,
          updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, now, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // Get updated trigger to return new count
    const trigger = db.db.prepare('SELECT * FROM ai_triggers WHERE id = ?').get(id);

    console.log(`📊 AI trigger usage updated: ${trigger.name} (usage_count: ${trigger.usage_count})`);

    res.json({ 
      success: true, 
      usageCount: trigger.usage_count,
      lastUsed: trigger.last_used
    });
  } catch (error) {
    console.error('❌ AI update trigger usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for database operations
async function loadAITriggers() {
  try {
    const { default: db } = await import('../lib/database.js');
    const triggers = db.preparedStatements.getAllAiTriggers.all();

    // Convert database format to API format
    return triggers.map(trigger => ({
      id: trigger.id,
      type: trigger.type,
      prefix: trigger.prefix,
      name: trigger.name,
      description: trigger.description,
      enabled: trigger.enabled === 1,
      usageCount: trigger.usage_count,
      lastUsed: trigger.last_used,
      createdAt: trigger.created_at
    }));
  } catch (error) {
    console.error('❌ Failed to load AI triggers from database:', error);
    return [];
  }
}

async function saveAITriggers(triggers) {
  try {
    console.log('💾 Starting saveAITriggers with', triggers.length, 'triggers');
    const { default: db } = await import('../lib/database.js');

    // Instead of DELETE ALL + RE-INSERT (dangerous), let's use individual UPSERT
    // This prevents data loss if one trigger fails
    console.log('� Using individual UPSERT operations...');

    let savedCount = 0;
    for (const trigger of triggers) {
      console.log(`📝 Processing trigger: ${trigger.id} - ${trigger.prefix}`);

      const dbTrigger = {
        id: trigger.id,
        type: trigger.type || 'ai',
        prefix: trigger.prefix,
        name: trigger.name,
        description: trigger.description,
        enabled: trigger.enabled ? 1 : 0,
        usage_count: trigger.usageCount || 0,
        last_used: trigger.lastUsed,
        created_at: trigger.createdAt,
        updated_at: new Date().toISOString()
      };

      console.log('🔧 Trigger data:', dbTrigger);

      try {
        // Use UPSERT: INSERT OR REPLACE
        const stmt = db.db.prepare(`
          INSERT OR REPLACE INTO ai_triggers (id, type, prefix, name, description, enabled, usage_count, last_used, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          dbTrigger.id,
          dbTrigger.type,
          dbTrigger.prefix,
          dbTrigger.name,
          dbTrigger.description,
          dbTrigger.enabled,
          dbTrigger.usage_count,
          dbTrigger.last_used,
          dbTrigger.created_at,
          dbTrigger.updated_at
        );

        savedCount++;
        console.log(`✅ Saved trigger ${trigger.id}`);
      } catch (insertError) {
        console.error(`❌ Failed to save trigger ${trigger.id}:`, insertError);
        console.error('Trigger data that failed:', dbTrigger);
        throw new Error(`Failed to save trigger ${trigger.id}: ${insertError.message || 'Database error'}`);
      }
    }

    console.log(`💾 Successfully saved ${savedCount} AI triggers to database`);
  } catch (error) {
    console.error('❌ Failed to save AI triggers to database:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      stack: error.stack
    });
    throw error;
  }
}

export default { init };