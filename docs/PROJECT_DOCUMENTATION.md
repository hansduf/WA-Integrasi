# AI Chat Integration System

Sistem integrasi AI chat dengan trigger-based prefix detection untuk WhatsApp integration dashboard.

## 📋 **Ringkasan Proyek**

Proyek ini mengembangkan sistem AI chat yang terintegrasi dengan sistem trigger existing. User dapat chat dengan AI menggunakan prefix tertentu, sistem akan mendeteksi trigger dan mengirim query ke company AI API.

### **Fitur Utama**
- 🚧 **AI Chat Integration**: Simple forwarding ke company AI API (dalam development)
- ✅ **Trigger Management**: CRUD operations untuk data triggers
- ✅ **Plugin Architecture**: Modular system untuk extensibility

### **Teknologi**
- **Backend**: Node.js + Express.js dengan simple plugin system
- **Frontend**: Next.js 13+ + TypeScript + Tailwind CSS
- **AI Integration**: Simple HTTP POST ke company API endpoint
- **Storage**: JSON-based untuk triggers dan basic connection config

### **📊 Current Status (Updated: 2025-09-23)**
- ✅ **Technical Discussion**: Completed - Simplified to basic API consumption
- ✅ **AI Frontend**: Completed - All components created in `frontend/`
- ✅ **Directory Structure**: Clarified - `avevapi/` for AI backend, `wa/` for WhatsApp bot
- 📋 **AI Backend Planning**: Completed - Simple forwarding implementation specs for `avevapi/`
- 🚧 **AI Backend Execution**: Ready for implementation in `avevapi/` directory
- 📚 **Documentation**: Updated - Clear directory structure and integration points

## 📁 **Struktur Direktori**

### **Backend Utama (`avevapi/`)** - **DIGUNAKAN UNTUK AI SYSTEM**
```
avevapi/
├── 📁 plugins/          # Plugin folders - AI plugin akan ditambahkan di sini
│   └── 📁 ai/            # AI plugin (dalam development)
├── 📁 routes/           # API endpoints - AI routes akan ditambahkan di sini
│   └── ai.js            # AI endpoints (dalam development)
├── 📁 data-sources/     # File JSON koneksi - AI connection config di sini
│   └── ai-connection.json   # AI connection config
├── 📁 triggers/         # File trigger - AI triggers di sini
│   └── 📁 ai/              # AI triggers folder
├── 📄 main.js           # Entry point server - Plugin loader ada di sini
└── 📁 core/             # Core system dengan plugin-loader.js
```

### **Backend WhatsApp (`wa/`)** - **KHUSUS WHATSAPP BOT**
```
wa/
├── 📄 index.js          # WhatsApp bot entry point (terpisah)
├── 📄 index-minimal.js  # Minimal version
├── 📁 sessions/         # WhatsApp sessions
├── 📁 downloads/        # File downloads
└── 📄 wa-qr.png         # QR code untuk login
```

### **Frontend (`frontend/`)** - **NEXT.JS APP**
```
frontend/
├── 📁 src/
│   └── 📁 app/
│       ├── 📁 components/
│       │   ├── 📁 ai/           # AI components (sudah selesai)
│       │   └── home.tsx         # Main tab navigation (sudah updated)
└── 📄 package.json              # Next.js dependencies
```

## 🔧 **API Endpoints**

### **AI Endpoints (Planned)**
- `POST /api/ai/chat` - AI chat with trigger detection
- `GET /api/ai/triggers` - Get AI triggers
- `POST /api/ai/test-connection` - Test AI connection
- `GET /api/ai/connection-status` - Get AI connection status
- `POST /api/ai/connections` - Save AI connection config
- `GET /api/ai/connections` - Get AI connection config

## 🔧 **Backend Implementation Planning**

### **Backend Architecture Overview**

