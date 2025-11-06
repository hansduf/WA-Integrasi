# 📚 AVEVA PI - Comprehensive Project Analysis

**Date**: November 6, 2025
**Version**: 2.0 - Complete Architecture & User Flow Documentation
**Purpose**: Complete documentation of project structure, functionality, architecture, and user workflows

---

## � Project Overview

**AVEVA PI** adalah **Universal Data Platform** - sebuah sistem terintegrasi yang memungkinkan pengguna untuk:

- **Mengelola koneksi database** dari berbagai sumber (AVEVA PI, MySQL, PostgreSQL, Oracle, dll)
- **Membuat dan menjalankan triggers** untuk automasi query database
- **Mengintegrasikan WhatsApp Bot** untuk akses data via messaging
- **Menggunakan AI** untuk natural language query processing

**Arsitektur**: Monorepo dengan 3 komponen independent yang saling terintegrasi

```
AVEVA PI Monorepo
├── avevapi/          ← Backend API (Port 8001) - Node.js + Express
├── frontend/         ← Web Dashboard (Port 3000) - Next.js + React + TypeScript  
└── wa/              ← WhatsApp Bot - whatsapp-web.js standalone service
```

---

## 🏗️ Arsitektur Sistem

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIVERSAL DATA PLATFORM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   FRONTEND       │         │    WHATSAPP      │             │
│  │  (Next.js 14)    │         │  BOT (Standalone)│             │
│  │  Port 3000       │         │  whatsapp-web.js │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
│           │ HTTP + JWT                 │ HTTP + API Key        │
│           │                            │                       │
│           └────────────┬───────────────┘                       │
│                        │ (All API calls)                       │
│                        ▼                                       │
│           ┌────────────────────────┐                          │
│           │   BACKEND API          │                          │
│           │  (Express.js)          │                          │
│           │  Port 8001             │                          │
│           └────────┬───────────────┘                          │
│                    │                                          │
│        ┌───────────┼───────────────┐                          │
│        │           │               │                          │
│        ▼           ▼               ▼                          │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐              │
│  │   Plugin   │ │  Trigger   │ │  Database   │              │
│  │  System    │ │  Engine    │ │  (SQLite)   │              │
│  │ (AVEVA PI, │ │ (Automtion)│ │ (Config &   │              │
│  │  MySQL,    │ │            │ │  Metadata)  │              │
│  │  PostgreSQL│ │            │ │             │              │
│  │  Oracle)   │ │            │ │             │              │
│  └────────────┘ └────────────┘ └─────────────┘              │
│                    │                                         │
│        ┌───────────┴───────────┐                            │
│        ▼                       ▼                            │
│  ┌─────────────────┐   ┌──────────────────┐               │
│  │  External       │   │  External        │               │
│  │  Databases      │   │  Data Sources    │               │
│  │ (MySQL, PSQL,   │   │ (AVEVA PI, APIs, │               │
│  │  Oracle, etc)   │   │  File Systems)   │               │
│  └─────────────────┘   └──────────────────┘               │
│                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Project Structure

### Directory Structure

```
avevapi/
├── main.js                          ← Entry point
├── config/
│   └── index.js                     ← Configuration management
├── core/                            ← Core systems
│   ├── plugin-loader.js             ← Plugin discovery & loading
│   ├── data-source-manager.js       ← Database connection management
│   ├── trigger-engine.js            ← Trigger execution engine
│   └── plugin-interface.js          ← Plugin interface definition
├── plugins/                         ← Database plugins
│   ├── ai/                          ← AI integration plugin
│   ├── aveva-pi/                    ← AVEVA PI plugin
│   └── database/                    ← Generic DB plugins (MySQL, PostgreSQL, etc)
├── routes/                          ← API endpoints
│   ├── auth.js                      ← Authentication (login/logout)
│   ├── users.js                     ← User management
│   ├── data-sources.js              ← Data source CRUD & management
│   ├── triggers.js                  ← Trigger CRUD & execution
│   ├── trigger-groups.js            ← Trigger grouping
│   ├── messages.js                  ← Message handling
│   ├── security.js                  ← Audit logs & security
│   ├── ai.js                        ← AI-related endpoints
│   ├── database.js                  ← Direct database queries
│   └── pi_routes.js                 ← AVEVA PI specific endpoints
├── middleware/                      ← Express middleware
│   ├── auth.middleware.js           ← JWT validation
│   └── dual-auth.middleware.js      ← JWT or API Key validation
├── lib/
│   └── database.js                  ← SQLite database manager
├── utils/
│   ├── scheduler.utils.js           ← Scheduled task management
│   ├── audit.utils.js               ← Audit logging
│   └── security.utils.js            ← Security utilities
├── data/                            ← Data storage
│   └── app.db                       ← SQLite database
└── package.json

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← Root layout
│   │   ├── page.tsx                 ← Login page
│   │   ├── home/
│   │   │   └── page.tsx             ← Dashboard page (protected)
│   │   ├── login/
│   │   │   └── page.tsx             ← Login page
│   │   └── components/
│   │       ├── home.tsx             ← Main dashboard (tab manager)
│   │       ├── AuthContext.tsx      ← Auth state management
│   │       ├── ProtectedRoute.tsx   ← Route protection wrapper
│   │       ├── list\ triger/        ← Trigger management UI
│   │       ├── koneksi/             ← Connection management UI
│   │       ├── whatsapp/            ← WhatsApp configuration UI
│   │       ├── ai/                  ← AI configuration UI
│   │       ├── management/          ← User & security management UI
│   │       └── ui/                  ← Reusable UI components
│   ├── lib/
│   │   └── api.ts                   ← API client utilities
│   ├── styles/
│   │   └── globals.css              ← Global styles
│   └── types/
│       └── *.ts                     ← TypeScript type definitions
├── public/                          ← Static assets
├── next.config.js                   ← Next.js configuration
├── tsconfig.json                    ← TypeScript configuration
├── tailwind.config.ts               ← Tailwind CSS configuration
└── package.json

wa/
├── index.js                         ← Entry point
├── .env                             ← Environment config
└── package.json
```

