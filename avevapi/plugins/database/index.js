// plugins/database/index.js
import { ConfigField, DataSourcePlugin, Schema, Trigger } from '../../core/plugin-interface.js';
import { DatabaseDriver } from './drivers/base-driver.js';
import { schemaLoader } from './schemas/schema-loader.js';

/**
 * Universal Database Plugin
 * Supports multiple database types through driver abstraction
 */
export class DatabasePlugin extends DataSourcePlugin {
  constructor() {
    super();
    this.name = 'Universal Database';
    this.type = 'database';
    this.version = '2.0.0';
    this.driver = null;
    this.dialect = null;
    this.connection = null;
  }

  /**
   * Get configuration schema based on selected driver
   * @returns {Array} Configuration fields
   */
  getConfigSchema() {
    return [
      new ConfigField('driver', 'select', {
        required: true,
        label: 'Database Type',
        description: 'Select the database type to connect to',
        options: [
          { value: 'mysql', label: 'MySQL', icon: '🗄️' },
          { value: 'oracle', label: 'Oracle', icon: '🏢' },
          { value: 'sqlserver', label: 'SQL Server', icon: '🔷' }
        ],
        default: 'mysql'
      }),
      // Dynamic fields will be added based on selected driver
      // These are loaded from schema files
    ];
  }

  /**
   * Get dynamic configuration fields based on selected driver
   * @param {string} driverType - Selected database driver
   * @returns {Promise<Array>} Dynamic configuration fields
   */
  async getDynamicConfigFields(driverType) {
    try {
      const schema = await schemaLoader.loadSchema(driverType);
      const fields = [];

      // Add driver-specific fields
      for (const field of schema.fields) {
        fields.push(new ConfigField(field.name, field.type, {
          required: field.required,
          label: field.label,
          description: field.description || '',
          placeholder: field.placeholder || '',
          default: field.default
        }));
      }

      return fields;
    } catch (error) {
      console.error(`Failed to load schema for ${driverType}:`, error);
      // Fallback to basic fields
      return this.getBasicConfigFields(driverType);
    }
  }

  /**
   * Get basic configuration fields as fallback
   * @param {string} driverType - Database driver type
   * @returns {Array} Basic configuration fields
   */
  getBasicConfigFields(driverType) {
    const fields = [
      new ConfigField('host', 'string', {
        required: true,
        label: 'Host/Server',
        description: 'Database server hostname or IP address',
        placeholder: 'localhost'
      }),
      new ConfigField('port', 'number', {
        required: true,
        label: 'Port',
        description: 'Database server port',
        placeholder: this.getDefaultPort(driverType)
      }),
      new ConfigField('database', 'string', {
        required: true,
        label: 'Database Name',
        description: 'Database name to connect to',
        placeholder: 'my_database'
      }),
      new ConfigField('user', 'string', {
        required: true,
        label: 'Username',
        description: 'Database user username',
        placeholder: 'root'
      }),
      new ConfigField('password', 'password', {
        required: false,
        label: 'Password',
        description: 'Database user password',
        placeholder: 'Enter password'
      })
    ];

    return fields;
  }

  /**
   * Get default port for database type
   * @param {string} driverType - Database driver type
   * @returns {string} Default port
   */
  getDefaultPort(driverType) {
    const ports = {
      mysql: '3306',
      oracle: '1521',
      sqlserver: '1433'
    };
    return ports[driverType] || '3306';
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} True if valid
   */
  async validateConfig(config) {
    if (!config.driver) {
      throw new Error('Database type (driver) is required');
    }

    const supportedDrivers = ['mysql', 'oracle', 'sqlserver'];
    if (!supportedDrivers.includes(config.driver)) {
      throw new Error(`Unsupported database type: ${config.driver}`);
    }

    // Use schema loader for detailed validation
    const validationErrors = await schemaLoader.validateConfig(config.driver, config);
    if (validationErrors.length > 0) {
      throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
    }

    return true;
  }

