import express from 'express';
import db from '../lib/database.js';
import { invalidateTriggerCountsCache } from './data-sources.js';

const router = express.Router();


// Helper function to update trigger-group relationships
function updateTriggerGroupIds(groupId, triggerIds) {
  try {
    // Get current members
    const currentMembers = db.preparedStatements.getTriggerGroupMembers.all(groupId);
    const currentTriggerIds = currentMembers.map(m => m.trigger_id);

    // Remove triggers that are no longer in the group
    currentTriggerIds.forEach(triggerId => {
      if (!triggerIds.includes(triggerId)) {
        db.preparedStatements.removeTriggerFromGroup.run(groupId, triggerId);
      }
    });

    // Add new triggers to the group
    triggerIds.forEach(triggerId => {
      if (!currentTriggerIds.includes(triggerId)) {
        db.preparedStatements.addTriggerToGroup.run(groupId, triggerId);
      }
    });

  } catch (error) {
    console.error('Error updating trigger group IDs:', error);
  }
}

// Sync all trigger group assignments - DEPRECATED (now handled by database foreign keys)
// function syncAllTriggerGroupIds() { ... }

// Generate unique ID
function generateId() {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Authentication is handled by `dualAuthMiddleware` mounted in main.js

// Note: syncAllTriggerGroupIds() removed - foreign keys handle consistency automatically

// GET /api/trigger-groups - List all groups
router.get('/', (req, res) => {
  try {
    const groups = db.preparedStatements.getAllTriggerGroups.all();
    
    // Get members for each group
    const groupsWithMembers = groups.map(group => {
      const members = db.preparedStatements.getTriggerGroupMembers.all(group.id);
      const triggerIds = members.map(m => m.trigger_id);
      
      return {
        ...group,
        triggers: triggerIds
      };
    });

    res.json({
      success: true,
      data: groupsWithMembers,
      count: groupsWithMembers.length
    });
  } catch (error) {
    console.error('Error listing trigger groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list trigger groups'
    });
  }
});

// POST /api/trigger-groups - Create new group
router.post('/', (req, res) => {
  try {
    const { name, description, executionMode = 'parallel', triggers = [] } = req.body;

    // Basic validation
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Name is required and must be a string'
      });
    }

    const id = generateId();
    const now = new Date().toISOString();

    // Insert into database
    db.preparedStatements.insertTriggerGroup.run(
      id,
      name,
      description || '',
      executionMode,
      now,
      now
    );

    // Add trigger memberships if any
    const triggerIds = Array.isArray(triggers) ? triggers : [];
    if (triggerIds.length > 0) {
      updateTriggerGroupIds(id, triggerIds);
    }

    // Invalidate cache to ensure dashboard shows updated data
    invalidateTriggerCountsCache();

    const newGroup = {
      id,
      name,
      description: description || '',
      execution_mode: executionMode,
      triggers: triggerIds,
      created_at: now,
      updated_at: now
    };

    res.status(201).json({
      success: true,
      data: newGroup,
      message: 'Trigger group created successfully'
    });
  } catch (error) {
    console.error('Error creating trigger group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create trigger group'
    });
  }
});

// GET /api/trigger-groups/:id - Get group details
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const group = db.preparedStatements.getTriggerGroup.get(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Trigger group not found'
      });
    }

    // Get members
    const members = db.preparedStatements.getTriggerGroupMembers.all(id);
    const triggerIds = members.map(m => m.trigger_id);

    res.json({
      success: true,
      data: {
        ...group,
        triggers: triggerIds
      }
    });
  } catch (error) {
    console.error('Error getting trigger group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trigger group'
    });
  }
});

// PUT /api/trigger-groups/:id - Update group
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, executionMode, triggers } = req.body;
    
    const group = db.preparedStatements.getTriggerGroup.get(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Trigger group not found'
      });
    }

    // Prepare update values (use existing if not provided)
    const updatedName = name || group.name;
    const updatedDescription = description !== undefined ? description : group.description;
    const updatedExecutionMode = executionMode || group.execution_mode;

    // Update in database
    db.preparedStatements.updateTriggerGroup.run(
      updatedName,
      updatedDescription,
      updatedExecutionMode,
      id
    );

    // Update trigger memberships if provided
    if (triggers !== undefined) {
      const newTriggers = Array.isArray(triggers) ? triggers : [];
      updateTriggerGroupIds(id, newTriggers);
    }

    // Invalidate cache to ensure dashboard shows updated data
    invalidateTriggerCountsCache();

    // Get updated group with members
    const updatedGroup = db.preparedStatements.getTriggerGroup.get(id);
    const members = db.preparedStatements.getTriggerGroupMembers.all(id);
    const triggerIds = members.map(m => m.trigger_id);

    res.json({
      success: true,
      data: {
        ...updatedGroup,
        triggers: triggerIds
      },
      message: 'Trigger group updated successfully'
    });
  } catch (error) {
    console.error('Error updating trigger group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update trigger group'
    });
  }
});

// DELETE /api/trigger-groups/:id - Delete group
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const group = db.preparedStatements.getTriggerGroup.get(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Trigger group not found'
      });
    }

    // Delete from database (CASCADE will remove members automatically)
    db.preparedStatements.deleteTriggerGroup.run(id);

    // Invalidate cache to ensure dashboard shows updated data
    invalidateTriggerCountsCache();

    res.json({
      success: true,
      message: 'Trigger group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting trigger group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete trigger group'
    });
  }
});

// POST /api/trigger-groups/:id/execute - Execute trigger group
router.post('/:id/execute', (req, res) => {
  try {
    const { id } = req.params;
    const group = db.preparedStatements.getTriggerGroup.get(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Trigger group not found'
      });
    }

    // Get trigger members
    const members = db.preparedStatements.getTriggerGroupMembers.all(id);

    if (!members || members.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Trigger group has no triggers to execute'
      });
    }

    // For now, just return success - actual execution is handled in pi_routes.js
    res.json({
      success: true,
      message: `Trigger group '${group.name}' execution initiated`,
      groupId: id,
      triggerCount: members.length
    });

  } catch (error) {
    console.error('Error executing trigger group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute trigger group'
    });
  }
});

export default router;