---

## 🖥️ Backend (avevapi/)

**Technology**: Node.js + Express + ES6 Modules
**Port**: 8001 (default)
**Database**: SQLite (better-sqlite3)
**Entry**: `main.js`

### Core Systems

#### 1. **Plugin System** (`core/plugin-loader.js`)

Sistem plugin yang dapat mendeteksi dan memuat plugin dari folder `plugins/` secara otomatis.

**Supported Plugins:**

- **AVEVA PI** - Query AVEVA PI data servers
- **AI** - Natural language processing & AI integration
- **Database** - Generic database plugins (MySQL, PostgreSQL, Oracle, etc.)

**How it works:**

- Setiap plugin adalah folder dengan file `index.js` yang export Plugin class
- Auto-discovered dari `plugins/` folder
- Lazy-loaded saat diperlukan
- Managed oleh `dataSourceManager`

#### 2. **Data Source Manager** (`core/data-source-manager.js`)

Mengelola semua koneksi database dan data sources.

**Responsibilities:**

- Create, read, update, delete data source connections
- Test connection validity
- Maintain connection status (connected/disconnected/error)
- Health check monitoring (30-second interval)
- Sensitive data masking (passwords, tokens, etc.)
- Plugin instantiation & lifecycle management

**Data Source Properties:**

```javascript
{
  id: string,                    // Unique ID (e.g., "ds-1234567890-abc123")
  name: string,                  // Human-readable name (e.g., "Production PI Server")
  plugin: string,                // Plugin type (e.g., "aveva-pi", "mysql", "ai")
  database_type: string,         // Database type (e.g., "AVEVA PI", "MySQL")
  config: object,                // Plugin-specific configuration (passwords masked)
  connection_status: string,     // 'connected' | 'disconnected' | 'error' | 'unknown'
  active: boolean,               // Is this data source enabled?
  test_status: string,           // 'success' | 'failed' | 'pending'
  created_at: datetime,
  updated_at: datetime
}
```

#### 3. **Trigger Engine** (`core/trigger-engine.js`)

Sistem automasi yang menjalankan trigger berdasarkan kondisi.

**Trigger Types:**

- **Query Trigger**: Execute predefined database query
- **API Trigger**: Call external API and return response
- **Composite Trigger**: Chain multiple triggers together

**Trigger Properties:**

```javascript
{
  id: string,                    // Unique ID
  name: string,                  // Trigger name
  type: string,                  // 'query' | 'api' | 'composite'
  config: object,                // Type-specific configuration
  active: boolean,               // Is trigger enabled?
  dataSourceId: string,          // Which data source to use
  created_at: datetime,
  updated_at: datetime
}
```

**Example: Query Trigger Config**

```javascript
{
  type: 'query',
  query: 'SELECT * FROM sensors WHERE value > 100',
  format: 'json',               // Response format
  limit: 100                     // Max results
}
```

#### 4. **Database (SQLite)**

Menyimpan semua konfigurasi, metadata, dan logs.

**Tables:**

- `users` - User accounts & authentication
- `data_sources` - Database connection configurations
- `triggers` - Trigger definitions & rules
- `trigger_groups` - Grouping multiple triggers
- `trigger_group_members` - Mapping between groups and triggers
- `ai_triggers` - AI trigger patterns (prefix → action mapping)
- `messages` - Message history & logs
- `audit_logs` - User action audit trail
- `whatsapp_status` - WhatsApp bot status & metadata

#### 5. **Authentication & Security**

**Auth Methods:**

1. **JWT Token Authentication** (for Frontend)

   - Header: `Authorization: Bearer <token>`
   - Token generated at login
   - Validated by `auth.middleware.js`
2. **API Key Authentication** (for Bot & External Services)

   - Header: `x-api-key: <api-key>`
   - Universal API key stored in `.env`
   - Validated by `dual-auth.middleware.js`

**Security Features:**

- Helmet.js for security headers
- CORS configuration (allowed origins)
- Password hashing with bcrypt
- Sensitive data masking in API responses
- Comprehensive audit logging

### API Routes & Endpoints

#### Authentication

```
POST   /api/auth/login              Login with username/password
POST   /api/auth/logout             Logout (invalidate token)
```

#### Data Sources (Connection Management)

```
GET    /api/data-sources            List all connections
POST   /api/data-sources            Create new connection
GET    /api/data-sources/:id        Get connection details
PUT    /api/data-sources/:id        Update connection
DELETE /api/data-sources/:id        Delete connection
POST   /api/data-sources/:id/test   Test connection validity
GET    /api/data-sources/:id/health Check connection health
GET    /api/data-sources/health     Get all connections health status
```

