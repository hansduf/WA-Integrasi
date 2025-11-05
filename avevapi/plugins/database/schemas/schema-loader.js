// plugins/database/schemas/schema-loader.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Schema Loader Utility
 * Loads and manages database configuration schemas
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SchemaLoader {
  constructor() {
    this.schemas = new Map();
    this.loadedSchemas = new Set();
  }

  /**
   * Load schema for a specific database driver
   * @param {string} driverType - Database driver type
   * @returns {Promise<Object>} Schema configuration
   */
  async loadSchema(driverType) {
    if (this.schemas.has(driverType)) {
      return this.schemas.get(driverType);
    }

    try {
      const schemaPath = path.join(__dirname, `${driverType}.json`);
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);

      this.schemas.set(driverType, schema);
      this.loadedSchemas.add(driverType);

      console.log(`✅ Loaded schema for ${driverType}`);
      return schema;

    } catch (error) {
      console.error(`❌ Failed to load schema for ${driverType}:`, error);
      throw new Error(`Schema not found for driver: ${driverType}`);
    }
  }

  /**
   * Get all available driver types
   * @returns {Array} Array of driver types
   */
  getAvailableDrivers() {
    return [
      { value: 'mysql', label: 'MySQL', icon: '🗄️' },
      { value: 'oracle', label: 'Oracle', icon: '🏢' },
      { value: 'sqlserver', label: 'SQL Server', icon: '🔷' }
    ];
  }

  /**
   * Validate configuration against schema
   * @param {string} driverType - Database driver type
   * @param {Object} config - Configuration object
   * @returns {Promise<Array>} Array of validation errors
   */
  async validateConfig(driverType, config) {
    const errors = [];

    try {
      const schema = await this.loadSchema(driverType);

      // Check required fields
      for (const fieldName of schema.requiredFields) {
        if (!config[fieldName] || config[fieldName] === '') {
          errors.push(`Missing required field: ${fieldName}`);
        }
      }

      // Validate field types and constraints
      for (const field of schema.fields) {
        const value = config[field.name];

        if (value !== undefined && value !== null && value !== '') {
          // Type validation
          if (field.type === 'number') {
            if (isNaN(value)) {
              errors.push(`${field.name} must be a number`);
            } else {
              const numValue = Number(value);
              if (field.min !== undefined && numValue < field.min) {
                errors.push(`${field.name} must be at least ${field.min}`);
              }
              if (field.max !== undefined && numValue > field.max) {
                errors.push(`${field.name} must be at most ${field.max}`);
              }
            }
          }

          // String length validation
          if (field.type === 'string' && field.maxLength) {
            if (value.length > field.maxLength) {
              errors.push(`${field.name} must be at most ${field.maxLength} characters`);
            }
          }
        }
      }

    } catch (error) {
      errors.push(`Schema validation failed: ${error.message}`);
    }

    return errors;
  }

  /**
   * Get default configuration for a driver
   * @param {string} driverType - Database driver type
   * @returns {Promise<Object>} Default configuration
   */
  async getDefaultConfig(driverType) {
    try {
      const schema = await this.loadSchema(driverType);
      const defaults = {};

      // Set default values from schema
      if (schema.fieldDefaults) {
        Object.assign(defaults, schema.fieldDefaults);
      }

      // Set defaults from individual fields
      for (const field of schema.fields) {
        if (field.default !== undefined && !(field.name in defaults)) {
          defaults[field.name] = field.default;
        }
      }

      return defaults;

    } catch (error) {
      console.error(`Failed to get defaults for ${driverType}:`, error);
      return {};
    }
  }

  /**
   * Check if schema is loaded
   * @param {string} driverType - Database driver type
   * @returns {boolean} True if loaded
   */
  isSchemaLoaded(driverType) {
    return this.loadedSchemas.has(driverType);
  }

  /**
   * Get schema metadata
   * @param {string} driverType - Database driver type
   * @returns {Promise<Object>} Schema metadata
   */
  async getSchemaMetadata(driverType) {
    try {
      const schema = await this.loadSchema(driverType);
      return {
        driver: driverType,
        requiredFields: schema.requiredFields || [],
        optionalFields: schema.optionalFields || [],
        hasAdvancedFields: (schema.advancedFields && schema.advancedFields.length > 0),
        fieldCount: schema.fields ? schema.fields.length : 0
      };
    } catch (error) {
      return {
        driver: driverType,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const schemaLoader = new SchemaLoader();
export default schemaLoader;
