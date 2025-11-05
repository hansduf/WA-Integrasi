// lib/database.js
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'app.db');
    this.ensureDataDirectory();
    this.db = new Database(this.dbPath);
    this.initDatabase();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  initDatabase() {
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.createTables();
    this.createIndexes();
  }

  createTables() {
    const schema = `
      CREATE TABLE IF NOT EXISTS data_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        plugin TEXT NOT NULL,
        database_type TEXT,
        config TEXT NOT NULL,
        connection_status TEXT DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')),
        last_tested_at DATETIME,
        test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
        test_error_message TEXT,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS triggers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        active BOOLEAN DEFAULT 1,
        data_source_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS trigger_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        execution_mode TEXT DEFAULT 'parallel' CHECK (execution_mode IN ('parallel', 'sequential')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trigger_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id TEXT NOT NULL,
        trigger_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES trigger_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (trigger_id) REFERENCES triggers(id) ON DELETE CASCADE,
        UNIQUE(group_id, trigger_id)
      );

      CREATE TABLE IF NOT EXISTS ai_triggers (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'ai',
        prefix TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT 1,
        usage_count INTEGER DEFAULT 0,
        last_used DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS whatsapp_status (
        id INTEGER PRIMARY KEY DEFAULT 1,
        is_ready BOOLEAN DEFAULT 0,
        is_initializing BOOLEAN DEFAULT 0,
        bot_number TEXT,
        phone_number TEXT,
        bot_id TEXT,
        qr_data TEXT,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        reconnect_attempts INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT,
        sender TEXT,
        recipient TEXT,
        status TEXT DEFAULT 'sent',
        processed_at DATETIME,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT UNIQUE,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS outgoing_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        sent_at DATETIME,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS query_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        query_template TEXT NOT NULL,
        variables TEXT,
        is_default BOOLEAN DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, key)
      );

      -- Authentication System Tables
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        email TEXT,
        role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'user', 'viewer')),
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1,
        login_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        user_id TEXT UNIQUE,
        token_hash TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    this.db.exec(schema);
  }

  createIndexes() {
    const indexes = `
      CREATE INDEX IF NOT EXISTS idx_data_sources_plugin ON data_sources(plugin);
      CREATE INDEX IF NOT EXISTS idx_data_sources_active ON data_sources(active);
      CREATE INDEX IF NOT EXISTS idx_triggers_active ON triggers(active);
      CREATE INDEX IF NOT EXISTS idx_triggers_data_source ON triggers(data_source_id);
      CREATE INDEX IF NOT EXISTS idx_outgoing_messages_status ON outgoing_messages(status);
      CREATE INDEX IF NOT EXISTS idx_outgoing_messages_recipient ON outgoing_messages(recipient);
      CREATE INDEX IF NOT EXISTS idx_outgoing_messages_created_at ON outgoing_messages(created_at);
      
      -- Authentication System Indexes
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
    `;

    this.db.exec(indexes);
  }

  // Prepared statements untuk performance
  get preparedStatements() {
    return {
      getTrigger: this.db.prepare('SELECT * FROM triggers WHERE id = ?'),
      getAllTriggers: this.db.prepare('SELECT * FROM triggers ORDER BY created_at DESC'),
      insertTrigger: this.db.prepare(`
        INSERT INTO triggers (id, name, type, config, active, data_source_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `),
      updateTrigger: this.db.prepare(`
        UPDATE triggers SET name = ?, config = ?, active = ?, updated_at = datetime('now')
        WHERE id = ?
      `),
      deleteTrigger: this.db.prepare('DELETE FROM triggers WHERE id = ?'),

      // AI Triggers
      getAllAiTriggers: this.db.prepare('SELECT * FROM ai_triggers ORDER BY created_at DESC'),
      getAiTrigger: this.db.prepare('SELECT * FROM ai_triggers WHERE id = ?'),
            insertAiTrigger: this.db.prepare(`
        INSERT INTO ai_triggers (id, type, prefix, name, description, enabled, usage_count, last_used, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      updateAiTrigger: this.db.prepare(`
        UPDATE ai_triggers SET prefix = ?, name = ?, description = ?, enabled = ?, usage_count = ?, last_used = ?, updated_at = datetime('now')
        WHERE id = ?
      `),
      deleteAiTrigger: this.db.prepare('DELETE FROM ai_triggers WHERE id = ?'),

      // WhatsApp Status
      getWhatsAppStatus: this.db.prepare('SELECT * FROM whatsapp_status WHERE id = 1'),
      insertWhatsAppStatus: this.db.prepare(`
        INSERT OR REPLACE INTO whatsapp_status (id, is_ready, is_initializing, bot_number, phone_number, bot_id, qr_data, last_update, reconnect_attempts, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `),
      updateWhatsAppStatus: this.db.prepare(`
        UPDATE whatsapp_status SET is_ready = ?, is_initializing = ?, bot_number = ?, phone_number = ?, bot_id = ?, qr_data = ?, last_update = ?, reconnect_attempts = ?, updated_at = datetime('now')
        WHERE id = 1
      `),

      // Messages
      getAllMessages: this.db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?'),
      getMessage: this.db.prepare('SELECT * FROM messages WHERE id = ?'),
      insertMessage: this.db.prepare(`
        INSERT INTO messages (id, type, content, sender, recipient, status, processed_at, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      updateMessage: this.db.prepare(`
        UPDATE messages SET status = ?, processed_at = ?, metadata = ?
        WHERE id = ?
      `),
      deleteMessage: this.db.prepare('DELETE FROM messages WHERE id = ?'),

      // Contacts
      getAllContacts: this.db.prepare('SELECT * FROM contacts ORDER BY created_at DESC'),
      getContact: this.db.prepare('SELECT * FROM contacts WHERE id = ?'),
      getContactByPhone: this.db.prepare('SELECT * FROM contacts WHERE phone = ?'),
      insertContact: this.db.prepare(`
        INSERT INTO contacts (id, name, phone, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      updateContact: this.db.prepare(`
        UPDATE contacts SET name = ?, phone = ?, metadata = ?, updated_at = datetime('now')
        WHERE id = ?
      `),
      deleteContact: this.db.prepare('DELETE FROM contacts WHERE id = ?'),

      // Query Presets
      getAllQueryPresets: this.db.prepare('SELECT * FROM query_presets ORDER BY created_at DESC'),
      getQueryPreset: this.db.prepare('SELECT * FROM query_presets WHERE id = ?'),
      insertQueryPreset: this.db.prepare(`
        INSERT INTO query_presets (id, name, query_template, variables, is_default, usage_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),
      updateQueryPreset: this.db.prepare(`
        UPDATE query_presets SET name = ?, query_template = ?, variables = ?, is_default = ?, usage_count = ?, updated_at = datetime('now')
        WHERE id = ?
      `),
      deleteQueryPreset: this.db.prepare('DELETE FROM query_presets WHERE id = ?'),

      // Trigger Groups
      getAllTriggerGroups: this.db.prepare('SELECT * FROM trigger_groups ORDER BY created_at DESC'),
      getTriggerGroup: this.db.prepare('SELECT * FROM trigger_groups WHERE id = ?'),
      insertTriggerGroup: this.db.prepare(`
        INSERT INTO trigger_groups (id, name, description, execution_mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      updateTriggerGroup: this.db.prepare(`
        UPDATE trigger_groups SET name = ?, description = ?, execution_mode = ?, updated_at = datetime('now')
        WHERE id = ?
      `),
      deleteTriggerGroup: this.db.prepare('DELETE FROM trigger_groups WHERE id = ?'),

      // Trigger Group Members
      getTriggerGroupMembers: this.db.prepare('SELECT * FROM trigger_group_members WHERE group_id = ?'),
      addTriggerToGroup: this.db.prepare(`
        INSERT OR IGNORE INTO trigger_group_members (group_id, trigger_id, created_at)
        VALUES (?, ?, datetime('now'))
      `),
      removeTriggerFromGroup: this.db.prepare('DELETE FROM trigger_group_members WHERE group_id = ? AND trigger_id = ?'),

      getDataSource: this.db.prepare('SELECT * FROM data_sources WHERE id = ?'),
      getAllDataSources: this.db.prepare('SELECT * FROM data_sources ORDER BY created_at DESC'),
      insertDataSource: this.db.prepare(`
        INSERT INTO data_sources (
          id, name, plugin, database_type, config, 
          connection_status, last_tested_at, test_status, test_error_message, active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      updateDataSource: this.db.prepare(`
        UPDATE data_sources SET 
          name = ?, 
          plugin = ?, 
          database_type = ?,
          config = ?, 
          connection_status = ?,
          last_tested_at = ?,
          test_status = ?,
          test_error_message = ?,
          active = ?, 
          updated_at = datetime('now')
        WHERE id = ?
      `),
      deleteDataSource: this.db.prepare('DELETE FROM data_sources WHERE id = ?'),

      // Authentication System - Users
      getUserById: this.db.prepare('SELECT * FROM users WHERE id = ?'),
      getUserByUsername: this.db.prepare('SELECT * FROM users WHERE username = ?'),
      getAllUsers: this.db.prepare('SELECT id, username, full_name, email, role, created_by, created_at, last_login, is_active, login_attempts, locked_until FROM users ORDER BY created_at DESC'),
      insertUser: this.db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, email, role, created_by, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),
      updateUser: this.db.prepare(`
        UPDATE users SET 
          full_name = ?, 
          email = ?, 
          is_active = ?
        WHERE id = ?
      `),
      updateUserLoginAttempts: this.db.prepare(`
        UPDATE users SET 
          login_attempts = ?, 
          locked_until = ?
        WHERE id = ?
      `),
      updateUserLastLogin: this.db.prepare(`
        UPDATE users SET
          last_login = strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'),
          login_attempts = 0,
          locked_until = NULL
        WHERE id = ?
      `),
      deleteUser: this.db.prepare('DELETE FROM users WHERE id = ?'),

      // Authentication System - Audit Logs
      insertAuditLog: this.db.prepare(`
        INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `),
      getAuditLogs: this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?'),
      getAuditLogsByUser: this.db.prepare('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?'),

      // Authentication System - Sessions
      getSessionByUserId: this.db.prepare('SELECT * FROM sessions WHERE user_id = ? AND is_active = 1'),
      getSessionById: this.db.prepare('SELECT * FROM sessions WHERE id = ?'),
      insertSession: this.db.prepare(`
        INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `),
      updateSessionExpiry: this.db.prepare(`
        UPDATE sessions SET expires_at = ?
        WHERE id = ?
      `),
      invalidateUserSessions: this.db.prepare(`
        UPDATE sessions SET is_active = 0
        WHERE user_id = ?
      `),
      deleteUserSessions: this.db.prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `),
      invalidateSession: this.db.prepare(`
        UPDATE sessions SET is_active = 0
        WHERE id = ?
      `),
      deleteExpiredSessions: this.db.prepare(`
        DELETE FROM sessions 
        WHERE expires_at < datetime('now')
      `),
      getAllSessions: this.db.prepare('SELECT * FROM sessions ORDER BY created_at DESC'),

      // Outgoing Messages
      getAllOutgoingMessages: this.db.prepare('SELECT * FROM outgoing_messages ORDER BY created_at ASC'),
      getPendingOutgoingMessages: this.db.prepare('SELECT * FROM outgoing_messages WHERE status = ? ORDER BY created_at ASC'),
      getOutgoingMessage: this.db.prepare('SELECT * FROM outgoing_messages WHERE id = ?'),
      insertOutgoingMessage: this.db.prepare(`
        INSERT INTO outgoing_messages (recipient, message, type, status, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `),
      updateOutgoingMessageStatus: this.db.prepare(`
        UPDATE outgoing_messages SET status = ?, sent_at = ?, error_message = ?, retry_count = ?
        WHERE id = ?
      `),
      deleteOutgoingMessage: this.db.prepare('DELETE FROM outgoing_messages WHERE id = ?'),
      incrementRetryCount: this.db.prepare(`
        UPDATE outgoing_messages SET retry_count = retry_count + 1
        WHERE id = ?
      `),

      // System Settings (for spam config and other settings)
      getSystemSetting: this.db.prepare('SELECT * FROM system_settings WHERE category = ? AND key = ?'),
      getSystemSettingsByCategory: this.db.prepare('SELECT * FROM system_settings WHERE category = ? ORDER BY key'),
      upsertSystemSetting: this.db.prepare(`
        INSERT INTO system_settings (id, category, key, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(category, key) DO UPDATE SET
          value = excluded.value,
          updated_at = datetime('now')
      `),
      deleteSystemSetting: this.db.prepare('DELETE FROM system_settings WHERE category = ? AND key = ?'),
      deleteSystemSettingsByCategory: this.db.prepare('DELETE FROM system_settings WHERE category = ?'),
    };
  }

  // Helper method to create default admin user (for initial setup)
  async createDefaultAdminUser(username, passwordHash) {
    try {
      const existingUser = this.preparedStatements.getUserByUsername.get(username);
      if (existingUser) {
        console.log('Default admin user already exists');
        return existingUser;
      }

      // Generate UUID for new user
      const userId = this.db.prepare(`
        SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || 
        substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || 
        substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))) as uuid
      `).get().uuid;

      // INSERT INTO users (id, username, password_hash, full_name, email, role, created_by, is_active)
      this.db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, email, role, created_by, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        username,
        passwordHash,
        'System Administrator',
        null,
        'admin', // role = admin for default admin
        null, // created_by is null for first admin
        1 // is_active
      );

      console.log(`✅ Default admin user '${username}' created successfully`);
      return this.preparedStatements.getUserById.get(userId);
    } catch (error) {
      console.error('Error creating default admin user:', error);
      throw error;
    }
  }

  // WhatsApp Status Methods
  getWhatsAppStatus() {
    try {
      const result = this.preparedStatements.getWhatsAppStatus.get();
      return result || null;
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      return null;
    }
  }

  updateWhatsAppStatus(statusData) {
    try {
      const {
        isReady = false,
        isInitializing = false,
        botNumber = null,
        phoneNumber = null,
        botId = null,
        qrData = null,
        lastUpdate = new Date().toISOString(),
        reconnectAttempts = 0
      } = statusData;

      // Sanitize values - ensure they're primitives or null
      const sanitize = (val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'object') {
          // For objects, try to stringify or return null
          try {
            return typeof val === 'string' ? val : JSON.stringify(val);
          } catch {
            return null;
          }
        }
        return String(val);
      };

      // Try update first, if no rows affected, do insert
      const updateResult = this.preparedStatements.updateWhatsAppStatus.run(
        isReady ? 1 : 0,
        isInitializing ? 1 : 0,
        sanitize(botNumber),
        sanitize(phoneNumber),
        sanitize(botId),
        sanitize(qrData),
        lastUpdate,
        reconnectAttempts
      );

      if (updateResult.changes === 0) {
        // No existing record, insert new one
        this.preparedStatements.insertWhatsAppStatus.run(
          isReady ? 1 : 0,
          isInitializing ? 1 : 0,
          sanitize(botNumber),
          sanitize(phoneNumber),
          sanitize(botId),
          sanitize(qrData),
          lastUpdate,
          reconnectAttempts
        );
      }

      return true;
    } catch (error) {
      console.error('Error updating WhatsApp status:', error);
      return false;
    }
  }

  // Get all AI triggers
  getAllAITriggers() {
    try {
      const stmt = this.db.prepare('SELECT * FROM ai_triggers WHERE enabled = 1 ORDER BY prefix ASC');
      return stmt.all() || [];
    } catch (error) {
      console.error('Error getting all AI triggers:', error);
      return [];
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default new DatabaseManager();