#### Triggers (Automation Rules)

```
GET    /api/triggers                List all triggers
POST   /api/triggers                Create trigger
GET    /api/triggers/:id            Get trigger details
PUT    /api/triggers/:id            Update trigger
DELETE /api/triggers/:id            Delete trigger
POST   /api/triggers/:id/execute    Execute trigger manually
POST   /api/triggers/execute-by-name Execute trigger by name
```

#### Trigger Groups

```
GET    /api/trigger-groups          List all trigger groups
POST   /api/trigger-groups          Create group
GET    /api/trigger-groups/:id      Get group details
PUT    /api/trigger-groups/:id      Update group
DELETE /api/trigger-groups/:id      Delete group
POST   /api/trigger-groups/:id/execute Execute all triggers in group
```

#### Users Management

```
GET    /api/users                   List all users
POST   /api/users                   Create user
GET    /api/users/:id               Get user details
PUT    /api/users/:id               Update user
DELETE /api/users/:id               Delete user
```

#### Security & Audit

```
GET    /api/security/audit-logs     Get audit log entries
GET    /api/security/overview       Security overview (stats)
```

#### Messages

```
GET    /api/messages                List messages
POST   /api/messages                Store message
GET    /api/messages/:id            Get message details
```

#### AI Integration

```
GET    /api/ai/triggers             List AI trigger patterns
POST   /api/ai/triggers             Create AI trigger pattern
PUT    /api/ai/triggers/:id         Update AI trigger pattern
DELETE /api/ai/triggers/:id         Delete AI trigger pattern
POST   /api/ai/chat                 Chat with AI
```

#### Database Queries

```
POST   /api/database/query          Execute raw database query
GET    /api/database/tables         List tables in data source
GET    /api/database/schema/:table  Get table schema
```

#### WhatsApp Integration

```
GET    /whatsapp/status             Bot connection status
GET    /whatsapp/messages           Get message history
GET    /whatsapp/contacts           Get contact list
POST   /whatsapp/send-message       Send message
GET    /whatsapp/qr                 Get QR code for authentication
POST   /api/wa/spam/config          WhatsApp spam filter config
```

#### AVEVA PI Specific

```
GET    /pi/ask                      Query AVEVA PI data
POST   /pi/upload                   Upload files to PI
GET    /pi/attributes               Get PI attributes
GET    /pi/servers                  List PI servers
```

#### System

```
GET    /health                      Health check
GET    /api/plugins                 List available plugins
```

---

## 🎨 Frontend (frontend/)

**Technology**: Next.js 14 + React 18 + TypeScript + Tailwind CSS v4
**Port**: 3000 (default)
**Framework**: App Router (modern Next.js architecture)
**Build Output**: `.next/` folder

### Authentication Flow

**Login Process:**

1. User akses `http://localhost:3000`
2. Redirected ke `/login` page
3. Input username & password
4. Backend validates → returns JWT token
5. Token stored in secure HTTP-only cookie
6. Redirected to `/home` dashboard

**Session Management:**

- JWT token stored in HTTP-only cookie (secure)
- Auto-refresh when near expiration
- Session expiry modal when token invalid
- Auto-logout if session expired

### Dashboard Structure

**Main Dashboard Component**: `components/home.tsx`

The dashboard is a **tabbed interface** dengan 5 main sections:

