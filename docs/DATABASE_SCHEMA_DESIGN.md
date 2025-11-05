# Desain Database SQLite - Schema Detail & Tipe Data

**Tanggal:** 6 Oktober 2025
**Dokumen:** Database Schema Design - JSON to SQLite Migration
**Status:** Detailed Schema Specification (Simplified - No Authentication)

---

## 1. ANALISIS STRUKTUR DATA SAAT INI

### **Triggers (triggers.json)**
```json
{
  "behaviors": {
    "trigger_id": {
      "type": "QUERY",
      "api_url": "SELECT TOP 5 * FROM Point WHERE tag = '7AGC-MWSET'",
      "method": "GET",
      "desc": "Description",
      "responsePrefix": "prefix",
      "active": true,
      "dataSourceId": "conn-mfqjhbtc-pc0hp",
      "sample": [],
      "interval": "1h", // optional
      "meta": {
        "created_by": "admin",
        "created_at": "2025-09-26T02:18:47.203Z",
        "updated_at": "2025-09-26T02:18:47.203Z",
        "updated_by": "admin"
      }
    }
  },
  "names": {
    "trigger_name": "trigger_id"
  }
}
```

### **Trigger Groups (trigger-groups.json)**
```json
{
  "groups": {
    "group_id": {
      "id": "group_id",
      "name": "unit7",
      "description": "Group description",
      "executionMode": "parallel",
      "triggers": ["trigger1", "trigger2"],
      "createdAt": "2025-10-01T07:28:09.010Z",
      "updatedAt": "2025-10-01T07:28:09.010Z"
    }
  },
  "names": {
    "group_name": "group_id"
  }
}
```

### **Data Sources (data-sources/*.json)**
```json
{
  "id": "conn-mfqjhbtc-pc0hp",
  "name": "AVEVA PI Server",
  "plugin": "aveva-pi",
  "databaseType": "pi",
  "config": {
    "host": "192.168.1.100",
    "port": 6066,
    "protocol": "http",
    "username": "piuser",
    "password": "encrypted_password"
  },
  "active": true,
  "createdAt": "2025-09-26T02:18:47.203Z",
  "updatedAt": "2025-09-26T02:18:47.203Z"
}
```

### **AI Connections (ai-connection.json)**
```json
{
  "endpoint": "http://127.0.0.1:5000/chat",
  "apiKey": "encrypted_key",
  "enabled": true,
  "lastTested": "2025-10-03T02:23:49.453Z",
  "testStatus": "success"
}
```

### **AVEVA PI Presets (aveva-pi-presets.json)**
```json
{
  "presets": [
    {
      "id": "preset_id",
      "name": "Latest Data",
      "queryTemplate": "SELECT TOP 10 * FROM Point WHERE tag = '{tag}'",
      "variables": ["tag"],
      "isDefault": true,
      "usageCount": 0,
      "createdAt": "2025-09-30T04:00:00.000Z",
      "updatedAt": "2025-09-30T04:00:00.000Z"
    }
  ]
}
```

---

## 2. DATABASE SCHEMA DESIGN - TABEL DETAIL

### **2.1 Tabel Utama (Core Entities)**

#### **data_sources - Koneksi ke External Systems**
```sql
CREATE TABLE data_sources (
  id TEXT PRIMARY KEY, -- conn-mfqjhbtc-pc0hp format
  name TEXT NOT NULL,
  plugin TEXT NOT NULL, -- aveva-pi, mysql, oracle, ai
  database_type TEXT, -- pi, mysql, oracle, postgresql
  config TEXT NOT NULL, -- ENCRYPTED JSON configuration
  connection_status TEXT DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')),
  last_tested_at DATETIME,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  test_error_message TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance
CREATE INDEX idx_data_sources_plugin ON data_sources(plugin);
CREATE INDEX idx_data_sources_active ON data_sources(active);
CREATE INDEX idx_data_sources_status ON data_sources(connection_status);
```

