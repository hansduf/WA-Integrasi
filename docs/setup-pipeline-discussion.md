# AVEVA-PI Multi-Repository Setup Pipeline

## 📁 Repository Structure
```
AVEVA-PI/
├── avevapi/          # Backend API (Node.js + Express)
├── frontend/         # Frontend App (Next.js + React)
└── wa/              # WhatsApp Bot (Node.js + whatsapp-web.js)
```

## 🚀 Installation Pipeline Options

### Option 1: Sequential Setup (Recommended)
```bash
# 1. Setup Backend First
cd avevapi
npm install
cp .env.example .env  # Configure environment
npm run dev

# 2. Setup Frontend
cd ../frontend
npm install
cp .env.local.example .env.local  # Configure environment
npm run dev

# 3. Setup WhatsApp Bot
cd ../wa
npm install
cp .env.example .env  # Configure environment
npm run dev
```

### Option 2: Parallel Setup (Advanced)
```bash
# Run all setups in parallel using tmux/screen or separate terminals
# Backend Terminal 1
cd avevapi && npm install && npm run dev

# Frontend Terminal 2
cd frontend && npm install && npm run dev

# WhatsApp Bot Terminal 3
cd wa && npm install && npm run dev
```

### Option 3: Docker Compose (Production Ready)
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./avevapi
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  whatsapp-bot:
    build: ./wa
    depends_on:
      - backend
```

## ⚙️ Environment Configuration

### Backend (.env)
```bash
PORT=3001
DATABASE_URL=./data/app.db
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### WhatsApp Bot (.env)
```bash
API_BASE_URL=http://localhost:3001
SESSION_PATH=./sessions
```

## 🔄 Development Workflow

### Git Management
```bash
# Each repo has its own git
cd avevapi && git status
cd ../frontend && git status
cd ../wa && git status
```

### Dependency Updates
```bash
# Update all repos
for dir in avevapi frontend wa; do
  cd $dir
  npm update
  cd ..
done
```

## 🎯 Questions for Discussion:

1. **Setup Priority**: Backend dulu, atau parallel setup?
2. **Environment**: Development vs Production setup?
3. **Database**: SQLite local atau external database?
4. **Deployment**: Docker atau manual deployment?
5. **CI/CD**: Perlu pipeline automation?

Apa pendapat Anda tentang approach ini?