```
┌─────────────────────────────────────────────────────────────┐
│        🎯 Universal Data Platform  [👤 User] [Logout]      │
├─────────────────────────────────────────────────────────────┤
│  [🎯 Trigger] [🔗 Koneksi] [📱 WhatsApp] [🤖 AI] [⚙️ Mgmt]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           ┌─ Active Tab Content ─┐                          │
│           │                      │                          │
│           │                      │                          │
│           └──────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tab 1: 🎯 Trigger (Automation Rules)

**Location**: `components/list\ triger/list\ triger.tsx`

**Purpose**: Manage database query automation triggers

**Features:**

- ✅ View all triggers
- ✅ Create new trigger with configuration
- ✅ Edit existing trigger
- ✅ Enable/disable trigger
- ✅ Delete trigger
- ✅ Execute trigger manually
- ✅ View trigger execution history
- ✅ Filter by data source

**Trigger Types Available:**

1. **Query Trigger**: Run predefined SQL/database query
2. **API Trigger**: Call external API endpoint
3. **Composite Trigger**: Chain multiple triggers

**UI Components:**

- Trigger list table with status indicators
- Create button opens modal form
- Edit button for modifying trigger config
- Action buttons (enable/disable/execute/delete)
- Status badge (Active/Inactive)
- Last executed timestamp

**Example Workflow - Create Query Trigger:**

1. Click "Create New Trigger"
2. Select data source (e.g., "Production MySQL")
3. Enter trigger name (e.g., "Daily Sales Report")
4. Select type: "Query"
5. Enter SQL: `SELECT SUM(amount) FROM sales WHERE date >= NOW() - INTERVAL 7 DAY`
6. Set response format: JSON
7. Set result limit: 100
8. Click Save
9. Trigger now available for manual or scheduled execution

### Tab 2: 🔗 Koneksi (Database Connections)

**Location**: `components/koneksi/list\ koneksi.tsx`

**Purpose**: Manage database connections and data sources

**Features:**

- ✅ View all database connections
- ✅ Create new connection (MySQL, PostgreSQL, Oracle, AVEVA PI, etc.)
- ✅ Edit connection settings
- ✅ Test connection validity
- ✅ View connection status (connected/disconnected/error)
- ✅ Delete connection
- ✅ View connection details (masked sensitive data)
- ✅ Monitor connection health
- ✅ View count of triggers using this connection

**Supported Database Types:**

- MySQL
- PostgreSQL
- Oracle
- AVEVA PI
- Generic databases

**UI Components:**

- Connection list with status indicators (green/red/yellow)
- Create button opens connection form
- Connection card showing: name, type, status, trigger count
- Test button to validate connection
- Action buttons (edit/delete/details)
- Health indicator with last tested time

**Connection Configuration Example - MySQL:**

```javascript
{
  name: "Production Database",
  type: "mysql",
  config: {
    host: "db.production.com",
    port: 3306,
    username: "appuser",
    password: "••••••••",        // Masked in UI
    database: "sales_db",
    pool_size: 10
  }
}
```

**Connection Configuration Example - AVEVA PI:**

```javascript
{
  name: "PI Server Production",
  type: "aveva-pi",
  config: {
    server: "10.0.0.5",
    port: 443,
    username: "piuser",
    password: "••••••••",        // Masked in UI
    domain: "ENGINEERING"
  }
}
```

### Tab 3: 📱 WhatsApp (Bot Configuration)

**Location**: `components/whatsapp/WhatsAppHub.tsx`

**Purpose**: Configure and manage WhatsApp bot integration

**Features:**

- ✅ View bot connection status (connected/disconnected/initializing)
- ✅ Display bot phone number when connected
- ✅ Show QR code for bot authentication (first time setup)
- ✅ View recent messages from WhatsApp users
- ✅ View contact list
- ✅ Configure spam filter settings (rate limiting)
- ✅ Test bot functionality
- ✅ View bot statistics (messages sent/received)

**Bot Status States:**

- 🟢 **Connected**: Bot is online and ready to receive messages
- 🔴 **Disconnected**: Bot is offline
- 🟡 **Initializing**: Bot is starting up
- ⚠️ **Error**: Connection failed with error message

**Spam Filter Configuration:**
Users can configure:

- Max messages per minute (rate limit)
- Max messages per hour
- Block certain contacts
- Auto-response settings

**UI Components:**

- Status card showing connection state
- QR code display for authentication
- Recent messages list
- Contact management
- Configuration panel for spam filters
- Test message button
- Statistics dashboard

**Important**: WhatsApp bot runs as standalone service in `wa/` folder. Frontend only shows status & configuration.

### Tab 4: 🤖 AI (AI Integration & Triggers)

**Location**: `components/ai/AIHub.tsx`

**Purpose**: Manage AI integration and natural language processing

**Features:**

- ✅ View AI connection status
- ✅ Create AI trigger patterns (prefix-based)
- ✅ Configure AI behavior and responses
- ✅ Test AI with sample queries
- ✅ View AI trigger usage statistics
- ✅ Enable/disable AI processing
- ✅ Set AI response templates

**AI Trigger Patterns:**
AI triggers use **prefix matching** to detect user intent in WhatsApp messages.

**Example AI Trigger Patterns:**

```javascript
{
  prefix: "sales",
  name: "Sales Report Query",
  description: "Get sales data from database",
  trigger: {
    type: "query",
    dataSourceId: "ds-mysql-prod",
    query: "SELECT SUM(amount) FROM sales WHERE date >= NOW() - INTERVAL 7 DAY"
  }
},
{
  prefix: "inventory",
  name: "Inventory Status",
  description: "Check current inventory levels",
  trigger: {
    type: "query",
    dataSourceId: "ds-havia-pi",
    query: "SELECT * FROM inventory WHERE stock < reorder_level"
  }
}
```

**How AI Triggers Work:**

1. User sends WhatsApp message: "sales report please"
2. Bot detects prefix "sales" in message
3. Bot executes associated trigger
4. Trigger queries database
5. Results formatted and sent back to user

**UI Components:**

- AI status card (connected/disconnected)
- AI trigger patterns list
- Create/edit AI trigger modal
- Prefix input field
- Trigger association selector
- Usage statistics chart
- Test input field with sample queries

### Tab 5: ⚙️ Management (User & Security)

**Location**: `components/management/ManagementHub.tsx`

**Purpose**: User management and security settings

**Features:**

- ✅ List all users
- ✅ Create new user (admin only)
- ✅ Edit user details (name, email, role)
- ✅ Delete user (admin only)
- ✅ View audit logs (all system actions)
- ✅ Filter audit logs by date/user/action
- ✅ Export audit logs
- ✅ View security overview

**User Management:**

- Display all system users
- User details: username, email, full name, created date
- User role/permissions
- Last login timestamp
- Account status (active/inactive)

**Audit Logs:**
Comprehensive logging of all system actions:

- User login/logout
- Data source created/updated/deleted
- Trigger created/updated/deleted/executed
- Messages sent/received
- Configuration changes
- Failed security checks

**Audit Log Entry Example:**

```javascript
{
  timestamp: "2025-11-06 14:32:45",
  user: "admin",
  action: "trigger_executed",
  resource: "Daily Sales Report",
  status: "success",
  details: "Executed query trigger, returned 250 rows",
  ip_address: "192.168.1.100",
  user_agent: "Mozilla/5.0..."
}
```

**UI Components:**

- Users tab with user list table
- Create user button → modal form
- Edit/delete buttons for each user
- Audit logs tab with filterable table
- Date range filter
- User filter dropdown
- Action filter dropdown
- Export CSV button
- Security overview card (login attempts, failed logins, etc.)

---

### Global Components

#### AuthContext (`AuthContext.tsx`)

Global authentication state management:

- Current logged-in user
- JWT token
- Login function
- Logout function
- Token refresh logic

#### ProtectedRoute (`ProtectedRoute.tsx`)

Route protection wrapper:

- Checks if user is authenticated
- Redirects to login if not
- Displays loading state while checking auth
- Prevents access to protected routes

#### ToastProvider

Notification system:

- Success messages
- Error messages
- Info messages
- Warning messages
- Auto-dismiss after timeout

### Configuration

**Environment Variables** (`.env.local`):

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_API_KEY=universal-api-key-2025
```

