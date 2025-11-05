// plugins/aveva-pi/index.js
import axios from 'axios';
import { ConfigField, DataSourcePlugin, Schema, Trigger } from '../../core/plugin-interface.js';

/**
 * AVEVA PI Database Plugin
 * Supports AVEVA PI Process Information System for industrial data
 */
export class AvevaPiPlugin extends DataSourcePlugin {
  constructor() {
    super();
    this.name = 'AVEVA PI System';
    this.type = 'industrial';
    this.version = '1.0.0';
    this.connection = null;
    this.baseUrl = null;
    this.lastParsedSql = null; // Store parsed SQL elements for post-processing
  }

  /**
   * Get configuration schema
   * @returns {Array} Array of configuration fields
   */
  getConfigSchema() {
    return [
      new ConfigField('host', 'string', {
        required: true,
        label: 'Host',
        description: 'AVEVA PI server hostname or IP address',
        placeholder: 'localhost'
      }),
      new ConfigField('port', 'number', {
        required: true,
        label: 'Port',
        description: 'AVEVA PI server port',
        default: 6066,
        placeholder: '6066'
      }),
      new ConfigField('protocol', 'select', {
        required: false,
        label: 'Protocol',
        description: 'Connection protocol',
        default: 'http',
        options: ['http', 'https'],
        placeholder: 'http'
      }),
      new ConfigField('timeout', 'number', {
        required: false,
        label: 'Timeout',
        description: 'Request timeout in milliseconds',
        default: 10000,
        placeholder: '10000'
      }),
      new ConfigField('maxRetries', 'number', {
        required: false,
        label: 'Max Retries',
        description: 'Maximum number of retry attempts',
        default: 3,
        placeholder: '3'
      }),
      new ConfigField('defaultTag', 'string', {
        required: true,
        label: 'Default AVEVA PI Tag',
        description: 'Tag AVEVA PI yang akan digunakan secara default untuk query',
        placeholder: '7TMWATTSNET'
      })
    ];
  }

  /**
   * Validate plugin configuration
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} True if valid
   */
  async validateConfig(config) {
    // Accept either complete URL or host/port combination
    if (config.url || config.endpoint) {
      // Validate complete URL format
      try {
        new URL(config.url || config.endpoint);
        return true;
      } catch (error) {
        throw new Error('Invalid URL format for AVEVA PI connection');
      }
    } else if (config.host && config.port) {
      // Validate host/port combination (backward compatibility)
      if (config.port < 1 || config.port > 65535) {
        throw new Error('Port must be between 1 and 65535');
      }
      return true;
    } else {
      throw new Error('Either complete URL or host and port are required for AVEVA PI connection');
    }
  }

  /**
   * Establish connection to AVEVA PI
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} Connection object
   */
  async connect(config) {
    try {
      // 🔄 AUTO-EXTRACT TAG FROM URL IF NOT PROVIDED
      if (!config.defaultTag) {
        console.log('🔍 Auto-extracting tag from AVEVA PI URL...');

        // Try to extract from URL first
        if (config.url) {
          const urlMatch = config.url.match(/tag=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            config.defaultTag = urlMatch[1];
            console.log(`✅ Auto-extracted defaultTag from URL: ${config.defaultTag}`);
          }
        }

        // If still not found, try from endpoint
        if (!config.defaultTag && config.endpoint) {
          const urlMatch = config.endpoint.match(/tag=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            config.defaultTag = urlMatch[1];
            console.log(`✅ Auto-extracted defaultTag from endpoint: ${config.defaultTag}`);
          }
        }

        // If still not found, try from avevaUrl (legacy)
        if (!config.defaultTag && config.avevaUrl) {
          const urlMatch = config.avevaUrl.match(/tag=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            config.defaultTag = urlMatch[1];
            console.log(`✅ Auto-extracted defaultTag from avevaUrl: ${config.defaultTag}`);
          }
        }
      }

      // Validate that we have a defaultTag
      if (!config.defaultTag) {
        throw new Error('Tag AVEVA PI tidak ditemukan. Silakan masukkan defaultTag secara manual atau pastikan URL mengandung parameter tag.');
      }

      // Use complete URL if available, otherwise construct from components
      if (config.url || config.endpoint) {
        const fullUrl = config.url || config.endpoint;
        // Extract base URL by removing path and query parameters
        const urlObj = new URL(fullUrl);
        this.baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      } else {
        // Fallback to component-based URL construction
        this.baseUrl = `${config.protocol || 'http'}://${config.host}:${config.port}`;
      }

      // Create connection object without test - test is done separately when needed
      this.connection = {
        config,
        connected: true,
        connectedAt: new Date()
      };

      console.log(`✅ AVEVA PI connection configured at ${this.baseUrl} with tag: ${config.defaultTag}`);
      return this.connection;
    } catch (error) {
      console.error('❌ Failed to configure AVEVA PI connection:', error.message);
      throw new Error(`AVEVA PI connection configuration failed: ${error.message}`);
    }
  }

