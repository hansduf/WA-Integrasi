// plugins/database/dialects/base-dialect.js
/**
 * Base SQL Dialect Interface
 * All SQL dialects must implement this interface
 */
export class SQLDialect {
  constructor() {
    this.name = '';
    this.version = '1.0.0';
  }

  /**
   * Quote identifier (table name, column name)
   * @param {string} identifier - Identifier to quote
   * @returns {string} Quoted identifier
   */
  quoteIdentifier(identifier) {
    return identifier;
  }

  /**
   * Generate LIMIT/OFFSET clause
   * @param {number} limit - Maximum number of rows
   * @param {number} offset - Number of rows to skip
   * @returns {string} LIMIT clause
   */
  getLimitClause(limit, offset) {
    return '';
  }

  /**
   * Get date function for current time
   * @param {string} functionName - Function name (NOW, CURRENT_DATE, etc.)
   * @returns {string} Database-specific date function
   */
  getDateFunction(functionName) {
    return functionName;
  }

  /**
   * Map database type to generic type
   * @param {string} dbType - Database-specific type
   * @returns {string} Generic type
   */
  mapDataType(dbType) {
    return 'string';
  }

  /**
   * Check if table is a system table
   * @param {string} tableName - Table name
   * @returns {boolean} True if system table
   */
  isSystemTable(tableName) {
    return false;
  }

  /**
   * Get SQL for getting current timestamp
   * @returns {string} SQL for current timestamp
   */
  getCurrentTimestamp() {
    return 'NOW()';
  }

  /**
   * Get SQL for date subtraction
   * @param {string} dateField - Date field name
   * @param {number} hours - Hours to subtract
   * @returns {string} SQL for date subtraction
   */
  getDateSubtraction(dateField, hours) {
    return `${dateField} >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)`;
  }

  /**
   * Get SQL for counting records
   * @param {string} table - Table name
   * @returns {string} SQL for counting
   */
  getCountQuery(table) {
    return `SELECT COUNT(*) as total FROM ${this.quoteIdentifier(table)}`;
  }

  /**
   * Get SQL for selecting all records
   * @param {string} table - Table name
   * @param {number} limit - Maximum records
   * @returns {string} SQL for selecting all
   */
  getSelectAllQuery(table, limit = 50) {
    const quotedTable = this.quoteIdentifier(table);
    const limitClause = this.getLimitClause(limit);
    return `SELECT * FROM ${quotedTable} ${limitClause}`;
  }

  /**
   * Get SQL for selecting recent records
   * @param {string} table - Table name
   * @param {string} dateField - Date field name
   * @param {number} hours - Hours back
   * @param {number} limit - Maximum records
   * @returns {string} SQL for recent records
   */
  getRecentRecordsQuery(table, dateField, hours = 24, limit = 20) {
    const quotedTable = this.quoteIdentifier(table);
    const quotedField = this.quoteIdentifier(dateField);
    const dateCondition = this.getDateSubtraction(quotedField, hours);
    const limitClause = this.getLimitClause(limit);
    const orderBy = `ORDER BY ${quotedField} DESC`;

    return `SELECT * FROM ${quotedTable} WHERE ${dateCondition} ${orderBy} ${limitClause}`;
  }
}