**Build Configuration**:

- TypeScript strict mode enabled
- Next.js App Router
- Tailwind CSS v4
- SWC compiler

**API Base URL**:

- Development: `http://localhost:8001`
- Production: Environment-specific URL

---

## 🤖 WhatsApp Bot (wa/)

**Technology**: whatsapp-web.js + Node.js (CommonJS)
**Type**: Standalone service (connects to WhatsApp Web)
**Entry**: `index.js`
**Session Storage**: `.wwebjs_cache/` (local session management)

### How WhatsApp Bot Works

WhatsApp Bot adalah **standalone service** yang:

1. Connects ke WhatsApp Web (via whatsapp-web.js library)
2. Listens untuk incoming messages
3. Matches messages dengan AI trigger patterns
4. Executes corresponding database queries
5. Sends response kembali ke user via WhatsApp

**Important**: Bot jalan sebagai service terpisah, bukan bagian dari Node.js cluster. Bisa restart tanpa affect backend/frontend.

### Bot Workflow

```
WhatsApp User sends message
        ↓
Bot receives message (whatsapp-web.js)
        ↓
Check spam/rate limit filters
        ↓
Match message with AI trigger patterns (prefix matching)
        ↓
Found matching trigger?
    ├─ YES → Execute trigger
    │         ├─ Call backend API
    │         ├─ Execute database query/API call
    │         ├─ Get results
    │         └─ Format response
    │
    └─ NO → Send "I don't understand" message
            or AI processing if enabled
        ↓
Send response to WhatsApp user
        ↓
Log message in database
        ↓
Update statistics
```

### Authentication

**WhatsApp Authentication Flow:**

1. **First Time Setup**:

   - Start bot: `npm run dev`
   - QR code displayed in terminal
   - User scans QR code dengan WhatsApp app
   - Bot authenticates dengan WhatsApp Web session
   - Session saved ke `.wwebjs_cache/` folder
   - Bot ready to receive messages
2. **Subsequent Startups**:

   - Bot loads saved session dari `.wwebjs_cache/`
   - Auto-connects to WhatsApp Web
   - No QR code needed (unless session expired)

**Connection Status**:

- Stored in database table `whatsapp_status`
- Accessible via `/api/whatsapp/status` endpoint
- Frontend displays status in WhatsApp tab

### Message Processing

**Message Flow:**

```javascript
// Example: User sends "sales report"
User: "sales report"
    ↓
Bot loads AI triggers dari database
    ↓
Find triggers dengan prefix "sales"
    ↓
Execute AI trigger:
    - Trigger Type: Query
    - Data Source: MySQL Production
    - Query: SELECT SUM(amount) FROM sales WHERE date >= NOW() - INTERVAL 7 DAY
    ↓
Bot sends to backend via HTTP:
    POST /api/triggers/:id/execute
    Headers: x-api-key: universal-api-key-2025
    Body: { params: {} }
    ↓
Backend executes query
    ↓
Returns: [{ total: 1500000 }]
    ↓
Bot formats response:
    "📊 Sales Report\n"
    "Total sales this week: Rp 1.500.000"
    ↓
Bot sends message ke WhatsApp user
    ↓
Message logged in database
```

### Features

#### Message Handling

- ✅ Receive text messages
- ✅ Receive media (images, documents, audio)
- ✅ Send text responses
- ✅ Send formatted messages with images/files
- ✅ Message logging & history
- ✅ Conversation context tracking

#### Automation

- ✅ AI trigger pattern matching (prefix-based)
- ✅ Execute database queries via trigger
- ✅ Call external APIs
- ✅ Chain multiple actions
- ✅ Conditional responses

#### Rate Limiting & Safety

- ✅ Spam filter (max messages per minute/hour)
- ✅ Contact blacklist/whitelist
- ✅ Auto-response templates
- ✅ Error handling & fallback messages
- ✅ Session management

#### Configuration

- ✅ Bot name (customizable)
- ✅ Session path (where to store login session)
- ✅ API base URL (backend API address)
- ✅ API key (for backend authentication)
- ✅ Spam config (rate limits, block lists)
- ✅ AI triggers (database-driven)

### Bot Configuration (`.env`)