**Tipe Data Rationale:**
- `id`: TEXT PRIMARY KEY - Preserve existing ID format (conn-*), more flexible than INTEGER
- `config`: TEXT (ENCRYPTED JSON) - Sensitive data perlu dienkripsi
- `connection_status`: TEXT with CHECK - Enum validation untuk consistency

#### **triggers - Business Logic Execution**
```sql
CREATE TABLE triggers (
  id TEXT PRIMARY KEY, -- b-1758600133050-kltnvaobd format
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('QUERY', 'COMMAND', 'WEBHOOK', 'AI')),
  description TEXT,
  response_prefix TEXT,
  query_template TEXT, -- SQL query or command template
  config TEXT, -- JSON: additional configuration
  active BOOLEAN DEFAULT 1,
  execution_interval TEXT, -- 1h, 24h, 5m, etc (optional)
  last_executed_at DATETIME,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  average_execution_time_ms REAL,
  data_source_id TEXT REFERENCES data_sources(id) ON DELETE CASCADE,
  group_id TEXT, -- Will reference trigger_groups.id
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance
CREATE INDEX idx_triggers_active ON triggers(active);
CREATE INDEX idx_triggers_type ON triggers(type);
CREATE INDEX idx_triggers_data_source ON triggers(data_source_id);
CREATE INDEX idx_triggers_group ON triggers(group_id);
CREATE INDEX idx_triggers_last_executed ON triggers(last_executed_at);
```

**Tipe Data Rationale:**
- `id`: TEXT PRIMARY KEY - Preserve existing format (b-*timestamp-random)
- `query_template`: TEXT - Store SQL queries, can be large
- `config`: TEXT (JSON) - Flexible configuration storage
- `execution_interval`: TEXT - Human readable (1h, 24h, 5m)
- Performance metrics: execution_count, success_count, etc untuk monitoring
- Version field untuk optimistic locking

#### **trigger_groups - Grouping & Organization**
```sql
CREATE TABLE trigger_groups (
  id TEXT PRIMARY KEY, -- group-1759303689009-8axtsvlfn format
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  execution_mode TEXT DEFAULT 'parallel' CHECK (execution_mode IN ('parallel', 'sequential', 'conditional')),
  execution_order INTEGER DEFAULT 0, -- For sequential execution
  active BOOLEAN DEFAULT 1,
  trigger_count INTEGER DEFAULT 0, -- Cached count for performance
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance
CREATE INDEX idx_trigger_groups_active ON trigger_groups(active);
CREATE INDEX idx_trigger_groups_execution_mode ON trigger_groups(execution_mode);
```

**Tipe Data Rationale:**
- `id`: TEXT PRIMARY KEY - Preserve existing format (group-*timestamp-random)
- `name`: TEXT UNIQUE COLLATE NOCASE - Case-insensitive unique names
- `execution_mode`: TEXT with CHECK - Controlled vocabulary
- `execution_order`: INTEGER - For sequential execution ordering
- `trigger_count`: INTEGER - Cached count to avoid COUNT(*) queries

#### **trigger_group_members - Many-to-Many Relationship**
```sql
CREATE TABLE trigger_group_members (
  group_id TEXT NOT NULL REFERENCES trigger_groups(id) ON DELETE CASCADE,
  trigger_id TEXT NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
  execution_order INTEGER DEFAULT 0, -- Order within group
  active BOOLEAN DEFAULT 1,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER REFERENCES users(id),
  PRIMARY KEY (group_id, trigger_id)
);

-- Indexes untuk performance
CREATE INDEX idx_trigger_group_members_trigger ON trigger_group_members(trigger_id);
CREATE INDEX idx_trigger_group_members_order ON trigger_group_members(group_id, execution_order);
```

**Tipe Data Rationale:**
- Composite PRIMARY KEY - Prevent duplicate memberships
- `execution_order`: INTEGER - Order of execution within group
- CASCADE DELETE - Automatic cleanup when groups/triggers deleted

### **2.2 Tabel Analytics & Monitoring**

