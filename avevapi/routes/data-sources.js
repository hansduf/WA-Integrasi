// routes/data-sources.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { dataSourceManager } from '../core/data-source-manager.js';
import { pluginLoader } from '../core/plugin-loader.js';
import { triggerEngine } from '../core/trigger-engine.js';
import db from '../lib/database.js';
import {
  logDataSourceCreated,
  logDataSourceDeleted,
  logDataSourceTested,
  logDataSourceUpdated
} from '../utils/audit.utils.js';
import { getClientIP, getUserAgent } from '../utils/security.utils.js';

const __filename_ts = fileURLToPath(import.meta.url);
const __dirname_ts = path.dirname(__filename_ts);

// Cache for trigger counts
let triggerCountsCache = null;
let triggerCountsCacheTimestamp = null;
const triggerCountsCacheTTL = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the trigger counts cache
 */
function invalidateTriggerCountsCache() {
  triggerCountsCache = null;
  triggerCountsCacheTimestamp = null;
}
const legacyTriggersPath = path.resolve(__dirname_ts, '../triggers.json');

/**
 * List of sensitive fields that should be masked in responses
 */
const SENSITIVE_FIELDS = [
  'password',
  'apiKey', 
  'api_key',
  'token',
  'secret',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'clientSecret',
  'client_secret'
];

/**
 * Mask sensitive data in config object
 * Replaces sensitive values with bullets (••••••••)
 * @param {Object} config - Configuration object
 * @returns {Object} Config with masked sensitive data
 */
function maskSensitiveData(config) {
  if (!config || typeof config !== 'object') return config;
  
  const masked = { ...config };
  
  // Mask all sensitive fields
  for (const field of SENSITIVE_FIELDS) {
    if (masked[field] !== undefined && masked[field] !== null) {
      // Replace with bullets (8 characters)
      masked[field] = '••••••••';
    }
  }
  
  return masked;
}

/**
 * Mask sensitive data in data source object
 * @param {Object} dataSource - Data source object
 * @returns {Object} Data source with masked config
 */
function maskDataSourceSensitiveData(dataSource) {
  if (!dataSource) return dataSource;
  
  return {
    ...dataSource,
    config: maskSensitiveData(dataSource.config)
  };
}

/**
 * Check if a value is a masked placeholder
 * @param {string} value - Value to check
 * @returns {boolean} True if value is masked
 */
function isMaskedValue(value) {
  return value === '••••••••' || value === '********' || /^•+$/.test(value);
}

function readLegacyTriggers() {
  // Read triggers from database instead of JSON file
  try {
    const triggers = db.preparedStatements.getAllTriggers.all();
    const result = { behaviors: {}, names: {} };
    
    triggers.forEach(trigger => {
      const config = JSON.parse(trigger.config);
      result.behaviors[trigger.id] = {
        ...config,
        type: trigger.type,
        active: trigger.active === 1,
        dataSourceId: trigger.data_source_id
      };
      result.names[trigger.name] = trigger.id;
    });
    
    return result;
  } catch (e) {
    console.error('Error reading triggers from database:', e.message);
    return { behaviors: {}, names: {} };
  }
}

const router = express.Router();

// Dual auth middleware applied at mount level (JWT OR API Key)
// No additional auth validation needed here

