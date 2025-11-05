// plugins/database/drivers/oracle.js
import oracledb from 'oracledb';
import { DatabaseDriver } from './base-driver.js';

/**
 * Oracle Database Driver
 * Handles Oracle-specific connection and query execution
 */
export class OracleDriver extends DatabaseDriver {
  constructor() {
    super();
    this.connection = null;
    this.pool = null;
    this.config = null;
  }

  /**
   * Establish connection to Oracle database
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Connection object
   */
  async connect(config) {
    try {
      console.log(`🔧 Oracle: Connecting to ${config.host}:${config.port}/${config.service || config.database}`);

      // Configure Oracle client (if needed)
      oracledb.initOracleClient(); // This might need Oracle Instant Client

      // Create connection string
      const connectString = config.service
        ? `${config.host}:${config.port}/${config.service}`
        : config.database; // SID format

      // Connection configuration
      const connectionConfig = {
        user: config.user,
        password: config.password,
        connectString: connectString,
        poolMin: 1,
        poolMax: config.connectionLimit || 10,
        poolIncrement: 1,
        poolTimeout: (config.connectTimeout || 60000) / 1000, // Convert to seconds
        queueTimeout: (config.acquireTimeout || 60000) / 1000
      };

      // Create connection pool
      this.pool = await oracledb.createPool(connectionConfig);
      this.config = config;

      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.close();

      console.log(`✅ Oracle: Connected to ${config.host}:${config.port}/${config.service || config.database}`);
      return { pool: this.pool, config };

    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('❌ Oracle connection failed:', errorMessage);
      throw new Error(`Failed to connect to Oracle database: ${errorMessage}`);
    }
  }

  /**
   * Close Oracle connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.config = null;
      console.log('✅ Oracle connection closed');
    }
  }

  /**
   * Test Oracle connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.pool) {
      return false;
    }

    try {
      const connection = await this.pool.getConnection();
      await connection.close();
      return true;
    } catch (error) {
      console.error('❌ Oracle connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Execute query on Oracle database
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, params = []) {
    if (!this.pool) {
      throw new Error('No active Oracle connection');
    }

    const connection = await this.pool.getConnection();

    try {
      // Oracle uses named parameters (:param) or positional parameters
      // Convert our array params to Oracle format
      let processedQuery = query;
      const bindParams = {};

      // Check if params is an object (named parameters) or array (positional)
      const hasParams = params && (
        (Array.isArray(params) && params.length > 0) ||
        (!Array.isArray(params) && Object.keys(params).filter(key => params[key] !== undefined).length > 0)
      );

      if (hasParams) {
        if (Array.isArray(params)) {
          // Handle positional parameters (? placeholders)
          if (query.includes('?')) {
            for (let i = 0; i < params.length; i++) {
              const paramName = `param${i}`;
              processedQuery = processedQuery.replace('?', `:${paramName}`);
              bindParams[paramName] = params[i];
            }
          } else {
            // Convert array to named parameters
            params.forEach((value, index) => {
              bindParams[`param${index}`] = value;
            });
          }
        } else {
          // params is an object with named parameters - filter out undefined values
          Object.keys(params).forEach(key => {
            if (params[key] !== undefined) {
              bindParams[key] = params[key];
            }
          });
        }
      }

      console.log(`🔍 Executing Oracle query: ${processedQuery}`);

      // Execute query with or without bind parameters
      let result;
      if (hasParams && Object.keys(bindParams).length > 0) {
        result = await connection.execute(processedQuery, bindParams, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: true
        });
      } else {
        // No bind parameters - pass empty object for bindParams
        result = await connection.execute(processedQuery, {}, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: true
        });
      }

      return {
        data: result.rows || [],
        fields: result.metaData ? result.metaData.map(col => ({
          name: col.name,
          type: col.dbTypeName
        })) : [],
        rowCount: result.rows ? result.rows.length : 0,
        affectedRows: result.rowsAffected || 0,
        insertId: null // Oracle doesn't have auto-increment like MySQL
      };

    } finally {
      await connection.close();
    }
  }

  /**
   * Get all tables in Oracle database
   * @param {string} database - Database/Schema name
   * @returns {Promise<Array>} Array of table names
   */
  async getTables(database) {
    const query = `
      SELECT table_name
      FROM all_tables
      WHERE owner = UPPER(:owner)
      AND table_name NOT LIKE 'BIN$%'
      ORDER BY table_name
    `;

    const ownerValue = this.config?.user?.toUpperCase();

    if (!ownerValue) {
      throw new Error('Oracle user not configured for schema discovery');
    }

    const result = await this.executeQuery(query, { owner: ownerValue });
    return result.data.map(row => row.TABLE_NAME);
  }

  /**
   * Get columns for a specific table in Oracle
   * @param {string} database - Database/Schema name
   * @param {string} table - Table name
   * @returns {Promise<Array>} Array of column definitions
   */
  async getColumns(database, table) {
    const query = `
      SELECT
        column_name,
        data_type,
        data_length,
        data_precision,
        data_scale,
        nullable,
        data_default
      FROM all_tab_columns
      WHERE owner = UPPER(:owner)
      AND table_name = UPPER(:table)
      ORDER BY column_id
    `;

    const ownerValue = this.config?.user?.toUpperCase();
    const tableValue = table?.toUpperCase();

    if (!ownerValue) {
      throw new Error('Oracle user not configured for schema discovery');
    }

    const result = await this.executeQuery(query, {
      owner: ownerValue,
      table: tableValue
    });

    return result.data.map(col => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      nullable: col.NULLABLE === 'Y',
      key: null, // Oracle doesn't have simple key indicators like MySQL
      default: col.DATA_DEFAULT,
      extra: null
    }));
  }

  /**
   * Get Oracle database information
   * @returns {Promise<Object>} Database information
   */
  async getDatabaseInfo() {
    try {
      const query = "SELECT * FROM v$version WHERE banner LIKE 'Oracle%'";
      const result = await this.executeQuery(query);

      return {
        version: result.data.length > 0 ? result.data[0].BANNER : 'Unknown',
        type: 'Oracle',
        driver: 'oracledb'
      };
    } catch (error) {
      console.error('Failed to get Oracle database info:', error.message);
      return {
        version: 'unknown',
        type: 'Oracle',
        driver: 'oracledb',
        error: error.message
      };
    }
  }
}

export default OracleDriver;