#### **trigger_executions - Execution History**
```sql
CREATE TABLE trigger_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id TEXT NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
  group_execution_id TEXT, -- For grouped executions
  execution_mode TEXT CHECK (execution_mode IN ('manual', 'scheduled', 'api', 'webhook')),
  parameters TEXT, -- JSON: execution parameters
  result TEXT, -- JSON: execution result data
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  error_code TEXT,
  data_source_response_time_ms INTEGER,
  bytes_processed INTEGER,
  records_returned INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance dan analytics
CREATE INDEX idx_trigger_executions_trigger ON trigger_executions(trigger_id);
CREATE INDEX idx_trigger_executions_success ON trigger_executions(success);
CREATE INDEX idx_trigger_executions_executed_at ON trigger_executions(executed_at);
CREATE INDEX idx_trigger_executions_mode ON trigger_executions(execution_mode);
CREATE INDEX idx_trigger_executions_group ON trigger_executions(group_execution_id);
```

**Tipe Data Rationale:**
- `id`: INTEGER AUTOINCREMENT - Efficient untuk large datasets
- `parameters/result`: TEXT (JSON) - Store complex execution data
- Performance metrics: execution_time_ms, bytes_processed, etc
- `group_execution_id`: TEXT - Correlate grouped executions
- Comprehensive indexing untuk analytics queries

#### **data_source_tests - Connection Monitoring**
```sql
CREATE TABLE data_source_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_source_id TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  test_type TEXT CHECK (test_type IN ('connection', 'query', 'full')),
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  error_code TEXT,
  tested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tested_by INTEGER REFERENCES users(id)
);

-- Indexes untuk monitoring
CREATE INDEX idx_data_source_tests_data_source ON data_source_tests(data_source_id);
CREATE INDEX idx_data_source_tests_success ON data_source_tests(success);
CREATE INDEX idx_data_source_tests_tested_at ON data_source_tests(tested_at);
```

**Tipe Data Rationale:**
- Track connection health over time
- Performance monitoring untuk data sources
- Support different test types (connection, query, full)

### **2.3 Tabel Configuration & Templates**

#### **aveva_pi_presets - Query Templates**
```sql
CREATE TABLE aveva_pi_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  query_template TEXT NOT NULL,
  variables TEXT, -- JSON array: ["tag", "start_time"]
  category TEXT DEFAULT 'custom' CHECK (category IN ('time', 'recent', 'custom', 'advanced')),
  is_default BOOLEAN DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance
CREATE INDEX idx_aveva_pi_presets_category ON aveva_pi_presets(category);
CREATE INDEX idx_aveva_pi_presets_default ON aveva_pi_presets(is_default);
CREATE INDEX idx_aveva_pi_presets_usage ON aveva_pi_presets(usage_count DESC);
```

**Tipe Data Rationale:**
- `variables`: TEXT (JSON array) - Store template variables
- `category`: TEXT with CHECK - Organize presets by type
- `usage_count`: INTEGER - Track popular presets
- Support user-specific and global presets

#### **ai_connections - AI Service Configuration**
```sql
CREATE TABLE ai_connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  api_key_hash TEXT, -- Hashed API key for security
  model TEXT, -- GPT-4, Claude, etc
  enabled BOOLEAN DEFAULT 1,
  connection_status TEXT DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')),
  last_tested_at DATETIME,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  test_error_message TEXT,
  request_count INTEGER DEFAULT 0,
  token_usage INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance
CREATE INDEX idx_ai_connections_enabled ON ai_connections(enabled);
CREATE INDEX idx_ai_connections_status ON ai_connections(connection_status);
```

**Tipe Data Rationale:**
- `api_key_hash`: TEXT - Store hashed keys, not plain text
- Usage tracking: request_count, token_usage untuk cost monitoring
- Connection health monitoring

### **2.4 Tabel System & Audit**