// Helper function to get database preview for MySQL connections
async function getDatabasePreview(dataSourceId) {
  try {
    const dataSource = await dataSourceManager.getDataSource(dataSourceId);

    if (dataSource.plugin !== 'mysql' && 
        !(dataSource.plugin === 'database' && 
          (dataSource.databaseType === 'mysql' || dataSource.databaseType === 'oracle'))) {
      return null; // Only support MySQL and Oracle preview for now
    }

    const sourceEntry = dataSourceManager.sources.get(dataSourceId);
    if (!sourceEntry || !sourceEntry.pluginInstance) {
      throw new Error('Plugin instance not available');
    }

    let plugin = sourceEntry.pluginInstance;

    // Ensure plugin has active connection
    // For DatabasePlugin, check driver and connection; for others, check pool/connection
    const needsReconnect = dataSource.plugin === 'database' 
      ? (!plugin.driver || !plugin.connection)
      : (!plugin.pool && !plugin.connection);

    if (needsReconnect) {
      try {
        const freshPlugin = pluginLoader.getPlugin(dataSource.plugin);
        // Prepare plugin config with additional fields for specific plugins
        const preparedConfig = dataSourceManager.preparePluginConfig(dataSource);
        await freshPlugin.connect(preparedConfig);
        sourceEntry.pluginInstance = freshPlugin;
        plugin = freshPlugin;
      } catch (connectError) {
        throw new Error(`Failed to reconnect: ${connectError.message}`);
      }
    }

    const preview = {
      database: dataSource.config.database,
      tables: [],
      totalTables: 0,
      totalRecords: 0
    };

    // Discover schema fresh for preview
    let freshSchema;
    try {
      freshSchema = await plugin.discoverSchema();
    } catch (schemaError) {
      console.warn(`⚠️ Schema discovery failed: ${schemaError.message}`);
      // Fallback to stored schema if fresh discovery fails
      freshSchema = dataSource.schema || { tables: [], fields: {} };
    }

    // Get all tables from fresh schema (fallback to stored schema)
    const tables = (freshSchema?.tables && freshSchema.tables.length > 0) 
      ? freshSchema.tables 
      : dataSource.schema?.tables || [];

    for (const tableName of tables) {
      try {
        // Build database-specific queries
        let countQuery, sampleQuery;
        const dbType = dataSource.databaseType || 'mysql';

        if (dbType === 'oracle') {
          // Oracle syntax
          countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
          sampleQuery = `SELECT * FROM "${tableName}" WHERE ROWNUM <= 3`;
        } else {
          // MySQL syntax (default)
          countQuery = `SELECT COUNT(*) as count FROM \`${tableName}\``;
          sampleQuery = `SELECT * FROM \`${tableName}\` LIMIT 3`;
        }

        // Get record count
        const countResult = await plugin.query({ query: countQuery });
        const recordCount = countResult ? countResult[0]?.count || 0 : 0;

        // Get sample data (max 3 rows)
        const sampleData = await plugin.query({ query: sampleQuery });
        const sampleRows = sampleData || [];

        // Get table structure from fresh schema (fallback to stored)
        const fields = freshSchema?.fields?.[tableName] || dataSource.schema?.fields?.[tableName] || [];

        preview.tables.push({
          name: tableName,
          rowCount: recordCount,
          columns: fields.map(field => ({
            name: field.name,
            type: field.type
          })),
          sampleData: sampleRows.slice(0, 3)
        });

        preview.totalRecords += recordCount;

      } catch (tableError) {
        console.warn(`Failed to preview table ${tableName}:`, tableError.message);
        // Continue with other tables
        preview.tables.push({
          name: tableName,
          recordCount: 0,
          fields: [],
          sampleData: [],
          error: tableError.message
        });
      }
    }

    preview.totalTables = preview.tables.length;
    return preview;

  } catch (error) {
    console.error('Database preview failed:', error);
    throw new Error(`Failed to get database preview: ${error.message}`);
  }
}
async function countTriggersPerDataSource() {
  // Check cache validity
  if (triggerCountsCache && 
      triggerCountsCacheTimestamp && 
      (Date.now() - triggerCountsCacheTimestamp) < triggerCountsCacheTTL) {
    return triggerCountsCache;
  }

  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Get triggers from database
    const triggers = db.preparedStatements.getAllTriggers.all();
    const triggerCounts = {};

    // Count triggers by dataSourceId
    for (const trigger of triggers) {
      const dataSourceId = trigger.data_source_id;
      if (dataSourceId) {
        triggerCounts[dataSourceId] = (triggerCounts[dataSourceId] || 0) + 1;
      }
    }

    // Update cache
    triggerCountsCache = triggerCounts;
    triggerCountsCacheTimestamp = Date.now();

    return triggerCounts;
  } catch (error) {
    console.error('Error counting triggers:', error);
    triggerCountsCache = {};
    triggerCountsCacheTimestamp = Date.now();
    return {};
  }
}
async function executeDatabaseQuery(dataSource, query, parameters) {
  try {
    // Get plugin instance from data source manager
    const dataSourceEntry = dataSourceManager.sources.get(dataSource.id);
    if (!dataSourceEntry || !dataSourceEntry.pluginInstance) {
      throw new Error('Plugin instance not found for data source');
    }

    const plugin = dataSourceEntry.pluginInstance;

    // Execute query using plugin's executeQuery method
    const result = await plugin.executeQuery(query, parameters);

    return {
      data: result,
      message: `${dataSource.databaseType} query executed successfully`,
      query,
      parameters,
      rowCount: Array.isArray(result) ? result.length : 1
    };
  } catch (error) {
    console.error(`❌ ${dataSource.databaseType} query execution failed:`, error.message);
    throw new Error(`${dataSource.databaseType} query failed: ${error.message}`);
  }
}

async function executeAVEVAPIQuery(dataSource, query, parameters) {
  try {
    // Get plugin instance from data source manager
    const dataSourceEntry = dataSourceManager.sources.get(dataSource.id);
    if (!dataSourceEntry || !dataSourceEntry.pluginInstance) {
      throw new Error('Plugin instance not found for data source');
    }

    const plugin = dataSourceEntry.pluginInstance;

    // Validate AVEVA PI queries - support direct URLs or SQL queries only
    if (dataSource.plugin === 'aveva-pi') {
      const isDirectUrl = query && typeof query === 'string' && query.startsWith('http');
      const isSqlQuery = query && typeof query === 'string' && query.toUpperCase().includes('SELECT') && query.toUpperCase().includes('FROM POINT');

      if (!isDirectUrl && !isSqlQuery) {
        throw new Error(`AVEVA PI queries must be direct URLs starting with http:// or https://, or SQL queries with FROM POINT. AVEVA PI no longer supports hardcoded preset queries.`);
      }

      if (isDirectUrl) {
      } else if (isSqlQuery) {
      }
    }

    // Execute query using plugin's executeQuery method
    const result = await plugin.executeQuery(query, parameters);

    return {
      data: result.data,
      sqlPreview: result.sqlPreview,
      message: 'AVEVA PI query executed successfully',
      query,
      parameters,
      rowCount: Array.isArray(result.data) ? result.data.length : 1
    };
  } catch (error) {
    console.error(`❌ AVEVA PI query execution failed:`, error.message);

    // Provide specific error messages based on error type
    if (error.message.includes('AVEVA PI only accepts direct URLs')) {
      throw new Error('AVEVA PI Error: Only direct URLs are supported. Please provide a complete AVEVA PI API URL starting with http:// or https://.');
    }

    if (error.message.includes('Unknown query format')) {
      throw new Error('AVEVA PI Error: Invalid query format. Use preset queries (24h, 1h, latest), direct URLs, or SQL queries with FROM points.');
    }

    if (error.message.includes('AVEVA PI server returned status')) {
      throw new Error(`AVEVA PI Server Error: ${error.message}`);
    }

    if (error.message.includes('timeout')) {
      throw new Error('AVEVA PI Error: Connection timeout. Please check server connectivity and try again.');
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      throw new Error('AVEVA PI Error: Cannot connect to AVEVA PI server. Please check server host and port configuration.');
    }

    throw new Error(`AVEVA PI query failed: ${error.message}`);
  }
}

