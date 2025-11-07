# 🚀 AVEVA PI - Universal Data Platform

**Universal Data Platform** yang memungkinkan pengguna mengelola koneksi database, membuat triggers otomatis, dan mengakses data via WhatsApp Bot.

---

## 📋 Dokumentasi

### 🔑 File Penting

| File | Tujuan |
|------|--------|
| **README.md** (ini) | Quick start & overview |
| **ARCHITECTURE_CORRECTED.md** | Arsitektur sistem yang benar |
| **BACKEND_REFACTORING_PLAN.md** | Plan refactoring backend & bot |
| **INSTALLATION.md** | Setup & deployment instructions |

### 📚 Legacy Documentation (Archive)
Dokumentasi lama disimpan di `/archive` folder untuk referensi.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│           HAVIA PI Monorepo                 │
├─────────────────────────────────────────────┤
│                                             │
│  Frontend (Next.js) ← Port 3000             │
│     ↓ calls ↓                               │
│  Backend (avevapi) ← Port 8001 (SERVER)     │
│     ↑ called by ↑                           │
│  Bot WhatsApp ← (CLIENT, no port)           │
│                                             │
└─────────────────────────────────────────────┘
```

**Komponen**:
- **Backend** (avevapi): Express.js server + database connections + triggers
- **Frontend** (frontend): Next.js + React dashboard
- **Bot** (wa): WhatsApp client untuk messaging

---

## 🚀 Quick Start

### 1. Setup Backend
```bash
cd avevapi
npm install
npm start
# Backend runs on http://localhost:8001
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### 3. Setup Bot
```bash
cd wa
npm install
npm start
# Bot connects to backend at localhost:8001
```

**Default Credentials**: Check `INSTALLATION.md`

---

## 📁 Project Structure

```
aveva-pi/
├── avevapi/              ← Backend (Express.js)
│   ├── main.js          ← Entry point
│   ├── config/          ← Configuration
│   ├── routes/          ← API endpoints (modularized)
│   ├── core/            ← Plugin & trigger system
│   ├── middleware/      ← Auth & validation
│   └── data/            ← SQLite database
│
├── frontend/            ← Frontend (Next.js)
│   ├── src/app/         ← Pages
│   ├── src/components/  ← React components
│   └── src/lib/         ← Utilities
│
├── wa/                  ← WhatsApp Bot
│   ├── index.js         ← Bot entry point
│   ├── config/          ← Configuration
│   ├── services/        ← (To be refactored)
│   └── handlers/        ← (To be refactored)
│
└── docs/                ← Additional documentation
```

---

## 🔄 System Flow

### User Login → Query Data Flow

```
1. User opens Frontend (port 3000)
2. User login
   ↓
3. Frontend calls Backend API (port 8001)
   ↓
4. Backend validates JWT token
   ↓
5. Backend returns user data
   ↓
6. Frontend shows dashboard
   ↓
7. User can query via:
   a) Web dashboard (direct call to backend)
   b) WhatsApp (bot calls backend)
```

---

## 🤖 WhatsApp Bot Flow

```
1. WhatsApp message arrives
   ↓
2. Bot receives message
   ↓
3. Bot calls Backend API
   http://localhost:8001/api/messages
   http://localhost:8001/pi/ask
   ↓
4. Backend processes query
   ↓
5. Backend returns data
   ↓
6. Bot sends reply to WhatsApp user
```

---

## ⚙️ Current Work: Refactoring

**Goal**: Clean up & organize codebase untuk production

**What's being done**:
- ✅ Backend: Standardize response format & error handling
- ✅ Bot: Modularize wa/index.js (1507 → 100 lines)
- ✅ API: Create centralized API client for bot
- ✅ Documentation: Clear architecture & refactoring plan

**See**: `BACKEND_REFACTORING_PLAN.md` for details

---

## 🛠️ Tech Stack

| Component | Tech |
|-----------|------|
| **Backend** | Node.js + Express.js + SQLite |
| **Frontend** | Next.js + React + TypeScript + Tailwind CSS |
| **Bot** | Node.js + whatsapp-web.js |
| **Database** | SQLite (main) + External connections (MySQL, PostgreSQL, AVEVA PI, etc) |
| **Auth** | JWT + API Key |

---

## 📚 Documentation Links

- **ARCHITECTURE_CORRECTED.md**: Detailed system architecture
- **BACKEND_REFACTORING_PLAN.md**: Refactoring plan & tasks
- **INSTALLATION.md**: Setup instructions
- **archive/**: Legacy analysis documents

---

## 🤝 Contributing

Before making changes:
1. Check `ARCHITECTURE_CORRECTED.md` for system design
2. Follow `BACKEND_REFACTORING_PLAN.md` for guidelines
3. Test locally before committing
4. Update documentation as needed

---

## 📞 Support

- Backend issues: Check `BACKEND_REFACTORING_PLAN.md` Phase 1 (audit)
- Bot issues: Check `BACKEND_REFACTORING_PLAN.md` Phase 3 (bot refactoring)
- Architecture questions: See `ARCHITECTURE_CORRECTED.md`

---

**Last Updated**: November 7, 2025  
**Status**: Refactoring in progress ✅