#### **audit_log - Complete Change Tracking**
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'LOGIN', 'LOGOUT')),
  entity_type TEXT NOT NULL, -- trigger, data_source, user, etc
  entity_id TEXT NOT NULL,
  old_values TEXT, -- JSON: before change
  new_values TEXT, -- JSON: after change
  changes TEXT, -- JSON: diff of what changed
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  transaction_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk audit queries
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_transaction ON audit_log(transaction_id);
```

**Tipe Data Rationale:**
- Complete audit trail untuk compliance
- `old_values/new_values`: TEXT (JSON) - Full before/after state
- `changes`: TEXT (JSON) - Minimal diff for performance
- `transaction_id`: TEXT - Correlate related changes

#### **system_settings - Application Configuration**
```sql
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  category TEXT DEFAULT 'general',
  is_encrypted BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_system_settings_category ON system_settings(category);
```

**Tipe Data Rationale:**
- Flexible key-value configuration storage
- Type safety dengan value_type
- Encryption support untuk sensitive settings

#### **scheduled_tasks - Background Job Management**
```sql
CREATE TABLE scheduled_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('trigger_execution', 'data_backup', 'health_check', 'report_generation')),
  schedule TEXT NOT NULL, -- Cron expression
  config TEXT, -- JSON: task-specific configuration
  active BOOLEAN DEFAULT 1,
  last_run_at DATETIME,
  next_run_at DATETIME,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_scheduled_tasks_active ON scheduled_tasks(active);
CREATE INDEX idx_scheduled_tasks_type ON scheduled_tasks(type);
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at);
```

**Tipe Data Rationale:**
- Background job scheduling
- Cron expression support
- Execution tracking dan error handling

---

## 3. RELATIONSHIPS & CONSTRAINTS

### **Foreign Key Relationships:**
```
data_sources (1) ──── (many) triggers

trigger_groups (1) ──── (many) trigger_group_members (many) ──── (1) triggers

triggers (1) ──── (many) trigger_executions
data_sources (1) ──── (many) data_source_tests
```

### **Data Integrity Constraints:**
- **CASCADE DELETE**: Automatic cleanup of related records
- **CHECK CONSTRAINTS**: Data validation at database level
- **UNIQUE CONSTRAINTS**: Prevent duplicate data
- **NOT NULL**: Required fields enforcement

---

## 4. INDEXING STRATEGY - PERFORMANCE OPTIMIZATION

### **Primary Access Patterns:**
1. **Dashboard**: Active triggers → `idx_triggers_active`
2. **Execution History**: Recent executions by trigger → `idx_trigger_executions_trigger_executed_at`
3. **Group Management**: Triggers in group → `idx_trigger_group_members_group`
4. **Audit**: Changes by entity → `idx_audit_log_entity_created_at`
5. **Monitoring**: Failed executions → `idx_trigger_executions_success`

### **Composite Indexes untuk Complex Queries:**
```sql
-- Dashboard queries
CREATE INDEX idx_triggers_dashboard ON triggers(active, updated_at DESC);

-- Analytics queries
CREATE INDEX idx_executions_analytics ON trigger_executions(trigger_id, executed_at DESC, success);

