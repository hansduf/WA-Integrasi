import express from 'express';
import { config } from '../config/index.js';
import { dataSourceManager } from '../core/data-source-manager.js';
import { triggerEngine } from '../core/trigger-engine.js';
import db from '../lib/database.js';
import {
    logTriggerCreated,
    logTriggerDeleted,
    logTriggerExecuted,
    logTriggerStatusChanged,
    logTriggerUpdated
} from '../utils/audit.utils.js';
import { getClientIP, getUserAgent } from '../utils/security.utils.js';
import { invalidateTriggerCountsCache } from './data-sources.js';

const router = express.Router();

// Middleware for API key validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = config.api.key;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid API Key'
    });
  }

  next();
};

// Database helper functions
function getAllTriggers() {
  try {
    const triggers = db.preparedStatements.getAllTriggers.all();
    return triggers.map(trigger => ({
      id: trigger.id,
      name: trigger.name,
      type: trigger.type,
      config: JSON.parse(trigger.config || '{}'),
      active: Boolean(trigger.active),
      dataSourceId: trigger.data_source_id,
      createdAt: trigger.created_at,
      updatedAt: trigger.updated_at
    }));
  } catch (error) {
    console.error('Error reading triggers from database:', error);
    return [];
  }
}

function getTriggerById(id) {
  try {
    const trigger = db.preparedStatements.getTrigger.get(id);
    if (!trigger) return null;

    return {
      id: trigger.id,
      name: trigger.name,
      type: trigger.type,
      config: JSON.parse(trigger.config || '{}'),
      active: Boolean(trigger.active),
      dataSourceId: trigger.data_source_id,
      createdAt: trigger.created_at,
      updatedAt: trigger.updated_at
    };
  } catch (error) {
    console.error('Error reading trigger from database:', error);
    return null;
  }
}

function createTrigger(triggerData) {
  try {
    const id = `b-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const configJson = JSON.stringify(triggerData.config || {});

    db.preparedStatements.insertTrigger.run(
      id,
      triggerData.name || `Trigger ${id}`,
      triggerData.type || 'QUERY',
      configJson,
      triggerData.active ? 1 : 0,
      triggerData.dataSourceId
    );

    return getTriggerById(id);
  } catch (error) {
    console.error('Error creating trigger in database:', error);
    throw error;
  }
}

function updateTrigger(id, triggerData) {
  try {
    const configJson = JSON.stringify(triggerData.config || {});
    const result = db.preparedStatements.updateTrigger.run(
      triggerData.name,
      configJson,
      triggerData.active ? 1 : 0,
      id
    );

    if (result.changes === 0) {
      throw new Error('Trigger not found');
    }

    return getTriggerById(id);
  } catch (error) {
    console.error('Error updating trigger in database:', error);
    throw error;
  }
}

function deleteTrigger(id) {
  try {
    const result = db.preparedStatements.deleteTrigger.run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting trigger from database:', error);
    throw error;
  }
}

// Legacy helper functions removed - all operations now use database only

// Convert legacy trigger format to new format
function convertLegacyTrigger(id, behavior) {
  console.log('Converting legacy trigger:', id, behavior);
  console.log('dataSourceId in behavior:', behavior.dataSourceId);
  const result = {
    id,
    name: id,
    type: behavior.type?.toLowerCase() || 'query',
    config: {
      query: behavior.api_url || '',
      description: behavior.desc || '',
      parameters: [],
      responsePrefix: behavior.responsePrefix || ''
    },
    active: behavior.active !== false,
    dataSource: behavior.dataSourceId || behavior.dataSource || 'aveva-pi-default', // Map to dataSource for frontend
    tag: behavior.tag || null, // Load AVEVA PI tag
    interval: behavior.interval || null, // Load interval from legacy format
    createdAt: behavior.meta?.created_at || new Date().toISOString(),
    updatedAt: behavior.meta?.updated_at || new Date().toISOString()
  };
  console.log('Converted result:', result);
  return result;
}

// Convert new format to legacy format for storage
function convertToLegacyFormat(trigger) {
  const id = `b-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log('Converting trigger to legacy format:', trigger);
  console.log('dataSourceId:', trigger.dataSourceId);
  return {
    [id]: {
      type: trigger.type.toUpperCase(),
      api_url: trigger.config.query || '',
      method: 'GET',
      desc: trigger.config.description || '',
      responsePrefix: trigger.config.responsePrefix || '',
      active: trigger.active,
      dataSourceId: trigger.dataSourceId || trigger.dataSource, // Store dataSourceId
      tag: trigger.tag, // Store AVEVA PI tag
      sample: [],
      meta: {
        created_by: 'admin',
        created_at: trigger.createdAt,
        updated_at: trigger.updatedAt,
        updated_by: 'admin'
      }
    }
  };
}

// GET /api/triggers - List all triggers  
router.get('/', (req, res) => {
  try {
    const triggers = getAllTriggers();

    res.json({
      success: true,
      data: triggers,
      count: triggers.length
    });
  } catch (error) {
    console.error('Error fetching triggers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch triggers',
      details: error.message
    });
  }
});