```
avevapi/                           # Backend utama - DIGUNAKAN UNTUK AI
├── 📁 plugins/
│   └── 📁 ai/
│       ├── 📄 index.js              # Main AI plugin entry point
│       └── 📄 ai-service.js         # Simple AI API service
├── 📁 routes/
│   └── 📄 ai.js                     # AI API routes
├── 📁 data-sources/
│   └── 📄 ai-connection.json        # AI connection config storage
└── 📁 triggers/
    └── 📁 ai/
        └── 📄 ai-triggers.json      # AI trigger definitions

wa/                                # WhatsApp bot - TERPISAH
├── 📄 index.js                     # WhatsApp bot (standalone)
└── 📁 sessions/                    # WhatsApp sessions
```

### **Core Components Implementation**

#### **1. AI Plugin (`plugins/ai/index.js`)**
```javascript
// Simple AI plugin entry point
class AIPlugin {
  constructor() {
    this.name = 'ai';
    this.version = '1.0.0';
    this.aiService = null;
  }

  async init(app, config) {
    this.aiService = new AIService(config);
    
    // Register AI routes
    const aiRoutes = require('../../routes/ai');
    aiRoutes.init(app, this.aiService);
    
    console.log('🤖 AI Plugin initialized');
  }

  async processMessage(message, trigger) {
    // Process AI trigger messages
    if (trigger.type === 'ai') {
      return await this.aiService.processAIRequest(message, trigger);
    }
    return null;
  }
}

module.exports = AIPlugin;
```

#### **2. AI Service (`plugins/ai/ai-service.js`)**
```javascript
// Simple AI API service - just forward to company API
class AIService {
  constructor(config) {
    this.config = config;
    this.httpClient = require('axios');
  }

  async processAIRequest(message, trigger) {
    try {
      // Extract query from message (remove prefix)
      const query = message.replace(trigger.prefix, '').trim();
      
      // Simple request to company API
      const response = await this.httpClient.post(this.config.endpoint, {
        message: query
      }, {
        headers: this.config.apiKey ? {
          'Authorization': `Bearer ${this.config.apiKey}`
        } : {},
        timeout: 30000
      });

      return {
        success: true,
        response: response.data.response || response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testConnection() {
    try {
      // Simple test request
      const response = await this.httpClient.post(this.config.endpoint, {
        message: 'test'
      }, {
        headers: this.config.apiKey ? {
          'Authorization': `Bearer ${this.config.apiKey}`
        } : {},
        timeout: 10000
      });

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = AIService;
```

#### **3. AI Routes (`routes/ai.js`)**
```javascript
// Simple AI API routes
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

let aiService = null;

function init(app, service) {
  aiService = service;
  app.use('/api/ai', router);
}

// POST /api/ai/chat - Process AI chat request
router.post('/chat', async (req, res) => {
  try {
    const { message, triggerId } = req.body;
    
    // Find trigger
    const triggers = await loadAITriggers();
    const trigger = triggers.find(t => t.id === triggerId);
    
    if (!trigger) {
      return res.status(404).json({ error: 'AI trigger not found' });
    }

    // Process with AI service
    const result = await aiService.processAIRequest(message, trigger);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/test-connection - Test AI connection
router.post('/test-connection', async (req, res) => {
  try {
    const result = await aiService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/connection-status - Get connection status
router.get('/connection-status', async (req, res) => {
  try {
    const config = await loadAIConfig();
    const status = config.endpoint ? 'configured' : 'not_configured';
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET/POST /api/ai/connections - Manage AI connections
router.get('/connections', async (req, res) => {
  try {
    const config = await loadAIConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/connections', async (req, res) => {
  try {
    const { endpoint, apiKey } = req.body;
    const config = { 
      endpoint, 
      apiKey: apiKey || '',
      enabled: true,
      lastTested: new Date().toISOString(),
      testStatus: 'pending'
    };
    
    await saveAIConfig(config);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET/POST /api/ai/triggers - Manage AI triggers
router.get('/triggers', async (req, res) => {
  try {
    const triggers = await loadAITriggers();
    res.json(triggers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/triggers', async (req, res) => {
  try {
    const { prefix, name, description } = req.body;
    const triggers = await loadAITriggers();
    
    const newTrigger = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      prefix,
      name: name || 'AI Chat',
      description: description || 'Chat dengan AI',
      enabled: true,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date().toISOString()
    };
    
    triggers.push(newTrigger);
    await saveAITriggers(triggers);
    
    res.json(newTrigger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function loadAIConfig() {
  const configPath = path.join(__dirname, '../data-sources/ai-connection.json');
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { endpoint: '', apiKey: '', enabled: false };
  }
}

async function saveAIConfig(config) {
  const configPath = path.join(__dirname, '../data-sources/ai-connection.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function loadAITriggers() {
  const triggersPath = path.join(__dirname, '../triggers/ai/ai-triggers.json');
  try {
    const data = await fs.readFile(triggersPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveAITriggers(triggers) {
  const triggersPath = path.join(__dirname, '../triggers/ai/ai-triggers.json');
  await fs.mkdir(path.dirname(triggersPath), { recursive: true });
  await fs.writeFile(triggersPath, JSON.stringify(triggers, null, 2));
}

module.exports = { init };
```