-- Group execution
CREATE INDEX idx_group_execution ON trigger_group_members(group_id, execution_order, active);
```

---

## 5. DATA TYPES OPTIMIZATION

### **SQLite Type Affinity:**
- **INTEGER**: Row IDs, counts, boolean (0/1), timestamps (Unix epoch)
- **REAL**: Floating point numbers, averages, percentages
- **TEXT**: Strings, JSON data, long text content
- **BLOB**: Binary data (encrypted content, files)

### **Size Considerations:**
- **Triggers**: ~1000 records → Small table, optimize for reads
- **Executions**: ~100k+ records → Large table, optimize for time-based queries
- **Audit Log**: ~10k+ records → Retention policy needed

---

## 6. MIGRATION DATA TYPES MAPPING

### **From JSON to SQLite Types:**

| JSON Type | SQLite Type | Example | Rationale |
|-----------|-------------|---------|-----------|
| `string` | `TEXT` | `"trigger_name"` | Flexible text storage |
| `number` | `INTEGER/REAL` | `123, 45.67` | Precise numeric storage |
| `boolean` | `INTEGER` | `0/1` | SQLite boolean affinity |
| `object` | `TEXT (JSON)` | `"{\"key\":\"value\"}"` | Store complex structures |
| `array` | `TEXT (JSON)` | `"[\"item1\",\"item2\"]"` | Store lists as JSON |
| `Date` | `DATETIME` | `"2025-10-06T10:30:00Z"` | ISO 8601 timestamps |

### **Special Handling:**
- **Encrypted Fields**: `config` in data_sources → Store as encrypted TEXT
- **Large JSON**: `result` in executions → Consider compression for large responses
- **Timestamps**: Convert to ISO 8601 format for consistency

---

## 7. PERFORMANCE EXPECTATIONS

### **Query Performance (Estimated):**

| Operation | JSON (Current) | SQLite (New) | Improvement |
|-----------|----------------|--------------|-------------|
| Get trigger by ID | O(n) scan | O(log n) index | 100-1000x |
| List user triggers | O(n) filter | O(log n) + sort | 50-500x |
| Execution history | O(n) scan | O(log n) range | 200-2000x |
| Group operations | O(n×m) nested | O(log n) joins | 20-200x |
| Search by name | O(n) scan | O(log n) index | 100-1000x |

### **Storage Efficiency:**
- **JSON**: ~2-3x data size (overhead from keys, formatting)
- **SQLite**: ~1.2-1.5x data size (compression, no redundancy)
- **Indexes**: Additional ~0.5x size but 10-100x query performance

---

## 8. BACKWARD COMPATIBILITY

### **API Compatibility Layer:**
```javascript
// Legacy JSON API routes maintained during transition
app.get('/api/legacy/triggers', (req, res) => {
  // Convert SQLite results to JSON format
  const triggers = await db.all('SELECT * FROM triggers WHERE user_id = ?', [userId]);
  const jsonFormat = {
    behaviors: Object.fromEntries(triggers.map(t => [t.id, t])),
    names: Object.fromEntries(triggers.map(t => [t.name, t.id]))
  };
  res.json(jsonFormat);
});
```

### **Gradual Migration:**
1. **Week 1-2**: New SQLite writes, JSON reads
2. **Week 3-4**: New SQLite reads, JSON fallback
3. **Week 5-6**: Complete SQLite migration
4. **Week 7-8**: JSON cleanup and optimization

---

## 9. MONITORING & MAINTENANCE

### **Database Maintenance:**
```sql
-- Regular maintenance queries
VACUUM; -- Reclaim space
ANALYZE; -- Update query statistics
REINDEX; -- Rebuild indexes

-- Health monitoring
SELECT 
  name, 
  sql 
FROM sqlite_master 
WHERE type='table';

PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

### **Backup Strategy:**
- **Daily**: Full database backup
- **Hourly**: WAL file backup (Write-Ahead Logging)
- **Real-time**: Replication to standby database

---

## KESIMPULAN SCHEMA DESIGN

**Database ini dirancang untuk:**
✅ **Performance**: 10-1000x faster queries dengan proper indexing  
✅ **Scalability**: Support 100k+ executions dengan efficient storage  
✅ **Data Integrity**: ACID compliance dengan foreign key constraints  
✅ **Auditability**: Complete change tracking untuk compliance  
✅ **Flexibility**: JSON fields untuk complex configurations  
✅ **Security**: Encrypted sensitive data dengan proper access controls  

**Key Design Decisions:**
- **TEXT primary keys**: Preserve existing ID formats for compatibility
- **JSON storage**: Balance structure dengan flexibility
- **Comprehensive indexing**: Optimize untuk common query patterns
- **Audit everywhere**: Complete traceability untuk enterprise requirements

---

*Schema ini dapat diadjust berdasarkan requirements spesifik dan hasil proof-of-concept implementation.*