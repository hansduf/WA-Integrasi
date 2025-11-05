// core/trigger-engine.js
import db from '../lib/database.js';
import { dataSourceManager } from './data-source-manager.js';
import { pluginLoader } from './plugin-loader.js';

/**
 * Trigger Engine - Executes triggers from data sources
 */
export class TriggerEngine {
  constructor() {
    this.activeTriggers = new Map();
    
    // Cache for getAvailableTriggers
    this.availableTriggersCache = null;
    this.triggersCacheTimestamp = null;
    this.triggersCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Invalidate the available triggers cache
   */
  invalidateCache() {
    console.log('🗑️ Invalidating trigger cache');
    this.availableTriggersCache = null;
    this.triggersCacheTimestamp = null;
  }

  /**
   * Execute trigger by name
   * @param {string} dataSourceId - Data source ID
   * @param {string} triggerName - Trigger name
   * @param {Object} params - Additional parameters
   * @returns {Promise<Object>} Execution result
   */
  async executeTrigger(dataSourceId, triggerName, params = {}) {
    try {
      console.log(`🚀 Executing trigger: ${dataSourceId}.${triggerName}`);

      // 1. Get data source
      const dataSource = await dataSourceManager.getDataSource(dataSourceId);
      if (!dataSource) {
        throw new Error(`Data source ${dataSourceId} not found`);
      }

      // 2. Get trigger from database
      const triggers = db.preparedStatements.getAllTriggers.all();
      const trigger = triggers.find(t => t.name === triggerName && t.data_source_id === dataSourceId);

      if (!trigger) {
        throw new Error(`Trigger ${triggerName} not found in data source ${dataSourceId}`);
      }

      // Parse config JSON
      const config = JSON.parse(trigger.config);
      
      // Convert database trigger to execution format
      const execTrigger = {
        id: trigger.id,
        name: trigger.name,
        type: trigger.type.toLowerCase(),
        config: config,
        active: trigger.active === 1,
        dataSourceId: trigger.data_source_id
      };

      if (!execTrigger.active) {
        throw new Error(`Trigger ${triggerName} is not active`);
      }

      // 3. Get plugin
      const plugin = pluginLoader.getPlugin(dataSource.plugin);

      // 4. Execute based on trigger type
      let result;
      switch (execTrigger.type) {
        case 'query':
          result = await this.executeQueryTrigger(plugin, execTrigger, params);
          break;
        case 'api':
          result = await this.executeApiTrigger(plugin, execTrigger, params);
          break;
        case 'composite':
          result = await this.executeCompositeTrigger(dataSource, execTrigger, params);
          break;
        default:
          throw new Error(`Unknown trigger type: ${execTrigger.type}`);
      }

      // 5. Format response
      const formattedResponse = this.formatResponse(result, execTrigger);

      console.log(`✅ Trigger ${triggerName} executed successfully`);
      return {
        success: true,
        trigger: triggerName,
        dataSource: dataSourceId,
        result: formattedResponse,
        metadata: {
          executedAt: new Date().toISOString(),
          resultCount: Array.isArray(result) ? result.length : 1,
          triggerType: execTrigger.type
        }
      };

    } catch (error) {
      console.error(`❌ Trigger execution failed:`, error.message);
      return {
        success: false,
        trigger: triggerName,
        dataSource: dataSourceId,
        error: error.message,
        metadata: {
          executedAt: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Execute query trigger
   * @param {Object} plugin - Plugin instance
   * @param {Object} trigger - Trigger configuration
   * @param {Object} params - Parameters
   * @returns {Promise<Array>} Query results
   */
  async executeQueryTrigger(plugin, trigger, params) {
    // Merge trigger config parameters with execution params
    const queryParams = {
      query: trigger.config.query,
      values: trigger.config.values || [],
      // Include interval from trigger config if available
      ...(trigger.interval && { interval: trigger.interval }),
      ...params
    };

    return await plugin.query(queryParams);
  }

  /**
   * Execute API trigger
   * @param {Object} plugin - Plugin instance
   * @param {Object} trigger - Trigger configuration
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} API response
   */
  async executeApiTrigger(plugin, trigger, params) {
    // For AVEVA PI plugin, extract tag from endpoint and pass as query parameter
    if (plugin.name === 'AVEVA PI System' && trigger.config.endpoint) {
      // Extract tag from endpoint URL
      const url = new URL(trigger.config.endpoint, 'http://dummy.com');
      const tag = url.searchParams.get('tag');

      if (tag) {
        // Pass tag as query parameter to executeQuery
        return await plugin.executeQuery(`tag=${tag}`, {
          interval: url.searchParams.get('interval') || '30m',
          start: url.searchParams.get('start'),
          end: url.searchParams.get('end'),
          ...params
        });
      }
    }

    // For other API plugins, execute the configured API call
    return await plugin.executeQuery(trigger.config.endpoint, params);
  }

  /**
   * Execute composite trigger (multiple triggers)
   * @param {Object} dataSource - Data source configuration
   * @param {Object} trigger - Composite trigger configuration
   * @param {Object} params - Parameters
   * @returns {Promise<Array>} Combined results
   */
  async executeCompositeTrigger(dataSource, trigger, params) {
    const results = [];
    const compositeTriggers = trigger.config.triggers || [];

    for (const subTriggerName of compositeTriggers) {
      try {
        const subResult = await this.executeTrigger(
          dataSource.id,
          subTriggerName,
          params
        );

        if (subResult.success) {
          results.push({
            trigger: subTriggerName,
            data: subResult.result
          });
        } else {
          results.push({
            trigger: subTriggerName,
            error: subResult.error
          });
        }
      } catch (error) {
        results.push({
          trigger: subTriggerName,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Find and execute trigger by message pattern
   * @param {string} message - User message
   * @returns {Promise<Object>} Execution result
   */
  async findAndExecuteTrigger(message) {
    const normalizedMessage = message.toLowerCase().trim();

    // Get all data sources
    const dataSources = await dataSourceManager.getAllDataSources();

    for (const dataSource of dataSources) {
      // Check each trigger in this data source
      const triggers = dataSource.triggers || [];
      for (const trigger of triggers) {
        if (!trigger.active) continue;

        // Check if message matches trigger name or aliases
        const triggerNames = [trigger.name];
        if (trigger.aliases) {
          triggerNames.push(...trigger.aliases);
        }

        const matches = triggerNames.some(name =>
          normalizedMessage === name.toLowerCase() ||
          normalizedMessage.includes(name.toLowerCase())
        );

        if (matches) {
          console.log(`🎯 Found matching trigger: ${trigger.name} in ${dataSource.id}`);
          return await this.executeTrigger(dataSource.id, trigger.name);
        }
      }
    }

    // No trigger found
    return {
      success: false,
      error: 'No matching trigger found',
      availableTriggers: await this.getAvailableTriggers()
    };
  }

  /**
   * Get all available triggers (with caching)
   * @returns {Promise<Array>} List of available triggers
   */
  async getAvailableTriggers() {
    // Check cache validity
    if (this.availableTriggersCache && 
        this.triggersCacheTimestamp && 
        (Date.now() - this.triggersCacheTimestamp) < this.triggersCacheTTL) {
      console.log('📋 Returning cached available triggers');
      return this.availableTriggersCache;
    }

    console.log('🔄 Computing fresh available triggers from database');
    const dataSources = await dataSourceManager.getAllDataSources();
    const triggers = [];

    // Get all triggers from database
    const dbTriggers = db.preparedStatements.getAllTriggers.all();
    
    for (const dbTrigger of dbTriggers) {
      if (dbTrigger.active === 1) {
        // Parse config JSON
        const config = JSON.parse(dbTrigger.config);
        
        // Find the data source this trigger belongs to
        const dataSource = dataSources.find(ds => ds.id === dbTrigger.data_source_id);
        const dataSourceExists = !!dataSource;

        triggers.push({
          id: dbTrigger.id,
          name: dbTrigger.name,
          dataSource: dbTrigger.data_source_id,
          description: config.desc || config.responsePrefix || dbTrigger.name,
          type: dbTrigger.type.toLowerCase(),
          aliases: [],
          dataSourceExists
        });
      }
    }

    // Update cache
    this.availableTriggersCache = triggers;
    this.triggersCacheTimestamp = Date.now();
    console.log(`✅ Cached ${triggers.length} available triggers from database`);

    return triggers;
  }

  /**
   * Format response for WhatsApp
   * @param {Array|Object} result - Query result
   * @param {Object} trigger - Trigger configuration
   * @returns {string} Formatted response
   */
  formatResponse(result, trigger) {
    const prefix = trigger.config.responsePrefix || '📊 DATA';
    let response = `*${prefix}*\n\n`;

    if (Array.isArray(result)) {
      if (result.length === 0) {
        response += '❌ No data found';
      } else {
        response += `📈 Found ${result.length} records\n\n`;

        // Limit to first 10 records for WhatsApp
        const displayRecords = result.slice(0, 10);

        displayRecords.forEach((record, index) => {
          response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          response += `📋 *Record ${index + 1}*\n`;

          // Format each field
          Object.entries(record).forEach(([key, value]) => {
            const formattedValue = this.formatFieldValue(value);
            response += `• ${key}: ${formattedValue}\n`;
          });

          response += '\n';
        });

        if (result.length > 10) {
          response += `... and ${result.length - 10} more records\n`;
        }

        response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `📱 Generated at ${new Date().toLocaleString('id-ID')}`;
      }
    } else if (typeof result === 'object') {
      // Single object result
      response += `📋 *Result*\n\n`;
      Object.entries(result).forEach(([key, value]) => {
        const formattedValue = this.formatFieldValue(value);
        response += `• ${key}: ${formattedValue}\n`;
      });
    } else {
      // Primitive result
      response += `📋 *Result*: ${result}`;
    }

    return response;
  }

  /**
   * Format field value for display
   * @param {*} value - Field value
   * @returns {string} Formatted value
   */
  formatFieldValue(value) {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    if (value instanceof Date) {
      return value.toLocaleString('id-ID');
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Get trigger statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    const dataSources = await dataSourceManager.getAllDataSources();

    const stats = {
      totalDataSources: dataSources.length,
      totalTriggers: 0,
      activeTriggers: 0,
      triggersByType: {},
      triggersByDataSource: {}
    };

    dataSources.forEach(ds => {
      stats.triggersByDataSource[ds.id] = 0;

      ds.triggers.forEach(trigger => {
        stats.totalTriggers++;

        if (trigger.active) {
          stats.activeTriggers++;
        }

        // Count by type
        stats.triggersByType[trigger.type] = (stats.triggersByType[trigger.type] || 0) + 1;

        // Count by data source
        stats.triggersByDataSource[ds.id]++;
      });
    });

    return stats;
  }
}

// Export singleton instance
export const triggerEngine = new TriggerEngine();
