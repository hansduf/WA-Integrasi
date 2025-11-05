// core/plugin-loader.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Plugin Loader - Automatically discovers and loads plugins
 */
export class PluginLoader {
  constructor() {
    this.plugins = new Map();
    this.pluginPath = path.join(__dirname, '..', 'plugins');
  }

  /**
   * Load all available plugins
   * @returns {Promise<Map>} Map of loaded plugins
   */
  async loadAllPlugins() {
    console.log('🔍 Scanning for plugins in:', this.pluginPath);

    try {
      const pluginDirs = fs.readdirSync(this.pluginPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      console.log(`📁 Found ${pluginDirs.length} plugin directories:`, pluginDirs.join(', '));

      for (const pluginName of pluginDirs) {
        console.log(`🔄 Attempting to load plugin: ${pluginName}`);
        try {
          await this.loadPlugin(pluginName);
          console.log(`✅ Plugin ${pluginName} loaded successfully`);
        } catch (error) {
          console.error(`❌ Failed to load plugin ${pluginName}:`, error.message);
          console.error(`   Stack:`, error.stack);
        }
      }

      console.log(`✅ Successfully loaded ${this.plugins.size} plugins:`, Array.from(this.plugins.keys()).join(', '));
      return this.plugins;
    } catch (error) {
      console.error('❌ Error scanning plugins:', error.message);
      console.error('   Stack:', error.stack);
      return this.plugins;
    }
  }

  /**
   * Load a specific plugin
   * @param {string} pluginName - Name of the plugin
   * @returns {Promise<Object>} Loaded plugin instance
   */
  async loadPlugin(pluginName) {
    const pluginDir = path.join(this.pluginPath, pluginName);
    const pluginIndex = path.join(pluginDir, 'index.js');

    // Check if plugin exists
    if (!fs.existsSync(pluginIndex)) {
      throw new Error(`Plugin ${pluginName} missing index.js file`);
    }

    try {
      // Load plugin module
      const pluginModule = await import(`file://${pluginIndex}`);

      // Get plugin class (default export or named export)
      let PluginClass = pluginModule.default;
      if (!PluginClass && pluginModule[pluginName]) {
        PluginClass = pluginModule[pluginName];
      }

      if (!PluginClass) {
        throw new Error(`Plugin ${pluginName} must export a default class or named export`);
      }

      // Create plugin instance
      const pluginInstance = new PluginClass();

      // Validate plugin interface
      this.validatePlugin(pluginInstance);

      // Store plugin
      this.plugins.set(pluginName, pluginInstance);

      console.log(`✅ Plugin ${pluginName} loaded successfully`);
      return pluginInstance;

    } catch (error) {
      console.error(`❌ Error loading plugin ${pluginName}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate plugin implements required interface
   * @param {Object} plugin - Plugin instance to validate
   */
  validatePlugin(plugin) {
    const requiredMethods = [
      'getConfigSchema',
      'validateConfig',
      'connect',
      'disconnect',
      'testConnection',
      'discoverSchema',
      'query',
      'executeQuery',
      'generateTriggers',
      'validateTrigger'
    ];

    const requiredProperties = ['name', 'type', 'version'];

    // Check required properties
    for (const prop of requiredProperties) {
      if (!plugin[prop]) {
        throw new Error(`Plugin missing required property: ${prop}`);
      }
    }

    // Check required methods
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        throw new Error(`Plugin missing required method: ${method}`);
      }
    }

    console.log(`✅ Plugin ${plugin.name} interface validation passed`);
  }

  /**
   * Get loaded plugin by name
   * @param {string} pluginName - Name of the plugin
   * @returns {Object} Plugin instance
   */
  getPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found. Available plugins: ${Array.from(this.plugins.keys()).join(', ')}`);
    }
    return plugin;
  }

  /**
   * Get all loaded plugins
   * @returns {Map} Map of plugin name -> plugin instance
   */
  getAllPlugins() {
    return this.plugins;
  }

  /**
   * Get list of available plugin names
   * @returns {Array} Array of plugin names
   */
  getAvailablePlugins() {
    return Array.from(this.plugins.keys());
  }

  /**
   * Check if plugin is loaded
   * @param {string} pluginName - Name of the plugin
   * @returns {boolean} True if plugin is loaded
   */
  hasPlugin(pluginName) {
    return this.plugins.has(pluginName);
  }

  /**
   * Reload a specific plugin
   * @param {string} pluginName - Name of the plugin
   * @returns {Promise<Object>} Reloaded plugin instance
   */
  async reloadPlugin(pluginName) {
    if (this.plugins.has(pluginName)) {
      this.plugins.delete(pluginName);
    }
    return await this.loadPlugin(pluginName);
  }

  /**
   * Get plugin metadata
   * @param {string} pluginName - Name of the plugin
   * @returns {Object} Plugin metadata
   */
  getPluginMetadata(pluginName) {
    const plugin = this.getPlugin(pluginName);
    return {
      name: plugin.name,
      type: plugin.type,
      version: plugin.version,
      configSchema: plugin.getConfigSchema()
    };
  }
}

// Export singleton instance
export const pluginLoader = new PluginLoader();
