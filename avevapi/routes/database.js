// routes/database.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dataSourceManager } from '../core/data-source-manager.js';
import { DatabasePlugin } from '../plugins/database/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Apply dual auth middleware at mount level (JWT OR API Key)
// No additional auth needed here - handled by dualAuthMiddleware

/**
 * GET /api/database/schemas
 * Get all available database schemas for configuration
 */
router.get('/schemas', async (req, res) => {
  try {
    const schemasPath = path.resolve(__dirname, '../plugins/database/schemas');

    if (!fs.existsSync(schemasPath)) {
      return res.json({
        success: true,
        schemas: {}
      });
    }

    const schemaFiles = fs.readdirSync(schemasPath).filter(file => file.endsWith('.json'));
    const schemas = {};

    for (const file of schemaFiles) {
      try {
        const filePath = path.join(schemasPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const schema = JSON.parse(content);
        const schemaName = file.replace('.json', '');
        schemas[schemaName] = schema;
      } catch (error) {
        console.error(`Error loading schema ${file}:`, error.message);
      }
    }

    res.json({
      success: true,
      schemas
    });
  } catch (error) {
    console.error('Error loading database schemas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load database schemas'
    });
  }
});

/**
 * POST /api/database/test
 * Test database connection using universal database plugin
 */
router.post('/test', async (req, res) => {
  try {
    const { databaseType, config } = req.body;

    if (!databaseType || !config) {
      return res.status(400).json({
        success: false,
        error: 'Database type and config are required'
      });
    }

    // Create database plugin instance
    const dbPlugin = new DatabasePlugin();

    // Test connection
    const testResult = await dbPlugin.testConnectionWithParams(databaseType, config);

    res.json({
      success: true,
      result: testResult
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database test failed'
    });
  }
});

/**
 * POST /api/database/discover
 * Discover database schema (tables, columns) using universal database plugin
 */
router.post('/discover', async (req, res) => {
  try {
    const { databaseType, config } = req.body;

    if (!databaseType || !config) {
      return res.status(400).json({
        success: false,
        error: 'Database type and config are required'
      });
    }

    // Create database plugin instance
    const dbPlugin = new DatabasePlugin();

    // Discover schema
    const schema = await dbPlugin.discoverSchemaWithParams(databaseType, config);

    res.json({
      success: true,
      schema
    });
  } catch (error) {
    console.error('Schema discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Schema discovery failed'
    });
  }
});

/**
 * POST /api/database/query
 * Execute query using universal database plugin
 */
router.post('/query', async (req, res) => {
  try {
    const { databaseType, config, query, params = [] } = req.body;

    if (!databaseType || !config || !query) {
      return res.status(400).json({
        success: false,
        error: 'Database type, config, and query are required'
      });
    }

    // Create database plugin instance
    const dbPlugin = new DatabasePlugin();

    // Execute query
    const result = await dbPlugin.executeQueryWithParams(databaseType, config, query, params);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Query execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Query execution failed'
    });
  }
});

/**
 * POST /api/database/migrate
 * Migrate existing MySQL connections to universal database plugin
 */
router.post('/migrate', async (req, res) => {
  try {
    const { dryRun = true } = req.body; // Default to dry run for safety
    const dbPlugin = new DatabasePlugin();

    // Get all existing data sources
    const dataSources = await dataSourceManager.getAllDataSources();

    const migrationResults = {
      total: dataSources.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      results: []
    };

    for (const dataSource of dataSources) {
      try {
        // Only migrate MySQL connections that aren't already using the universal plugin
        if (dataSource.plugin === 'mysql' && dataSource.config) {
          const mysqlConfig = dataSource.config;

          // Convert MySQL config to universal database format
          const universalConfig = {
            host: mysqlConfig.host || mysqlConfig.server || 'localhost',
            port: mysqlConfig.port || 3306,
            database: mysqlConfig.database || mysqlConfig.db || '',
            user: mysqlConfig.user || mysqlConfig.username || '',
            password: mysqlConfig.password || '',
            connectionLimit: mysqlConfig.connectionLimit || mysqlConfig.poolSize || 10,
            connectTimeout: mysqlConfig.connectTimeout || mysqlConfig.timeout || 60000,
            acquireTimeout: mysqlConfig.acquireTimeout || 60000
          };

          // Test the migrated configuration (optional - don't fail migration if test fails)
          let testResult = { success: true, message: 'Connection test skipped during migration' };
          try {
            testResult = await dbPlugin.testConnectionWithParams('mysql', universalConfig);
          } catch (error) {
            console.warn(`Connection test failed for ${dataSource.name}: ${error.message}`);
            testResult = { success: false, message: `Connection test failed: ${error.message}` };
          }

          const migrationResult = {
            id: dataSource.id,
            name: dataSource.name,
            originalPlugin: dataSource.plugin,
            newPlugin: 'database',
            databaseType: 'mysql',
            config: universalConfig,
            testResult: testResult,
            migrated: true // Always mark as migrated since we're converting the format
          };

          if (!dryRun) {
            // Update the data source to use universal database plugin
            const updatedDataSource = {
              ...dataSource,
              plugin: 'database',
              databaseType: 'mysql',
              config: universalConfig
            };

            await dataSourceManager.updateDataSource(dataSource.id, updatedDataSource);
            migrationResult.migrated = true;
            migrationResults.migrated++;
          } else {
            migrationResults.migrated++;
          }

          migrationResults.results.push(migrationResult);
        } else {
          // Skip non-MySQL connections or already migrated connections
          migrationResults.results.push({
            id: dataSource.id,
            name: dataSource.name,
            plugin: dataSource.plugin,
            skipped: true,
            reason: dataSource.plugin === 'database' ? 'Already migrated' : 'Not a MySQL connection'
          });
          migrationResults.skipped++;
        }
      } catch (error) {
        migrationResults.results.push({
          id: dataSource.id,
          name: dataSource.name,
          error: error.message,
          migrated: false
        });
        migrationResults.errors++;
      }
    }

    res.json({
      success: true,
      migration: migrationResults,
      dryRun,
      message: dryRun ?
        'Dry run completed. No connections were actually migrated.' :
        'Migration completed. Connections have been updated.'
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Migration failed'
    });
  }
});