  /**
   * Close connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.connection) {
      this.connection = null;
      this.baseUrl = null;
      console.log('🔌 Disconnected from AVEVA PI');
    }
  }

  /**
   * Test connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.connection) {
      throw new Error('No active connection to AVEVA PI');
    }

    try {
      // Test connection dengan cara yang lebih fleksibel
      // Coba beberapa endpoint yang mungkin tersedia
      const testUrls = [
        // Test dengan endpoint info/status jika tersedia
        `${this.baseUrl}/pi/`,  // Root endpoint
        `${this.baseUrl}/pi/trn?tag=*&limit=1`,  // Query dengan limit kecil
        `${this.baseUrl}/pi/trn?tag=test&interval=1h&start=2025-01-01T00:00:00&end=2025-01-01T01:00:00`  // Fallback
      ];

      for (const testUrl of testUrls) {
        try {
          const response = await axios.get(testUrl, {
            timeout: this.connection.config?.timeout || 10000,
            validateStatus: (status) => status < 500 // Accept any status < 500
          });

          // Jika mendapat response (bahkan error), berarti server reachable
          if (response.status < 500) {
            // Silent mode: no success logging
            return true;
          }
        } catch (error) {
          // Continue to next URL if this one fails (silent)
          continue;
        }
      }

      // If all URLs failed, return false (silent, health check will log if needed)
      return false;

    } catch (error) {
      console.error(`❌ AVEVA PI connection test failed: ${error.message}`);
      return false; // Return false on actual errors
    }
  }

  /**
   * Discover database schema
   * @returns {Promise<Object>} Schema information
   */
  async discoverSchema() {
    if (!this.connection) {
      throw new Error('No active connection to AVEVA PI');
    }

    try {
      const schema = new Schema();
      console.log('🔎 Discovering AVEVA PI schema...');

      // Try to discover available tags from AVEVA PI server
      let availableTags = [];
      try {
        console.log('🔍 Querying available AVEVA PI tags...');

        // Try multiple AVEVA PI Web API endpoints for tag discovery
        const tagEndpoints = [
          `${this.baseUrl}/pi/search/tags?query=*&count=100`,
          `${this.baseUrl}/pi/dataservers/*/points?maxCount=100`,
          `${this.baseUrl}/pi/points?maxCount=100`,
          `${this.baseUrl}/pi/tags?query=*&count=100`
        ];

        for (const tagsUrl of tagEndpoints) {
          try {
            console.log(`🔍 Trying endpoint: ${tagsUrl}`);
            const tagsResponse = await axios.get(tagsUrl, {
              timeout: this.connection?.config?.timeout || 10000,
              headers: { 'Accept': 'application/json' },
              validateStatus: (status) => status < 500
            });

            if (tagsResponse.status === 200 && tagsResponse.data) {
              // Parse tags from different possible response formats
              if (Array.isArray(tagsResponse.data)) {
                availableTags = tagsResponse.data.map(tag => typeof tag === 'string' ? tag : tag.name || tag.tag || tag.webId).filter(Boolean);
              } else if (tagsResponse.data.tags && Array.isArray(tagsResponse.data.tags)) {
                availableTags = tagsResponse.data.tags.map(tag => typeof tag === 'string' ? tag : tag.name || tag.tag || tag.webId).filter(Boolean);
              } else if (tagsResponse.data.items && Array.isArray(tagsResponse.data.items)) {
                availableTags = tagsResponse.data.items.map(tag => typeof tag === 'string' ? tag : tag.name || tag.tag || tag.webId).filter(Boolean);
              } else if (tagsResponse.data.data && Array.isArray(tagsResponse.data.data)) {
                availableTags = tagsResponse.data.data.map(tag => typeof tag === 'string' ? tag : tag.name || tag.tag || tag.webId).filter(Boolean);
              }

              if (availableTags.length > 0) {
                console.log(`✅ Found ${availableTags.length} tags using endpoint: ${tagsUrl}`);
                break;
              }
            }
          } catch (endpointError) {
            console.log(`⚠️ Endpoint ${tagsUrl} failed: ${endpointError.message}`);
            continue;
          }
        }

        // Remove duplicates and sort
        availableTags = [...new Set(availableTags)].sort();

        console.log(`✅ Found ${availableTags.length} available AVEVA PI tags:`, availableTags.slice(0, 5), availableTags.length > 5 ? '...' : '');
      } catch (tagError) {
        console.log('⚠️ Tag discovery failed, using basic schema:', tagError.message);
      }

      // Create schema structure
      schema.tables = ['tags', 'points', 'values'];

      // Add available tags to schema if discovered
      schema.fields = {
        tags: [
          { name: 'name', type: 'string', nullable: false, key: 'PRIMARY' },
          { name: 'description', type: 'string', nullable: true },
          { name: 'units', type: 'string', nullable: true },
          { name: 'pointtype', type: 'string', nullable: true }
        ],
        points: [
          { name: 'tag', type: 'string', nullable: false, key: 'PRIMARY' },
          { name: 'timestamp', type: 'datetime', nullable: false },
          { name: 'value', type: 'number', nullable: false },
          { name: 'status', type: 'number', nullable: true }
        ],
        values: [
          { name: 'tag', type: 'string', nullable: false },
          { name: 'start_time', type: 'datetime', nullable: false },
          { name: 'end_time', type: 'datetime', nullable: false },
          { name: 'interval', type: 'string', nullable: false },
          { name: 'values', type: 'array', nullable: false }
        ]
      };

      // Add available tags to schema metadata
      if (availableTags.length > 0) {
        schema.metadata = {
          availableTags: availableTags,
          tagCount: availableTags.length
        };
        console.log(`📊 Schema includes ${availableTags.length} discovered tags`);
      }

      console.log('✅ AVEVA PI schema discovered');
      return schema;
    } catch (error) {
      console.error('❌ Schema discovery failed:', error.message);
      throw new Error(`AVEVA PI schema discovery failed: ${error.message}`);
    }
  }

  /**
   * Execute query
   * @param {string} query - Query string
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>}
   */
  /**
   * Get available tags from AVEVA PI server
   * @returns {Promise<Array>} Array of available tag names
   */
  async getAvailableTags() {
    if (!this.connection) {
      throw new Error('No active connection to AVEVA PI');
    }

    try {
      console.log('🔍 Fetching available AVEVA PI tags...');

      // NOTE: Tag discovery is disabled for this AVEVA PI server
      // The server returns 404 for all tag discovery endpoints
      console.log('ℹ️ Tag discovery not supported by this AVEVA PI server');
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch available tags:', error.message);
      return [];
    }
  }

  /**
   * Suggest tag based on pattern or auto-select first available
   * @param {string} pattern - Pattern to match (optional)
   * @returns {Promise<string|null>} Suggested tag or null
   */
  async suggestTag(pattern = null) {
    const availableTags = await this.getAvailableTags();

    if (availableTags.length === 0) {
      return null;
    }

    if (pattern) {
      // Find tags matching pattern (case-insensitive)
      const matches = availableTags.filter(tag =>
        tag.toLowerCase().includes(pattern.toLowerCase())
      );
      return matches.length > 0 ? matches[0] : availableTags[0];
    }

    // Return first available tag as default suggestion
    return availableTags[0];
  }
  async executeQuery(query, params = {}) {
    console.log('🚀 ===== STARTING AVEVA PI QUERY EXECUTION =====');
    console.log('📝 Query:', query);
    console.log('📋 Params:', JSON.stringify(params, null, 2));

    // ✅ FIX: Replace template variables in query before any processing
    let processedQuery = query;
    if (params.tag && typeof params.tag === 'string') {
      console.log('🔧 [TEMPLATE] Replacing {tag} with actual tag value:', params.tag);
      processedQuery = processedQuery.replace(/\{tag\}/g, params.tag);
      console.log('🔧 [TEMPLATE] Processed query:', processedQuery);
    }

    // Check if dual query should be used
    const useDualQuery = this.shouldUseDualQuery(params);
    console.log('🔍 [EXECUTE] shouldUseDualQuery result:', useDualQuery);
    console.log('🔍 [EXECUTE] dualQuery param:', params.dualQuery, '(type:', typeof params.dualQuery, ')');
    console.log('🔍 [EXECUTE] queryMode param:', params.queryMode, '(type:', typeof params.queryMode, ')');

    if (useDualQuery) {
      console.log('🔄 [DUAL QUERY] DETECTED DUAL QUERY - EXECUTING DUAL MODE 🚀🚀🚀');
      console.log('🔄 [DUAL QUERY] This should return 1 real-time + historical records with user interval');
      try {
        const result = await this.executeDualQuery(processedQuery, params);
        console.log('✅ [DUAL QUERY] SUCCESS - Dual query completed');
        console.log('✅ [DUAL QUERY] Result data length:', result.data?.length || 0);
        console.log('✅ [DUAL QUERY] Sample data:', result.data?.slice(0, 2) || []);
        return result;
      } catch (error) {
        console.error('❌ [DUAL QUERY] FAILED - Falling back to single query:', error.message);
        console.log('🔄 [DUAL QUERY] Executing fallback single query');
        const fallbackResult = await this.executeSingleQuery(processedQuery, params);
        console.log('✅ [DUAL QUERY] Fallback result data length:', fallbackResult.data?.length || 0);
        return fallbackResult;
      }
    }

    console.log('🔄 [SINGLE QUERY] Using single query mode (historical only)');
    const singleResult = await this.executeSingleQuery(processedQuery, params);
    console.log('✅ [SINGLE QUERY] Result data length:', singleResult.data?.length || 0);
    console.log('✅ [SINGLE QUERY] Sample data:', singleResult.data?.slice(0, 2) || []);
    return singleResult;
  }