// GET /api/data-sources - Get all data sources
router.get('/data-sources', async (req, res) => {
  try {
    const dataSources = await dataSourceManager.getAllDataSources();
    const triggerCounts = await countTriggersPerDataSource();

    // 🔒 Security: Mask sensitive data in all data sources
    const dataSourcesWithTriggerCount = dataSources.map(dataSource => ({
      ...maskDataSourceSensitiveData(dataSource),
      triggersCount: triggerCounts[dataSource.id] || 0
    }));

    res.json({
      success: true,
      dataSources: dataSourcesWithTriggerCount,
      total: dataSources.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting data sources:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/data-sources/:id - Get specific data source
router.get('/data-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dataSource = await dataSourceManager.getDataSource(id);

    // 🔒 Security: Mask sensitive data before sending to frontend
    const maskedDataSource = maskDataSourceSensitiveData(dataSource);

    res.json({
      success: true,
      dataSource: maskedDataSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error getting data source ${req.params.id}:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/data-sources - Create new data source
router.post('/data-sources', async (req, res) => {
  try {
    const { id, plugin, name, config, databaseType } = req.body;

    if (!id || !plugin || !config) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, plugin, config'
      });
    }

    const dataSource = await dataSourceManager.addDataSource({
      id,
      plugin,
      name,
      config,
      databaseType
    });

    // 🔒 Security: Mask sensitive data in response
    const maskedDataSource = maskDataSourceSensitiveData(dataSource);

    // Audit logging for data source creation
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logDataSourceCreated(userId, dataSource.id, { id, plugin, name, databaseType }, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log data source creation:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.status(201).json({
      success: true,
      dataSource: maskedDataSource,
      message: 'Data source created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating data source:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/data-sources/:id - Update data source
router.put('/data-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 🔒 Security: Remove masked values from updates
    // If user didn't change password, keep existing one
    if (updates.config) {
      const cleanConfig = { ...updates.config };
      
      // Get existing data source to preserve masked fields
      const existingDataSource = await dataSourceManager.getDataSource(id);
      
      // For each sensitive field, if it's masked, restore original value
      for (const field of SENSITIVE_FIELDS) {
        if (cleanConfig[field] !== undefined && isMaskedValue(cleanConfig[field])) {
          // Keep existing value (don't update)
          if (existingDataSource?.config?.[field]) {
            cleanConfig[field] = existingDataSource.config[field];
          } else {
            // If no existing value, remove masked placeholder
            delete cleanConfig[field];
          }
        }
      }
      
      updates.config = cleanConfig;
    }

    const dataSource = await dataSourceManager.updateDataSource(id, updates);

    // 🔒 Security: Mask sensitive data in response
    const maskedDataSource = maskDataSourceSensitiveData(dataSource);

    // Audit logging for data source update
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logDataSourceUpdated(userId, id, existingDataSource, updates, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log data source update:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      dataSource: maskedDataSource,
      message: 'Data source updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error updating data source ${req.params.id}:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/data-sources/:id - Delete data source
router.delete('/data-sources/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing data source for audit logging
    const existingDataSource = await dataSourceManager.getDataSource(id);

    await dataSourceManager.removeDataSource(id);

    // Audit logging for data source deletion
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logDataSourceDeleted(userId, id, existingDataSource, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log data source deletion:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      message: 'Data source deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error deleting data source ${req.params.id}:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/data-sources/:id/triggers/:triggerName - Delete a trigger from a specific data source
router.delete('/data-sources/:id/triggers/:triggerName', async (req, res) => {
  try {
    const { id, triggerName } = req.params;

    // Load data source (throws 404 if not found)
    const ds = await dataSourceManager.getDataSource(id);
    if (!ds || !Array.isArray(ds.triggers)) {
      return res.status(404).json({ success: false, error: 'Data source or triggers not found' });
    }

    const lower = triggerName.toLowerCase();
    const idx = ds.triggers.findIndex(t => t.name === triggerName || (t.name && t.name.toLowerCase() === lower));

    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Trigger not found in data source' });
    }

    const removed = ds.triggers.splice(idx, 1);

    // Persist to disk
    await dataSourceManager.saveDataSource(ds);

    // Update in-memory cache if present
    if (dataSourceManager.sources && dataSourceManager.sources.has(ds.id)) {
      const entry = dataSourceManager.sources.get(ds.id);
      entry.dataSource = ds;
      dataSourceManager.sources.set(ds.id, entry);
    }

    res.json({ success: true, message: 'Trigger removed from data source', removed });
  } catch (error) {
    console.error('Error deleting trigger from data-source via endpoint:', error.message);
    const statusCode = error.message && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, error: error.message || 'Failed to delete trigger from data source' });
  }
});

// POST /api/data-sources/:id/test - Test data source connection
router.post('/data-sources/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { preview = false } = req.body;

    const result = await dataSourceManager.testDataSource(id);

    // If preview is requested and connection is successful, get database preview
    let previewData = null;
    if (preview && result.success) {
      try {
        previewData = await getDatabasePreview(id);
      } catch (previewError) {
        console.warn(`Preview failed for ${id}:`, previewError.message);
        // Don't fail the whole request if preview fails
      }
    }

    res.json({
      success: result.success,
      status: result.status,
      message: result.message,
      lastTested: result.lastTested,
      preview: previewData,
      timestamp: new Date().toISOString()
    });

    // Audit logging for data source test
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logDataSourceTested(userId, id, result, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log data source test:', auditError);
      // Don't fail the request if audit logging fails
    }
  } catch (error) {
    console.error(`Error testing data source ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/plugins - Get available plugins
router.get('/plugins', async (req, res) => {
  try {
    const plugins = pluginLoader.getAllPlugins();
    const pluginList = [];

    for (const [name, plugin] of plugins) {
      pluginList.push({
        name: plugin.name,
        type: plugin.type,
        version: plugin.version,
        configSchema: plugin.getConfigSchema()
      });
    }

    res.json({
      success: true,
      plugins: pluginList,
      total: pluginList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting plugins:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/triggers - Get all available triggers
router.get('/triggers', async (req, res) => {
  try {
    const triggers = await triggerEngine.getAvailableTriggers();

    // Also merge legacy triggers stored in triggers.json so UI shows file-stored triggers
    try {
      const legacy = readLegacyTriggers();
      const legacyBehaviors = legacy.behaviors || {};
      const legacyNames = legacy.names || {};

      const converted = [];
      for (const [id, behavior] of Object.entries(legacyBehaviors)) {
        // Resolve friendly name from names map (keys may be stored lowercase)
        let friendly = null;
        for (const [k, v] of Object.entries(legacyNames)) {
          if (v === id) {
            friendly = k;
            break;
          }
        }

        const name = friendly || id;
        const obj = {
          name,
          dataSource: behavior.dataSourceId || behavior.dataSource || 'aveva-pi-default',
          description: behavior.desc || behavior.description || '',
          type: (behavior.type || 'query').toLowerCase(),
          aliases: [],
          active: behavior.active !== false,
          source: 'legacy' // mark this as coming from legacy triggers.json
        };
        converted.push(obj);
      }

      // Merge without duplicates (prefer triggerEngine entries).
      // Ensure plugin-provided triggers are marked with source: 'plugin'
      const map = new Map();
      for (const t of converted) map.set(t.name, t);
      for (const t of triggers) {
        const copy = { ...t, source: t.source || 'plugin' };
        map.set(copy.name, copy);
      }

      const merged = Array.from(map.values());

      res.json({
        success: true,
        triggers: merged,
        total: merged.length,
        timestamp: new Date().toISOString()
      });
      return;
    } catch (err) {
      console.warn('Failed to merge legacy triggers:', err.message);
    }

    // Fallback to plugin-provided triggers
    res.json({
      success: true,
      triggers,
      total: triggers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting triggers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/triggers/execute - Execute trigger by name
router.post('/triggers/execute', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const result = await triggerEngine.findAndExecuteTrigger(message);

    res.json({
      success: result.success,
      result: result.result,
      error: result.error,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error executing trigger:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/data-sources/:id/query - Execute query on specific data source
router.post('/data-sources/:id/query', async (req, res) => {
  try {
    const { id } = req.params;
    const { query, parameters = {}, interval, limit, dualQuery, queryMode, tag } = req.body;

    // ✅ FIX: Include interval, dualQuery, queryMode, and limit from req.body into parameters if they exist
    const enrichedParameters = { ...parameters };
    if (interval !== undefined) {
      enrichedParameters.interval = interval;
    }
    if (dualQuery !== undefined) {
      enrichedParameters.dualQuery = dualQuery;
    }
    if (queryMode !== undefined) {
      enrichedParameters.queryMode = queryMode;
    }
    if (limit !== undefined) {
      enrichedParameters.limit = limit;
    }
    if (tag !== undefined) {
      enrichedParameters.tag = tag;
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const dataSource = await dataSourceManager.getDataSource(id);
    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Execute query based on data source type
    let result;
    switch (dataSource.plugin) {
      case 'database':
        // Handle universal database plugin
        if (!dataSource.databaseType) {
          return res.status(400).json({
            success: false,
            error: 'Database type not specified for database plugin'
          });
        }
        result = await executeDatabaseQuery(dataSource, query, enrichedParameters);
        break;
      case 'aveva-pi':
        result = await executeAVEVAPIQuery(dataSource, query, enrichedParameters);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported plugin type: ${dataSource.plugin}`
        });
    }

    // Generate preview for AVEVA PI queries
    let sqlPreview = null;
    if (dataSource.plugin === 'aveva-pi' && result.sqlPreview) {
      sqlPreview = result.sqlPreview;
    }

    res.json({
      success: true,
      data: result.data,
      sqlPreview: sqlPreview,
      metadata: {
        dataSource: id,
        plugin: dataSource.plugin,
        query,
        parameters: enrichedParameters,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error executing query on data source ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/data-sources/:id/tables - Get available tables for data source
router.get('/data-sources/:id/tables', async (req, res) => {
  try {
    const { id } = req.params;
    const dataSource = await dataSourceManager.getDataSource(id);

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Support both legacy mysql plugin and new database plugin
    if (dataSource.plugin !== 'mysql' &&
        !(dataSource.plugin === 'database' &&
          (dataSource.databaseType === 'mysql' || dataSource.databaseType === 'oracle'))) {
      return res.status(400).json({
        success: false,
        error: 'This endpoint only supports MySQL and Oracle data sources'
      });
    }

    // Get plugin instance
    const sourceEntry = dataSourceManager.sources.get(id);
    if (!sourceEntry || !sourceEntry.pluginInstance) {
      return res.status(500).json({
        success: false,
        error: 'Plugin instance not available'
      });
    }

    let plugin = sourceEntry.pluginInstance;

    // Ensure plugin has active connection
    if (!plugin.pool && !plugin.connection) {
      console.log(`🔄 Reconnecting MySQL plugin for ${id}...`);
      try {
        const freshPlugin = pluginLoader.getPlugin(dataSource.plugin);
        await freshPlugin.connect(dataSource.config);
        sourceEntry.pluginInstance = freshPlugin;
        plugin = freshPlugin;
      } catch (connectError) {
        return res.status(500).json({
          success: false,
          error: `Failed to reconnect: ${connectError.message}`
        });
      }
    }

    // Get all tables using database-specific queries
    const dbType = dataSource.databaseType || 'mysql';
    let tablesQuery, tableKey;

    switch (dbType) {
      case 'oracle':
        tablesQuery = `SELECT table_name FROM all_tables WHERE owner = UPPER(:ownerName) AND table_name NOT LIKE 'BIN$%' ORDER BY table_name`;
        tableKey = 'TABLE_NAME';
        break;
      case 'mysql':
      default:
        tablesQuery = `SHOW TABLES`;
        tableKey = null; // Will be determined from result
        break;
    }

    let queryParams = {};
    if (dbType === 'oracle') {
      queryParams = { ownerName: dataSource.config?.user?.toUpperCase() || 'SYSTEM' };
    }

    // Use executeQuery for database plugin (supports named parameters), query for others
    let tablesResult;
    if (dataSource.plugin === 'database') {
      tablesResult = await plugin.executeQuery(tablesQuery, queryParams);
      tablesResult = tablesResult.data || tablesResult;
    } else {
      tablesResult = await plugin.query({
        query: tablesQuery,
        values: Object.values(queryParams)
      });
    }

    if (!tablesResult || !Array.isArray(tablesResult)) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve tables'
      });
    }

    // Extract table names from result
    let tables;
    if (tableKey) {
      // For Oracle, we know the column name
      tables = tablesResult.map(row => row[tableKey]).filter(name => name);
    } else {
      // For MySQL, detect the column name dynamically
      const firstRow = tablesResult[0];
      if (!firstRow) {
        tables = [];
      } else {
        const detectedKey = Object.keys(firstRow)[0];
        tables = tablesResult.map(row => row[detectedKey]).filter(name => name);
      }
    }

    res.json({
      success: true,
      tables,
      total: tables.length,
      database: dataSource.config.database,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error getting tables for data source ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/data-sources/:id/tags - Get available AVEVA PI tags
router.get('/data-sources/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const dataSource = await dataSourceManager.getDataSource(id);

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    if (dataSource.plugin !== 'aveva-pi') {
      return res.status(400).json({
        success: false,
        error: 'Tags endpoint only available for AVEVA PI data sources'
      });
    }

    // Get plugin instance
    const dataSourceEntry = dataSourceManager.sources.get(id);
    if (!dataSourceEntry || !dataSourceEntry.pluginInstance) {
      return res.status(500).json({
        success: false,
        error: 'Plugin instance not available'
      });
    }

    const plugin = dataSourceEntry.pluginInstance;

    // Get available tags
    const tags = await plugin.getAvailableTags();

    res.json({
      success: true,
      tags: tags,
      count: tags.length,
      dataSource: id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error getting tags for data source ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/data-sources/:id/tables/:table/columns - Get columns for specific table
router.get('/data-sources/:id/tables/:table/columns', async (req, res) => {
  try {
    const { id, table } = req.params;
    const dataSource = await dataSourceManager.getDataSource(id);

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Support both legacy mysql plugin and new database plugin
    if (dataSource.plugin !== 'mysql' &&
        !(dataSource.plugin === 'database' &&
          (dataSource.databaseType === 'mysql' || dataSource.databaseType === 'oracle'))) {
      return res.status(400).json({
        success: false,
        error: 'This endpoint only supports MySQL and Oracle data sources'
      });
    }

    // Get plugin instance
    const sourceEntry = dataSourceManager.sources.get(id);
    if (!sourceEntry || !sourceEntry.pluginInstance) {
      return res.status(500).json({
        success: false,
        error: 'Plugin instance not available'
      });
    }

    let plugin = sourceEntry.pluginInstance;

    // Ensure plugin has active connection
    if (!plugin.pool && !plugin.connection) {
      try {
        const freshPlugin = pluginLoader.getPlugin(dataSource.plugin);
        await freshPlugin.connect(dataSource.config);
        sourceEntry.pluginInstance = freshPlugin;
        plugin = freshPlugin;
      } catch (connectError) {
        return res.status(500).json({
          success: false,
          error: `Failed to reconnect: ${connectError.message}`
        });
      }
    }

    // Get table columns using database-specific queries
    const dbType = dataSource.databaseType || 'mysql';
    let columnsQuery, columnKey;

    switch (dbType) {
      case 'oracle':
        columnsQuery = `SELECT column_name FROM all_tab_columns WHERE owner = UPPER(:owner) AND table_name = UPPER(:tableName) ORDER BY column_id`;
        columnKey = 'COLUMN_NAME';
        break;
      case 'mysql':
      default:
        columnsQuery = `DESCRIBE \`${table}\``;
        columnKey = 'Field';
        break;
    }

    let queryParams = {};
    if (dbType === 'oracle') {
      queryParams = {
        owner: dataSource.config?.user?.toUpperCase() || 'SYSTEM',
        tableName: table.toUpperCase()
      };
    }

    // Use executeQuery for database plugin (supports named parameters), query for others
    let columnsResult;
    if (dataSource.plugin === 'database') {
      columnsResult = await plugin.executeQuery(columnsQuery, queryParams);
      columnsResult = columnsResult.data || columnsResult;
    } else {
      columnsResult = await plugin.query({
        query: columnsQuery,
        values: Array.isArray(queryParams) ? queryParams : Object.values(queryParams)
      });
    }

    if (!columnsResult || !Array.isArray(columnsResult)) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve columns'
      });
    }

    // Extract column names
    const columns = columnsResult.map(row => row[columnKey]).filter(name => name);

    res.json({
      success: true,
      columns,
      total: columns.length,
      table,
      database: dataSource.config.database,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error getting columns for table ${req.params.table} in data source ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/data-sources/:id/triggers/:triggerId/execute - Execute specific trigger
router.post('/data-sources/:id/triggers/:triggerId/execute', async (req, res) => {
  try {
    const { id, triggerId } = req.params;
    const { parameters = {} } = req.body;

    const dataSource = await dataSourceManager.getDataSource(id);
    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Find the trigger
    const trigger = dataSource.triggers.find(t => t.name === triggerId || t.id === triggerId);
    if (!trigger) {
      return res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
    }

    // Execute trigger based on its configuration
    const result = await executeTrigger(trigger, parameters);

    res.json({
      success: true,
      result: result.result,
      data: result.data,
      metadata: {
        dataSource: id,
        trigger: triggerId,
        parameters,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error executing trigger ${req.params.triggerId} on data source ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/config - Get current configuration
router.get('/config', async (req, res) => {
  try {
    // Return current configuration (excluding sensitive data)
    const safeConfig = {
      server: {
        host: config.server.host,
        port: config.server.port
      },
      api: {
        baseUrl: `http://${config.server.host}:${config.server.port}/api`
        // Exclude API key for security
      }
    };

    res.json({
      success: true,
      config: safeConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/setup/connection - Auto-setup new connection
router.post('/setup/connection', async (req, res) => {
  try {
    const { type, config: connectionConfig } = req.body;

    if (!type || !connectionConfig) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, config'
      });
    }

    let dataSourceId, dataSourceName, pluginType;

    // Auto-generate data source based on type
    switch (type) {
      case 'mysql':
        pluginType = 'database';
        dataSourceId = `mysql-${Date.now()}`;
        dataSourceName = `MySQL Database ${new Date().toLocaleDateString()}`;
        databaseType = 'mysql';
        break;
      case 'database':
        pluginType = 'database';
        dataSourceId = `database-${Date.now()}`;
        dataSourceName = `Database ${new Date().toLocaleDateString()}`;
        break;

      case 'aveva-pi':
      case 'aveva':
        pluginType = 'aveva-pi';
        dataSourceId = `aveva-pi-${Date.now()}`;
        dataSourceName = `AVEVA PI System ${new Date().toLocaleDateString()}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported connection type: ${type}`
        });
    }

    // Create the data source
    const dataSource = await dataSourceManager.addDataSource({
      id: dataSourceId,
      plugin: pluginType,
      name: dataSourceName,
      config: connectionConfig
    });

    res.status(201).json({
      success: true,
      dataSource,
      message: `Connection ${dataSourceName} created successfully`,
      setup: {
        id: dataSourceId,
        type: pluginType,
        name: dataSourceName,
        config: connectionConfig
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error setting up connection:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/setup/templates - Get connection setup templates
router.get('/setup/templates', async (req, res) => {
  try {
    const templates = {
      mysql: {
        type: 'mysql',
        name: 'MySQL Database',
        description: 'Connect to MySQL/MariaDB database',
        config: {
          host: 'localhost',
          port: 3306,
          user: 'root',
          password: '',
          database: 'your_database'
        },
        required: ['host', 'port', 'user', 'database']
      },
      'aveva-pi': {
        type: 'aveva-pi',
        name: 'AVEVA PI System',
        description: 'Connect to AVEVA PI Process Information System',
        config: {
          host: 'localhost',
          port: 6066,
          protocol: 'http',
          timeout: 10000,
          maxRetries: 3
        },
        required: ['host', 'port']
      }
    };

    res.json({
      success: true,
      templates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting setup templates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/test-aveva-url - Test AVEVA PI URL connection
router.post('/test-aveva-url', async (req, res) => {
  try {
    const { url, count = 1 } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required for AVEVA PI test'
      });
    }

    // Validate URL format
    let testUrl;
    try {
      testUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    // Build test query URL - Test URL as-is (user responsibility)
    let fullUrl;

    // For AVEVA PI testing, use the URL exactly as provided by user
    // No parameter modification - user is responsible for valid URLs
    fullUrl = url;

    // Make request to AVEVA PI server
    const axios = (await import('axios')).default;
    const https = (await import('https')).default;

    // Create axios instance with better configuration
    const axiosInstance = axios.create({
      timeout: 15000, // 15 second timeout
      headers: {
        'Accept': '*/*',
        'User-Agent': 'AVEVA-PI-Test/1.0'
      },
      validateStatus: () => true, // Accept any status code
      // Skip SSL verification for self-signed certificates (optional)
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // WARNING: Only use in development/testing
      })
    });

    console.log(`🔗 Making request to: ${fullUrl}`);
    console.log(`🔍 Request details:`, {
      url: fullUrl,
      timeout: 15000,
      headers: {
        'Accept': '*/*',
        'User-Agent': 'AVEVA-PI-Test/1.0'
      }
    });

    const response = await axiosInstance.get(fullUrl);

    // Return raw response
    const result = {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      statusText: response.statusText,
      contentType: response.headers['content-type'] || 'unknown',
      url: fullUrl,
      responseSize: JSON.stringify(response.data).length,
      timestamp: new Date().toISOString()
    };

    // Include raw data based on content type
    if (response.headers['content-type']?.includes('application/json')) {
      result.data = response.data;
    } else {
      // For non-JSON responses, include as string (truncated if too long)
      const rawData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      result.rawData = rawData.length > 1000 ? rawData.substring(0, 1000) + '...' : rawData;
    }

    console.log(`✅ AVEVA PI URL test completed: ${response.status} ${response.statusText}`);

    res.json({
      success: true,
      message: result.success ? 'Koneksi AVEVA PI berhasil!' : `Koneksi AVEVA PI merespons dengan status ${response.status}`,
      test: result
    });

  } catch (error) {
    console.error('❌ AVEVA PI URL test failed:', error.message);
    console.error('❌ Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      url: fullUrl || req.body.url
    });

    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - AVEVA PI server tidak dapat dijangkau. Periksa apakah server berjalan dan port benar.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Host not found - Alamat server AVEVA PI tidak dapat ditemukan. Periksa hostname/IP address.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout - Server AVEVA PI tidak merespons dalam waktu yang ditentukan.';
    } else if (error.code === 'ECONNRESET') {
      errorMessage = 'Connection reset - Koneksi diputus oleh server AVEVA PI.';
    } else if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      troubleshooting: [
        'Periksa apakah server AVEVA PI sedang berjalan',
        'Verifikasi hostname/IP dan port yang benar',
        'Pastikan tidak ada firewall yang memblokir koneksi',
        'Coba gunakan base URL saja (tanpa parameter tambahan)',
        'Periksa apakah diperlukan authentication atau API key'
      ],
      test: {
        success: false,
        statusCode: error.response?.status || 0,
        statusText: error.response?.statusText || 'Request Failed',
        url: fullUrl || req.body.url || 'unknown',
        error: error.code || error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/dashboard-data - Get combined dashboard data (triggers, data sources, trigger groups)
router.get('/dashboard-data', async (req, res) => {
  try {
    // Force fresh data - disable cache for now
    invalidateTriggerCountsCache();
    if (triggerEngine && triggerEngine.invalidateCache) {
      triggerEngine.invalidateCache();
    }

    // Load all data sources
    const dataSources = await dataSourceManager.getAllDataSources();
    const triggerCounts = await countTriggersPerDataSource();

    // 🔒 Security: Mask sensitive data in all data sources
    const dataSourcesWithTriggerCount = dataSources.map(dataSource => ({
      ...maskDataSourceSensitiveData(dataSource),
      triggersCount: triggerCounts[dataSource.id] || 0
    }));

    // Load triggers from triggers.json - always fresh
    const triggersData = readLegacyTriggers();
    const triggers = [];
    for (const [behaviorId, behavior] of Object.entries(triggersData.behaviors || {})) {
      // Skip inactive OR soft-deleted triggers (backward compatibility)
      if (behavior.active === false || behavior.meta?.deleted_at) continue;

      // Find all names that point to this behavior
      const triggerNames = Object.entries(triggersData.names || {})
        .filter(([name, bid]) => bid === behaviorId)
        .map(([name]) => name);

      if (triggerNames.length > 0) {
        triggers.push({
          id: behaviorId,
          name: triggerNames[0], // Primary name
          dataSource: behavior.dataSourceId || behavior.dataSource || '',
          description: behavior.description || behavior.desc || '',
          type: behavior.type || 'query',
          aliases: triggerNames.slice(1), // Additional names as aliases
          active: true, // Only active triggers are included
          source: 'legacy'
        });
      }
    }

    // Load trigger groups (if exists)
    let groups = [];
    try {
      // Get groups from database
      const dbGroups = db.preparedStatements.getAllTriggerGroups.all();

      // Convert to array format for frontend
      groups = dbGroups.map(group => {
        // Get members for each group
        const members = db.preparedStatements.getTriggerGroupMembers.all(group.id);
        const triggerIds = members.map(m => m.trigger_id);
        
        // Get trigger names for these IDs
        const triggerNames = triggerIds.map(id => {
          const trigger = db.preparedStatements.getTrigger.get(id);
          return trigger ? trigger.name : null;
        }).filter(Boolean);
        
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          executionMode: group.execution_mode,
          triggers: triggerNames,
          createdAt: group.created_at,
          updatedAt: group.updated_at
        };
      });
    } catch (error) {
      console.error('❌ Error loading trigger groups from database:', error);
      groups = [];
    }

    res.json({
      success: true,
      data: {
        triggers,
        dataSources: dataSourcesWithTriggerCount,
        triggerGroups: groups
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// AVEVA PI Presets Management
// ===========================

// Removed: loadAvevaPiPresets() and saveAvevaPiPresets() - now using database

/**
 * Generate unique ID for preset
 */
function generatePresetId() {
  return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET /api/aveva-pi-presets - Get all AVEVA PI presets
router.get('/aveva-pi-presets', async (req, res) => {
  try {
    const presets = db.preparedStatements.getAllQueryPresets.all();
    // Transform database format to API format
    const formattedPresets = presets.map(p => ({
      id: p.id,
      name: p.name,
      queryTemplate: p.query_template,
      variables: JSON.parse(p.variables || '[]'),
      isDefault: Boolean(p.is_default),
      usageCount: p.usage_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
    res.json({
      presets: formattedPresets
    });
  } catch (error) {
    console.error('Error getting AVEVA PI presets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/aveva-pi-presets - Create new AVEVA PI preset
router.post('/aveva-pi-presets', async (req, res) => {
  try {
    const { name, queryTemplate, variables } = req.body;

    if (!name || !queryTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Name and queryTemplate are required'
      });
    }

    // Check for duplicate names
    const existing = db.db.prepare('SELECT id FROM query_presets WHERE LOWER(name) = LOWER(?)').get(name.trim());
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Preset name already exists'
      });
    }

    const newPreset = {
      id: generatePresetId(),
      name: name.trim(),
      queryTemplate: queryTemplate.trim(),
      variables: variables || ['tag'],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert into database
    db.preparedStatements.insertQueryPreset.run(
      newPreset.id,
      newPreset.name,
      newPreset.queryTemplate,
      JSON.stringify(newPreset.variables),
      0, // is_default
      newPreset.usageCount,
      newPreset.createdAt,
      newPreset.updatedAt
    );

    res.json({
      success: true,
      data: newPreset,
      message: 'Preset created successfully'
    });
  } catch (error) {
    console.error('Error creating AVEVA PI preset:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/aveva-pi-presets/:id - Update AVEVA PI preset
router.put('/aveva-pi-presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, queryTemplate, variables } = req.body;

    // Check if preset exists
    const preset = db.preparedStatements.getQueryPreset.get(id);
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'Preset not found'
      });
    }

    // Check for duplicate names (excluding current preset)
    if (name) {
      const duplicate = db.db.prepare('SELECT id FROM query_presets WHERE LOWER(name) = LOWER(?) AND id != ?').get(name.trim(), id);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: 'Preset name already exists'
        });
      }
    }

    // Update preset
    const updatedName = name ? name.trim() : preset.name;
    const updatedTemplate = queryTemplate ? queryTemplate.trim() : preset.query_template;
    const updatedVariables = variables ? JSON.stringify(variables) : preset.variables;

    db.preparedStatements.updateQueryPreset.run(
      updatedName,
      updatedTemplate,
      updatedVariables,
      preset.is_default,
      preset.usage_count,
      id
    );

    // Get updated preset
    const updatedPreset = db.preparedStatements.getQueryPreset.get(id);
    const formattedPreset = {
      id: updatedPreset.id,
      name: updatedPreset.name,
      queryTemplate: updatedPreset.query_template,
      variables: JSON.parse(updatedPreset.variables || '[]'),
      isDefault: Boolean(updatedPreset.is_default),
      usageCount: updatedPreset.usage_count,
      createdAt: updatedPreset.created_at,
      updatedAt: updatedPreset.updated_at
    };

    res.json({
      success: true,
      data: formattedPreset,
      message: 'Preset updated successfully'
    });
  } catch (error) {
    console.error('Error updating AVEVA PI preset:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/aveva-pi-presets/:id - Delete AVEVA PI preset
router.delete('/aveva-pi-presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if preset exists
    const preset = db.preparedStatements.getQueryPreset.get(id);
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'Preset not found'
      });
    }

    // Delete from database
    const result = db.preparedStatements.deleteQueryPreset.run(id);

    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete preset'
      });
    }

    res.json({
      success: true,
      message: 'Preset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting AVEVA PI preset:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { invalidateTriggerCountsCache };
export default router;
