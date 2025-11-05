# 🚀 AVEVA-PI Production Setup Guide

## 📋 Development vs Production Differences

### Development Environment
```bash
# Local machine, hot reload, debug mode
npm run dev          # Auto-restart on file changes
NODE_ENV=development # Full error messages, source maps
Database: Local SQLite
Ports: 3000, 3001, etc (can conflict)
```

### Production Environment
```bash
# Server, optimized, stable
npm run build && npm start  # Pre-built, optimized
NODE_ENV=production         # Minified, no debug info
Database: External/Cloud DB
Ports: Standard ports (80, 443)
Security: HTTPS, firewalls, monitoring
```

---

## 🏭 Production Setup Options

### Option 1: VPS/Cloud Server (Recommended)

#### 1. Server Preparation
```bash
# Ubuntu/Debian Server
sudo apt update
sudo apt install nodejs npm nginx certbot

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install git
```

#### 2. Clone Repositories
```bash
# Create app directory
mkdir -p /var/www/aveva-pi
cd /var/www/aveva-pi

# Clone all repositories
git clone https://github.com/your-org/avevapi.git backend
git clone https://github.com/your-org/frontend.git
git clone https://github.com/your-org/whatsapp-bot.git wa
```

#### 3. Backend Setup (avevapi)
```bash
cd backend
npm install --production  # Only production dependencies

# Create production .env
cat > .env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=./data/app.db
JWT_SECRET=your-super-secure-secret-here
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=warn
EOF

# Build and start
npm run build  # If you have build script
pm2 start ecosystem.config.js  # Or: pm2 start main.js --name "avevapi"
```

#### 4. Frontend Setup (Next.js)
```bash
cd ../frontend
npm install --production

# Create production .env
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
EOF

# Build for production
npm run build

# Start with PM2
pm2 start npm --name "frontend" -- start
```

#### 5. WhatsApp Bot Setup
```bash
cd ../wa
npm install --production

# Create production .env
cat > .env << EOF
API_BASE_URL=https://api.yourdomain.com
SESSION_PATH=./sessions
NODE_ENV=production
EOF

# Start bot
pm2 start index.js --name "whatsapp-bot"
```

#### 6. Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/aveva-pi
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/aveva-pi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 7. SSL Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d yourdomain.com
```

#### 8. Database Setup
```bash
# For production, consider PostgreSQL or MySQL instead of SQLite
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb avea_pi_prod
sudo -u postgres createuser avea_pi_user
sudo -u postgres psql -c "ALTER USER avea_pi_user PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE avea_pi_prod TO avea_pi_user;"
```

### Option 2: Docker Production Setup

#### docker-compose.prod.yml
```yaml
version: '3.8'
services:
  # PostgreSQL Database
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: avea_pi_prod
      POSTGRES_USER: avea_pi_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - avea_network

  # Backend API
  backend:
    build:
      context: ./avevapi
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://avea_pi_user:secure_password@db:5432/avea_pi_prod
      - JWT_SECRET=your-super-secure-secret
      - PORT=3001
    depends_on:
      - db
    networks:
      - avea_network

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001
    depends_on:
      - backend
    networks:
      - avea_network

  # WhatsApp Bot
  whatsapp-bot:
    build:
      context: ./wa
      dockerfile: Dockerfile.prod
    environment:
      - API_BASE_URL=http://backend:3001
    depends_on:
      - backend
    volumes:
      - whatsapp_sessions:/app/sessions
    networks:
      - avea_network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - frontend
      - backend
    networks:
      - avea_network

volumes:
  postgres_data:
  whatsapp_sessions:

networks:
  avea_network:
    driver: bridge
```

#### Dockerfile.prod (Backend)
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Option 3: Cloud Platforms

#### Railway (Easiest)
```bash
# Connect GitHub repos to Railway
# Auto-deploy on push
# Built-in databases
```

#### Vercel + Railway
```bash
# Frontend: Vercel (free)
# Backend: Railway ($)
# Database: Railway PostgreSQL
```

#### AWS/GCP/Azure
```bash
# More complex but scalable
# Load balancers, auto-scaling
# Managed databases
```

---

## 🔧 Production Best Practices

### Security
- ✅ Use HTTPS (SSL certificates)
- ✅ Environment variables for secrets
- ✅ Firewall rules
- ✅ Regular security updates
- ✅ Database backups

### Performance
- ✅ PM2 clustering for multi-core
- ✅ Redis for caching (optional)
- ✅ CDN for static assets
- ✅ Database connection pooling
- ✅ Compression (gzip)

### Monitoring
- ✅ PM2 monitoring
- ✅ Application logs
- ✅ Database monitoring
- ✅ Uptime monitoring
- ✅ Error tracking (Sentry)

### Backup & Recovery
- ✅ Database daily backups
- ✅ File system backups
- ✅ Disaster recovery plan
- ✅ Rollback procedures

---

## ❓ Yang Mana yang Cocok untuk Anda?

1. **VPS Manual Setup**: Full control, learning experience
2. **Docker**: Consistent environments, easy scaling
3. **Cloud Platforms**: Quick setup, managed services

**Budget dan pengalaman Anda seperti apa?** Atau ada preferensi platform tertentu?