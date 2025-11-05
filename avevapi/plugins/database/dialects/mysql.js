// plugins/database/dialects/mysql.js
import { SQLDialect } from './base-dialect.js';

/**
 * MySQL SQL Dialect
 * Handles MySQL-specific SQL syntax and functions
 */
export class MySQLDialect extends SQLDialect {
  constructor() {
    super();
    this.name = 'MySQL';
    this.version = '1.0.0';
  }

  /**
   * Quote MySQL identifier (table name, column name)
   * @param {string} identifier - Identifier to quote
   * @returns {string} Quoted identifier
   */
  quoteIdentifier(identifier) {
    return `\`${identifier}\``;
  }

  /**
   * Generate MySQL LIMIT/OFFSET clause
   * @param {number} limit - Maximum number of rows
   * @param {number} offset - Number of rows to skip
   * @returns {string} LIMIT clause
   */
  getLimitClause(limit, offset) {
    let clause = `LIMIT ${limit}`;
    if (offset && offset > 0) {
      clause += ` OFFSET ${offset}`;
    }
    return clause;
  }

  /**
   * Get MySQL date function
   * @param {string} functionName - Function name
   * @returns {string} MySQL-specific date function
   */
  getDateFunction(functionName) {
    const functions = {
      'NOW': 'NOW()',
      'CURRENT_DATE': 'CURRENT_DATE()',
      'CURRENT_TIMESTAMP': 'CURRENT_TIMESTAMP()',
      'DATE_SUB': 'DATE_SUB(NOW(), INTERVAL 24 HOUR)'
    };
    return functions[functionName] || functionName;
  }

  /**
   * Map MySQL data type to generic type
   * @param {string} dbType - MySQL-specific type
   * @returns {string} Generic type
   */
  mapDataType(dbType) {
    const type = dbType.toLowerCase();

    // Handle types with parameters (e.g., varchar(255), decimal(10,2))
    const baseType = type.split('(')[0];

    const typeMap = {
      'int': 'integer',
      'tinyint': 'integer',
      'smallint': 'integer',
      'mediumint': 'integer',
      'bigint': 'integer',
      'decimal': 'decimal',
      'numeric': 'decimal',
      'float': 'decimal',
      'double': 'decimal',
      'varchar': 'string',
      'char': 'string',
      'text': 'text',
      'tinytext': 'text',
      'mediumtext': 'text',
      'longtext': 'text',
      'datetime': 'datetime',
      'timestamp': 'datetime',
      'date': 'date',
      'time': 'time',
      'year': 'integer',
      'boolean': 'boolean',
      'tinyint(1)': 'boolean', // MySQL boolean representation
      'blob': 'binary',
      'tinyblob': 'binary',
      'mediumblob': 'binary',
      'longblob': 'binary',
      'json': 'json'
    };

    return typeMap[baseType] || typeMap[type] || 'string';
  }

  /**
   * Check if table is a MySQL system table
   * @param {string} tableName - Table name
   * @returns {boolean} True if system table
   */
  isSystemTable(tableName) {
    const systemTables = [
      'sys',
      'mysql',
      'information_schema',
      'performance_schema'
    ];

    const lowerTable = tableName.toLowerCase();
    return systemTables.some(sys => lowerTable.startsWith(sys));
  }

  /**
   * Get MySQL current timestamp
   * @returns {string} SQL for current timestamp
   */
  getCurrentTimestamp() {
    return 'NOW()';
  }

  /**
   * Get MySQL date subtraction
   * @param {string} dateField - Date field name
   * @param {number} hours - Hours to subtract
   * @returns {string} SQL for date subtraction
   */
  getDateSubtraction(dateField, hours) {
    return `${dateField} >= DATE_SUB(NOW(), INTERVAL ${hours} HOUR)`;
  }

  /**
   * Get MySQL count query
   * @param {string} table - Table name
   * @returns {string} SQL for counting
   */
  getCountQuery(table) {
    return `SELECT COUNT(*) as total FROM ${this.quoteIdentifier(table)}`;
  }

  /**
   * Get MySQL select all query
   * @param {string} table - Table name
   * @param {number} limit - Maximum records
   * @returns {string} SQL for selecting all
   */
  getSelectAllQuery(table, limit = 50) {
    const quotedTable = this.quoteIdentifier(table);
    const limitClause = this.getLimitClause(limit);
    return `SELECT * FROM ${quotedTable} ORDER BY id DESC ${limitClause}`;
  }

  /**
   * Get MySQL recent records query
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

    return `SELECT * FROM ${quotedTable} WHERE ${dateCondition} ORDER BY ${quotedField} DESC ${limitClause}`;
  }
}

export default MySQLDialect;
