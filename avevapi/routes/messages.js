// routes/messages.js - FULL DATABASE VERSION
import express from 'express';
import db from '../lib/database.js';
import {
    logMessageDeleted,
    logMessageSent
} from '../utils/audit.utils.js';
import { getClientIP, getUserAgent } from '../utils/security.utils.js';

const router = express.Router();

/**
 * GET /api/messages - Get all messages (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 */
router.get('/', async (req, res) => {
  try {
    const messages = db.preparedStatements.getAllMessages.all(50, 0); // limit 50, offset 0
    res.json({
      success: true,
      data: messages.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        sender: m.sender,
        recipient: m.recipient,
        status: m.status,
        processedAt: m.processed_at,
        metadata: m.metadata ? JSON.parse(m.metadata) : {},
        createdAt: m.created_at,
        // Add formatted timestamps for frontend compatibility
        timestamp: new Date(m.created_at).getTime(), // Unix timestamp
        formattedTime: new Date(m.created_at).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }))
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages - Save message to database (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 */
router.post('/', async (req, res) => {
  try {
    const { id, type, content, sender, recipient, status, metadata } = req.body;

    if (!id || !type || !sender || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, type, sender, recipient'
      });
    }

    // Check if message already exists
    const existing = db.preparedStatements.getMessage.get(id);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Message with this ID already exists'
      });
    }

    // Insert message
    const now = new Date().toISOString();
    db.preparedStatements.insertMessage.run(
      id,
      type,
      content || '',
      sender,
      recipient,
      status || 'sent',
      now, // processed_at
      metadata ? JSON.stringify(metadata) : '{}',
      now  // created_at
    );

    // Audit logging for message sent
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logMessageSent(userId, id, { type, sender, recipient, status: status || 'sent' }, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log message sent:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      message: 'Message saved to database successfully',
      data: {
        id,
        type,
        content,
        sender,
        recipient,
        status: status || 'sent',
        processedAt: now,
        metadata: metadata || {},
        createdAt: now
      }
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/contacts - Save/update contact to database (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 */
router.post('/contacts', async (req, res) => {
  try {
    const { id, name, phone, metadata } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id'
      });
    }

    const now = new Date().toISOString();

    // Normalize incoming phone (remove non-digits)
    const incomingPhone = phone ? String(phone).replace(/\D+/g, '') : '';

    // 1) Check by id
    const existingById = db.preparedStatements.getContact.get(id);

    // 2) If not found by id, try find by phone
    let existingByPhone = null;
    if (!existingById && incomingPhone) {
      try {
        existingByPhone = db.preparedStatements.getContactByPhone.get(incomingPhone);
      } catch (err) {
        // ignore
      }
    }

    if (existingById) {
      // Update existing contact by id
      db.preparedStatements.updateContact.run(
        name || existingById.name,
        incomingPhone || existingById.phone,
        metadata ? JSON.stringify(metadata) : existingById.metadata,
        id
      );

      return res.json({
        success: true,
        message: 'Contact updated in database successfully',
        data: {
          id,
          name: name || existingById.name,
          phone: incomingPhone || existingById.phone,
          metadata: metadata ? metadata : JSON.parse(existingById.metadata || '{}'),
          updatedAt: now
        }
      });
    }

    if (existingByPhone) {
      // Update the existing record found by phone to avoid UNIQUE constraint
      db.preparedStatements.updateContact.run(
        name || existingByPhone.name,
        incomingPhone || existingByPhone.phone,
        metadata ? JSON.stringify(metadata) : existingByPhone.metadata,
        existingByPhone.id
      );

      return res.json({
        success: true,
        message: 'Contact updated (matched by phone) to avoid duplicate phone entry',
        data: {
          id: existingByPhone.id,
          name: name || existingByPhone.name,
          phone: incomingPhone || existingByPhone.phone,
          metadata: metadata ? metadata : JSON.parse(existingByPhone.metadata || '{}'),
          updatedAt: now
        }
      });
    }

    // Not found -> attempt insert, but catch UNIQUE constraint on phone and handle it
    try {
      db.preparedStatements.insertContact.run(
        id,
        name || 'Unknown',
        incomingPhone || '',
        metadata ? JSON.stringify(metadata) : '{}',
        now,
        now
      );

      return res.json({
        success: true,
        message: 'Contact saved to database successfully',
        data: {
          id,
          name: name || 'Unknown',
          phone: incomingPhone || '',
          metadata: metadata || {},
          createdAt: now,
          updatedAt: now
        }
      });
    } catch (insertErr) {
      console.error('❌ Insert contact failed:', insertErr.message);

      // If UNIQUE constraint on phone occurred, try to find the existing row by flexible matching
      if (insertErr.message && insertErr.message.includes('UNIQUE constraint failed') && incomingPhone) {
        try {
          // Try matching phone ignoring leading '+' (if stored with +)
          const matchStmt = db.db.prepare("SELECT * FROM contacts WHERE REPLACE(phone, '+', '') = ? LIMIT 1");
          const matched = matchStmt.get(incomingPhone);
          if (matched) {
            // Update the matched record
            db.preparedStatements.updateContact.run(
              name || matched.name,
              incomingPhone || matched.phone,
              metadata ? JSON.stringify(metadata) : matched.metadata,
              matched.id
            );

            return res.json({
              success: true,
              message: 'Contact updated (matched by phone after insert conflict)',
              data: {
                id: matched.id,
                name: name || matched.name,
                phone: incomingPhone || matched.phone,
                metadata: metadata ? metadata : JSON.parse(matched.metadata || '{}'),
                updatedAt: now
              }
            });
          }
        } catch (matchErr) {
          console.error('❌ Failed to resolve UNIQUE conflict by phone match:', matchErr.message);
        }
      }

      // If still not resolved, return error
      return res.status(500).json({ success: false, error: insertErr.message });
    }
  } catch (error) {
    console.error('Error saving contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/messages/stats - Get message statistics (WEB USERS ONLY)
 * IMPORTANT: Must be BEFORE /messages/:id to avoid route conflict
 * Protected by global dualAuthMiddleware (JWT for web)
 */
router.get('/messages/stats', async (req, res) => {
  try {
    // Get total messages
    const totalMessages = db.db.prepare('SELECT COUNT(*) as count FROM messages').get();
    
    // Get messages by status
    const byStatus = db.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM messages 
      GROUP BY status
    `).all();

    // Get spam messages (from metadata)
    const spamMessages = db.db.prepare(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE json_extract(metadata, '$.spam') = 1
    `).get();

    // Get recent messages (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentMessages = db.db.prepare(
      'SELECT COUNT(*) as count FROM messages WHERE created_at >= ?'
    ).get(yesterday);

    // Get total contacts
    const totalContacts = db.db.prepare('SELECT COUNT(*) as count FROM contacts').get();

    res.json({
      success: true,
      data: {
        totalMessages: totalMessages.count,
        spamMessages: spamMessages.count,
        recentMessages: recentMessages.count,
        totalContacts: totalContacts.count,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error getting message stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/messages/:id - Get single message by ID (WEB USERS ONLY)
 * Protected by global dualAuthMiddleware (JWT for web)
 */
router.get('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const message = db.preparedStatements.getMessage.get(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: message.id,
        type: message.type,
        content: message.content,
        sender: message.sender,
        recipient: message.recipient,
        status: message.status,
        processedAt: message.processed_at,
        metadata: message.metadata ? JSON.parse(message.metadata) : {},
        createdAt: message.created_at
      }
    });
  } catch (error) {
    console.error('Error getting message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/messages - Create new message (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 * Body: { id, type, content, sender, recipient, status, metadata }
 */
router.post('/messages', async (req, res) => {
  try {
    const { id, type, content, sender, recipient, status, metadata } = req.body;

    if (!id || !type || !sender || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, type, sender, recipient'
      });
    }

    // Check if message already exists
    const existing = db.preparedStatements.getMessage.get(id);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Message with this ID already exists'
      });
    }

    // Insert message
    const now = new Date().toISOString();
    db.preparedStatements.insertMessage.run(
      id,
      type,
      content || '',
      sender,
      recipient,
      status || 'sent',
      now, // processed_at
      metadata ? JSON.stringify(metadata) : '{}',
      now  // created_at
    );

    res.json({
      success: true,
      message: 'Message saved successfully',
      data: {
        id,
        type,
        content,
        sender,
        recipient,
        status: status || 'sent',
        processedAt: now,
        metadata: metadata || {},
        createdAt: now
      }
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/messages/:id - Delete message
 */
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if message exists
    const message = db.preparedStatements.getMessage.get(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Delete from database
    const result = db.preparedStatements.deleteMessage.run(id);

    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
    }

    // Audit logging for message deletion
    try {
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      await logMessageDeleted(userId, id, message, ipAddress, userAgent);
    } catch (auditError) {
      console.error('Failed to log message deletion:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== CONTACTS ENDPOINTS ====================

/**
 * GET /api/contacts - Get all contacts
 */
router.get('/contacts', async (req, res) => {
  try {
    const contacts = db.preparedStatements.getAllContacts.all();

    // Transform database format to API format
    const formattedContacts = contacts.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      metadata: c.metadata ? JSON.parse(c.metadata) : {},
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    res.json({
      success: true,
      data: formattedContacts
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contacts/:id - Get single contact by ID
 */
router.get('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contact = db.preparedStatements.getContact.get(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        metadata: contact.metadata ? JSON.parse(contact.metadata) : {},
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      }
    });
  } catch (error) {
    console.error('Error getting contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contacts - Create or update contact (UPSERT)
 * Body: { id, name, phone, metadata }
 */
router.post('/contacts', async (req, res) => {
  try {
    const { id, name, phone, metadata } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id'
      });
    }

    // Check if contact exists
    const existing = db.preparedStatements.getContact.get(id);
    const now = new Date().toISOString();

    if (existing) {
      // Update existing contact
      db.preparedStatements.updateContact.run(
        name || existing.name,
        phone || existing.phone,
        metadata ? JSON.stringify(metadata) : existing.metadata,
        id
      );

      res.json({
        success: true,
        message: 'Contact updated successfully',
        data: {
          id,
          name: name || existing.name,
          phone: phone || existing.phone,
          metadata: metadata || JSON.parse(existing.metadata || '{}'),
          updatedAt: now
        }
      });
    } else {
      // Insert new contact
      db.preparedStatements.insertContact.run(
        id,
        name || 'Unknown',
        phone || '',
        metadata ? JSON.stringify(metadata) : '{}',
        now,
        now
      );

      res.json({
        success: true,
        message: 'Contact created successfully',
        data: {
          id,
          name: name || 'Unknown',
          phone: phone || '',
          metadata: metadata || {},
          createdAt: now,
          updatedAt: now
        }
      });
    }
  } catch (error) {
    console.error('Error creating/updating contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/contacts/:id - Delete contact
 */
router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if contact exists
    const contact = db.preparedStatements.getContact.get(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Delete from database
    const result = db.preparedStatements.deleteContact.run(id);

    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete contact'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/messages/outgoing - Queue outgoing message (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 */
router.post('/outgoing', async (req, res) => {
  try {
    const { recipient, message, type = 'manual' } = req.body;

    if (!recipient || !message) {
      return res.status(400).json({
        success: false,
        error: 'Recipient and message are required'
      });
    }

    const result = db.preparedStatements.insertOutgoingMessage.run(
      recipient, message, type, 'pending'
    );

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        recipient,
        message,
        type,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error queuing outgoing message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/messages/outgoing - Get pending outgoing messages (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 */
router.get('/outgoing', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const messages = status === 'all' 
      ? db.preparedStatements.getAllOutgoingMessages.all()
      : db.preparedStatements.getPendingOutgoingMessages.all(status);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error getting outgoing messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/messages/outgoing/:id - Update outgoing message status (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 */
router.put('/outgoing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, error_message, retry_count = 0 } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const sent_at = status === 'sent' ? new Date().toISOString() : null;

    const result = db.preparedStatements.updateOutgoingMessageStatus.run(
      status, sent_at, error_message, retry_count, id
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Outgoing message not found'
      });
    }

    res.json({
      success: true,
      message: 'Outgoing message status updated'
    });
  } catch (error) {
    console.error('Error updating outgoing message status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/messages/outgoing/:id - Delete outgoing message (BOT ONLY)
 * Protected by global dualAuthMiddleware (API Key for bot)
 */
router.delete('/outgoing/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = db.preparedStatements.deleteOutgoingMessage.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Outgoing message not found'
      });
    }

    res.json({
      success: true,
      message: 'Outgoing message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting outgoing message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