// POST /api/triggers - Create new trigger
router.post('/', async (req, res) => {
  try {
    const { name, type, dataSourceId, config, active = true } = req.body;

    if (!name || !type || !dataSourceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, dataSourceId'
      });
    }

    // Validate data source exists
    const dataSource = db.preparedStatements.getDataSource.get(dataSourceId);
    if (!dataSource) {
      return res.status(400).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Create trigger in database
    const triggerData = {
      name,
      type: type.toUpperCase(),
      config: config || {},
      active: Boolean(active),
      dataSourceId
    };

    const newTrigger = createTrigger(triggerData);

    invalidateTriggerCountsCache();
    // Invalidate trigger engine cache
    if (triggerEngine && triggerEngine.invalidateCache) {
      triggerEngine.invalidateCache();
    }

    // Audit logging for trigger creation
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logTriggerCreated(userId, newTrigger.id, triggerData, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log trigger creation:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.status(201).json({
      success: true,
      data: newTrigger
    });

  } catch (error) {
    console.error('Error creating trigger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create trigger',
      details: error.message
    });
  }
});

// PUT /api/triggers/:id - Update trigger
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, dataSourceId, config, active } = req.body;

    if (!name || !type || !dataSourceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, dataSourceId'
      });
    }

    // Check if trigger exists
    const existingTrigger = getTriggerById(id);
    if (!existingTrigger) {
      return res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
    }

    // Validate data source exists
    const dataSource = db.preparedStatements.getDataSource.get(dataSourceId);
    if (!dataSource) {
      return res.status(400).json({
        success: false,
        error: 'Data source not found'
      });
    }

    // Update trigger in database
    const triggerData = {
      name,
      type: type.toUpperCase(),
      config: config || existingTrigger.config,
      active: active !== undefined ? Boolean(active) : existingTrigger.active,
      dataSourceId
    };

    const updatedTrigger = updateTrigger(id, triggerData);

    invalidateTriggerCountsCache();
    // Invalidate trigger engine cache
    if (triggerEngine && triggerEngine.invalidateCache) {
      triggerEngine.invalidateCache();
    }

    // Audit logging for trigger update
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logTriggerUpdated(userId, id, existingTrigger, triggerData, ipAddress, userAgent);

      // Log status change if active status changed
      if (existingTrigger.active !== updatedTrigger.active) {
        await logTriggerStatusChanged(userId, id, existingTrigger.active, updatedTrigger.active, ipAddress, userAgent);
      }
    } catch (auditError) {
      console.error('Failed to log trigger update/status change:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      data: updatedTrigger
    });

  } catch (error) {
    console.error('Error updating trigger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update trigger',
      details: error.message
    });
  }
});

// DELETE /api/triggers/:id - Delete trigger
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if trigger exists
    const existingTrigger = getTriggerById(id);
    if (!existingTrigger) {
      return res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
    }

    // Delete trigger from database
    const deleted = deleteTrigger(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
    }

    invalidateTriggerCountsCache();
    // Invalidate trigger engine cache
    if (triggerEngine && triggerEngine.invalidateCache) {
      triggerEngine.invalidateCache();
    }

    // Audit logging for trigger deletion
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logTriggerDeleted(userId, id, existingTrigger, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log trigger deletion:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      message: 'Trigger deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting trigger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete trigger',
      details: error.message
    });
  }
});

// GET /api/triggers/:id - Get single trigger
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const trigger = getTriggerById(id);
    if (!trigger) {
      return res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
    }

    res.json({
      success: true,
      data: trigger
    });

  } catch (error) {
    console.error('Error getting trigger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load trigger',
      details: error.message
    });
  }
});

// POST /api/triggers/:name/execute - Execute a trigger
router.post('/:name/execute', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Get trigger from database by name
    const allTriggers = db.preparedStatements.getAllTriggers.all();
    const dbTrigger = allTriggers.find(t => t.name === name);

    if (!dbTrigger) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    // Parse config and create trigger object
    const config = JSON.parse(dbTrigger.config);
    const trigger = {
      id: dbTrigger.id,
      name: dbTrigger.name,
      type: dbTrigger.type.toLowerCase(),
      config: config,
      active: dbTrigger.active === 1,
      dataSource: dbTrigger.data_source_id
    };
    
    console.log('Trigger from database:', JSON.stringify(trigger, null, 2));

    // Check if trigger is active
    if (!trigger.active) {
      return res.status(400).json({ error: 'Trigger is not active' });
    }

    // Execute the trigger using data source manager
    try {
      console.log('Executing trigger with parameters:', {
        tag: trigger.tag,
        interval: trigger.interval
      });
      const result = await dataSourceManager.executeQuery(trigger.dataSource, {
        query: trigger.config.query,
        parameters: {
          tag: trigger.tag, // Pass AVEVA PI tag as parameter
          interval: trigger.interval // Pass interval from trigger config
        }
      });

      // Generate preview for AVEVA PI triggers
      let sqlPreview = null;
      if (result.sqlPreview) {
        sqlPreview = result.sqlPreview;
      }

      // Audit logging for trigger execution
      try {
        const userId = req.user?.id;
        const ipAddress = getClientIP(req);
        const userAgent = getUserAgent(req);
        await logTriggerExecuted(userId, trigger.id, trigger.name, result, ipAddress, userAgent);
      } catch (auditError) {
        console.error('Failed to log trigger execution:', auditError);
        // Don't fail the request if audit logging fails
      }

      res.json({
        success: true,
        message: `Trigger ${name} executed successfully`,
        result: result,
        sqlPreview: sqlPreview,
        trigger: trigger
      });
    } catch (executeError) {
      console.error(`Error executing trigger ${name}:`, executeError);
      res.status(500).json({
        error: `Failed to execute trigger: ${executeError.message}`
      });
    }
  } catch (error) {
    console.error('Error executing trigger:', error);
    res.status(500).json({ error: 'Failed to execute trigger' });
  }
});

export default router;