### **Data Flow Architecture**

#### **Simple AI Chat Flow:**
```
1. User Message → 2. Trigger Detection → 3. AI Plugin → 4. Company AI API → 5. Response
   ↓                    ↓                    ↓              ↓                    ↓
   "+-= hello"      Find AI trigger      Process via     POST to company       Return AI
                     with prefix "+-="   plugin          API with {message}     response
                                             ↓              endpoint
                                        Extract "hello"
```

#### **Connection Setup Flow:**
```
Frontend Form → API Route → Save to JSON → Test Connection → Response
     ↓              ↓            ↓              ↓            ↓
   User input    /api/ai/     ai-connection.  Call company    Success/error
   (endpoint)    connections  json           API test        message
```

### **Integration Points**

#### **With Existing Plugin System (`avevapi/core/plugin-loader.js`):**
- **Plugin Registration**: AI plugin akan didaftarkan di plugin loader utama
- **Message Processing**: Extend existing message processing pipeline
- **Route Integration**: AI routes akan ditambahkan ke Express app utama

#### **With Existing Trigger System (`avevapi/routes/triggers.js`):**
- **Detection**: Extend trigger detection untuk mendeteksi AI triggers
- **Processing**: AI triggers akan diproses oleh AI plugin
- **Storage**: Gunakan pola storage yang sama dengan triggers existing

#### **With WhatsApp System (`wa/index.js`):**
- **Message Routing**: AI responses akan di-route melalui WhatsApp channels
- **Session Management**: Gunakan existing session handling untuk AI conversations
- **Standalone Operation**: WhatsApp bot berjalan terpisah dari AI system

### **Error Handling Strategy**

#### **API Errors:**
- **Connection Timeout**: Retry 2x with 1 second delay
- **Invalid Endpoint**: Return clear error message
- **API Down**: Return error, let user retry later
- **Invalid Response**: Handle gracefully, return error message

#### **Validation Errors:**
- **Missing Endpoint**: Required field validation
- **Duplicate Prefix**: Check existing triggers before creation
- **Invalid Prefix**: Basic format validation

### **Testing Strategy**

#### **Unit Tests:**
- **AI Service**: Mock HTTP calls to company API
- **Route Handlers**: Test request/response cycles
- **File Operations**: Test JSON read/write

#### **Integration Tests:**
- **End-to-End**: Frontend → Backend → Company API
- **Trigger Detection**: Test prefix matching
- **Connection Testing**: Verify API connectivity

#### **Manual Testing:**
- **Setup Connection**: Test with company API endpoint
- **Create Trigger**: Add prefix, test detection
- **Chat Flow**: Send message with prefix, verify response

### **Deployment Considerations**

#### **Environment Variables:**
```bash
AI_ENDPOINT=http://127.0.0.1:5000/chat
AI_API_KEY=  # optional, kosong jika tidak perlu
```

#### **Health Checks:**
- **API Connectivity**: Test connection on startup
- **Configuration**: Validate endpoint format
- **Plugin Load**: Ensure AI plugin initializes