```env
# Backend connection
API_BASE_URL=http://localhost:8001
API_KEY=universal-api-key-2025

# Bot settings
BOT_NAME=LearnAI Assistant
SESSION_PATH=./sessions

# Debug/Logging
DEBUG=whatsapp-web.js:*
LOG_LEVEL=info
```

### Example User Conversations

**Scenario 1: Query Database**

```
User:   "sales report"
Bot:    "📊 Sales Report
         Total sales this week: Rp 1.500.000
         Best selling product: Product A (500 units)"

User:   "inventory status"
Bot:    "📦 Inventory Status
         Item A: 150 units (good)
         Item B: 45 units (low - reorder soon)
         Item C: 5 units (critically low)"
```

**Scenario 2: API Call**

```
User:   "weather today"
Bot:    "🌤️ Weather Report
         Location: Jakarta
         Temperature: 28°C
         Humidity: 75%
         Forecast: Partly cloudy"
```

**Scenario 3: Composite Trigger**

```
User:   "daily report"
Bot:    "📋 Daily Report
       
         📊 Sales: Rp 2.000.000
         📦 Inventory: 1,250 units
         👥 New customers: 15
       
         Detailed report: https://..."
```

**Scenario 4: Unknown Command**

```
User:   "hello bot"
Bot:    "👋 Hi there! I didn't understand that command.
       
         Available commands:
         - sales report
         - inventory status
         - daily report
         - help"
```

### Database Integration

Bot mengakses database via HTTP API calls ke backend (tidak direct database connection).

**API Calls yang Bot Make:**

1. **Load AI Triggers** (startup):

   ```
   GET /api/ai/triggers
   Headers: x-api-key: universal-api-key-2025
   Response: List of AI trigger patterns
   ```
2. **Execute Trigger** (when message matches):

   ```
   POST /api/triggers/:id/execute
   Headers: x-api-key: universal-api-key-2025
   Body: { params: { messageText: "sales report" } }
   Response: Query results
   ```
3. **Load Spam Config** (startup):

   ```
   GET /api/wa/spam/config
   Headers: x-api-key: universal-api-key-2025
   Response: Rate limit config
   ```
4. **Log Message** (after sending response):

   ```
   POST /api/messages
   Headers: x-api-key: universal-api-key-2025
   Body: { 
     from: "+6281234567890",
     to: "bot_number",
     text: "sales report",
     response: "📊 Sales Report...",
     timestamp: "2025-11-06T14:32:45Z"
   }
   ```

### Limitations & Considerations

⚠️ **Important Points:**

1. **WhatsApp Rate Limits**

   - WhatsApp limits messages per account
   - Bot cannot send messages too frequently
   - Spam filter prevents abuse
2. **Session Management**

   - Session stored locally in `.wwebjs_cache/`
   - Session expires after ~7 days inactivity
   - Requires QR re-scan if session lost
3. **Reliability**

   - WhatsApp Web API not officially supported
   - Subject to WhatsApp changes/updates
   - May require library updates to maintain compatibility
4. **Message Types**

   - Text messages fully supported
   - Media (images, files) - limited support
   - Reactions, stories, etc. - may not be supported
5. **Number of Chats**

   - Can handle multiple contacts
   - Best performance with <100 active chats
   - Scalability limited by WhatsApp Web

### Running the Bot

**Start Bot:**

```bash
cd wa
npm install
npm run dev
# Scan QR code dengan WhatsApp phone
# Bot ready to receive messages
```

**Stop Bot:**

- Press Ctrl+C in terminal

**Restart Bot:**

- Stop bot
- Start bot again
- Uses saved session (no QR scan needed)

---

## 🔗 How Components Connect

### Data Flow Diagram

```
┌──────────────────┐              ┌─────────────────┐
│   FRONTEND       │◄────JWT──────►│   BACKEND API   │
│   (Port 3000)    │   (Cookies)   │   (Port 8001)   │
│                  │               │                 │
│  Tabs:           │ HTTP Requests │  Routes:        │
│  - Trigger       │ (JSON Body)   │  - Auth         │
│  - Koneksi       │               │  - Triggers     │
│  - WhatsApp      │               │  - Data Sources │
│  - AI            │               │  - Messages     │
│  - Management    │               │  - Users        │
└──────────────────┘               │  - Security     │
       ▲                           │  - AI           │
       │                           │  - WhatsApp     │
       │                           └────┬────────────┘
       │                                │
   (displays)                      (manages)
       │                                │
       │                   ┌────────────┴──────────────┐
       │                   │                           │
       └───────────────────┤      ┌─────────────────┐  │
                           │      │   SQLite DB     │  │
                           ▼      │   (app.db)      │  │
                    ┌────────────┐│                 │  │
                    │  Plugins   ││  Tables:        │  │
                    │ (AVEVA PI, ├┤  - users        │  │
                    │  MySQL,    │ │  - data_sources│  │
                    │  PostgreSQL│ │  - triggers    │  │
                    │  Oracle)   │ │  - messages    │  │
                    └─────┬──────┘ │  - audit_logs  │  │
                          │        │  - ai_triggers │  │
                          │        │  - ...         │  │
                          │        └─────────────────┘  │
                          │                             │
                          ▼                             │
                    ┌──────────────────────┐            │
                    │ External Databases   │            │
                    │ (MySQL, PostgreSQL,  │            │
                    │  Oracle, AVEVA PI, etc)           │
                    └──────────────────────┘            │
                                                        │
┌──────────────────┐                                    │
│   WHATSAPP BOT   │◄───API Key (x-api-key)────────────┘
│   (Standalone)   │
│                  │  HTTP API Calls
│  - Listens       │  - Get AI Triggers
│    messages      │  - Execute Triggers
│  - Matches       │  - Log Messages
│    triggers      │  - Get Spam Config
│  - Executes      │
│    queries       │
└──────────────────┘
         ▲
         │
         │ WhatsApp Web
         │ (Session)
         │
    [External: WhatsApp Servers]
         │
         ▼
┌──────────────────┐
│  WHATSAPP USERS  │
│  (Chat Messages) │
└──────────────────┘
```

