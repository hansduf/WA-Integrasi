// core/data-source-manager.js
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../lib/database.js';
import { pluginLoader } from './plugin-loader.js';
import { triggerEngine } from './trigger-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Data Source Manager - Manages all data source connections
 */
export class DataSourceManager {
  constructor() {
    this.sources = new Map(); // id -> { dataSource, pluginInstance }
    
    // Cache for getAllDataSources
    this.dataSourcesCache = null;
    this.cacheTimestamp = null;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Prepare plugin config with additional fields for specific plugins
   * @param {Object} dataSource - Data source           // Fallback: Try to load AVEVA PI plugin manually if not loaded
          if (dataSource.plugin === 'aveva-pi') {
            console.log(`🔄 AVEVA PI plugin not loaded, attempting manual load...`);
            try {
              const pluginPath = path.join(__dirname, 'plugins', 'aveva-pi', 'index.js');
              console.log(`__dirname: ${__dirname}`);
              console.log(`Plugin path: ${pluginPath}`);
              console.log(`File exists: ${fs.existsSync(pluginPath)}`);
              const fileUrl = `file://${pluginPath.replace(/\\/g, '/')}`;
              console.log(`Loading plugin from: ${fileUrl}`);
              const pluginModule = await import(fileUrl);
              plugin = pluginModule.default || pluginModule;
              pluginLoader.plugins.set('aveva-pi', plugin);
              console.log(`✅ AVEVA PI plugin loaded manually`);
            } catch (manualLoadError) {
              console.error(`❌ Failed to manually load AVEVA PI plugin:`, manualLoadError.message);
              throw pluginError;
            }
          } else {
            throw pluginError;
          } {Object} Prepared plugin config
   */
  preparePluginConfig(dataSource) {
    const pluginConfig = { ...dataSource.config };

    // For database plugin, include databaseType as driver field
    if (dataSource.plugin === 'database' && dataSource.databaseType) {
      pluginConfig.driver = dataSource.databaseType;
    }

    return pluginConfig;
  }

  /**
   * Add new data source
   * @param {Object} config - Data source configuration
   * @returns {Promise<Object>} Created data source
   */
  async addDataSource(config) {
    const { id, plugin: pluginName, name, config: pluginConfig, databaseType } = config;

    console.log(`🔧 Adding data source: ${id} (${pluginName})`);

    try {
      // 1. Load plugin
      const plugin = pluginLoader.getPlugin(pluginName);

      // 2. Prepare plugin config with additional fields
      const preparedConfig = this.preparePluginConfig({ plugin: pluginName, config: pluginConfig, databaseType });

      // 3. Validate configuration
      console.log('🔍 Validating configuration...');
      await plugin.validateConfig(preparedConfig);

      // 4. Test connection
      console.log('🔗 Testing connection...');
      const connection = await plugin.connect(preparedConfig);
      const testResult = await plugin.testConnection();

      // Handle both boolean and object responses
      const isSuccess = typeof testResult === 'boolean' 
        ? testResult 
        : (testResult?.success === true);

      if (!isSuccess) {
        const errorMsg = typeof testResult === 'object' && testResult?.message
          ? testResult.message
          : 'Connection test failed';
        throw new Error(errorMsg);
      }

      // 4. Discover schema
      console.log('🔎 Discovering schema...');
      const schema = await plugin.discoverSchema();

  // 5. Generate triggers (disabled globally)
  // NOTE: automatic generation of plugin-provided triggers is disabled to avoid
  // creating built-in triggers when a user simply adds a connection. Users
  // should create triggers manually via the triggers UI/API.
  console.log('🎯 Skipping automatic trigger generation (global setting)');
  const triggers = [];

      // 6. Create data source object
      const dataSource = {
        id,
        plugin: pluginName,
        name: name || id,
        config: pluginConfig,
        databaseType, // Include databaseType for database plugins
        schema,
        triggers,
        status: 'connected',
        lastTested: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          pluginVersion: plugin.version,
          schemaDiscoveryTime: new Date().toISOString()
        }
      };

      // 7. Save to file
      await this.saveDataSource(dataSource);

      // 8. Store in memory with plugin instance
      this.sources.set(id, { dataSource, pluginInstance: plugin });

      // 9. Invalidate cache
      this.invalidateCache();
      triggerEngine.invalidateCache();

      console.log(`✅ Data source ${id} added successfully`);
      return dataSource;

    } catch (error) {
      console.error(`❌ Failed to add data source ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update existing data source
   * @param {string} id - Data source ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated data source
   */
  async updateDataSource(id, updates) {
    const dataSource = await this.getDataSource(id);

    try {
      // Handle config updates that require re-validation
      if (updates.config) {
        const plugin = pluginLoader.getPlugin(dataSource.plugin);

        // Prepare config with databaseType if it's a database plugin
        const preparedConfig = this.preparePluginConfig({
          plugin: dataSource.plugin,
          config: updates.config,
          databaseType: updates.databaseType || dataSource.databaseType
        });

        await plugin.validateConfig(preparedConfig);

        // Test new connection
        const connection = await plugin.connect(preparedConfig);
        const testResult = await plugin.testConnection();

        // Handle both boolean and object responses
        const isSuccess = typeof testResult === 'boolean' 
          ? testResult 
          : (testResult?.success === true);

        if (!isSuccess) {
          const errorMsg = typeof testResult === 'object' && testResult?.message
            ? testResult.message
            : 'New configuration connection test failed';
          throw new Error(errorMsg);
        }

  // Re-discover schema if config changed
  console.log('🔄 Re-discovering schema due to config change...');
  const newSchema = await plugin.discoverSchema();
  updates.schema = newSchema;
  // Keep existing triggers as-is. Do not auto-generate new builtin triggers
  // when updating the connection. Users manage triggers explicitly.
  updates.triggers = dataSource.triggers || [];
  updates.lastTested = new Date().toISOString();
      }

      // Apply updates
      const updatedDataSource = {
        ...dataSource,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Save and update memory
      await this.saveDataSource(updatedDataSource);
      
      // Get existing plugin instance or create new one
      let pluginInstance = null;
      try {
        pluginInstance = pluginLoader.getPlugin(updatedDataSource.plugin);
        const preparedConfig = this.preparePluginConfig(updatedDataSource);
        await pluginInstance.connect(preparedConfig);
      } catch (error) {
        console.warn(`⚠️ Could not create plugin instance for updated data source ${id}: ${error.message}`);
      }
      
      this.sources.set(id, { dataSource: updatedDataSource, pluginInstance });

      // Invalidate cache
      this.invalidateCache();
      triggerEngine.invalidateCache();

      console.log(`✅ Data source ${id} updated successfully`);
      return updatedDataSource;

    } catch (error) {
      console.error(`❌ Failed to update data source ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove data source
   * @param {string} id - Data source ID
   * @returns {Promise<boolean>} True if removed
   */
  async removeDataSource(id) {
    try {
      const dataSource = await this.getDataSource(id);

      // Remove from database
      db.preparedStatements.deleteDataSource.run(id);

      // Remove from memory
      this.sources.delete(id);

      // Invalidate cache
      this.invalidateCache();
      triggerEngine.invalidateCache();

      console.log(`✅ Data source ${id} removed successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to remove data source ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Get data source by ID
   * @param {string} id - Data source ID
   * @returns {Promise<Object>} Data source object
   */
  async getDataSource(id) {
    // Check memory first
    if (this.sources.has(id)) {
      const entry = this.sources.get(id);
      // Always refresh plugin instance to ensure latest config
      try {
        const plugin = pluginLoader.getPlugin(entry.dataSource.plugin);
        const preparedConfig = this.preparePluginConfig(entry.dataSource);
        await plugin.connect(preparedConfig);
        entry.pluginInstance = plugin;
        // Update status to connected when reconnection is successful
        entry.dataSource.status = 'connected';
        entry.dataSource.lastTested = new Date().toISOString();
        await this.saveDataSource(entry.dataSource);
        // Reduced logging: no output for normal operation
      } catch (connectError) {
        const errorMessage = connectError.message || 'Unknown connection error';
        // Only log warnings, no verbose success messages
        entry.pluginInstance = null;
        entry.dataSource.status = 'error';
        entry.dataSource.lastTested = new Date().toISOString();
        await this.saveDataSource(entry.dataSource);
      }
      return entry.dataSource;
    }

    // Load from file
    try {
      const dataSource = await this.loadDataSource(id);

      // Create plugin instance for loaded data source
      try {
        const plugin = pluginLoader.getPlugin(dataSource.plugin);
        const preparedConfig = this.preparePluginConfig(dataSource);
        await plugin.connect(preparedConfig);
        // Update status to connected when connection is successful
        dataSource.status = 'connected';
        dataSource.lastTested = new Date().toISOString();
        await this.saveDataSource(dataSource);
        this.sources.set(id, { dataSource, pluginInstance: plugin });
      } catch (connectError) {
        const errorMessage = connectError.message || 'Unknown connection error';
        console.warn(`⚠️ Failed to reconnect data source ${id}: ${errorMessage}`);
        // Still store data source but mark as error
        dataSource.status = 'error';
        dataSource.lastTested = new Date().toISOString();
        this.sources.set(id, { dataSource, pluginInstance: null });
        await this.saveDataSource(dataSource);
      }

      return dataSource;
    } catch (error) {
      throw new Error(`Data source ${id} not found`);
    }
  }

  /**
   * Invalidate data sources cache
   */
  invalidateCache() {
    this.dataSourcesCache = null;
    this.cacheTimestamp = null;
    console.log('🗑️ Data sources cache invalidated');
  }

  /**
   * Get all data sources from database (with caching)
   * @returns {Promise<Array>} Array of data sources
   */
  async getAllDataSources() {
    // If we have data in memory, return with connection status
    if (this.sources.size > 0) {
      const dataSources = [];
      
      for (const [id, sourceEntry] of this.sources.entries()) {
        dataSources.push({
          ...sourceEntry.dataSource,
          connected: sourceEntry.connected,
          status: sourceEntry.connected ? 'connected' : 'disconnected',
          lastConnected: sourceEntry.lastConnected,
          lastAttempt: sourceEntry.lastAttempt,
          error: sourceEntry.error
        });
      }

      console.log(`📋 Returning ${dataSources.length} data sources from memory (${dataSources.filter(ds => ds.connected).length} connected)`);
      return dataSources;
    }

    // Otherwise, load from database
    try {
      const rows = db.preparedStatements.getAllDataSources.all();
      const dataSources = rows.map(row => ({
        id: row.id,
        name: row.name,
        plugin: row.plugin,
        databaseType: row.database_type,
        config: JSON.parse(row.config || '{}'),
        status: row.connection_status,
        lastTested: row.last_tested_at,
        active: Boolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        connected: false,
        schema: {},
        triggers: [],
        metadata: {}
      }));

      console.log(`📋 Returning ${dataSources.length} data sources from database`);
      return dataSources;
    } catch (error) {
      console.error('Error loading data sources from database:', error.message);
      return [];
    }
  }

  /**
   * Load and connect all data sources on startup (CRITICAL for Dashboard)
   * @returns {Promise<Object>} Connection results summary
   */
  async loadAndConnectAllDataSources() {
    console.log('🔄 Loading and connecting all data sources from database...');
    
    // Get all data sources from database
    const rows = db.preparedStatements.getAllDataSources.all();

    const results = {
      success: [],
      failed: [],
      total: rows.length
    };

    for (const row of rows) {
      const id = row.id;
      try {
        // Load data source from file
        const dataSource = await this.loadDataSourceFromFile(id);
        
        // Skip if plugin is invalid/undefined
        if (!dataSource.plugin || dataSource.plugin === 'undefined') {
          console.warn(`⚠️ Skipping ${id}: Invalid plugin name`);
          results.failed.push({ id, error: 'Invalid plugin name' });
          continue;
        }
        
        // Check if plugin exists
        let plugin;
        try {
          plugin = pluginLoader.getPlugin(dataSource.plugin);
        } catch (pluginError) {
          // Plugin not found, skip with warning
          console.warn(`⚠️ Skipping ${id}: Plugin "${dataSource.plugin}" not available`);
          
          // Load to memory but mark as failed
          this.sources.set(id, {
            dataSource,
            pluginInstance: null,
            connected: false,
            error: `Plugin ${dataSource.plugin} not available`,
            lastAttempt: new Date().toISOString()
          });
          
          results.failed.push({ id, error: `Plugin ${dataSource.plugin} not available` });
          continue;
        }

        // Prepare config and CONNECT
        const preparedConfig = this.preparePluginConfig(dataSource);
        await plugin.connect(preparedConfig);
        
        // Store in memory with connection status
        this.sources.set(id, {
          dataSource,
          pluginInstance: plugin,
          connected: true,
          lastConnected: new Date().toISOString()
        });
        
        results.success.push(id);
        // Reduced logging: only show connection name, not ID
        
      } catch (error) {
        // Only log error message, not full stack
        
        // Still load to memory but mark as failed
        try {
          const dataSource = await this.loadDataSourceFromFile(id);
          this.sources.set(id, {
            dataSource,
            pluginInstance: null,
            connected: false,
            error: error.message,
            lastAttempt: new Date().toISOString()
          });
        } catch (loadError) {
          // Silently continue
        }
        
        results.failed.push({ id, error: error.message });
      }
    }
    
    console.log(`\n📊 Connection Summary:`);
    console.log(`   Total: ${results.total}`);
    console.log(`   ✅ Success: ${results.success.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    
    return results;
  }

  /**
   * Start periodic health check for all connections (every 30 seconds)
   * Silent mode - only logs important events (failures/reconnections)
   * NOW UPDATES DATABASE for real-time status
   * WITH DEBOUNCE: Status only changes after consecutive failures/successes
   */
  startHealthCheck() {
    console.log('💓 Health check service started (30s interval, silent mode, DB sync enabled, debounce active)');

    this.healthCheckInterval = setInterval(async () => {
      let checked = 0;
      let healthy = 0;
      let reconnected = 0;
      let failed = 0;
      const failedSources = [];
      const reconnectedSources = [];

      for (const [id, sourceEntry] of this.sources.entries()) {
        checked++;

        try {
          // ✅ SKIP AI CONNECTION - disabled to control API costs (manual test only)
          if (id === 'ai-connection') {
            console.log('⏭️ Skipping ai-connection (manual test only - no auto health checks)');
            continue;
          }

          // Skip if plugin doesn't exist (e.g., ai-connection without ai plugin)
          const pluginName = sourceEntry.dataSource.plugin;
          if (!pluginName || pluginName === 'undefined') {
            // Silently skip invalid plugins
            continue;
          }

          // Initialize debounce counters if not exist
          if (sourceEntry.consecutiveFailures === undefined) {
            sourceEntry.consecutiveFailures = 0;
          }
          if (sourceEntry.consecutiveSuccesses === undefined) {
            sourceEntry.consecutiveSuccesses = 0;
          }
          if (sourceEntry.lastReportedStatus === undefined) {
            sourceEntry.lastReportedStatus = sourceEntry.connected ? 'connected' : 'disconnected';
          }

          // Check if plugin exists before using it
          try {
            pluginLoader.getPlugin(pluginName);
          } catch (pluginError) {
            // Plugin doesn't exist, skip silently
            sourceEntry.connected = false;
            sourceEntry.error = `Plugin ${pluginName} not available`;

            // 🔥 UPDATE DATABASE: Mark as disconnected (with debounce)
            await this.updateConnectionStatusWithDebounce(id, 'disconnected', sourceEntry.error, sourceEntry);
            continue;
          }
          
          if (!sourceEntry.connected || !sourceEntry.pluginInstance) {
            // Try to reconnect failed connections
            const plugin = pluginLoader.getPlugin(sourceEntry.dataSource.plugin);
            const preparedConfig = this.preparePluginConfig(sourceEntry.dataSource);
            await plugin.connect(preparedConfig);
            
            sourceEntry.pluginInstance = plugin;
            sourceEntry.connected = true;
            sourceEntry.lastConnected = new Date().toISOString();
            delete sourceEntry.error;
            
            reconnected++;
            reconnectedSources.push(sourceEntry.dataSource.name);
            
            // 🔥 UPDATE DATABASE: Mark as connected (with debounce)
            await this.updateConnectionStatusWithDebounce(id, 'connected', null, sourceEntry);
            
          } else {
            // Test existing connection (silently)
            const testResult = await sourceEntry.pluginInstance.testConnection();
            
            // 🔥 FIX: Handle both boolean and object responses
            // Some plugins return boolean (true/false)
            // Some plugins return object { success: true/false }
            const isHealthy = typeof testResult === 'boolean' 
              ? testResult 
              : (testResult?.success === true);
            
            if (isHealthy) {
              healthy++;
              
              // 🔥 UPDATE DATABASE: Confirm still connected (with debounce)
              await this.updateConnectionStatusWithDebounce(id, 'connected', null, sourceEntry);
            } else {
              sourceEntry.connected = false;
              
              // Extract error message from object response if available
              const errorMsg = typeof testResult === 'object' && testResult?.message
                ? testResult.message
                : 'Health check failed';
              
              sourceEntry.error = errorMsg;
              failed++;
              failedSources.push(sourceEntry.dataSource.name);
              
              // 🔥 UPDATE DATABASE: Mark as disconnected (with debounce)
              await this.updateConnectionStatusWithDebounce(id, 'disconnected', errorMsg, sourceEntry);
            }
          }
        } catch (error) {
          sourceEntry.connected = false;
          sourceEntry.error = error.message;
          sourceEntry.lastAttempt = new Date().toISOString();
          failed++;
          failedSources.push(`${sourceEntry.dataSource.name}: ${error.message}`);
          
          // 🔥 UPDATE DATABASE: Mark as error (with debounce)
          await this.updateConnectionStatusWithDebounce(id, 'error', error.message, sourceEntry);
        }
      }
      
      // Only log if there are issues or reconnections
      if (failed > 0 || reconnected > 0) {
        const timestamp = new Date().toISOString();
        console.log(`\n💓 [${timestamp}] Health check: ${healthy} healthy, ${failed} failed, ${reconnected} reconnected`);
        
        if (reconnectedSources.length > 0) {
          console.log(`   ✅ Reconnected: ${reconnectedSources.join(', ')}`);
        }
        
        if (failedSources.length > 0) {
          console.log(`   ❌ Failed: ${failedSources.join(', ')}`);
        }
      }
      // Else: All healthy, no output (silent)
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop health check service
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      console.log('💓 Health check service stopped');
    }
  }

  /**
   * Update connection status in database with debounce logic
   * Status only changes after consecutive failures/successes to prevent flip-flopping
   * @param {string} id - Data source ID
   * @param {string} newStatus - New status ('connected', 'disconnected', 'error')
   * @param {string} errorMessage - Optional error message
   * @param {Object} sourceEntry - Source entry object with debounce counters
   */
  async updateConnectionStatusWithDebounce(id, newStatus, errorMessage = null, sourceEntry) {
    const DEBOUNCE_THRESHOLD = 3; // Require 3 consecutive tests before changing status

    // Update consecutive counters
    if (newStatus === 'connected') {
      sourceEntry.consecutiveSuccesses++;
      sourceEntry.consecutiveFailures = 0;
    } else {
      sourceEntry.consecutiveFailures++;
      sourceEntry.consecutiveSuccesses = 0;
    }

    // Only update status if we have enough consecutive results OR if status actually changed
    const shouldUpdate = (
      (newStatus === 'connected' && sourceEntry.consecutiveSuccesses >= DEBOUNCE_THRESHOLD) ||
      (newStatus !== 'connected' && sourceEntry.consecutiveFailures >= DEBOUNCE_THRESHOLD) ||
      (sourceEntry.lastReportedStatus !== newStatus)
    );

    if (shouldUpdate) {
      // Status changed significantly - update database directly
      try {
        const now = new Date().toISOString();

        // Update using raw SQL since we don't have a dedicated prepared statement
        db.db.prepare(`
          UPDATE data_sources
          SET connection_status = ?,
              last_tested_at = ?,
              test_status = ?,
              test_error_message = ?,
              updated_at = ?
          WHERE id = ?
        `).run(newStatus, now, newStatus === 'connected' ? 'success' : 'failed', errorMessage, now, id);

        sourceEntry.lastReportedStatus = newStatus;

        // Reset counters after status change
        sourceEntry.consecutiveSuccesses = 0;
        sourceEntry.consecutiveFailures = 0;

        console.log(`🔄 [${id}] Status changed to ${newStatus} (debounced)`);
      } catch (error) {
        // Silently fail - don't break health check if DB update fails
        console.error(`⚠️ Failed to update connection status in DB for ${id}:`, error.message);
      }
    } else {
      // Status stable - no logging needed, only log when status actually changes
      // Removed verbose test result logging to reduce log noise
      // console.log(`📊 [${id}] Test result: ${newStatus}, consecutive: ${newStatus === 'connected' ? sourceEntry.consecutiveSuccesses : sourceEntry.consecutiveFailures}/${DEBOUNCE_THRESHOLD}`);
    }
  }

  /**
   * Load data source from database without connection
   * @param {string} id - Data source ID
   * @returns {Promise<Object>} Data source object
   */
  async loadDataSourceFromFile(id) {
    // Now loads from database instead of file
    return await this.loadDataSource(id);
  }

  /**
   * Test data source connection
   * @param {string} id - Data source ID
   * @returns {Promise<Object>} Test result
   */
  async testDataSource(id) {
    try {
      let sourceEntry = this.sources.get(id);
      
      // If not in memory, try to load from file (shouldn't happen with auto-connect)
      if (!sourceEntry) {
        console.warn(`⚠️ Data source ${id} not in memory, attempting to load...`);
        try {
          const dataSource = await this.loadDataSourceFromFile(id);
          const plugin = pluginLoader.getPlugin(dataSource.plugin);
          const preparedConfig = this.preparePluginConfig(dataSource);
          await plugin.connect(preparedConfig);
          
          this.sources.set(id, {
            dataSource,
            pluginInstance: plugin,
            connected: true,
            lastConnected: new Date().toISOString()
          });
          
          sourceEntry = this.sources.get(id);
          console.log(`✅ Loaded and connected ${id}`);
        } catch (loadError) {
          throw new Error(`Data source ${id} not found: ${loadError.message}`);
        }
      }

      const { dataSource, pluginInstance } = sourceEntry;

      if (!pluginInstance) {
        console.log(`🔄 Reconnecting plugin for ${id}...`);
        try {
          const plugin = pluginLoader.getPlugin(dataSource.plugin);
          const preparedConfig = this.preparePluginConfig(dataSource);
          await plugin.connect(preparedConfig);
          sourceEntry.pluginInstance = plugin;
          sourceEntry.connected = true;
          sourceEntry.lastConnected = new Date().toISOString();
          delete sourceEntry.error;
          console.log(`✅ Reconnected plugin for ${id}`);
        } catch (connectError) {
          console.log(`❌ Reconnection failed for ${id}:`, connectError.message);
          sourceEntry.connected = false;
          sourceEntry.error = connectError.message;
          sourceEntry.lastAttempt = new Date().toISOString();
          return {
            success: false,
            status: 'error',
            lastTested: new Date().toISOString(),
            message: `Reconnection failed: ${connectError.message}`
          };
        }
      }

      console.log(`🔗 Testing connection for ${id}...`);
      const result = await sourceEntry.pluginInstance.testConnection();

      // Handle both boolean and object responses
      const isSuccess = typeof result === 'boolean' 
        ? result 
        : (result?.success === true);

      // Update status
      dataSource.status = isSuccess ? 'connected' : 'failed';
      sourceEntry.connected = isSuccess;
      if (isSuccess) {
        sourceEntry.lastConnected = new Date().toISOString();
        delete sourceEntry.error;
      } else {
        const errorMsg = typeof result === 'object' && result?.message
          ? result.message
          : 'Connection test failed';
        sourceEntry.error = errorMsg;
        sourceEntry.lastAttempt = new Date().toISOString();
      }
      dataSource.lastTested = new Date().toISOString();
      await this.saveDataSource(dataSource);

      return {
        success: result,
        status: dataSource.status,
        lastTested: dataSource.lastTested,
        message: result ? 'Connection successful' : 'Connection failed'
      };

    } catch (error) {
      console.error(`❌ Connection test failed for ${id}:`, error.message);
      return {
        success: false,
        status: 'error',
        lastTested: new Date().toISOString(),
        message: error.message
      };
    }
  }

  /**
   * Save data source to database
   * @param {Object} dataSource - Data source object
   */
  async saveDataSource(dataSource) {
    try {
      const configJson = JSON.stringify(dataSource.config || {});
      
      // Check if data source exists
      const existing = db.preparedStatements.getDataSource.get(dataSource.id);
      
      if (existing) {
        // Update existing data source
        db.preparedStatements.updateDataSource.run(
          dataSource.name || dataSource.id,
          dataSource.plugin || 'unknown',
          dataSource.databaseType || null,
          configJson,
          dataSource.status || 'unknown',
          dataSource.lastTested || new Date().toISOString(),
          null, // test_status
          null, // test_error_message
          dataSource.active !== false ? 1 : 0,
          dataSource.id
        );
      } else {
        // Insert new data source
        db.preparedStatements.insertDataSource.run(
          dataSource.id,
          dataSource.name || dataSource.id,
          dataSource.plugin || 'unknown',
          dataSource.databaseType || null,
          configJson,
          dataSource.status || 'unknown',
          dataSource.lastTested || new Date().toISOString(),
          null, // test_status
          null, // test_error_message
          dataSource.active !== false ? 1 : 0
        );
      }
    } catch (error) {
      console.error(`Error saving data source ${dataSource.id} to database:`, error.message);
      throw error;
    }
  }

  /**
   * Load data source from database
   * @param {string} id - Data source ID
   * @returns {Promise<Object>} Data source object
   */
  async loadDataSource(id) {
    try {
      const row = db.preparedStatements.getDataSource.get(id);
      
      if (!row) {
        throw new Error(`Data source not found: ${id}`);
      }

      // Convert database row to data source object
      return {
        id: row.id,
        name: row.name,
        plugin: row.plugin,
        databaseType: row.database_type,
        config: JSON.parse(row.config || '{}'),
        status: row.connection_status,
        lastTested: row.last_tested_at,
        active: Boolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        schema: {}, // Schema not stored in DB, will be discovered on connect
        triggers: [], // Triggers are in separate table
        metadata: {}
      };
    } catch (error) {
      console.error(`Error loading data source ${id} from database:`, error.message);
      throw error;
    }
  }



  /**
   * Execute query on specific data source
   * @param {string} id - Data source ID
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(id, queryParams) {
    try {
      console.log(`🔍 Executing query on data source: ${id}`);

      // Get data source entry with refresh logic
      let dataSourceEntry = this.sources.get(id);
      if (!dataSourceEntry) {
        // Load from file if not in memory
        const dataSource = await this.loadDataSource(id);
        let plugin;
        try {
          plugin = pluginLoader.getPlugin(dataSource.plugin);
        } catch (pluginError) {
          // Fallback: Try to load AVEVA PI plugin manually if not loaded
          if (dataSource.plugin === 'aveva-pi') {
            console.log(`🔄 AVEVA PI plugin not loaded, attempting manual load...`);
            try {
              const pluginPath = path.join(__dirname, '..', 'plugins', 'aveva-pi', 'index.js');
              const fileUrl = `file://${pluginPath.replace(/\\/g, '/')}`;
              const pluginModule = await import(fileUrl);
              const PluginClass = pluginModule.default || pluginModule;
              plugin = new PluginClass();
              pluginLoader.plugins.set('aveva-pi', plugin);
              console.log(`✅ AVEVA PI plugin loaded manually`);
            } catch (manualLoadError) {
              console.error(`❌ Failed to manually load AVEVA PI plugin:`, manualLoadError.message);
              throw pluginError;
            }
          } else {
            throw pluginError;
          }
        }
        const preparedConfig = this.preparePluginConfig(dataSource);
        await plugin.connect(preparedConfig);
        dataSourceEntry = { dataSource, pluginInstance: plugin };
        this.sources.set(id, dataSourceEntry);
      } else {
        // Always refresh plugin instance to ensure latest config
        try {
          let plugin;
          try {
            plugin = pluginLoader.getPlugin(dataSourceEntry.dataSource.plugin);
          } catch (pluginError) {
            // Fallback: Try to load AVEVA PI plugin manually if not loaded
            if (dataSourceEntry.dataSource.plugin === 'aveva-pi') {
              console.log(`🔄 AVEVA PI plugin not loaded, attempting manual load...`);
              try {
                const pluginPath = path.join(__dirname, 'plugins', 'aveva-pi', 'index.js');
                const fileUrl = `file://${pluginPath.replace(/\\/g, '/')}`;
                console.log(`Loading plugin from: ${fileUrl}`);
                const pluginModule = await import(fileUrl);
                const PluginClass = pluginModule.default || pluginModule;
                plugin = new PluginClass();
                pluginLoader.plugins.set('aveva-pi', plugin);
                console.log(`✅ AVEVA PI plugin loaded manually`);
              } catch (manualLoadError) {
                console.error(`❌ Failed to manually load AVEVA PI plugin:`, manualLoadError.message);
                throw pluginError;
              }
            } else {
              throw pluginError;
            }
          }
          const preparedConfig = this.preparePluginConfig(dataSourceEntry.dataSource);
          await plugin.connect(preparedConfig);
          dataSourceEntry.pluginInstance = plugin;
          console.log(`🔄 Refreshed plugin instance for data source: ${id}`);
        } catch (connectError) {
          const errorMessage = connectError.message || 'Unknown connection error';
          console.warn(`⚠️ Failed to refresh plugin instance for ${id}: ${errorMessage}`);
          dataSourceEntry.pluginInstance = null;
          dataSourceEntry.dataSource.status = 'error';
          dataSourceEntry.dataSource.lastTested = new Date().toISOString();
          await this.saveDataSource(dataSourceEntry.dataSource);
          throw new Error(`Failed to refresh connection for data source ${id}: ${errorMessage}`);
        }
      }

      const { pluginInstance } = dataSourceEntry;
      const { query, parameters = {}, units, interval } = queryParams;

      // Execute query using plugin - pass all parameters including interval
      const result = await pluginInstance.executeQuery(query, { ...parameters, units, ...(interval && { interval }) });

      console.log(`✅ Query executed successfully on ${id}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to execute query on data source ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Get data source statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    const dataSources = await this.getAllDataSources();
    let connected = 0;

    // Count connected data sources
    for (const ds of dataSources) {
      try {
        const pluginInstance = this.sources.get(ds.id);
        if (pluginInstance) {
          const testResult = await pluginInstance.testConnection();
          // Handle both boolean and object responses
          const isConnected = typeof testResult === 'boolean' 
            ? testResult 
            : (testResult?.success === true);
          if (isConnected) {
            connected++;
          }
        }
      } catch (error) {
        // Connection test failed, consider disconnected
      }
    }

    return {
      total: dataSources.length,
      connected: connected,
      disconnected: dataSources.length - connected
    };
  }
}

// Export singleton instance
export const dataSourceManager = new DataSourceManager();
