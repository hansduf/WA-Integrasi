# 📚 AVEVA PI - Project Analysis

**Date**: November 5, 2025  
**Purpose**: Document actual project structure and functionality

---

## 🏗️ Project Structure

### 3 Main Components

```
avevapi/             Backend API (Node.js + Express)
frontend/            Frontend Dashboard (Next.js 14 + React 18 + TypeScript)
wa/                  WhatsApp Bot (whatsapp-web.js)
```

---

## 🖥️ Backend (avevapi/)

**Technology**: Node.js + Express + ES6 Modules  
**Port**: 8001  
**Entry**: main.js

### Core Features

1. **Plugin System**
   - Located: `core/plugin-loader.js`
   - Auto-discovers plugins from `plugins/` folder
   - Supports: AVEVA PI, MySQL, PostgreSQL, Oracle, Database

2. **Data Source Manager**
   - Located: `core/data-source-manager.js`
   - Manages all database connections
   - Health check monitoring

3. **API Routes**
   - `/api/auth` - Login/logout
   - `/api/users` - User management
   - `/api/security` - Security & audit logs
   - `/api/database` - Database operations
   - `/api/triggers` - Trigger management
   - `/api/messages` - Message handling
   - `/api/data-sources` - Data source CRUD
   - `/api/trigger-groups` - Trigger grouping
   - `/api/ai/chat` - AI chat functionality
   - `/whatsapp/*` - WhatsApp integration
   - `/pi/*` - AVEVA PI queries

4. **Database**
   - SQLite for configuration & metadata
   - Stores: users, connections, triggers, messages, audit logs

5. **Authentication**
   - JWT token (header: Authorization: Bearer <token>)
   - API Key (header: x-api-key)
   - Dual auth middleware for some routes

6. **Middleware**
   - `auth.middleware.js` - JWT validation
   - `dual-auth.middleware.js` - JWT or API Key
   - Helmet - Security headers
   - CORS - Cross-origin handling

### Key Routes

```javascript
POST   /api/auth/login              // Login
POST   /api/auth/logout             // Logout
GET    /api/users                   // List users
POST   /api/users                   // Create user
GET    /api/security/audit-logs     // Audit logs
GET    /api/data-sources            // List connections
POST   /api/data-sources            // Add connection
GET    /api/triggers                // List triggers
POST   /api/triggers                // Create trigger
GET    /api/messages                // Get messages
POST   /api/ai/chat                 // AI chat
GET    /whatsapp/messages           // WhatsApp messages
GET    /whatsapp/contacts           // WhatsApp contacts
POST   /whatsapp/send-message       // Send message
GET    /health                      // Health check
```

---

## 🎨 Frontend (frontend/)

**Technology**: Next.js 14 + React 18 + TypeScript + Tailwind CSS  
**Port**: 3000  
**Structure**: `/src/app` (App Router)

### Pages

1. **Login** (`src/app/login/page.tsx`)
   - Username/password authentication
   - Session management
   - Session expired handling

2. **Home** (`src/app/home/page.tsx`)
   - Protected route
   - Dashboard with multiple tabs
   - User info display
   - Logout functionality

### Dashboard Tabs (src/app/components/home.tsx)

1. **Trigger** (`list triger/`)
   - View/create/edit triggers
   - Trigger status monitoring
   - Trigger execution

2. **Koneksi** (`koneksi/`)
   - List database connections
   - Add/edit/delete connections
   - Test connections
   - Connection details

3. **WhatsApp** (`whatsapp/`)
   - Bot status
   - Message dashboard
   - Contact list
   - Send messages
   - Spam settings

4. **AI** (`ai/`)
   - AI connection status
   - Test AI interface
   - AI trigger configuration
   - Chat functionality

5. **Management** (`management/`)
   - User management
   - Audit logs
   - Security settings

### Key Components

- **AuthContext** - Global auth state (login/logout)
- **ProtectedRoute** - Route protection
- **ToastProvider** - Notifications
- **SessionExpiredModal** - Session handling

