// avevapi/plugins/ai/ai-service.js
// Simple AI Service - Just forwards to company AI API

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../../lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple AI Service - Forwards requests to company AI API
 */
export class AIService {
  constructor(config = {}) {
    this.config = config;
    this.httpClient = axios.create({
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Process AI request by forwarding to company API
   * @param {string} message - The message to send to AI
   * @param {Object} trigger - The trigger configuration
   * @returns {Object} AI response
   */
  async processAIRequest(message, trigger) {
    try {
      console.log(`🤖 Processing AI request for trigger: ${trigger.prefix}`);

      // Extract query from message (remove prefix)
      const query = message.replace(trigger.prefix, '').trim();

      if (!query) {
        return {
          success: false,
          error: 'No query provided after trigger prefix',
          timestamp: new Date().toISOString()
        };
      }

      // Load current AI configuration
      const aiConfig = await this.loadAIConfig();

      if (!aiConfig.endpoint) {
        return {
          success: false,
          error: 'AI endpoint not configured',
          timestamp: new Date().toISOString()
        };
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add API key if configured
      if (aiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      }

      console.log(`📡 Forwarding to company AI API: ${aiConfig.endpoint}`);

      // Forward request to company AI API
      const response = await this.httpClient.post(aiConfig.endpoint, {
        message: query
      }, { headers });

      console.log('✅ AI API response received');

      // 🔥 FIX: Remove status updates - let health check handle connection status
      // aiConfig.lastTested = new Date().toISOString();
      // aiConfig.testStatus = 'success';
      // await this.saveAIConfig(aiConfig);

      return {
        success: true,
        response: response.data.response || response.data,
        timestamp: new Date().toISOString(),
        trigger: trigger.name,
        query: query
      };

    } catch (error) {
      console.error('❌ AI Service Error:', error.message);

      // 🔥 FIX: Remove status updates - let health check handle connection status
      // try {
      //   const aiConfig = await this.loadAIConfig();
      //   aiConfig.lastTested = new Date().toISOString();
      //   aiConfig.testStatus = 'failed';
      //   await this.saveAIConfig(aiConfig);
      // } catch (configError) {
      //   console.error('Failed to update AI config on error:', configError);
      // }

      // Handle different error types
      let errorMessage = 'Unknown AI service error';

      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to AI service';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'AI service timeout';
      } else if (error.response) {
        errorMessage = `AI API error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test connection to AI service
   * @returns {Object} Test result
   */
  async testConnection(silent = true) {
    try {
      // Only log if not silent (manual test)
      if (!silent) console.log('🧪 Testing AI connection...');

      const aiConfig = await this.loadAIConfig();

      if (!aiConfig.endpoint) {
        return {
          success: false,
          message: 'AI endpoint not configured'
        };
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };

      if (aiConfig.apiKey) {
        headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      }

      // Send test request
      const response = await this.httpClient.post(aiConfig.endpoint, {
        message: 'test'
      }, {
        headers,
        timeout: 10000 // 10 seconds for test
      });

      // 🔥 FIX: Remove status updates - let health check handle connection status
      // aiConfig.lastTested = new Date().toISOString();
      // aiConfig.testStatus = 'success';
      // await this.saveAIConfig(aiConfig);

      return {
        success: true,
        message: 'Connection successful',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ AI Connection test failed:', error.message);

      // 🔥 FIX: Remove status updates - let health check handle connection status
      // try {
      //   const aiConfig = await this.loadAIConfig();
      //   aiConfig.lastTested = new Date().toISOString();
      //   aiConfig.testStatus = 'failed';
      //   await this.saveAIConfig(aiConfig);
      // } catch (configError) {
      //   console.error('Failed to update config:', configError);
      // }

      let errorMessage = 'Connection failed';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to AI service';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout';
      } else if (error.response) {
        errorMessage = `API error: ${error.response.status}`;
      }

      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Load AI configuration from database
   * @returns {Object} AI configuration
   */
  async loadAIConfig() {
    try {
      const row = db.preparedStatements.getDataSource.get('ai-connection');
      
      if (row) {
        const config = JSON.parse(row.config || '{}');
        return {
          endpoint: config.endpoint || '',
          apiKey: config.apiKey || '',
          enabled: config.enabled || false,
          lastTested: config.lastTested || null,
          testStatus: config.testStatus || 'not_tested'
        };
      }
      
      // Return default config if not found
      return {
        endpoint: '',
        apiKey: '',
        enabled: false,
        lastTested: null,
        testStatus: 'not_tested'
      };
    } catch (error) {
      console.error('Error loading AI config from database:', error.message);
      // Return default config on error
      return {
        endpoint: '',
        apiKey: '',
        enabled: false,
        lastTested: null,
        testStatus: 'not_tested'
      };
    }
  }

  /**
   * Save AI configuration to database
   * @param {Object} config - Configuration to save
   */
  async saveAIConfig(config) {
    try {
      const configJson = JSON.stringify(config);
      
      // Check if ai-connection exists
      const existing = db.preparedStatements.getDataSource.get('ai-connection');
      
      if (existing) {
        // Update existing
        db.preparedStatements.updateDataSource.run(
          'AI Connection',
          'AI',
          null, // database_type
          configJson,
          config.enabled ? 'connected' : 'disconnected',
          config.lastTested || new Date().toISOString(),
          config.testStatus,
          null, // test_error_message
          config.enabled ? 1 : 0,
          'ai-connection'
        );
      } else {
        // Insert new
        db.preparedStatements.insertDataSource.run(
          'ai-connection',
          'AI Connection',
          'AI',
          null, // database_type
          configJson,
          config.enabled ? 'connected' : 'disconnected',
          config.lastTested || new Date().toISOString(),
          config.testStatus,
          null, // test_error_message
          config.enabled ? 1 : 0
        );
      }
      
      // Silent save - no log (called frequently by health checks)
      // console.log('💾 AI config saved to database');
    } catch (error) {
      console.error('❌ Failed to save AI config:', error);
      throw error;
    }
  }

  /**
   * Update trigger usage count
   * @param {string} triggerId - Trigger ID to update
   */
  async updateTriggerUsage(triggerId) {
    try {
      const triggers = await this.loadAITriggers();
      const trigger = triggers.find(t => t.id === triggerId);

      if (trigger) {
        trigger.usageCount = (trigger.usageCount || 0) + 1;
        trigger.lastUsed = new Date().toISOString();
        await this.saveAITriggers(triggers);
      }
    } catch (error) {
      console.error('Failed to update trigger usage:', error);
    }
  }

  /**
   * Load AI triggers from database
   * @returns {Array} Array of AI triggers
   */
  async loadAITriggers() {
    try {
      const { default: db } = await import('../../lib/database.js');
      const triggers = db.preparedStatements.getAllAiTriggers.all();

      // Convert database format to service format
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

  /**
   * Save AI triggers to database
   * @param {Array} triggers - Triggers to save
   */
  async saveAITriggers(triggers) {
    try {
      const { default: db } = await import('../../lib/database.js');

      // For simplicity, we'll delete all and re-insert
      // In production, you might want more sophisticated update logic
      db.db.exec('DELETE FROM ai_triggers');

      for (const trigger of triggers) {
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
      }

      console.log('💾 AI triggers saved to database');
    } catch (error) {
      console.error('❌ Failed to save AI triggers to database:', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export default AIService;