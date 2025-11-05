// plugins/database/drivers/base-driver.js
/**
 * Base Database Driver Interface
 * All database drivers must implement this interface
 */
export class DatabaseDriver {
  constructor() {
    this.pool = null;
    this.connection = null;
  }

  /**
   * Establish connection to database
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Connection object
   */
  async connect(config) {
    throw new Error('connect() must be implemented by driver');
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by driver');
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by driver');
  }

  /**
   * Execute raw query
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, params = []) {
    throw new Error('executeQuery() must be implemented by driver');
  }

  /**
   * Get all tables in database
   * @param {string} database - Database name
   * @returns {Promise<Array>} Array of table names
   */
  async getTables(database) {
    throw new Error('getTables() must be implemented by driver');
  }

  /**
   * Get columns for a specific table
   * @param {string} database - Database name
   * @param {string} table - Table name
   * @returns {Promise<Array>} Array of column definitions
   */
  async getColumns(database, table) {
    throw new Error('getColumns() must be implemented by driver');
  }

  /**
   * Get database version/info
   * @returns {Promise<Object>} Database information
   */
  async getDatabaseInfo() {
    throw new Error('getDatabaseInfo() must be implemented by driver');
  }
}
