// plugins/database/drivers/mysql.js
import mysql from 'mysql2/promise';
import { DatabaseDriver } from './base-driver.js';

/**
 * MySQL Database Driver
 * Handles MySQL-specific connection and query execution
 */
export class MySQLDriver extends DatabaseDriver {
  constructor() {
    super();
    this.pool = null;
    this.config = null;
  }

  /**
   * Establish connection to MySQL database
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Connection object
   */
  async connect(config) {
    try {
      console.log(`🔧 MySQL: Connecting to ${config.host}:${config.port}/${config.database}`);

      // First check if we can reach the host
      const net = await import('net');
      const canConnect = await new Promise((resolve) => {
        const socket = net.createConnection(config.port, config.host);
        socket.setTimeout(5000); // 5 second timeout

        socket.on('connect', () => {
          socket.end();
          resolve(true);
        });

        socket.on('error', () => {
          resolve(false);
        });

        socket.on('timeout', () => {
          socket.end();
          resolve(false);
        });
      });

      if (!canConnect) {
        throw new Error(`Cannot connect to ${config.host}:${config.port} - MySQL server may not be running`);
      }

      // Create connection pool
      this.pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password || '',
        database: config.database,
        waitForConnections: true,
        connectionLimit: config.connectionLimit || 10,
        queueLimit: 0,
        acquireTimeout: config.acquireTimeout || 60000,
        timeout: config.connectTimeout || 60000
      });

      this.config = config;

      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      console.log(`✅ MySQL: Connected to ${config.host}:${config.port}/${config.database}`);
      return { pool: this.pool, config };

    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('❌ MySQL connection failed:', errorMessage);
      throw new Error(`Failed to connect to MySQL database at ${config.host}:${config.port}/${config.database}: ${errorMessage}`);
    }
  }

  /**
   * Close MySQL connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.config = null;
      console.log('✅ MySQL connection closed');
    }
  }

  /**
   * Test MySQL connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.pool) {
      return false;
    }

    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      console.error('❌ MySQL connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Execute query on MySQL database
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, params = []) {
    if (!this.pool) {
      throw new Error('No active MySQL connection');
    }

    const conn = await this.pool.getConnection();

    try {
      // For SELECT queries, ensure we use fully qualified table names
      let modifiedQuery = query;
      if (this.config.database && query.toUpperCase().includes('FROM') && !query.toUpperCase().startsWith('SHOW')) {
        // Replace unqualified table references with fully qualified names
        modifiedQuery = query.replace(/FROM\s+`?([^`\.\s]+)`?(?!\.)/gi, `FROM \`${this.config.database}\`.\`$1\``);
      }

      // Use regular query for commands that don't support prepared statements
      const commandsWithoutPreparedStatements = ['SHOW', 'DESCRIBE', 'USE', 'SET'];
      const isPreparedStatementSupported = !commandsWithoutPreparedStatements.some(cmd =>
        modifiedQuery.toUpperCase().startsWith(cmd)
      );

      let rows, fields;
      if (isPreparedStatementSupported && params.length > 0 && params.every(val => val !== undefined && val !== null)) {
        // Use prepared statement for parameterized queries
        [rows, fields] = await conn.execute(modifiedQuery, params);
      } else {
        // Use regular query for non-parameterized or unsupported commands
        [rows, fields] = await conn.query(modifiedQuery);
      }

      return {
        data: rows,
        fields: fields ? fields.map(f => ({ name: f.name, type: f.type })) : [],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        affectedRows: rows.affectedRows || 0,
        insertId: rows.insertId || null
      };

    } finally {
      // Always release connection back to pool
      conn.release();
    }
  }

  /**
   * Get all tables in MySQL database
   * @param {string} database - Database name
   * @returns {Promise<Array>} Array of table names
   */
  async getTables(database) {
    const conn = await this.pool.getConnection();

    try {
      // Use regular query for SHOW commands (don't support prepared statements)
      const [rows] = await conn.query(`SHOW TABLES FROM \`${database}\``);
      return rows.map(row => Object.values(row)[0]);
    } finally {
      conn.release();
    }
  }

  /**
   * Get columns for a specific table in MySQL
   * @param {string} database - Database name
   * @param {string} table - Table name
   * @returns {Promise<Array>} Array of column definitions
   */
  async getColumns(database, table) {
    const conn = await this.pool.getConnection();

    try {
      // Use regular query for DESCRIBE commands (don't support prepared statements)
      const [rows] = await conn.query(`DESCRIBE \`${database}\`.\`${table}\``);
      return rows.map(col => ({
        name: col.Field,
        type: col.Type,
        nullable: col.Null === 'YES',
        key: col.Key,
        default: col.Default,
        extra: col.Extra
      }));
    } finally {
      conn.release();
    }
  }

  /**
   * Get MySQL database information
   * @returns {Promise<Object>} Database information
   */
  async getDatabaseInfo() {
    try {
      const [rows] = await this.pool.execute('SELECT VERSION() as version');
      return {
        version: rows[0].version,
        type: 'MySQL',
        driver: 'mysql2'
      };
    } catch (error) {
      console.error('Failed to get MySQL database info:', error.message);
      return {
        version: 'unknown',
        type: 'MySQL',
        driver: 'mysql2',
        error: error.message
      };
    }
  }
}

export default MySQLDriver;