### Authentication Flow

**Frontend Login:**

```
1. User input username/password
2. POST /api/auth/login
3. Backend validates credentials
4. Returns JWT token
5. Frontend stores in HTTP-only cookie
6. Frontend sends JWT in Authorization header for subsequent requests
7. Backend validates JWT token
```

**Bot API Calls:**

```
1. Bot loads AI triggers at startup
2. GET /api/ai/triggers with x-api-key header
3. Backend validates API key from .env
4. Returns list of triggers
5. Bot caches triggers in memory
6. When message arrives, executes matching trigger
7. POST /api/triggers/:id/execute with x-api-key header
8. Backend executes query, returns results
```

---

## 📊 System Use Cases

### Use Case 1: Sales Manager Checking Daily Sales

**Frontend User:**

1. Open dashboard → click "Trigger" tab
2. Click "Execute" on "Daily Sales Report" trigger
3. System executes SQL query: `SELECT SUM(amount) FROM sales WHERE date = TODAY()`
4. Results displayed in dashboard
5. Admin logs this action in audit logs

**WhatsApp User:**

1. Send message: "sales report"
2. Bot detects prefix "sales"
3. Executes same trigger via backend API
4. Receives formatted report in WhatsApp

### Use Case 2: Adding New Database Connection

1. Frontend user clicks "Koneksi" tab
2. Clicks "Add Connection"
3. Selects database type: MySQL
4. Fills in host, port, credentials
5. Clicks "Test Connection"
6. System validates connection → success
7. Saves to database
8. Now available for trigger creation

### Use Case 3: Creating AI Trigger for WhatsApp

1. Admin in frontend goes to "AI" tab
2. Clicks "Create AI Trigger"
3. Sets prefix: "inventory"
4. Associates trigger: "Check Inventory Levels"
5. Saves
6. Now when WhatsApp user sends "inventory", bot executes trigger

### Use Case 4: Audit Logging

1. User performs action (create trigger, delete connection, etc.)
2. System automatically logs to audit_logs table
3. Log includes: timestamp, user, action, resource, status, IP address
4. Admin can view logs in Management → Audit Logs tab
5. Can filter by date, user, action type

---

## 🔐 Security Architecture

### Authentication Layers

1. **Frontend ↔ Backend**: JWT Token (HTTP-only cookie)
2. **Bot ↔ Backend**: API Key (x-api-key header)
3. **Backend ↔ Database**: SQLite (local file)

### Sensitive Data Protection

**Data Masking:**

- Database passwords masked in API responses
- API keys masked in UI
- Private keys masked
- User passwords hashed with bcrypt

**Example Response (Data Source Details):**

```javascript
{
  id: "ds-mysql-prod",
  name: "Production Database",
  plugin: "mysql",
  config: {
    host: "db.production.com",
    port: 3306,
    username: "appuser",
    password: "••••••••",      // ← MASKED
    database: "sales_db"
  }
}
```

### Audit Trail

**All actions logged:**

- User authentication (login/logout)
- Data source modifications
- Trigger execution
- Message sending
- Configuration changes
- Failed security checks

### Security Headers (Helmet.js)

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- etc.

---

## 🗄️ Database Schema

### Core Tables

**data_sources** - Database connections

```sql
id (PK)
name
plugin (AVEVA PI | MySQL | PostgreSQL | etc)
database_type
config (JSON, sensitive fields stored encrypted/hashed)
connection_status (connected|disconnected|error|unknown)
last_tested_at
test_status (success|failed|pending)
test_error_message
active (boolean)
created_at
updated_at
```

**triggers** - Automation rules

```sql
id (PK)
name
type (query | api | composite)
config (JSON - type-specific configuration)
active (boolean)
data_source_id (FK)
created_at
updated_at
```

**trigger_groups** - Group multiple triggers

```sql
id (PK)
name
description
execution_mode (parallel | sequential)
created_at
updated_at
```

**trigger_group_members** - Mapping

```sql
id (AI PK)
group_id (FK)
trigger_id (FK)
created_at
```

**ai_triggers** - AI trigger patterns

```sql
id (PK)
type (always 'ai')
prefix (match pattern)
name (display name)
description
enabled (boolean)
usage_count (statistics)
last_used (datetime)
created_at
updated_at
```

**messages** - Message history

```sql
id (PK)
type (incoming | outgoing)
from_number (WhatsApp number)
to_number (Bot number or recipient)
text (message content)
media_url (if media)
status (sent | delivered | read)
trigger_id (if executed trigger)
created_at
```

**audit_logs** - Audit trail