  /**
   * Establish connection using appropriate driver
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} Connection object
   */
  async connect(config) {
    try {
      console.log(`🔧 Connecting to ${config.driver} database...`);

      // Dynamically load the appropriate driver
      const driverModule = await import(`./drivers/${config.driver}.js`);
      this.driver = new driverModule.default();

      // Dynamically load the appropriate dialect
      const dialectModule = await import(`./dialects/${config.driver}.js`);
      this.dialect = new dialectModule.default();

      // Establish connection
      this.connection = await this.driver.connect(config);

      console.log(`✅ Connected to ${config.driver} database successfully`);
      return this.connection;

    } catch (error) {
      console.error(`❌ Failed to connect to ${config.driver} database:`, error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Close connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.driver) {
      await this.driver.disconnect();
      this.driver = null;
      this.dialect = null;
      this.connection = null;
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Test connection
   * @returns {Promise<boolean>} True if successful
   */
  async testConnection() {
    if (!this.driver) {
      throw new Error('No active connection');
    }

    try {
      const result = await this.driver.testConnection();
      // Silent mode: only log failures
      if (!result) {
        console.warn('⚠️ Database connection test failed');
      }
      return result;
    } catch (error) {
      // Only log critical errors
      return false;
    }
  }

  /**
   * Discover database schema
   * @returns {Promise<Object>} Schema information
   */
  async discoverSchema() {
    if (!this.driver || !this.dialect) {
      throw new Error('No active connection');
    }

    try {
      console.log('🔍 Discovering database schema...');

      const schema = new Schema();
      const config = this.connection.config;

      // Get database name (different for Oracle)
      const databaseName = config.database || config.service || 'default';

      // Get all tables
      schema.tables = await this.driver.getTables(databaseName);

      // Filter out system tables
      schema.tables = schema.tables.filter(table => !this.dialect.isSystemTable(table));

      console.log(`📋 Found ${schema.tables.length} tables`);

      // Get fields for each table
      schema.fields = {};
      for (const table of schema.tables) {
        try {
          const columns = await this.driver.getColumns(databaseName, table);
          schema.fields[table] = columns.map(col => ({
            name: col.name,
            type: this.dialect.mapDataType(col.type),
            nullable: col.nullable,
            key: col.key,
            default: col.default,
            extra: col.extra
          }));
        } catch (error) {
          console.warn(`⚠️ Failed to get columns for table ${table}:`, error.message);
          schema.fields[table] = [];
        }
      }

      // Get basic metadata
      schema.metadata = {
        discoveredAt: new Date().toISOString(),
        tableCount: schema.tables.length,
        totalFields: Object.values(schema.fields).reduce((sum, fields) => sum + fields.length, 0),
        driver: config.driver,
        database: databaseName
      };

      console.log(`🔎 Discovered ${schema.tables.length} tables with ${schema.metadata.totalFields} fields`);
      return schema;

    } catch (error) {
      console.error('❌ Schema discovery failed:', error.message);
      throw new Error(`Failed to discover schema: ${error.message}`);
    }
  }

  /**
   * Execute query using driver
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(params) {
    if (!this.driver) {
      throw new Error('No active connection');
    }

    const { query, values = [], limit, offset } = params;

    try {
      let sql = query;
      const sqlValues = values; // Pass values as-is to preserve object format for Oracle

      // Add LIMIT/OFFSET if specified
      if (typeof limit === 'number' && limit > 0) {
        sql += ' ' + this.dialect.getLimitClause(limit, offset);
      }

      console.log(`🔍 Executing query: ${sql}`);

      const result = await this.driver.executeQuery(sql, sqlValues);

      console.log(`✅ Query executed successfully, returned ${result.rowCount || 0} rows`);
      return result.data || result;

    } catch (error) {
      console.error('❌ Query execution failed:', error.message);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Execute raw query
   * @param {string} query - Raw query string
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, params = {}) {
    if (!this.driver) {
      throw new Error('No active connection');
    }

    try {
      console.log(`🔍 Executing raw query: ${query}`);

      // For Oracle, pass named parameters as object; for others, convert to array
      let paramValues;
      if (this.dialect && this.dialect.name === 'Oracle') {
        // Oracle uses named parameters - pass object directly
        paramValues = params;
      } else {
        // Other databases use positional parameters - convert to array
        paramValues = Object.values(params).filter(val => val !== undefined && val !== null);
      }

      const result = await this.driver.executeQuery(query, paramValues);

      console.log(`✅ Raw query executed successfully`);

      return {
        data: result.data || result,
        fields: result.fields || [],
        rowCount: result.rowCount || 0,
        affectedRows: result.affectedRows || 0,
        insertId: result.insertId || null
      };

    } catch (error) {
      console.error(`❌ Raw query execution failed:`, error.message);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Generate triggers based on schema using dialect
   * @param {Object} schema - Discovered schema
   * @returns {Array} Array of trigger configurations
   */
  generateTriggers(schema) {
    const triggers = [];

    console.log(`🎯 Generating triggers for ${schema.tables.length} tables`);

    for (const table of schema.tables) {
      if (this.dialect.isSystemTable(table)) continue;

      const fields = schema.fields[table];
      if (!fields || fields.length === 0) continue;

      // Basic SELECT ALL trigger
      triggers.push(new Trigger(
        `${table}-all`,
        'query',
        {
          query: this.dialect.getSelectAllQuery(table),
          description: `Get all records from ${table}`,
          responsePrefix: `📋 *${table.toUpperCase()} DATA*`
        }
      ));

      // Recent records trigger (if has date/timestamp field)
      const dateField = this.findDateField(fields);
      if (dateField) {
        triggers.push(new Trigger(
          `${table}-recent`,
          'query',
          {
            query: this.dialect.getRecentRecordsQuery(table, dateField),
            description: `Get recent records from ${table}`,
            responsePrefix: `🕐 *RECENT ${table.toUpperCase()}*`
          }
        ));
      }

      // Count trigger
      triggers.push(new Trigger(
        `${table}-count`,
        'query',
        {
          query: this.dialect.getCountQuery(table),
          description: `Get total count of records in ${table}`,
          responsePrefix: `🔢 *${table.toUpperCase()} COUNT*`
        }
      ));
    }

    console.log(`🎯 Generated ${triggers.length} triggers`);
    return triggers;
  }

  /**
   * Find date/timestamp field in table
   * @param {Array} fields - Table fields
   * @returns {string|null} Date field name or null
   */
  findDateField(fields) {
    const dateFields = fields.filter(f =>
      f.name.toLowerCase().includes('date') ||
      f.name.toLowerCase().includes('time') ||
      f.name.toLowerCase().includes('created') ||
      f.name.toLowerCase().includes('updated') ||
      f.type.toLowerCase().includes('date') ||
      f.type.toLowerCase().includes('time')
    );
    return dateFields.length > 0 ? dateFields[0].name : null;
  }

  /**
   * Validate SQL query for security
   * @param {string} query - SQL query to validate
   * @returns {boolean} True if query is safe
   */
  validateQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    // Basic SQL injection prevention
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'EXEC', 'EXECUTE'];
    const upperQuery = query.toUpperCase();

    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        throw new Error(`Query contains dangerous keyword: ${keyword}`);
      }
    }