### **🛠️ Next Steps (Backend Planning Phase)**

## 🎯 **Fitur AI Chat (Dalam Development)**

### **Konsep**
- User chat dengan prefix tertentu (e.g., "+-= berita hari ini")
- Sistem detect trigger AI berdasarkan prefix
- Forward message ke company AI API tanpa complexity
- Return response langsung ke user

### **Flow Kerja**
1. User: "+-= berita hari ini"
2. System: Detect prefix "+-=", extract "berita hari ini"
3. AI: POST {message: "berita hari ini"} ke company API
4. Response: Return AI response langsung

### **Implementasi**
- **AI Plugin**: `avevapi/plugins/ai/` - Simple forwarding ke company API
- **AI Routes**: `avevapi/routes/ai.js` - Basic endpoints tanpa complexity
- **AI Components**: `frontend/src/app/components/ai/` - Sudah selesai
- **AI Tab**: `frontend/src/app/home.tsx` - Sudah updated dengan AI tab
- **Backend Utama**: `avevapi/` - Sistem dengan plugin loader
- **WhatsApp Bot**: `wa/` - Standalone WhatsApp integration (terpisah)

## 🎯 **Development Roadmap & Plan**

### **🚧 Phase 2: AI Chat Integration (IN PROGRESS)**
**Konsep:** Tab AI terpisah dengan sub-tabs untuk koneksi, trigger, dan test. Sistem AI tunggal dengan koneksi configurable.

**Pipeline Implementasi:**
1. **Frontend AI Tab (✅ DONE):**
   - ✅ Tab "🤖 AI" di `home.tsx` sebagai tab utama
   - ✅ `components/ai/AIHub.tsx` - Container dengan sub-tabs (Koneksi, Trigger, Test)
   - ✅ `AIConnectionForm.tsx` - Form simple: endpoint + optional apiKey
   - ✅ `AIConnectionStatus.tsx` - Status koneksi
   - ✅ `AITriggerForm.tsx` - Management triggers (array kosong awal)
   - ✅ `AITestInterface.tsx` - Chat testing interface
   - ✅ **Clean State**: Semua form kosong saat pertama kali

2. **Backend Simple (1 minggu)** - **DI `avevapi/`:**
   - Buat `avevapi/plugins/ai/index.js` - Plugin sederhana
   - Buat `avevapi/plugins/ai/ai-service.js` - Service forward ke company API
   - Buat `avevapi/routes/ai.js` - Endpoints basic
   - Storage di `avevapi/data-sources/ai-connection.json` - Cuma endpoint dan apiKey
   - Register AI plugin di `avevapi/core/plugin-loader.js`

3. **Integration & Testing (1 minggu):**
   - Connect frontend ke backend
   - Test end-to-end: Setup koneksi → Buat trigger → Test chat
   - Basic error handling

**Flow Kerja:**
1. User buka tab AI → Sub-tab Koneksi → Setup company API endpoint → Test koneksi
2. Sub-tab Trigger → Buat trigger dengan prefix (e.g., "+-=")
3. Sub-tab Test → Ketik "+-= berita hari ini" → Sistem detect trigger → POST ke company API → Tampilkan response

**Hasil Diskusi:**
- ✅ **Backend Utama**: `avevapi/` - Sistem lengkap dengan plugin architecture
- ✅ **WhatsApp Bot**: `wa/` - Standalone bot terpisah dari AI system
- ✅ **AI Integration**: Plugin-based di `avevapi/` bukan standalone
- ✅ **Koneksi AI simple**: Cuma endpoint dan optional apiKey
- ✅ **Sistem AI forwarding**: Backend cuma forward ke company API
- ✅ **Company API handle complexity**: Model, temperature, dll di-handle company
- ✅ **Frontend**: Next.js di `frontend/` dengan AI tab sudah selesai

## 💬 **Technical Discussion & Decisions**

