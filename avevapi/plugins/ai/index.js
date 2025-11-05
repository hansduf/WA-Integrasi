// avevapi/plugins/ai/index.js
// Simple AI Plugin - Just forwards to company AI API

export class AIPlugin {
  constructor() {
    this.name = 'ai';
    this.version = '1.0.0';
    this.aiService = null;
  }

  /**
   * Initialize AI plugin
   * @param {Object} app - Express app instance
   * @param {Object} config - Plugin configuration
   */
  async init(app, config) {
    try {
      // Import AI service dynamically
      const { AIService } = await import('./ai-service.js');
      this.aiService = new AIService(config);

      // Import and initialize AI routes
      const aiRoutes = await import('../../routes/ai.js');
      await aiRoutes.init(app, this.aiService);

      console.log('🤖 AI Plugin initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI plugin:', error);
      throw error;
    }
  }

  /**
   * Process AI message from trigger system
   * @param {string} message - The message to process
   * @param {Object} trigger - The trigger configuration
   * @returns {Object|null} AI response or null if not AI trigger
   */
  async processMessage(message, trigger) {
    try {
      if (trigger.type === 'ai') {
        console.log(`🤖 Processing AI message with trigger: ${trigger.prefix}`);
        return await this.aiService.processAIRequest(message, trigger);
      }
      return null;
    } catch (error) {
      console.error('❌ AI Plugin processMessage error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Connect to AI service (no-op for AI plugin)
   * AI plugin doesn't maintain persistent connections like database plugins
   * @param {Object} config - Connection config
   * @returns {Promise<boolean>} Always returns true
   */
  async connect(config) {
    // AI plugin doesn't need persistent connection
    // Each request creates new HTTP connection
    return true;
  }

  /**
   * Test AI connection
   * @returns {Object} Test result
   */
  async testConnection() {
    try {
      return await this.aiService.testConnection();
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get plugin info
   * @returns {Object} Plugin information
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'AI Chat Integration Plugin - Simple forwarding to company AI API'
    };
  }
}

export default AIPlugin;