  /**
   * Execute dual query: Real-time + Historical data
   * @param {string} query - The query string
   * @param {object} params - Query parameters including limit, interval, etc.
   * @returns {Promise<object>} Combined result with real-time and historical data
   */
  async executeDualQuery(query, params = {}) {
    console.log('🚀 ===== STARTING DUAL QUERY EXECUTION =====');
    console.log('📝 Query:', query);
    console.log('📋 Params:', JSON.stringify(params, null, 2));
    console.log('🎯 [DUAL] This should return 1 real-time record + historical records with user interval');

    // ✅ STRICT VALIDATION: Only interval required now
    if (!params.interval) {
      throw new Error('Interval wajib dipilih untuk dual query! Pilih interval waktu (30s, 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d)');
    }

    // ✅ FIX: Prioritize SQL TOP/LIMIT over params.limit for SQL queries
    let limit;
    if (query && typeof query === 'string' && query.toUpperCase().includes('SELECT') && query.toUpperCase().includes('FROM POINT')) {
      // Parse SQL to get TOP/LIMIT
      const parsedSql = this.parseSqlElements(query);
      if (parsedSql.limit) {
        limit = parsedSql.limit;
        console.log(`📊 [DUAL] Using SQL TOP/LIMIT: ${limit} records`);
      } else {
        limit = params.limit || 10; // Fallback to params.limit or default 10
        console.log(`📊 [DUAL] No SQL TOP/LIMIT found, using params.limit: ${limit}`);
      }
    } else {
      limit = params.limit || 10; // For non-SQL queries, use params.limit or default 10
      console.log(`📊 [DUAL] Non-SQL query, using params.limit: ${limit}`);
    }

    const { interval } = params;

    try {
      // Query 1: Real-Time Data (Latest Record)
      console.log('🔍 [DUAL] Step 1: Executing Real-Time Query (should return 1 record)...');
      const realTimeResult = await this.executeRealTimeQuery(query, params);
      console.log(`✅ [DUAL] Real-Time Query completed: ${realTimeResult.data.length} records`);
      console.log('📊 [DUAL] Real-Time data sample:', realTimeResult.data.slice(0, 1));
      console.log('📊 [DUAL] Real-Time metadata:', realTimeResult.metadata);

      // Query 2: Historical Data (User Interval)
      console.log('🔍 [DUAL] Step 2: Executing Historical Query (should return records with user interval)...');
      const historicalParams = {
        ...params,
        limit: limit - 1 // Subtract 1 for real-time record
      };
      console.log('📋 [DUAL] Historical params:', JSON.stringify(historicalParams, null, 2));

      const historicalResult = await this.executeHistoricalQuery(query, historicalParams);
      console.log(`✅ [DUAL] Historical Query completed: ${historicalResult.data.length} records`);
      console.log('📊 [DUAL] Historical data sample:', historicalResult.data.slice(0, 2));

      // Combine results
      console.log('🔄 [DUAL] Step 3: Combining results...');
      const combinedResult = this.combineDualQueryResults(realTimeResult, historicalResult, limit);

      console.log('✅ ===== DUAL QUERY EXECUTION COMPLETED =====');
      console.log(`📊 [DUAL] Final result: ${combinedResult.data.length} records`);
      console.log('📊 [DUAL] Expected: 1 real-time + up to', limit - 1, 'historical records');
      console.log('📊 [DUAL] Final combined result sample:', combinedResult.data.slice(0, 3));

      return combinedResult;

    } catch (error) {
      console.error('❌ [DUAL] Dual query failed:', error.message);

      // Fallback: Try historical query only
      console.log('🔄 [DUAL] Attempting fallback to historical query only...');
      try {
        const fallbackResult = await this.executeHistoricalQuery(query, params);
        console.log('✅ [DUAL] Fallback successful - returning historical data only');

        return {
          ...fallbackResult,
          metadata: {
            ...fallbackResult.metadata,
            isFallback: true,
            fallbackReason: `Real-time query failed: ${error.message}`,
            realTimeCount: 0,
            historicalCount: fallbackResult.data.length
          }
        };
      } catch (fallbackError) {
        console.error('❌ [DUAL] Fallback also failed:', fallbackError.message);
        throw new Error(`Dual query failed completely: ${error.message}. Fallback also failed: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Execute real-time query (latest record with minimal interval)
   * @param {string} query - The query string
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Real-time query result
   */
  async executeRealTimeQuery(query, params = {}) {
    console.log('⚡ ===== EXECUTING REAL-TIME QUERY =====');

    // ✅ FIX: Use direct URL for real-time to ensure we get the latest data point
    // This bypasses all parsing and uses a simple query for the most recent value
    const tag = params.tag || this.connection.config.defaultTag;
    if (!tag) {
      throw new Error('Tag AVEVA PI tidak ditemukan untuk real-time query');
    }

    const baseUrl = this.connection.config.url ?
      `${new URL(this.connection.config.url).protocol}//${new URL(this.connection.config.url).host}` :
      `${this.connection.config.protocol || 'http'}://${this.connection.config.host}:${this.connection.config.port}`;

    // Use a very recent time range with small interval to get latest data
    const realTimeUrl = `${baseUrl}/pi/trn?tag=${tag}&interval=1s&start=*-1h&end=*&maxCount=1`;

    console.log('⚡ Real-time URL:', realTimeUrl);

    try {
      const response = await axios.get(realTimeUrl, {
        timeout: this.connection.config?.timeout || 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const data = response.data || [];
      const processedData = Array.isArray(data) ? data : [data];
      const parsedData = this.parseAvevaResponse(processedData, tag, 'real-time', null, 1);

      const result = {
        data: parsedData,
        metadata: {
          queryType: 'real-time',
          tag: tag,
          count: parsedData.length,
          url: realTimeUrl
        }
      };

      console.log(`⚡ Real-time query result: ${parsedData.length} records`);
      return result;

    } catch (error) {
      console.error('⚡ Real-time query failed:', error.message);
      // Return empty result instead of throwing to allow fallback
      return {
        data: [],
        metadata: {
          queryType: 'real-time',
          error: error.message
        }
      };
    }
  }

  /**
   * Execute historical query (user-selected interval)
   * @param {string} query - The query string
   * @param {object} params - Query parameters including limit and interval
   * @returns {Promise<object>} Historical query result
   */
  async executeHistoricalQuery(query, params = {}) {
    console.log('📚 ===== EXECUTING HISTORICAL QUERY =====');

    // ✅ STRICT VALIDATION: Only interval required now
    if (!params.interval) {
      throw new Error('Interval wajib dipilih untuk historical query! Pilih interval waktu (30s, 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d)');
    }

    // ✅ FIX: Prioritize SQL TOP/LIMIT over params.limit for SQL queries
    let limit;
    if (query && typeof query === 'string' && query.toUpperCase().includes('SELECT') && query.toUpperCase().includes('FROM POINT')) {
      // Parse SQL to get TOP/LIMIT
      const parsedSql = this.parseSqlElements(query);
      if (parsedSql.limit) {
        limit = parsedSql.limit;
        console.log(`📊 [HISTORICAL] Using SQL TOP/LIMIT: ${limit} records`);
      } else {
        limit = params.limit || 10; // Fallback to params.limit or default 10
        console.log(`📊 [HISTORICAL] No SQL TOP/LIMIT found, using params.limit: ${limit}`);
      }
    } else {
      limit = params.limit || 10; // For non-SQL queries, use params.limit or default 10
      console.log(`📊 [HISTORICAL] Non-SQL query, using params.limit: ${limit}`);
    }

    const { interval } = params;

    // Calculate time range for historical data
    const timeRange = this.calculateTimeRangeForIntervalAndLimit(interval, limit);
    console.log(`📚 Historical time range for ${limit} records with ${interval} interval:`, timeRange);

    // Create historical specific parameters
    const historicalParams = {
      ...params,
      interval: interval,
      limit: limit,
      timeRange: timeRange
    };

    console.log('📚 Historical params:', historicalParams);

    // Execute using existing logic
    const result = await this.executeSingleQuery(query, historicalParams);

    // Add historical metadata
    result.metadata = {
      ...result.metadata,
      queryType: 'historical',
      interval: interval,
      timeRange: timeRange,
      requestedLimit: limit
    };

    console.log(`📚 Historical query result: ${result.data.length} records`);
    return result;
  }

  /**
   * Combine results from real-time and historical queries
   * @param {object} realTimeResult - Result from real-time query
   * @param {object} historicalResult - Result from historical query
   * @param {number} totalLimit - Total number of records to return
   * @returns {object} Combined result
   */
  combineDualQueryResults(realTimeResult, historicalResult, totalLimit) {
    console.log('🔄 ===== COMBINING DUAL QUERY RESULTS =====');

    const realTimeData = realTimeResult.data || [];
    const historicalData = historicalResult.data || [];

    console.log(`📊 Real-time data: ${realTimeData.length} records`);
    if (realTimeData.length > 0) {
      console.log(`📊 Real-time sample:`, realTimeData.slice(0, 3).map(d => ({ id: d.id, timestamp: d.timestamp, value: d.value })));
    }

    console.log(`📊 Historical data: ${historicalData.length} records`);
    if (historicalData.length > 0) {
      console.log(`📊 Historical sample:`, historicalData.slice(0, 3).map(d => ({ id: d.id, timestamp: d.timestamp, value: d.value })));
    }

    // Combine and sort by timestamp (newest first)
    const combinedData = [...realTimeData, ...historicalData]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, totalLimit); // Limit total records

    console.log(`📊 Combined data before limiting: ${realTimeData.length + historicalData.length} records`);
    console.log(`📊 Combined data after limiting to ${totalLimit}: ${combinedData.length} records`);

    // Add sequential IDs
    const finalData = combinedData.map((item, index) => ({
      ...item,
      id: index + 1
    }));

    const result = {
      data: finalData,
      metadata: {
        queryType: 'dual',
        realTimeCount: realTimeData.length,
        historicalCount: historicalData.length,
        totalCount: finalData.length,
        requestedLimit: totalLimit,
        realTimeMetadata: realTimeResult.metadata,
        historicalMetadata: historicalResult.metadata
      }
    };

    console.log(`✅ Combined result: ${finalData.length} records (${result.metadata.realTimeCount} real-time + ${result.metadata.historicalCount} historical)`);
    if (finalData.length > 0) {
      console.log(`📊 Final result sample:`, finalData.slice(0, 3).map(d => ({ id: d.id, timestamp: d.timestamp, value: d.value })));
    }
    return result;
  }

  /**
   * Execute single query (historical data only)
   * @param {string} query - The query string
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Query result
   */
  async executeSingleQuery(query, params = {}) {
    console.log('🔄 ===== EXECUTING SINGLE QUERY =====');
    console.log('📝 Query:', query);
    console.log('📋 Params:', params);

    // ✅ STRICT VALIDATION: Only interval required now
    if (!params.interval) {
      throw new Error('Interval wajib dipilih! Pilih interval waktu (30s, 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d)');
    }

    // Get connection and validate
    if (!this.connection) {
      throw new Error('No active connection to AVEVA PI');
    }

    // Get base URL from connection config
    let baseUrl;
    if (this.connection.config.url) {
      try {
        const urlObj = new URL(this.connection.config.url);
        baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      } catch (error) {
        baseUrl = `${this.connection.config.protocol || 'http'}://${this.connection.config.host}:${this.connection.config.port}`;
      }
    } else {
      baseUrl = `${this.connection.config.protocol || 'http'}://${this.connection.config.host}:${this.connection.config.port}`;
    }

    // Get tag from parameters or data source config
    if (!params.tag && !this.connection.config.defaultTag) {
      throw new Error(`Tag AVEVA PI tidak ditemukan. Pastikan defaultTag sudah dikonfigurasi dengan benar di pengaturan koneksi data source AVEVA PI.`);
    }
    const tag = params.tag || this.connection.config.defaultTag;

    try {
      // Handle different query types
      let url;
      let processedQuery = query;

      // Process SQL queries (custom queries and custom presets)
      if (processedQuery && typeof processedQuery === 'string' && processedQuery.toUpperCase().includes('SELECT') && processedQuery.toUpperCase().includes('FROM POINT')) {
        console.log('🎯 [SINGLE] Processing SQL Query (unified)');
        console.log('🎯 [SINGLE] Raw query received:', processedQuery);
        const parsedSql = this.parseSqlElements(processedQuery);
        console.log('🎯 [SINGLE] Parsed SQL result:', parsedSql);
        // ✅ STRICT: SQL query HARUS ada interval dari user
        if (!params.interval) {
          throw new Error('Interval wajib dipilih untuk SQL query! Pilih interval waktu (30s, 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d)');
        }
        const customInterval = params.interval;
        parsedSql.requestedInterval = customInterval;

        url = this.buildAvevaUrlFromSql(parsedSql, baseUrl, tag, customInterval, params);
        console.log('🎯 [SINGLE] Final URL built:', url);
        this.lastParsedSql = parsedSql;
      }
      // Check if it's a direct URL
      else if (query && typeof query === 'string' && query.startsWith('http')) {
        console.log(`🌐 Using direct AVEVA PI URL in single mode: ${query}`);
        url = query;
      }
      else {
        // ❌ TIDAK ADA FALLBACK! Kalau bukan preset, SQL, atau URL, langsung error
        throw new Error('Query format tidak didukung. Gunakan preset (latest/1h/24h), SQL query dengan SELECT FROM POINT, atau direct URL yang dimulai dengan http.');
      }

      console.log('🔗 Single query URL:', url);

      // Execute HTTP request
      const response = await axios.get(url, {
        timeout: this.connection.config?.timeout || 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Process response
      const data = response.data || [];
      const processedData = Array.isArray(data) ? data : [data];

      // ✅ FIX: Parse AVEVA PI response to standard format
      // For dual query, override SQL limit with params limit ONLY for non-SQL queries
      let overrideLimit = null;
      if (query && typeof query === 'string' && query.toUpperCase().includes('SELECT') && query.toUpperCase().includes('FROM POINT')) {
        // For SQL queries, don't override - let parseAvevaResponse use SQL limit
        overrideLimit = null;
        console.log('📊 [SINGLE] SQL query detected - will use SQL TOP/LIMIT, not overriding with params.limit');
      } else {
        // For non-SQL queries, use params.limit as override
        overrideLimit = params.limit ? parseInt(params.limit) : null;
        console.log(`📊 [SINGLE] Non-SQL query - using params.limit override: ${overrideLimit}`);
      }
      const parsedData = this.parseAvevaResponse(processedData, tag, query, this.lastParsedSql, overrideLimit);

      const result = {
        data: parsedData,
        metadata: {
          queryType: 'single',
          tag: tag,
          count: parsedData.length,
          url: url
        }
      };

      console.log(`✅ Single query completed: ${parsedData.length} records`);
      return result;

    } catch (error) {
      console.error('❌ Single query failed:', error.message);
      throw new Error(`AVEVA PI single query failed: ${error.message}`);
    }
  }

  /**
   * Calculate time range for interval and limit
   * @param {string} interval - Interval string (e.g., '1h', '30m')
   * @param {number} limit - Number of records
   * @returns {object} Time range object with start and end
   */
  calculateTimeRangeForIntervalAndLimit(interval, limit) {
    // Convert interval to hours
    const intervalHours = this.intervalToHours(interval);

    // For single SQL queries, use limit * interval to get more data
    // This ensures we have enough historical data points
    const totalHours = limit * intervalHours;

    return {
      start: `*-${totalHours}h`,
      end: '*' // Current time
    };
  }

  /**
   * Convert interval string to hours
   * @param {string} interval - Interval string
   * @returns {number} Hours
   */
  intervalToHours(interval) {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 1; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value / 3600;
      case 'm': return value / 60;
      case 'h': return value;
      case 'd': return value * 24;
      default: return 1;
    }
  }

  /**
   * Parse AVEVA PI response to standard format
   * AVEVA PI returns data in format: {data: [{v0: "timestamp", v1: "value"}, ...], message: "Success", status: 200}
   * Or direct array: [{v0: "timestamp", v1: "value"}, ...]
   * Convert to: [{tag: "tag", timestamp: "timestamp", value: number}, ...]
   */
  parseAvevaResponse(avevaData, tag, query, parsedSql = null, overrideLimit = null) {
    console.log('🔄 ===== STARTING AVEVA PI RESPONSE PARSING =====');
    console.log('📥 Input:', {
      dataLength: Array.isArray(avevaData) ? avevaData.length : (avevaData?.data?.length || 0),
      tag: tag,
      query: query,
      parsedSql: parsedSql
    });

    // Handle different response formats
    let dataArray = [];

    if (Array.isArray(avevaData)) {
      // Check if it's an array of response objects (AVEVA PI format)
      if (avevaData.length > 0 && avevaData[0] && typeof avevaData[0] === 'object' && avevaData[0].data) {
        // AVEVA PI response format: [{data: [...], message: 'Success', status: 200}]
        dataArray = avevaData[0].data;
        console.log('📋 Detected AVEVA PI response format with data array');
      } else {
        // Direct array format
        dataArray = avevaData;
        console.log('📋 Detected direct array format');
      }
    } else if (avevaData && Array.isArray(avevaData.data)) {
      // Wrapped in data object format
      dataArray = avevaData.data;
      console.log('📋 Detected wrapped data object format');
    } else {
      console.warn('AVEVA PI response format not recognized:', avevaData);
      return [];
    }

    console.log(`✅ After format detection: dataArray has ${dataArray.length} records`);
    console.log('📋 First few dataArray items:', dataArray.slice(0, 3));

    if (dataArray.length === 0) {
      console.log('No data returned from AVEVA PI');
      return [];
    }

    // ✅ FILTER: Hanya ambil data dengan value yang valid (tidak null, tidak "No Data")
    // Lebih permisif - izinkan semua data kecuali null/undefined/"No Data"
    const validData = dataArray.filter(item => {
      const rawValue = item.v1;
      // Filter out null, undefined, "No Data"
      if (rawValue === null || rawValue === undefined) return false;
      if (rawValue === "No Data") return false;
      // Izinkan semua value lainnya (termasuk string numeric dan non-numeric)
      return true;
    });

    if (validData.length === 0) {
      console.log('No valid data after filtering');
      console.log('Raw data sample:', dataArray.slice(0, 3));
      return [];
    }

    console.log(`✅ After filtering: ${validData.length} valid records out of ${dataArray.length} total`);
    console.log('Sample valid data:', validData.slice(0, 2));

    let parsedData = validData.map((item, index) => {
      // AVEVA PI format: {v0: timestamp, v1: value}
      const timestamp = item.v0;
      const rawValue = item.v1;

      // Parse value - handle various formats more robustly
      let value = rawValue; // Keep original value as fallback
      if (rawValue !== 'No Data' && rawValue !== null && rawValue !== undefined) {
        // Try to parse as number, but keep original if parsing fails
        const parsed = parseFloat(rawValue);
        if (!isNaN(parsed)) {
          value = parsed; // Use parsed number if valid
        }
        // Otherwise keep original string value
      }

      return {
        id: index + 1,
        tag: tag,
        timestamp: timestamp,
        value: value
        // Removed units and quality fields for flexibility
      };
    });

    // ✅ NEW: Apply WHERE conditions filtering (DISABLED for AVEVA PI since server already filters by tag)
    // if (parsedSql && parsedSql.where) {
    //   console.log(`🔍 Applying WHERE conditions filtering...`);
    //   const filteredData = parsedData.filter(item => this.matchesWhereConditions(item, parsedSql.where));
    //   console.log(`✅ After WHERE filtering: ${filteredData.length} records (from ${parsedData.length})`);
    //   parsedData = filteredData;
    // }

    // ✅ POST-PROCESSING: Handle LIMIT/TOP from SQL queries
    // But allow override for dual query scenarios
    const effectiveLimit = overrideLimit !== null ? overrideLimit : (parsedSql?.limit ? parsedSql.limit : null);
    
    if (effectiveLimit) {
      console.log(`📊 Applying LIMIT ${effectiveLimit} to ${parsedData.length} records (override: ${overrideLimit !== null})`);
      console.log(`📊 Sample data before sorting:`, parsedData.slice(0, 3).map(d => ({ timestamp: d.timestamp, value: d.value })));
      
      // Sort by timestamp DESC (as per ORDER BY timestamp DESC)
      const sortedData = parsedData.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      console.log(`📊 Sample data after sorting DESC:`, sortedData.slice(0, 3).map(d => ({ timestamp: d.timestamp, value: d.value })));
      
      // Apply limit
      const limitedData = sortedData.slice(0, effectiveLimit);
      
      // ✅ FIX: Re-assign sequential IDs after sorting/slicing
      const finalData = limitedData.map((item, index) => ({
        ...item,
        id: index + 1 // Always 1, 2, 3, 4, 5...
      }));
      
      console.log(`✅ After LIMIT ${effectiveLimit}: ${finalData.length} records`);
      console.log(`✅ Final data with corrected IDs:`, finalData.map(d => ({ id: d.id, timestamp: d.timestamp, value: d.value })));
      
      return finalData;
    }

    console.log('🔄 ===== AVEVA PI RESPONSE PARSING COMPLETED =====');
    console.log('📤 Output:', {
      recordCount: parsedData.length,
      hasLimitApplied: !!(parsedSql && parsedSql.limit),
      sampleData: parsedData.slice(0, 3).map(d => ({
        id: d.id,
        timestamp: d.timestamp,
        value: d.value
      }))
    });

    return parsedData;
  }
  generateSqlPreview(query, params = {}) {
    // Get tag from parameters or data source config - NO FALLBACK ALLOWED
    if (!params.tag && !this.connection?.config?.defaultTag) {
      throw new Error(`Tag AVEVA PI tidak ditemukan untuk preview SQL. Pastikan defaultTag sudah dikonfigurasi dengan benar di pengaturan koneksi data source AVEVA PI.`);
    }
    const tag = params.tag || this.connection.config.defaultTag;

    // ✅ Use data source URL parameters for accurate preview, or dynamic params
    let interval = params.interval || '1h'; // Use dynamic interval if available
    let timeRange = '24 HOUR'; // default

    if (this.connection.config.url) {
      try {
        const urlObj = new URL(this.connection.config.url);
        const urlInterval = urlObj.searchParams.get('interval');
        const urlStart = urlObj.searchParams.get('start');

        // Extract interval from data source URL
        if (urlInterval) {
          interval = urlInterval;
        }

        // Extract time range from data source URL
        if (urlStart && urlStart.startsWith('*-')) {
          const timeMatch = urlStart.match(/\*-(\d+)([hdm])/);
          if (timeMatch) {
            const value = parseInt(timeMatch[1]);
            const unit = timeMatch[2];
            if (unit === 'h') {
              timeRange = `${value} HOUR`;
            } else if (unit === 'd') {
              timeRange = `${value} DAY`;
            } else if (unit === 'm') {
              timeRange = `${value} MINUTE`;
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not parse data source URL for preview: ${error.message}`);
      }
    }

    switch(query) {
      case '24h':
        return `SELECT * FROM points\nWHERE tag = '${tag}'\n  AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)\nORDER BY timestamp DESC`;

      case '1h':
        return `SELECT * FROM points\nWHERE tag = '${tag}'\n  AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)\nORDER BY timestamp DESC`;

      case 'latest':
        return `SELECT * FROM points\nWHERE tag = '${tag}'\nORDER BY timestamp DESC\nLIMIT 1`;

      default:
        // Check if it's a direct URL
        if (query && typeof query === 'string' && query.startsWith('http')) {
          // Extract tag from direct URL for preview
          const urlMatch = query.match(/tag=([^&]+)/);
          const directUrlTag = urlMatch ? urlMatch[1] : 'unknown';
          return `Direct AVEVA PI URL Query\nTag: ${directUrlTag}\nURL: ${query}`;
        }
        // Check if it's already a SQL query
        else if (query && typeof query === 'string' && query.includes('SELECT') && query.includes('FROM points')) {
          // Replace placeholder ? with actual tag for preview
          return query.replace(/\?/g, `'${tag}'`);
        }
        else {
          return `Unknown query format: ${query}`;
        }
    }
  }

  /**
   * Parse SQL query to AVEVA PI URL (backward compatibility)
   * @deprecated Use parseSqlElements + buildAvevaUrlFromSql instead
   */
  parseSqlToAvevaUrl(sqlQuery, tag, baseUrl) {
    console.log(`🔍 Parsing SQL query: ${sqlQuery}`);
    console.log(`🏷️ Using tag: ${tag}`);

    // Validate inputs
    if (!tag || tag.trim() === '') {
      throw new Error('Tag is required for AVEVA PI SQL queries');
    }

    if (!baseUrl || baseUrl.trim() === '') {
      throw new Error('Base URL is required for AVEVA PI queries');
    }

    // Use the already parsed SQL elements if available
    let parsed;
    if (this.lastParsedSql) {
      parsed = this.lastParsedSql;
      console.log(`📋 Using pre-parsed SQL elements:`, parsed);
    } else {
      // Fallback to parsing if not available
      const processedQuery = sqlQuery.replace(/\?/g, `'${tag}'`);
      console.log(`📝 Processed query: ${processedQuery}`);
      parsed = this.parseSqlElements(processedQuery);
      console.log(`🔎 Parsed elements:`, parsed);
    }

    // Ensure we have a tag (fallback to provided tag if parsing failed)
    if (!parsed.tag) {
      parsed.tag = tag;
    }

    // Build AVEVA PI URL
    const avevaUrl = this.buildAvevaUrlFromSql(parsed, baseUrl, tag, null, {});
    console.log(`🔗 Generated AVEVA PI URL: ${avevaUrl}`);

    return avevaUrl;
  }

  /**
   * Parse SQL elements from query - COMPREHENSIVE VERSION
   */
  parseSqlElements(sql) {
    console.log(`🔍 Parsing SQL elements from: ${sql}`);
    const result = {
      tag: null,
      limit: null,
      top: null,
      timeRange: null,
      orderBy: null,
      where: {} // ✅ NEW: Support WHERE clause conditions
    };

    // Extract tag from WHERE clause - handle both ? placeholder and direct values
    const tagMatch = sql.match(/WHERE\s+tag\s*=\s*['"]([^'"]+)['"]/i);
    if (tagMatch) {
      result.tag = tagMatch[1];
      console.log(`✅ Found tag: ${result.tag}`);
    } else {
      // Fallback: try to extract tag from any tag = value pattern
      const fallbackMatch = sql.match(/tag\s*=\s*['"]([^'"]+)['"]/i);
      if (fallbackMatch) {
        result.tag = fallbackMatch[1];
        console.log(`✅ Found tag (fallback): ${result.tag}`);
      } else {
        console.log(`❌ No tag found in query`);
      }
    }

    // Extract LIMIT or TOP
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const topMatch = sql.match(/SELECT\s+TOP\s+(\d+)/i);
    if (limitMatch) {
      result.limit = parseInt(limitMatch[1]);
      console.log(`✅ Found LIMIT: ${result.limit}`);
    } else if (topMatch) {
      result.top = parseInt(topMatch[1]);
      result.limit = result.top; // For compatibility
      console.log(`✅ Found TOP: ${result.top}`);
    } else {
      console.log(`❌ No LIMIT or TOP found`);
    }

    // ✅ NEW: Parse WHERE clause conditions
    result.where = this.parseWhereClause(sql);

    // Extract time range from DATE_SUB - support multiple formats (legacy support)
    const timeMatch = sql.match(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\d+)\s+(HOUR|DAY|MINUTE|SECOND)/i);
    if (timeMatch) {
      result.timeRange = {
        value: parseInt(timeMatch[1]),
        unit: timeMatch[2].toLowerCase()
      };
      console.log(`✅ Found time range: ${result.timeRange.value} ${result.timeRange.unit}`);
    } else {
      console.log(`❌ No legacy time range found`);
    }

    // Extract ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+([^,\s]+)/i);
    if (orderMatch) {
      result.orderBy = orderMatch[1];
      console.log(`✅ Found ORDER BY: ${result.orderBy}`);
    } else {
      console.log(`❌ No ORDER BY found`);
    }

    console.log(`📋 Final parsed result:`, result);
    return result;
  }

  /**
   * Parse WHERE clause conditions - COMPREHENSIVE VERSION
   */
  parseWhereClause(sql) {
    console.log(`🔍 Parsing WHERE clause from: ${sql}`);
    const where = {};

    // Extract WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+(?:ORDER|GROUP|HAVING|LIMIT|$))/i);
    if (!whereMatch) {
      console.log(`❌ No WHERE clause found`);
      return where;
    }

    const whereClause = whereMatch[1];
    console.log(`📝 WHERE clause: ${whereClause}`);

    // ✅ Parse timestamp conditions
    // timestamp >= '2025-09-25 08:00:00'
    const timestampGteMatch = whereClause.match(/timestamp\s*>=\s*['"]([^'"]+)['"]/i);
    if (timestampGteMatch) {
      where.timestampGte = timestampGteMatch[1];
      console.log(`✅ Found timestamp >= : ${where.timestampGte}`);
    }

    // timestamp <= '2025-09-25 10:00:00'
    const timestampLteMatch = whereClause.match(/timestamp\s*<=\s*['"]([^'"]+)['"]/i);
    if (timestampLteMatch) {
      where.timestampLte = timestampLteMatch[1];
      console.log(`✅ Found timestamp <= : ${where.timestampLte}`);
    }

    // timestamp BETWEEN '2025-09-25 08:00:00' AND '2025-09-25 10:00:00'
    const betweenMatch = whereClause.match(/timestamp\s+BETWEEN\s+['"]([^'"]+)['"]\s+AND\s+['"]([^'"]+)['"]/i);
    if (betweenMatch) {
      where.timestampBetween = {
        start: betweenMatch[1],
        end: betweenMatch[2]
      };
      console.log(`✅ Found timestamp BETWEEN: ${where.timestampBetween.start} - ${where.timestampBetween.end}`);
    }

    // ✅ Parse value conditions
    // value > 100
    const valueGtMatch = whereClause.match(/value\s*>\s*(\d+(?:\.\d+)?)/i);
    if (valueGtMatch) {
      where.valueGt = parseFloat(valueGtMatch[1]);
      console.log(`✅ Found value > : ${where.valueGt}`);
    }

    // value < 50
    const valueLtMatch = whereClause.match(/value\s*<\s*(\d+(?:\.\d+)?)/i);
    if (valueLtMatch) {
      where.valueLt = parseFloat(valueLtMatch[1]);
      console.log(`✅ Found value < : ${where.valueLt}`);
    }

    // value BETWEEN 75 AND 125
    const valueBetweenMatch = whereClause.match(/value\s+BETWEEN\s+(\d+(?:\.\d+)?)\s+AND\s+(\d+(?:\.\d+)?)/i);
    if (valueBetweenMatch) {
      where.valueBetween = {
        min: parseFloat(valueBetweenMatch[1]),
        max: parseFloat(valueBetweenMatch[2])
      };
      console.log(`✅ Found value BETWEEN: ${where.valueBetween.min} - ${where.valueBetween.max}`);
    }

    // ✅ Parse tag conditions
    // tag = 'TEMP001'
    const tagEqMatch = whereClause.match(/tag\s*=\s*['"]([^'"]+)['"]/i);
    if (tagEqMatch) {
      where.tagEq = tagEqMatch[1];
      console.log(`✅ Found tag = : ${where.tagEq}`);
    }

    // tag IN ('TEMP001', 'TEMP002')
    const tagInMatch = whereClause.match(/tag\s+IN\s*\(\s*([^)]+)\s*\)/i);
    if (tagInMatch) {
      const tags = tagInMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      where.tagIn = tags;
      console.log(`✅ Found tag IN: [${where.tagIn.join(', ')}]`);
    }

    // tag LIKE 'TEMP%'
    const tagLikeMatch = whereClause.match(/tag\s+LIKE\s*['"]([^'"]+)['"]/i);
    if (tagLikeMatch) {
      where.tagLike = tagLikeMatch[1];
      console.log(`✅ Found tag LIKE: ${where.tagLike}`);
    }

    console.log(`📋 Parsed WHERE conditions:`, where);
    return where;
  }

  /**
   * Check if data item matches WHERE conditions
   */
  matchesWhereConditions(item, where) {
    // ✅ Check timestamp conditions
    if (where.timestampGte) {
      const itemTime = new Date(item.timestamp);
      const conditionTime = new Date(where.timestampGte);
      if (itemTime < conditionTime) return false;
    }

    if (where.timestampLte) {
      const itemTime = new Date(item.timestamp);
      const conditionTime = new Date(where.timestampLte);
      if (itemTime > conditionTime) return false;
    }

    if (where.timestampBetween) {
      const itemTime = new Date(item.timestamp);
      const startTime = new Date(where.timestampBetween.start);
      const endTime = new Date(where.timestampBetween.end);
      if (itemTime < startTime || itemTime > endTime) return false;
    }

    // ✅ Check value conditions
    if (where.valueGt !== undefined) {
      if (item.value <= where.valueGt) return false;
    }

    if (where.valueLt !== undefined) {
      if (item.value >= where.valueLt) return false;
    }

    if (where.valueBetween) {
      if (item.value < where.valueBetween.min || item.value > where.valueBetween.max) return false;
    }

    // ✅ Check tag conditions
    if (where.tagEq) {
      if (item.tag !== where.tagEq) return false;
    }

    if (where.tagIn) {
      if (!where.tagIn.includes(item.tag)) return false;
    }

    if (where.tagLike) {
      // Simple LIKE implementation (supports % wildcard)
      const pattern = where.tagLike.replace(/%/g, '.*');
      const regex = new RegExp(`^${pattern}$`, 'i');
      if (!regex.test(item.tag)) return false;
    }

    return true; // All conditions passed
  }

  /**
   * Build AVEVA PI URL from parsed SQL elements
   */
  buildAvevaUrlFromSql(parsed, baseUrl, providedTag = null, customInterval = null, queryParams = {}) {
    console.log(`🔧 Building AVEVA PI URL from parsed elements:`, parsed);

    const params = new URLSearchParams();

    // Set tag - use parsed tag, provided tag, or default
    const tag = parsed.tag || providedTag || this.defaultTag;
    if (!tag) {
      throw new Error('Tag AVEVA PI tidak ditemukan. Pastikan tag sudah dikonfigurasi dengan benar.');
    }
    params.append('tag', tag);
    console.log(`🏷️ Using tag: ${tag}`);

    // ✅ DYNAMIC TIME RANGE: Determine interval and time range based on WHERE conditions
    const timeParams = this.calculateDynamicTimeParameters(parsed, customInterval, queryParams);
    params.append('interval', timeParams.interval);
    params.append('start', timeParams.start);
    if (timeParams.end !== '*') {
      params.append('end', timeParams.end);
    } else {
      params.append('end', '*');
    }
    
    // ✅ ADD MAXCOUNT for SQL queries to ensure we get the requested number of records
    if (parsed.limit) {
      params.append('maxCount', parsed.limit.toString());
      console.log(`📊 Added maxCount=${parsed.limit} for SQL query`);
    }
    
    console.log(`📊 Dynamic time params: interval=${timeParams.interval}, start=${timeParams.start}, end=${timeParams.end}`);

    const finalUrl = `${baseUrl}/pi/trn?${params.toString()}`;
    console.log(`🔗 Final AVEVA PI URL: ${finalUrl}`);

    return finalUrl;
  }

  /**
   * Calculate dynamic time parameters based on parsed SQL WHERE conditions
   */
  calculateDynamicTimeParameters(parsed, customInterval = null, params = {}) {
    console.log(`⏰ Calculating dynamic time parameters for:`, parsed, `customInterval:`, customInterval, `params:`, params);

    const now = new Date();

    // ✅ Priority 0: Explicit timeRange parameter (highest priority - for real-time queries)
    if (params.timeRange) {
      console.log(`🎯 Using explicit timeRange from params:`, params.timeRange);
      // Handle both object and string timeRange
      const timeRangeObj = typeof params.timeRange === 'object' ? params.timeRange : { start: params.timeRange, end: '*' };
      return {
        start: timeRangeObj.start,
        end: timeRangeObj.end || '*',
        interval: customInterval || '1h'
      };
    }

    // ✅ Priority 1: Custom interval with parsed limit (for SQL queries)
    if (customInterval && parsed.limit) {
      console.log(`🎯 Using custom interval with parsed limit: ${customInterval}, limit: ${parsed.limit}`);
      const timeRange = this.calculateTimeRangeForIntervalAndLimit(customInterval, parsed.limit);
      return {
        start: timeRange.start,
        end: timeRange.end,
        interval: customInterval
      };
    }

    // ✅ Priority 2: Custom interval with limit from params (for historical queries)
    if (customInterval && params.limit) {
      console.log(`🎯 Using custom interval with params limit: ${customInterval}, limit: ${params.limit}`);
      const timeRange = this.calculateTimeRangeForIntervalAndLimit(customInterval, params.limit);
      return {
        start: timeRange.start,
        end: timeRange.end,
        interval: customInterval
      };
    }

    // ✅ Priority 3: Custom interval override (fallback for when no limit specified)
    if (customInterval) {
      console.log(`🎯 Using custom interval fallback: ${customInterval}`);
      // For small intervals, use reasonable time ranges
      let hoursBack = 1; // Default fallback

      // Adjust time range based on interval for better performance
      switch (customInterval) {
        case '30s':
        case '1m':
          hoursBack = 0.25; // 15 minutes for small intervals
          break;
        case '5m':
        case '15m':
          hoursBack = 1; // 1 hour for medium intervals
          break;
        case '30m':
        case '1h':
          hoursBack = 24; // 24 hours for hourly intervals
          break;
        case '2h':
        case '6h':
        case '12h':
          hoursBack = 168; // 1 week for larger intervals
          break;
        case '1d':
          hoursBack = 720; // 1 month for daily
          break;
        default:
          hoursBack = 1; // Fallback to 1 hour
      }

      return {
        start: `*-${hoursBack}h`,
        end: '*',
        interval: customInterval
      };
    }

    // ✅ Priority 1: Explicit timestamp BETWEEN
    if (parsed.where && parsed.where.timestampBetween) {
      const { start, end } = parsed.where.timestampBetween;
      const startTime = new Date(start);
      const endTime = new Date(end);

      return {
        start: start,
        end: end,
        interval: this.calculateOptimalInterval(startTime, endTime)
      };
    }

    // ✅ Priority 2: Explicit timestamp >=
    if (parsed.where && parsed.where.timestampGte) {
      const startTime = new Date(parsed.where.timestampGte);

      return {
        start: parsed.where.timestampGte,
        end: '*',
        interval: this.calculateOptimalInterval(startTime, now)
      };
    }

    // ✅ Priority 3: Explicit timestamp <=
    if (parsed.where && parsed.where.timestampLte) {
      const endTime = new Date(parsed.where.timestampLte);
      // Estimate start time as 1 hour before end time
      const startTime = new Date(endTime.getTime() - (60 * 60 * 1000));

      return {
        start: startTime.toISOString(),
        end: parsed.where.timestampLte,
        interval: this.calculateOptimalInterval(startTime, endTime)
      };
    }

    // ✅ Priority 4: Legacy timeRange (DATE_SUB)
    if (parsed.timeRange) {
      const { value, unit } = parsed.timeRange;
      let startTime;

      if (unit === 'hour') {
        startTime = new Date(now.getTime() - (value * 60 * 60 * 1000));
      } else if (unit === 'day') {
        startTime = new Date(now.getTime() - (value * 24 * 60 * 60 * 1000));
      } else if (unit === 'minute') {
        startTime = new Date(now.getTime() - (value * 60 * 1000));
      } else {
        startTime = new Date(now.getTime() - (value * 1000)); // seconds
      }

      return {
        start: `*-${value}${unit.charAt(0)}`,
        end: '*',
        interval: this.calculateOptimalInterval(startTime, now)
      };
    }

    // ✅ Priority 5: TOP N or LIMIT queries (estimation based on limit)
    if (parsed.limit) {
      return this.calculateTimeRangeForLimit(parsed.limit);
    }

    // ✅ Default: Last 1 hour
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    return {
      start: '*-1h',
      end: '*',
      interval: this.calculateOptimalInterval(oneHourAgo, now)
    };
  }

  /**
   * Calculate optimal interval based on time range duration
   */
  calculateOptimalInterval(startTime, endTime) {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    console.log(`📏 Time range duration: ${durationHours.toFixed(2)} hours`);

    // Dynamic interval based on duration
    if (durationHours <= 0.25) return '30s';     // ≤ 15 min: 30 seconds
    if (durationHours <= 1) return '1m';         // ≤ 1 hour: 1 minute
    if (durationHours <= 6) return '5m';         // ≤ 6 hours: 5 minutes
    if (durationHours <= 24) return '15m';       // ≤ 1 day: 15 minutes
    if (durationHours <= 168) return '1h';       // ≤ 1 week: 1 hour
    if (durationHours <= 720) return '6h';       // ≤ 1 month: 6 hours
    return '1d';                                 // > 1 month: 1 day
  }

  /**
   * Calculate time range for TOP N / LIMIT queries
   */
  calculateTimeRangeForLimit(limit) {
    console.log(`🎯 Calculating time range for LIMIT ${limit}`);

    // Estimate time range based on expected data density
    // Assume average 1 data point per minute for industrial sensors
    const estimatedMinutes = Math.max(5, Math.ceil(limit * 1.2)); // 1.2x limit + minimum 5 min

    const startTime = new Date(Date.now() - (estimatedMinutes * 60 * 1000));
    const endTime = new Date();

    return {
      start: `*-${estimatedMinutes}m`,
      end: '*',
      interval: this.calculateOptimalInterval(startTime, endTime)
    };
  }

  /**
   * Calculate appropriate time range based on custom interval
   */
  calculateTimeRangeForInterval(interval) {
    console.log(`⏰ Calculating time range for custom interval: ${interval}`);

    const now = new Date();
    let hoursBack = 1; // Default fallback

    // Calculate appropriate time range based on interval
    switch (interval) {
      case '30s':
        hoursBack = 0.25; // 15 minutes for 30s interval
        break;
      case '1m':
        hoursBack = 1; // 1 hour for 1m interval
        break;
      case '5m':
        hoursBack = 6; // 6 hours for 5m interval
        break;
      case '15m':
        hoursBack = 12; // 12 hours for 15m interval
        break;
      case '30m':
        hoursBack = 24; // 24 hours for 30m interval
        break;
      case '1h':
        hoursBack = 168; // 1 week for 1h interval
        break;
      case '2h':
        hoursBack = 336; // 2 weeks for 2h interval
        break;
      case '6h':
        hoursBack = 720; // 1 month for 6h interval
        break;
      case '12h':
        hoursBack = 1440; // 2 months for 12h interval
        break;
      case '1d':
        hoursBack = 8760; // 1 year for 1d interval
        break;
      case '1w':
        hoursBack = 17520; // 2 years for 1w interval
        break;
      default:
        hoursBack = 1; // Fallback to 1 hour
    }

    const startTime = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    const startFormatted = `*-${hoursBack}h`;

    console.log(`📅 Time range for ${interval}: ${startFormatted} to now (${hoursBack} hours back)`);

    return {
      start: startFormatted,
      end: '*'
    };
  }

  /**
   * Format date for AVEVA PI API
   * AVEVA PI expects format like "17/Sep/2025"
   * @param {Date} date - Date object to format
   * @returns {string} Formatted date string
   */
  formatAvevaDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  /**
   * Generate triggers based on schema
   * @param {Object} schema - Discovered schema
   * @returns {Array} Array of trigger configurations
   */
  generateTriggers(schema) {
    const triggers = [];

    // Generate essential triggers only for AVEVA PI data
    for (const table of schema.tables) {
      const fields = schema.fields[table];

      if (table === 'tags') {
        // Get all tags trigger
        triggers.push(new Trigger(
          'aveva-pi-tags-all',
          'query',
          {
            query: 'SELECT * FROM tags LIMIT 50',
            description: 'Get all available tags from AVEVA PI',
            responsePrefix: '🏷️ *AVEVA PI TAGS*'
          }
        ));

        // Search tags trigger
        triggers.push(new Trigger(
          'aveva-pi-tags-search',
          'query',
          {
            query: 'SELECT * FROM tags WHERE name LIKE ?',
            description: 'Search tags by name pattern',
            parameters: ['pattern'],
            responsePrefix: '🔍 *TAG SEARCH RESULTS*'
          }
        ));
      }

      if (table === 'points') {
        // Get latest values for all points
        triggers.push(new Trigger(
          'aveva-pi-points-latest',
          'query',
          {
            query: 'SELECT * FROM points ORDER BY timestamp DESC LIMIT 20',
            description: 'Get latest point values from AVEVA PI',
            responsePrefix: '📈 *LATEST POINT VALUES*'
          }
        ));

        // Get values for specific tag
        triggers.push(new Trigger(
          'aveva-pi-points-by-tag',
          'query',
          {
            query: 'SELECT * FROM points WHERE tag = ? ORDER BY timestamp DESC LIMIT 10',
            description: 'Get point values for specific tag',
            parameters: ['tag'],
            responsePrefix: '📊 *POINT VALUES*'
          }
        ));
      }
    }

        console.log(`🎯 Generated ${triggers.length} triggers for AVEVA PI`);
    return triggers;
  }

  /**
   * Create a new AVEVA PI trigger
   * @param {Object} triggerData - Trigger configuration
   * @returns {Object} Created trigger object
   */
  async createTrigger(triggerData) {
    try {
      console.log('🔧 Creating AVEVA PI trigger:', triggerData);

      // Validation
      if (!triggerData.name || !triggerData.query) {
        throw new Error('Trigger name and query are required');
      }

      // Import database
      const { default: db } = await import('../../lib/database.js');

      // Create trigger config object
      const triggerConfig = {
        api_url: triggerData.query,
        method: 'GET',
        desc: triggerData.description || '',
        responsePrefix: triggerData.responsePrefix || '',
        sample: [],
        // ✅ Simpan interval jika ada
        ...(triggerData.interval && { interval: triggerData.interval }),
        ...(triggerData.config?.interval && { interval: triggerData.config.interval }),
        meta: {
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: 'admin'
        }
      };

      // Create trigger ID
      const triggerId = `b-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Save to database
      db.preparedStatements.insertTrigger.run(
        triggerId,
        triggerData.name,
        'QUERY',
        JSON.stringify(triggerConfig),
        triggerData.active !== false ? 1 : 0,
        triggerData.dataSourceId || null
      );

      console.log('✅ Trigger saved to database:', triggerId);

      // Return trigger object
      return {
        id: triggerId,
        name: triggerData.name,
        type: 'QUERY',
        config: triggerConfig,
        active: triggerData.active !== false,
        dataSourceId: triggerData.dataSourceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to create AVEVA PI trigger:', error.message);
      throw new Error(`AVEVA PI trigger creation failed: ${error.message}`);
    }
  }



  /**
   * Check if dual query should be used based on parameters
   * @param {object} params - Query parameters
   * @returns {boolean} True if dual query should be used
   */
  shouldUseDualQuery(params = {}) {
    // All AVEVA PI queries now use dual query (real-time + historical)
    // After removing built-in presets, all queries go through custom preset system
    return true;
  }
}

export default AvevaPiPlugin;