### **1. Integration dengan Trigger System**
**Format AI Triggers:**
```json
{
  "id": "ai-001",
  "type": "ai",
  "prefix": "+-=",
  "name": "AI Chat",
  "description": "Chat dengan AI perusahaan",
  "enabled": true,
  "usageCount": 0,
  "lastUsed": null,
  "createdAt": "2025-09-23T10:00:00Z"
}
```
- AI triggers pakai format simple tanpa `aiConfig` complexity
- Storage terpisah tapi terintegrasi dengan trigger system untuk detection logic
- Tidak ada cache management yang kompleks

### **2. AI API Integration**
- **Simple Forwarding**: Backend cuma forward message ke company API
- **Company API**: Handle semua AI complexity (model, temperature, prompts)
- **Request Format**: POST {message: "user query"}
- **Response Format**: Expect {response: "ai answer"} dari company API

### **3. Error Handling & Reliability**
- **Simple Retry**: Retry 2x jika connection fail
- **Clear Messages**: Error messages yang mudah dipahami
- **Graceful Degradation**: Jika AI down, return error message

### **4. Security & Configuration**
- **Simple Storage**: API key (jika ada) di JSON tanpa encryption
- **Basic Validation**: Cek endpoint format dan required fields
- **HTTPS**: Gunakan HTTPS jika company API require

### **5. UI/UX Details**
- **Simple Forms**: Cuma endpoint dan optional apiKey
- **Clear Status**: Connection status yang mudah dipahami
- **Basic Chat**: Simple message input dan response display

### **6. Development Timeline**
- **Simple Backend**: 1 minggu untuk basic forwarding
- **Basic Testing**: Manual testing dengan company API
- **No Complexity**: Fokus ke working solution, bukan perfect architecture

### **7. Future Extensibility**
- **Keep Simple**: Jika perlu complex features, buat system terpisah
- **Company API**: Mereka handle AI complexity, kita cuma consume
- **No Over-engineering**: Fokus ke working solution dulu

### **8. Monitoring & Logging**
- **Basic Logging**: Log AI requests dan errors
- **Simple Metrics**: Count successful/failed requests
- **No Heavy Monitoring**: Keep it simple sesuai kebutuhan

### **9. Rollback Plan**
- **Simple Disable**: Matikan AI plugin jika ada problem
- **Config Backup**: Backup JSON files sebelum changes
- **Easy Revert**: Hapus AI files jika perlu rollback total

### **📊 Current Status (Updated: 2025-09-23)**
- ✅ **Technical Discussion**: Completed - Simplified to basic API consumption
- ✅ **AI Frontend**: Completed - All components created and integrated
- 📋 **AI Backend Planning**: Completed - Simple forwarding implementation specs
- 🚧 **AI Backend Execution**: Ready for implementation (simple approach)
- 📚 **Documentation**: Updated - Simplified specs without over-engineering

### **Data Storage & Formats**

#### **1. AI Connection Configuration (`avevapi/data-sources/ai-connection.json`)**
```json
{
  "endpoint": "http://127.0.0.1:5000/chat",
  "apiKey": "",
  "enabled": true,
  "lastTested": "2025-09-23T10:00:00Z",
  "testStatus": "success"
}
```

#### **2. AI Triggers Storage (`avevapi/triggers/ai/ai-triggers.json`)**
```json
[
  {
    "id": "ai-001",
    "type": "ai",
    "prefix": "+-=",
    "name": "AI Chat",
    "description": "Chat dengan AI perusahaan",
    "enabled": true,
    "usageCount": 0,
    "lastUsed": null,
    "createdAt": "2025-09-23T10:00:00Z"
  }
]
```

**Field Descriptions:**
- `id`: Unique identifier (format: "ai-{timestamp}")
- `type`: Always "ai" for AI triggers
- `prefix`: Trigger prefix (e.g., "+-=", "++", "@ai")
- `name`: Human-readable name
- `description`: Simple description
- `enabled`: Whether this trigger is active
- `usageCount`: Number of times used
- `lastUsed`: Timestamp of last usage
- `createdAt`: Creation timestamp

### **Storage Strategy**

