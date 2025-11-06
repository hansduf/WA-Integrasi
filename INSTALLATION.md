# 🚀 AVEVA PI - Complete Server Installation Guide

Panduan lengkap instalasi AVEVA PI dari clone hingga running di production server.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Server Setup](#step-1-server-setup)
3. [Step 2: Clone & Dependencies](#step-2-clone--dependencies)
4. [Step 3: Environment Configuration](#step-3-environment-configuration)
5. [Step 4: Database & Admin Setup](#step-4-database--admin-setup)
6. [Step 5: Build & Prepare](#step-5-build--prepare)
7. [Step 6: PM2 Process Manager](#step-6-pm2-process-manager)
8. [Step 7: Nginx Reverse Proxy](#step-7-nginx-reverse-proxy)
9. [Step 8: SSL/HTTPS Certificate](#step-8-sslhttps-certificate)
10. [Step 9: Verification & Testing](#step-9-verification--testing)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

### Recommended VPS Specs

| Spec | Requirement | Notes |
|------|-------------|-------|
| **OS** | Ubuntu 20.04 LTS+ | Debian-based |
| **RAM** | 2GB minimum, 4GB+ recommended | For all 3 services |
| **Storage** | 20GB SSD minimum | Database + builds |
| **CPU** | 2 cores minimum | 4+ cores recommended |
| **Uptime SLA** | 99.9%+ | For production |

### What You Need Before Starting

- ✅ SSH access to VPS
- ✅ Domain name (optional, can use IP during setup)
- ✅ Sudo privileges on server
- ✅ Git repository cloned locally: `https://github.com/hansduf/WA-Integrasi.git`

---

## Step 1: Server Setup

### 1.1 Connect to VPS

```bash
# Replace with your VPS IP/hostname
ssh user@your-vps-ip

# Or if using specific SSH key
ssh -i /path/to/key.pem user@your-vps-ip

# Verify you're logged in
whoami
pwd
```

### 1.2 Update System Packages

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y curl wget git build-essential net-tools htop

# Check if successful
node --version 2>/dev/null || echo "Node.js not installed yet"
```

### 1.3 Install Node.js 20 LTS

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version        # Should be v20.x.x
npm --version         # Should be 10.x.x or higher

# Optional: Install Yarn (alternative to npm)
# sudo npm install -g yarn
```

### 1.4 Install PM2 (Global Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on system boot
pm2 startup

# Run the generated command (output from pm2 startup)
# This creates a systemd service for PM2
sudo env PATH=$PATH:/usr/bin pm2 startup -u $USER --hp /home/$USER

# Verify PM2 installation
pm2 --version
pm2 list
```

### 1.5 Install Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx service
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx

# Check Nginx status
curl http://localhost
# Should return Nginx welcome page
```

### 1.6 Setup UFW Firewall (Optional but Recommended)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (critical to avoid lockout!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Verify firewall rules
sudo ufw status

# Output should show ports 22, 80, 443 allowed
```

---

## Step 2: Clone & Dependencies

### 2.1 Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone repository
git clone https://github.com/hansduf/WA-Integrasi.git

# Navigate into project
cd WA-Integrasi

# Verify clone
ls -la
# Should see: avevapi/, frontend/, wa/, .git/, .gitignore, *.md files
```

### 2.2 Install Backend Dependencies

```bash
# Navigate to backend
cd ~/WA-Integrasi/avevapi

# Install dependencies
npm install

# Rebuild SQLite (important for production)
npm rebuild better-sqlite3

# Verify installation
npm list | head -20

# Return to project root
cd ..
```

### 2.3 Install Frontend Dependencies & Build

```bash
# Navigate to frontend
cd ~/WA-Integrasi/frontend

# Install dependencies
npm install

# Build for production (creates .next folder)
npm run build

# Verify build was successful
ls -la .next/
# Should see: server/, static/, etc.

# Return to project root
cd ..
```

### 2.4 Install WhatsApp Bot Dependencies

```bash
# Navigate to bot
cd ~/WA-Integrasi/wa

# Install dependencies
npm install

# Verify installation
npm list | head -20

# Return to project root
cd ..
```

### 2.5 Verify All Dependencies

```bash
# Quick check all folders have node_modules
echo "Backend modules:" && ls -d avevapi/node_modules && \
echo "Frontend modules:" && ls -d frontend/node_modules && \
echo "Bot modules:" && ls -d wa/node_modules

# Should show all three successfully
```

---

## Step 3: Environment Configuration

### 3.1 Backend Configuration (.env)

```bash
# Navigate to backend
cd ~/WA-Integrasi/avevapi

# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

**Key settings to change:**

```bash
# ========== PRODUCTION SETTINGS ==========

# Server runs on all interfaces for Nginx reverse proxy
HOST=0.0.0.0
PORT=8001

# Production mode
NODE_ENV=production

# ⚠️ CHANGE THESE SECURITY KEYS!
API_KEY=your-secure-api-key-here-12345
TRIGGERS_ADMIN_KEY=your-secure-admin-key-here-67890

# ⚠️ CHANGE ADMIN PASSWORD!
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here

# WhatsApp integration
WA_TIMEOUT=30000

# Leave this as is for production
ALLOW_NGROK_COOKIES=false
```

**Save file:** Press `Ctrl+X`, then `Y`, then `Enter`

### 3.2 Frontend Configuration (.env.local)

```bash
# Navigate to frontend
cd ~/WA-Integrasi/frontend

# Copy template
cp .env.example .env.local

# Edit with your values
nano .env.local
```

**Configuration for production:**

```bash
# Backend API running locally (behind Nginx)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001

# ⚠️ MUST MATCH backend API_KEY
NEXT_PUBLIC_API_KEY=your-secure-api-key-here-12345

# ⚠️ MUST MATCH backend TRIGGERS_ADMIN_KEY
NEXT_PUBLIC_TRIGGERS_ADMIN_KEY=your-secure-admin-key-here-67890
```

**Save file:** Press `Ctrl+X`, then `Y`, then `Enter`

### 3.3 WhatsApp Bot Configuration (.env)

```bash
# Navigate to bot
cd ~/WA-Integrasi/wa

# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

**Configuration:**

```bash
# ⚠️ MUST MATCH backend HOST:PORT
API_BASE_URL=http://localhost:8001

# Bot settings (all optional, shown are defaults)
BOT_NAME=LearnAI Assistant
BOT_PREFIX=🤖

# Session directory (auto-created)
SESSION_PATH=./sessions

# Debug mode
DEBUG=false

# WhatsApp timeout
WA_TIMEOUT=30000
```

**Save file:** Press `Ctrl+X`, then `Y`, then `Enter`

### 3.4 Verify All Configs

```bash
# Check all .env files exist
echo "=== Backend ===" && cat ~/WA-Integrasi/avevapi/.env | grep -E "^[A-Z_]+=" | head -10
echo ""
echo "=== Frontend ===" && cat ~/WA-Integrasi/frontend/.env.local | grep -E "^[A-Z_]+" | head -5
echo ""
echo "=== Bot ===" && cat ~/WA-Integrasi/wa/.env | grep -E "^[A-Z_]+=" | head -5
```

---

## Step 4: Database & Admin Setup

### 4.1 Create Database Automatically

Backend akan automatically membuat database folder and files:

```bash
# Navigate to backend
cd ~/WA-Integrasi/avevapi

# Test if database gets created
node main.js &

# Wait 5 seconds
sleep 5

# Kill the process
kill %1 2>/dev/null || pkill -f "node main.js"

# Verify database folder created
ls -la data/
# Should show: app.db, app.db-wal, app.db-shm (SQLite WAL files)

# Check database size
du -sh data/app.db
```

### 4.2 Create Admin User

```bash
# Navigate to backend
cd ~/WA-Integrasi/avevapi

# Run admin creation script
node scripts/create-admin.js

# Follow prompts or use environment variables:
ADMIN_USERNAME=admin ADMIN_PASSWORD="your-secure-password" node scripts/create-admin.js

# Output should show: ✅ Admin user created successfully
```

### 4.3 Verify Database Setup

```bash
# Check database tables exist
cd ~/WA-Integrasi/avevapi
npm list | grep sqlite

# Check if better-sqlite3 is installed
node -e "const db = require('better-sqlite3')('data/app.db'); console.log('✅ Database accessible'); db.close();"
```

---

## Step 5: Build & Prepare

### 5.1 Frontend Build Verification

```bash
# Check frontend build
cd ~/WA-Integrasi/frontend

# Verify .next folder exists
ls -la .next/

# Should show:
# - server/       (server-side code)
# - static/       (client-side assets)
# - package.json  (metadata)

# Check build size
du -sh .next/

# Should be less than 100MB typically
```

### 5.2 Test Each Service Locally

**Test Backend:**
```bash
cd ~/WA-Integrasi/avevapi
timeout 10 npm start 2>&1 | head -20
# Should show: "✅ Server running on http://0.0.0.0:8001"
```

**Test Frontend:**
```bash
cd ~/WA-Integrasi/frontend
timeout 10 npm start 2>&1 | head -20
# Should show: "▲ Next.js 14.2.0"
```

### 5.3 Create PM2 Ecosystem File

Copy the provided `ecosystem.config.js` to project root:

```bash
# Check if ecosystem.config.js exists
cat ~/WA-Integrasi/ecosystem.config.js | head -20

# If it doesn't exist, create it from the template provided
# It should be in the project root
```

### 5.4 Update Ecosystem File Paths

Edit the ecosystem.config.js to match your paths:

```bash
cd ~/WA-Integrasi

# Edit ecosystem config
nano ecosystem.config.js

# Find and replace `/home/user/WA-Integrasi` with your path:
# Press Ctrl+\ (Find & Replace in nano)
# Find: /home/user/WA-Integrasi
# Replace: $(pwd)   or your actual path like /home/ubuntu/WA-Integrasi
```

---

## Step 6: PM2 Process Manager

### 6.1 Start All Services with PM2

```bash
# Navigate to project root
cd ~/WA-Integrasi

# Start all apps from ecosystem.config.js
pm2 start ecosystem.config.js

# Verify all processes started
pm2 list

# Check logs
pm2 logs

# Exit logs view: Ctrl+C
```

### 6.2 Monitor Services

```bash
# View real-time monitoring
pm2 monit

# Exit monit: Ctrl+C

# Or check specific service
pm2 logs backend
pm2 logs frontend
pm2 logs wa-bot
```

### 6.3 Save PM2 Configuration (Auto-startup)

```bash
# Save PM2 startup configuration
pm2 save

# This creates ~/.pm2/dump.pm2 with current processes

# Verify PM2 will startup on reboot
cat ~/.pm2/dump.pm2 | grep -c "\"name\""
# Should show 3 (backend, frontend, wa-bot)
```

### 6.4 Common PM2 Commands

```bash
# Stop specific service
pm2 stop backend
pm2 stop frontend
pm2 stop wa-bot

# Restart specific service
pm2 restart backend
pm2 restart frontend
pm2 restart wa-bot

# Stop all
pm2 stop all

# Start all
pm2 start all

# View detailed app info
pm2 show backend
pm2 show frontend
pm2 show wa-bot

# Clear logs
pm2 flush

# Delete app from PM2
pm2 delete backend
```

---

## Step 7: Nginx Reverse Proxy

### 7.1 Backup Original Nginx Config

```bash
# Backup original config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Backup original sites
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

### 7.2 Create New Nginx Configuration

```bash
# Create new config file
sudo nano /etc/nginx/sites-available/aveva-pi
```

**Paste this configuration:**

```nginx
# ==========================================
# AVEVA PI - Nginx Configuration
# ==========================================

# Upstream servers (where to forward requests)
upstream backend {
    server localhost:8001;
}

upstream frontend {
    server localhost:3000;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server (Main)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    # Change 'your-domain.com' to your actual domain
    server_name your-domain.com www.your-domain.com;
    
    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/aveva-pi-access.log;
    error_log /var/log/nginx/aveva-pi-error.log;
    
    # ==========================================
    # API Routing (Backend)
    # ==========================================
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long connections
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # ==========================================
    # Frontend Routing
    # ==========================================
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Localhost access (for monitoring without domain)
server {
    listen 80;
    listen [::]:80;
    server_name localhost;
    
    # ==========================================
    # API Routing (Backend)
    # ==========================================
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    # ==========================================
    # Frontend Routing
    # ==========================================
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    access_log /var/log/nginx/aveva-pi-localhost.log;
}
```

**Save file:** `Ctrl+X`, `Y`, `Enter`

### 7.3 Enable New Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/aveva-pi /etc/nginx/sites-enabled/

# Disable default site
sudo unlink /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
# Should output: "successful" and "configuration file test is successful"

# Reload Nginx
sudo systemctl reload nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 7.4 Verify Nginx Routing

```bash
# Test API routing
curl http://localhost/api/health
# Should get response from backend (might be 404 if endpoint doesn't exist, but connection works)

# Test frontend routing
curl http://localhost/
# Should get HTML from frontend

# Check Nginx logs
sudo tail -50 /var/log/nginx/aveva-pi-access.log
sudo tail -50 /var/log/nginx/aveva-pi-error.log
```

---

## Step 8: SSL/HTTPS Certificate

### 8.1 Install Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### 8.2 Obtain SSL Certificate

```bash
# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com --agree-tos -m your-email@example.com --non-interactive

# Verify certificate was created
sudo ls -la /etc/letsencrypt/live/your-domain.com/

# Should show: fullchain.pem and privkey.pem
```

### 8.3 Setup Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Enable automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check renewal schedule
sudo systemctl status certbot.timer

# Or use cron (alternative method)
# sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8.4 Update Nginx for HTTPS

```bash
# Edit your Nginx config with your domain
sudo nano /etc/nginx/sites-available/aveva-pi

# Update these lines:
# - server_name your-domain.com www.your-domain.com;
# - ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# - ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 8.5 Verify HTTPS Works

```bash
# Test HTTPS connection
curl https://your-domain.com

# Check SSL certificate info
openssl s_client -connect your-domain.com:443 </dev/null 2>/dev/null | grep "Issuer\|Subject\|Not After"

# Should show Let's Encrypt issuer and valid dates
```

---

## Step 9: Verification & Testing

### 9.1 Check All Services Running

```bash
# Check PM2 status
pm2 list

# Output should show:
# ┌─────┬──────────────┬──────────┬──────┬───────────┬──────────┐
# │ id  │ name         │ mode     │ ↺    │ status    │ cpu      │
# ├─────┼──────────────┼──────────┼──────┼───────────┼──────────┤
# │ 0   │ backend      │ fork     │ 0    │ online    │ 0.1%     │
# │ 1   │ frontend     │ fork     │ 0    │ online    │ 0.2%     │
# │ 2   │ wa-bot       │ fork     │ 0    │ online    │ 0.0%     │
# └─────┴──────────────┴──────────┴──────┴───────────┴──────────┘

# Check Nginx is running
sudo systemctl status nginx

# Check ports listening
sudo netstat -tulpn | grep LISTEN
# Should show: 80 (HTTP), 443 (HTTPS), 8001 (backend), 3000 (frontend)
```

### 9.2 Test API Connectivity

```bash
# Test backend directly
curl http://localhost:8001/

# Test through Nginx
curl http://localhost/api/

# Test with authentication
curl -H "Authorization: Bearer your-api-key" http://localhost/api/triggers

# Check response codes (look for 200, 401, etc. - not 502, 503)
```

### 9.3 Test Frontend Access

```bash
# Open in browser (from your local machine):
# - Direct: http://your-vps-ip:3000
# - Through Nginx: http://your-vps-ip
# - With domain: https://your-domain.com

# Should see login page
```

### 9.4 Test WhatsApp Bot

```bash
# Check bot logs
pm2 logs wa-bot

# Should show bot initialization and ready status

# Watch for messages (if WhatsApp is integrated)
# The bot will process incoming messages and match AI triggers
```

### 9.5 Monitor System Resources

```bash
# Check CPU/Memory usage
pm2 monit

# Alternative: check system load
top -b -n 1 | head -15

# Check disk space
df -h

# Should have sufficient free space (>10% of disk)

# Check database size
du -sh ~/WA-Integrasi/avevapi/data/
```

---

## Monitoring & Maintenance

### Daily Monitoring

```bash
# Check if all services running
pm2 list

# Check recent errors
pm2 logs --lines 100

# Monitor system resources
pm2 monit

# Check Nginx logs
sudo tail -100 /var/log/nginx/aveva-pi-access.log
sudo tail -50 /var/log/nginx/aveva-pi-error.log
```

### Weekly Tasks

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check certificate expiration (should warn 30 days before)
sudo certbot certificates

# Clean up PM2 logs (optional)
pm2 flush
```

### Monthly Tasks

```bash
# Backup database
cp ~/WA-Integrasi/avevapi/data/app.db ~/WA-Integrasi/avevapi/data/app.db.backup-$(date +%Y-%m-%d)

# Check disk usage
du -sh ~/WA-Integrasi

# Review error logs
sudo grep ERROR /var/log/nginx/aveva-pi-error.log | tail -20
```

### Backup Strategy

```bash
# Backup entire project (automated)
# Create daily backup script: backup.sh

#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
PROJECT_DIR="/home/$USER/WA-Integrasi"
mkdir -p $BACKUP_DIR

# Backup database
tar czf $BACKUP_DIR/app.db.backup-$(date +%Y-%m-%d-%H%M%S).tar.gz \
    $PROJECT_DIR/avevapi/data/app.db

echo "Backup completed: $(ls -lh $BACKUP_DIR | tail -1)"

# Add to crontab
# crontab -e
# 0 2 * * * /home/user/backup.sh

# Run daily at 2 AM
```

### Log Rotation

```bash
# Setup log rotation (usually auto in Ubuntu)
# But you can configure:

sudo nano /etc/logrotate.d/aveva-pi
```

**Add this content:**
```
/var/log/nginx/aveva-pi-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 www-data www-data
    sharedscripts
}

/home/*/WA-Integrasi/avevapi/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
}
```

---

## Troubleshooting

### Services Not Starting

**Problem:** PM2 shows `stopped` or `errored`

```bash
# Check service logs
pm2 logs backend --lines 50
pm2 logs frontend --lines 50
pm2 logs wa-bot --lines 50

# Check if ports are already in use
sudo lsof -i :8001
sudo lsof -i :3000
sudo lsof -i :3000

# Kill conflicting process if needed
sudo kill -9 <PID>

# Restart services
pm2 restart all
```

### Database Errors

**Problem:** "SQLITE_CANTOPEN" or database locked

```bash
# Check database integrity
cd ~/WA-Integrasi/avevapi
npm exec -- sqlite3 data/app.db ".tables"

# Backup and recreate
cp data/app.db data/app.db.corrupt
rm data/app.db data/app.db-wal data/app.db-shm

# Restart backend (will recreate)
pm2 restart backend

# Re-create admin user
node scripts/create-admin.js
```

### Nginx Not Routing Correctly

**Problem:** 502 Bad Gateway or 404 errors

```bash
# Test Nginx configuration
sudo nginx -t

# Check if upstream services are running
curl http://localhost:8001
curl http://localhost:3000

# Check Nginx logs
sudo tail -50 /var/log/nginx/aveva-pi-error.log

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Certificate Issues

**Problem:** Certificate expired or invalid

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal

# Check renewal logs
sudo journalctl -u certbot.timer -n 50

# If renewal fails, check Nginx is not blocking port 80
sudo lsof -i :80
```

### Out of Disk Space

**Problem:** Services stop, "No space left on device"

```bash
# Check disk usage
df -h

# Find large directories
du -sh ~/* | sort -rh | head -10

# Clean up old logs
sudo journalctl --vacuum=50M
sudo truncate -s 0 /var/log/nginx/*.log
pm2 flush

# Clean npm cache
npm cache clean --force
```

### High Memory Usage

**Problem:** Services consuming too much RAM

```bash
# Check memory per process
ps aux | grep node | grep -v grep

# Monitor with PM2
pm2 monit

# Restart service to free memory
pm2 restart backend

# Check for memory leaks in logs
pm2 logs backend | grep -i "leak\|memory"
```

### Frontend Not Loading

**Problem:** Page shows "Cannot GET /" or blank

```bash
# Check Next.js build
ls -la ~/WA-Integrasi/frontend/.next

# If missing, rebuild
cd ~/WA-Integrasi/frontend
npm run build

# Check process is running frontend server, not wrong process
pm2 show frontend

# Check logs
pm2 logs frontend | tail -50
```

---

## Quick Command Reference

```bash
# ========== SERVICE MANAGEMENT ==========
pm2 list                          # Show all services
pm2 logs                          # View all logs (Ctrl+C to exit)
pm2 logs backend                  # View specific service logs
pm2 monit                         # Monitor CPU/Memory (Ctrl+C to exit)
pm2 restart backend               # Restart service
pm2 stop all                      # Stop all services
pm2 start all                     # Start all services

# ========== NGINX ==========
sudo systemctl status nginx       # Check Nginx status
sudo nginx -t                     # Test Nginx config
sudo systemctl reload nginx       # Reload Nginx (no restart)
sudo systemctl restart nginx      # Restart Nginx
sudo tail -50 /var/log/nginx/aveva-pi-access.log    # View access logs
sudo tail -50 /var/log/nginx/aveva-pi-error.log     # View error logs

# ========== DATABASE ==========
cd ~/WA-Integrasi/avevapi
npm exec sqlite3 -- data/app.db ".tables"  # List tables
npm exec sqlite3 -- data/app.db ".dump"    # Dump database

# ========== CERTIFICATES ==========
sudo certbot certificates        # Check SSL certificates
sudo certbot renew              # Manually renew certificates
sudo certbot renew --dry-run    # Test renewal without making changes

# ========== SYSTEM ==========
df -h                           # Check disk space
du -sh ~/WA-Integrasi           # Check project folder size
top -b -n 1                     # Check top processes
netstat -tulpn | grep LISTEN    # Check listening ports
```

---

## Success Checklist ✅

Before considering installation complete:

- [ ] SSH access to VPS working
- [ ] Node.js installed and version 20+
- [ ] PM2 installed and configured for startup
- [ ] Nginx installed and running
- [ ] Repository cloned successfully
- [ ] All dependencies installed (npm install completed)
- [ ] All `.env` files created and configured
- [ ] Database created and accessible
- [ ] Admin user created successfully
- [ ] Backend running and accessible on :8001
- [ ] Frontend built and running on :3000
- [ ] WhatsApp bot running without errors
- [ ] Nginx routing all services correctly
- [ ] SSL certificate installed (if using domain)
- [ ] HTTPS working and redirecting HTTP
- [ ] All logs clean without critical errors
- [ ] System resources normal (CPU/Memory)
- [ ] Disk space sufficient (>10% free)

---