### Configuration

- `.env.local` with `BACKEND_URL` and `API_KEY`
- `next.config.js` with API rewrites
- Tailwind CSS configuration
- TypeScript strict mode

---

## 🤖 WhatsApp Bot (wa/)

**Technology**: whatsapp-web.js + Node.js  
**Type**: Client (connects to WhatsApp Web)  
**Main File**: index.js

### Features

1. **Authentication**
   - QR code scanning
   - Local session storage (`.wwebjs_cache/`)
   - Auto-reconnection

2. **Message Handling**
   - Receive messages
   - Pattern matching with AI triggers
   - Send responses

3. **Integration**
   - HTTP calls to backend API
   - Upload/download files
   - Message logging

4. **Configuration**
   - `.env` with `API_BASE_URL`, `BOT_NAME`, etc.
   - Session path configuration
   - Debug logging

---

## 🔗 How They Connect

### Frontend → Backend
```
Frontend (Port 3000)
    ↓ HTTP Request + JWT
Backend API (Port 8001)
    ↓ Query Database/Plugins
Response back to Frontend
```

### WhatsApp → Backend
```
User Message (WhatsApp)
    ↓ whatsapp-web.js
Bot (wa/index.js)
    ↓ HTTP Request + API Key
Backend API (Port 8001)
    ↓ Query Database/Plugins
Bot sends response to WhatsApp
```

---

## 📊 Database

**Type**: SQLite (avevapi/lib/database.js)

### Tables
- `users` - User accounts
- `data_sources` - Database connections config
- `triggers` - Trigger rules
- `messages` - Message logs
- `audit_logs` - Action logs
- `ai_triggers` - AI trigger patterns
- And more...

---

## ⚙️ Configuration

### Backend (avevapi/.env)
```
PORT=8001
API_KEY=universal-api-key-2025
ADMIN_USERNAME=admin
ADMIN_PASSWORD=xxx
NODE_ENV=development
```

### Frontend (frontend/.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_API_KEY=universal-api-key-2025
```

### Bot (wa/.env)
```
API_BASE_URL=http://localhost:8001
BOT_NAME=LearnAI Assistant
SESSION_PATH=./sessions
```

---

## 🔐 Security

- JWT token authentication
- API key for bot access
- Bcrypt password hashing
- CORS policy configuration
- Helmet security headers
- Audit logging

---

## 📖 How to Use

### Start Backend
```bash
cd avevapi
npm install
npm run dev
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### Start Bot
```bash
cd wa
npm install
npm run dev
# Scan QR code
```

### Access
- Frontend: http://localhost:3000
- Backend: http://localhost:8001
- API docs: Check main.js console output

---

## 📋 Available Endpoints

See main.js for complete list. Key ones:

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Data Management
- `GET /api/data-sources` - List connections
- `POST /api/data-sources` - Add connection
- `DELETE /api/data-sources/:id` - Remove connection

### Triggers
- `GET /api/triggers` - List triggers
- `POST /api/triggers` - Create trigger
- `DELETE /api/triggers/:id` - Delete trigger

### Messages
- `GET /api/messages` - Get messages
- `POST /api/messages` - Create message

### WhatsApp
- `GET /whatsapp/messages` - Get messages
- `GET /whatsapp/contacts` - Get contacts
- `POST /whatsapp/send-message` - Send message

### Others
- `GET /health` - Health check
- `GET /api/plugins` - List plugins
- `GET /api/users` - List users
- `GET /api/security/audit-logs` - Audit logs

---

## 🎯 Current Status

✅ **Working Features**
- User authentication
- Database connection management
- Trigger system
- WhatsApp bot integration
- Message management
- Audit logging

⚠️ **Known**
- Uses SQLite (not ideal for production)
- No comprehensive tests
- Basic monitoring

---

## 📝 Notes

- All 3 components run independently
- Can restart one without affecting others
- Backend manages all data/logic
- Frontend is UI layer
- Bot handles WhatsApp interactions
- Plugin system allows easy database type addition