#### **File Organization:**
```
avevapi/                           # Backend utama
├── 📁 data-sources/
│   └── 📄 ai-connection.json       # Single connection config
├── 📁 triggers/
│   └── 📁 ai/
│       ├── 📄 ai-triggers.json     # Array of AI triggers
│       └── 📄 chat-history.json    # Chat history (optional)
└── 📁 archive/
    └── 📄 ai-backup-*.json         # Backup files

wa/                                # WhatsApp bot (terpisah)
└── 📁 sessions/                   # WhatsApp sessions

frontend/                          # Next.js app
└── 📁 src/app/components/ai/      # AI components
```

#### **Data Persistence Rules:**
1. **Atomic Writes**: Use temporary files then rename for atomic updates
2. **Backup on Change**: Create backup before modifying critical files
3. **Validation**: Validate JSON structure before saving
4. **Error Recovery**: Fallback to backup if corruption detected
5. **Size Limits**: Implement rotation for chat history (keep last 1000 entries)

#### **Access Patterns:**
- **Connection Config**: Read frequently, write on config changes
- **AI Triggers**: Read on startup, write on trigger CRUD operations
- **Chat History**: Append-only, with periodic cleanup

### **Migration & Backup**

#### **Version Control:**
```json
// Future: Add version field for migrations
{
  "version": "1.0",
  "data": { /* actual data */ },
  "migratedAt": "2025-09-23T12:00:00Z"
}
```

#### **Backup Strategy:**
- **Automatic**: Backup before any write operation
- **Manual**: Export/import functionality via API
- **Retention**: Keep last 10 backups, auto-cleanup older ones

#### **Phase 3: Backend Implementation Planning (Current)**
1. **✅ Documentation**: Complete detailed backend specs and code examples
2. **📋 Architecture Review**: Final review of `avevapi/` plugin structure and integration points
3. **🔧 Development Setup**: Prepare development environment in `avevapi/` directory
4. **📝 Code Structure**: Plan file organization and dependencies in `avevapi/`

#### **Phase 4: Backend Execution (Next - 1 Week)**
1. **Simple Plugin Development** (di `avevapi/plugins/ai/`):
   - Create `avevapi/plugins/ai/index.js` - Basic plugin entry point
   - Create `avevapi/plugins/ai/ai-service.js` - Simple service to call company API
   - Register AI plugin di `avevapi/core/plugin-loader.js`

2. **Simple Route Implementation** (di `avevapi/routes/`):
   - Create `avevapi/routes/ai.js` - Basic API endpoints
   - Integrate dengan `avevapi/main.js` untuk route registration
   - `/api/ai/chat` - Forward message to company API
   - `/api/ai/test-connection` - Test company API connection
   - `/api/ai/connections` - Save/load endpoint config
   - `/api/ai/triggers` - Basic trigger CRUD

3. **Simple Data Management** (di `avevapi/`):
   - Create `avevapi/data-sources/ai-connection.json` - Just endpoint and apiKey
   - Create `avevapi/triggers/ai/ai-triggers.json` - Simple trigger array
   - No complex validation or caching

4. **Basic Integration Testing**:
   - Test AI plugin loads di `avevapi/main.js`
   - Verify endpoints work dengan company API
   - Test trigger detection integration dengan existing system

#### **Phase 5: Frontend-Backend Integration (Following Week)**
1. **Simple API Integration**: Connect `frontend/` to `avevapi/` backend endpoints
2. **Basic End-to-End Testing**: Test message → trigger detection → company API → response
3. **Simple Error Handling**: Basic error messages and connection status
4. **Manual Testing**: Test real chat flow dengan company API melalui `avevapi/`

#### **Phase 6: Production Deployment**
1. **Simple Environment Setup**: Configure company API endpoint in `avevapi/` production
2. **Basic Security**: Ensure HTTPS for API calls if needed
3. **Basic Monitoring**: Simple logging for AI requests in `avevapi/`
4. **User Testing**: Test with real WhatsApp messages melalui `wa/` bot ke `avevapi/` AI system