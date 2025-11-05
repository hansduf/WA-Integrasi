// core/plugin-interface.js
/**
 * Plugin Interface Definition
 * All data source plugins must implement this interface
 */

export class DataSourcePlugin {
  constructor() {
    this.name = '';
    this.type = '';
    this.version = '1.0.0';
  }

  /**
   * Get configuration schema for this plugin
   * @returns {Array} Array of configuration fields
   */
  getConfigSchema() {
    throw new Error('getConfigSchema() must be implemented by plugin');
  }

  /**
   * Validate plugin configuration
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} True if valid
   */
  async validateConfig(config) {
    throw new Error('validateConfig() must be implemented by plugin');
  }

  /**
   * Establish connection to data source
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} Connection object
   */
  async connect(config) {
    throw new Error('connect() must be implemented by plugin');
  }

  /**
   * Close connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by plugin');
  }

  /**
   * Test connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by plugin');
  }

  /**
   * Discover data source schema
   * @returns {Promise<Object>} Schema information
   */
  async discoverSchema() {
    throw new Error('discoverSchema() must be implemented by plugin');
  }

  /**
   * Execute query
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(params) {
    throw new Error('query() must be implemented by plugin');
  }

  /**
   * Execute raw query
   * @param {string} query - Raw query string
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(query, params = {}) {
    throw new Error('executeQuery() must be implemented by plugin');
  }

  /**
   * Generate triggers based on schema
   * @param {Object} schema - Discovered schema
   * @returns {Array} Array of trigger configurations
   */
  generateTriggers(schema) {
    throw new Error('generateTriggers() must be implemented by plugin');
  }

  /**
   * Validate trigger configuration
   * @param {Object} trigger - Trigger configuration
   * @returns {Promise<boolean>} True if valid
   */
  async validateTrigger(trigger) {
    throw new Error('validateTrigger() must be implemented by plugin');
  }
}

/**
 * Configuration Field Definition
 */
export class ConfigField {
  constructor(name, type, options = {}) {
    this.name = name;
    this.type = type; // 'string', 'number', 'password', 'boolean', 'select'
    this.required = options.required || false;
    this.default = options.default || null;
    this.label = options.label || name;
    this.description = options.description || '';
    this.options = options.options || []; // For select type
    this.placeholder = options.placeholder || '';
  }
}

/**
 * Schema Definition
 */
export class Schema {
  constructor() {
    this.tables = [];
    this.fields = {};
    this.relationships = [];
    this.metadata = {};
  }
}

/**
 * Trigger Definition
 */
export class Trigger {
  constructor(name, type, config = {}) {
    this.name = name;
    this.type = type; // 'query', 'api', 'composite'
    this.config = config;
    this.active = true;
    this.responsePrefix = config.responsePrefix || '';
    this.description = config.description || '';
  }
}
