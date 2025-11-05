// plugins/database/dialects/oracle.js
import { SQLDialect } from './base-dialect.js';

/**
 * Oracle SQL Dialect
 * Handles Oracle-specific SQL syntax and functions
 */
export class OracleDialect extends SQLDialect {
  constructor() {
    super();
    this.name = 'Oracle';
    this.version = '1.0.0';
  }

  /**
   * Quote Oracle identifier (table name, column name)
   * Oracle uses double quotes for identifiers
   * @param {string} identifier - Identifier to quote
   * @returns {string} Quoted identifier
   */
  quoteIdentifier(identifier) {
    return `"${identifier}"`;
  }

  /**
   * Generate Oracle LIMIT/OFFSET clause using ROWNUM
   * Oracle doesn't have LIMIT like MySQL, uses ROWNUM
   * @param {number} limit - Maximum number of rows
   * @param {number} offset - Number of rows to skip
   * @returns {string} Oracle LIMIT equivalent
   */
  getLimitClause(limit, offset) {
    if (offset && offset > 0) {
      // For Oracle with offset, we need a more complex query
      return `ROWNUM <= ${limit + offset}`;
    }
    return `ROWNUM <= ${limit}`;
  }

  /**
   * Get Oracle date function
   * @param {string} functionName - Function name
   * @returns {string} Oracle-specific date function
   */
  getDateFunction(functionName) {
    const functions = {
      'NOW': 'SYSDATE',
      'CURRENT_DATE': 'CURRENT_DATE',
      'CURRENT_TIMESTAMP': 'CURRENT_TIMESTAMP',
      'DATE_SUB': 'SYSDATE - INTERVAL \'24\' HOUR'
    };
    return functions[functionName] || functionName;
  }

  /**
   * Map Oracle data type to generic type
   * @param {string} dbType - Oracle-specific type
   * @returns {string} Generic type
   */
  mapDataType(dbType) {
    const type = dbType.toUpperCase();

    // Handle types with parameters (e.g., VARCHAR2(255), NUMBER(10,2))
    const baseType = type.split('(')[0];

    const typeMap = {
      'NUMBER': 'decimal',
      'VARCHAR2': 'string',
      'NVARCHAR2': 'string',
      'CHAR': 'string',
      'NCHAR': 'string',
      'CLOB': 'text',
      'NCLOB': 'text',
      'BLOB': 'binary',
      'DATE': 'datetime',
      'TIMESTAMP': 'datetime',
      'TIMESTAMP WITH TIME ZONE': 'datetime',
      'TIMESTAMP WITH LOCAL TIME ZONE': 'datetime',
      'INTERVAL DAY TO SECOND': 'string',
      'INTERVAL YEAR TO MONTH': 'string',
      'RAW': 'binary',
      'LONG': 'text',
      'LONG RAW': 'binary',
      'ROWID': 'string',
      'UROWID': 'string'
    };

    return typeMap[baseType] || typeMap[type] || 'string';
  }

  /**
   * Check if table is an Oracle system table
   * @param {string} tableName - Table name
   * @returns {boolean} True if system table
   */
  isSystemTable(tableName) {
    const systemTables = [
      'ALL_',
      'DBA_',
      'USER_',
      'V$',
      'GV$',
      'X$',
      'SYS',
      'SYSTEM'
    ];

    const upperTable = tableName.toUpperCase();
    return systemTables.some(sys => upperTable.startsWith(sys)) ||
           upperTable.includes('$') ||
           upperTable.startsWith('BIN$');
  }

  /**
   * Get Oracle current timestamp
   * @returns {string} SQL for current timestamp
   */
  getCurrentTimestamp() {
    return 'SYSDATE';
  }

  /**
   * Get Oracle date subtraction
   * @param {string} dateField - Date field name
   * @param {number} hours - Hours to subtract
   * @returns {string} SQL for date subtraction
   */
  getDateSubtraction(dateField, hours) {
    return `${dateField} >= SYSDATE - INTERVAL '${hours}' HOUR`;
  }

  /**
   * Get Oracle count query
   * @param {string} table - Table name
   * @returns {string} SQL for counting
   */
  getCountQuery(table) {
    return `SELECT COUNT(*) as total FROM ${this.quoteIdentifier(table)}`;
  }

  /**
   * Get Oracle select all query with ROWNUM
   * @param {string} table - Table name
   * @param {number} limit - Maximum records
   * @returns {string} SQL for selecting all
   */
  getSelectAllQuery(table, limit = 50) {
    const quotedTable = this.quoteIdentifier(table);
    const limitClause = this.getLimitClause(limit);
    return `SELECT * FROM ${quotedTable} WHERE ${limitClause} ORDER BY ROWNUM`;
  }

  /**
   * Get Oracle recent records query
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

    return `SELECT * FROM ${quotedTable} WHERE ${dateCondition} AND ${limitClause} ORDER BY ${quotedField} DESC`;
  }

  /**
   * Get Oracle-specific query for pagination
   * @param {string} baseQuery - Base SELECT query
   * @param {number} limit - Maximum records
   * @param {number} offset - Records to skip
   * @returns {string} Paginated query
   */
  getPaginatedQuery(baseQuery, limit, offset = 0) {
    if (!offset || offset === 0) {
      return `${baseQuery} WHERE ROWNUM <= ${limit}`;
    }

    // Oracle pagination with offset is more complex
    return `
      SELECT * FROM (
        SELECT a.*, ROWNUM rnum FROM (
          ${baseQuery}
        ) a WHERE ROWNUM <= ${limit + offset}
      ) WHERE rnum > ${offset}
    `;
  }

  /**
   * Get Oracle sequence next value
   * @param {string} sequenceName - Sequence name
   * @returns {string} SQL for next sequence value
   */
  getSequenceNextVal(sequenceName) {
    return `${sequenceName}.NEXTVAL`;
  }

  /**
   * Get Oracle sequence current value
   * @param {string} sequenceName - Sequence name
   * @returns {string} SQL for current sequence value
   */
  getSequenceCurrVal(sequenceName) {
    return `${sequenceName}.CURRVAL`;
  }
}

export default OracleDialect;