/**
 * POST /api/database/migrate/single
 * Migrate a single connection to universal database plugin
 */
router.post('/migrate/single', async (req, res) => {
  try {
    const { connectionId, dryRun = true } = req.body;
    const dbPlugin = new DatabasePlugin();

    if (!connectionId) {
      return res.status(400).json({
        success: false,
        error: 'Connection ID is required'
      });
    }

    // Get the specific data source
    const dataSource = await dataSourceManager.getDataSource(connectionId);

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Check if it's a MySQL connection
    if (dataSource.plugin !== 'mysql') {
      return res.status(400).json({
        success: false,
        error: 'Only MySQL connections can be migrated'
      });
    }

    const mysqlConfig = dataSource.config;

    // Convert MySQL config to universal database format
    const universalConfig = {
      host: mysqlConfig.host || mysqlConfig.server || 'localhost',
      port: mysqlConfig.port || 3306,
      database: mysqlConfig.database || mysqlConfig.db || '',
      user: mysqlConfig.user || mysqlConfig.username || '',
      password: mysqlConfig.password || '',
      connectionLimit: mysqlConfig.connectionLimit || mysqlConfig.poolSize || 10,
      connectTimeout: mysqlConfig.connectTimeout || mysqlConfig.timeout || 60000,
      acquireTimeout: mysqlConfig.acquireTimeout || 60000
    };

    // Test the migrated configuration (optional - don't fail migration if test fails)
    let testResult = { success: true, message: 'Connection test skipped during migration' };
    try {
      testResult = await dbPlugin.testConnectionWithParams('mysql', universalConfig);
    } catch (error) {
      console.warn(`Connection test failed for ${dataSource.name}: ${error.message}`);
      testResult = { success: false, message: `Connection test failed: ${error.message}` };
    }

    const migrationResult = {
      id: dataSource.id,
      name: dataSource.name,
      originalPlugin: dataSource.plugin,
      newPlugin: 'database',
      databaseType: 'mysql',
      originalConfig: mysqlConfig,
      newConfig: universalConfig,
      testResult: testResult,
      migrated: false
    };

    if (!dryRun) {
      // Update the data source to use universal database plugin
      const updatedDataSource = {
        ...dataSource,
        plugin: 'database',
        databaseType: 'mysql',
        config: universalConfig
      };

      await dataSourceManager.updateDataSource(dataSource.id, updatedDataSource);
      migrationResult.migrated = true;
    }

    res.json({
      success: true,
      migration: migrationResult,
      dryRun,
      message: dryRun ?
        'Dry run completed. Connection was not actually migrated.' :
        `Migration ${migrationResult.migrated ? 'successful' : 'failed'}.`
    });
  } catch (error) {
    console.error('Single migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Migration failed'
    });
  }
});

/**
 * GET /api/database/migration/status
 * Get migration status and recommendations
 */
router.get('/migration/status', async (req, res) => {
  try {
    // Get all existing data sources
    const dataSources = await dataSourceManager.getAllDataSources();

    const status = {
      totalConnections: dataSources.length,
      mysqlConnections: 0,
      universalConnections: 0,
      otherConnections: 0,
      migrationReady: [],
      alreadyMigrated: [],
      notApplicable: []
    };

    for (const dataSource of dataSources) {
      if (dataSource.plugin === 'mysql') {
        status.mysqlConnections++;
        status.migrationReady.push({
          id: dataSource.id,
          name: dataSource.name,
          config: dataSource.config
        });
      } else if (dataSource.plugin === 'database') {
        status.universalConnections++;
        status.alreadyMigrated.push({
          id: dataSource.id,
          name: dataSource.name,
          databaseType: dataSource.databaseType
        });
      } else {
        status.otherConnections++;
        status.notApplicable.push({
          id: dataSource.id,
          name: dataSource.name,
          plugin: dataSource.plugin
        });
      }
    }

    res.json({
      success: true,
      status,
      recommendations: {
        canMigrate: status.mysqlConnections > 0,
        migrationCount: status.mysqlConnections,
        message: status.mysqlConnections > 0 ?
          `Found ${status.mysqlConnections} MySQL connection(s) ready for migration.` :
          'No MySQL connections found for migration.'
      }
    });
  } catch (error) {
    console.error('Migration status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get migration status'
    });
  }
});

export default router;