    return true;
  }

  /**
   * Validate trigger configuration
   * @param {Object} trigger - Trigger configuration
   * @returns {Promise<boolean>} True if valid
   */
  async validateTrigger(trigger) {
    if (!trigger.name || !trigger.config) {
      throw new Error('Trigger must have name and config');
    }

    if (!trigger.config.query) {
      throw new Error('Trigger must have a query');
    }

    // Use the validateQuery method
    return this.validateQuery(trigger.config.query);
  }

  /**
   * Test connection with specific database type and config
   * Used by API endpoints
   * @param {string} databaseType - Database type (mysql, oracle)
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Test result
   */
  async testConnectionWithParams(databaseType, config) {
    try {
      // Create driver instance for the specific database type
      const driver = await this.createDriver(databaseType);

      // Connect using the provided config
      await driver.connect(config);

      // Test with a simple query
      const testResult = await driver.executeQuery('SELECT 1 as test', []);

      // Disconnect
      await driver.disconnect();

      return {
        success: true,
        message: 'Connection successful',
        databaseType,
        testResult
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        databaseType,
        error: error.stack
      };
    }
  }

  /**
   * Discover schema with specific database type and config
   * Used by API endpoints
   * @param {string} databaseType - Database type (mysql, oracle)
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Schema information
   */
  async discoverSchemaWithParams(databaseType, config) {
    try {
      // Create driver instance for the specific database type
      const driver = await this.createDriver(databaseType);

      // Connect using the provided config
      await driver.connect(config);

      // Get tables
      const tables = await driver.getTables(config.database || config.db);

      // Get columns for each table
      const schema = {};
      for (const table of tables) {
        try {
          const columns = await driver.getColumns(config.database || config.db, table);
          schema[table] = columns;
        } catch (error) {
          console.warn(`Failed to get columns for table ${table}:`, error.message);
          schema[table] = [];
        }
      }

      // Get database info
      const dbInfo = await driver.getDatabaseInfo();

      // Disconnect
      await driver.disconnect();

      return {
        success: true,
        databaseType,
        database: config.database || config.db,
        tables: tables,
        schema: schema,
        info: dbInfo
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        databaseType,
        error: error.stack
      };
    }
  }

  /**
   * Execute query with specific database type and config
   * Used by API endpoints
   * @param {string} databaseType - Database type (mysql, oracle)
   * @param {Object} config - Database configuration
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQueryWithParams(databaseType, config, query, params = []) {
    try {
      // Validate query for security
      this.validateQuery(query);

      // Create driver instance for the specific database type
      const driver = await this.createDriver(databaseType);

      // Connect using the provided config
      await driver.connect(config);

      // Execute the query
      const result = await driver.executeQuery(query, params);

      // Disconnect
      await driver.disconnect();

      return {
        success: true,
        databaseType,
        query,
        result,
        rowCount: result.length || 0
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        databaseType,
        query,
        error: error.stack
      };
    }
  }

  /**
   * Create driver instance for specific database type
   * @param {string} databaseType - Database type
   * @returns {Promise<DatabaseDriver>} Driver instance
   */
  async createDriver(databaseType) {
    if (!databaseType) {
      throw new Error('Database type is required');
    }

    let DriverClass;

    switch (databaseType.toLowerCase()) {
      case 'mysql':
        const { MySQLDriver } = await import('./drivers/mysql.js');
        DriverClass = MySQLDriver;
        break;
      case 'oracle':
        const { OracleDriver } = await import('./drivers/oracle.js');
        DriverClass = OracleDriver;
        break;
      default:
        throw new Error(`Unsupported database type: ${databaseType}`);
    }

    return new DriverClass();
  }
}

export default DatabasePlugin;