```sql
id (AI PK)
timestamp
user (username)
action (login | create_trigger | delete_datasource | etc)
resource (name of resource affected)
status (success | failed)
details (detailed description)
ip_address
user_agent
```

**users** - User accounts

```sql
id (PK)
username (unique)
password (bcrypt hashed)
email
full_name
role (admin | user)
active (boolean)
created_at
updated_at
```

**whatsapp_status** - Bot status

```sql
id (PK = 1, singleton)
is_ready (boolean)
is_initializing (boolean)
bot_number (phone)
phone_number (linked)
bot_id (WhatsApp ID)
last_activity
```

---

## 📈 System Statistics & Monitoring

### Available Metrics

1. **Connection Health**

   - Active connections
   - Failed connections
   - Connection uptime
2. **Trigger Statistics**

   - Total triggers
   - Active triggers
   - Trigger execution count
   - Most-used triggers
   - Failed executions
3. **Message Statistics**

   - Messages sent/received
   - Average response time
   - Error rate
   - Top contacts
4. **User Activity**

   - Login count
   - Actions performed
   - Failed operations
   - Last activity time
5. **System Health**

   - API uptime
   - Response times
   - Error rates
   - Database size

---

## ✨ Key Features Summary

### ✅ Database Connectivity

- Multi-database support (MySQL, PostgreSQL, Oracle, AVEVA PI)
- Connection management with health checks
- Secure credential storage
- Connection pooling

### ✅ Automation (Triggers)

- Query triggers (execute SQL/queries)
- API triggers (call external APIs)
- Composite triggers (chain multiple actions)
- Scheduled execution support
- Group triggers for batch operations

### ✅ WhatsApp Integration

- Bot messaging capabilities
- AI-powered trigger matching
- Spam filtering & rate limiting
- Message logging & history
- Contact management

### ✅ AI Processing

- Natural language understanding
- Prefix-based pattern matching
- Context-aware responses
- Integration with database queries

### ✅ Security & Audit

- JWT authentication (Frontend)
- API key authentication (Bot)
- Comprehensive audit logging
- Sensitive data masking
- Role-based access control

### ✅ User Interface

- Clean, intuitive dashboard
- Multiple management tabs
- Real-time status monitoring
- Rich configuration forms
- Responsive design

---

## 🎯 Workflow Examples

### Example 1: Complete Sales Report Automation

**Setup (Admin does this):**

1. Frontend → Koneksi tab → Add connection (Production MySQL)
2. Frontend → Trigger tab → Create query trigger
   - Name: "Daily Sales Summary"
   - Type: Query
   - Query: `SELECT SUM(amount) FROM sales WHERE date = CURDATE()`
   - Data source: Production MySQL
3. Frontend → AI tab → Create AI trigger
   - Prefix: "sales"
   - Links to: "Daily Sales Summary" trigger

**Usage:**

- **Web User**: Frontend → Trigger tab → Click "Execute" on Daily Sales Summary
- **WhatsApp User**: Send message "sales" → Bot executes trigger → Receives sales report

### Example 2: Real-Time Inventory Monitoring

**Setup:**

1. Connect to AVEVA PI server
2. Create query trigger to read current inventory levels
3. Create AI trigger with prefix "inventory"
4. Configure whatsapp spam settings

**Usage:**

- Warehouse staff send "inventory" in WhatsApp
- Bot queries AVEVA PI in real-time
- Receives current inventory levels
- Automatically alerts if stock low

### Example 3: Multi-Step Automation

**Setup:**

1. Create Query Trigger #1: Get sales data
2. Create Query Trigger #2: Get inventory data
3. Create Query Trigger #3: Generate summary report
4. Create Trigger Group linking all 3 triggers in sequential mode
5. Create AI trigger linking to trigger group

**Usage:**

- User triggers "daily report" in WhatsApp
- Bot executes all 3 triggers in sequence
- Receives comprehensive daily report

---

## 📝 Notes & Best Practices

### 💡 Tips for Best Usage

1. **Data Source Management**

   - Use descriptive names for connections
   - Test connection before creating triggers
   - Monitor health status regularly
2. **Trigger Design**

   - Keep queries simple and efficient
   - Use appropriate result limits
   - Document trigger purpose in name
3. **AI Triggers**

   - Use short, recognizable prefixes
   - One prefix = one specific action
   - Test with sample messages
4. **WhatsApp Bot**

   - Monitor spam filter settings
   - Keep session alive (at least weekly check)
   - Document available commands for users
5. **Security**

   - Change default admin password
   - Regularly review audit logs
   - Use strong API keys
   - Enable HTTPS in production

### ⚠️ Important Considerations

- **SQLite Limitations**: Good for single-instance, not ideal for high-concurrency
- **WhatsApp Reliability**: Dependent on WhatsApp Web API compatibility
- **Message Rate Limits**: WhatsApp may throttle frequent messages
- **Session Persistence**: WhatsApp session may expire, requiring re-authentication

---

## 📚 Documentation Index

- **INSTALLATION.md** - Complete setup guide (development & production setup instructions)
- **PROJECT_ANALYSIS.md** - This file (architecture, components, features & technical details)
- **.env.example** files - Configuration templates with detailed comments
- **ecosystem.config.js** - PM2 process management configuration template
- **nginx.conf** - Nginx reverse proxy configuration template
