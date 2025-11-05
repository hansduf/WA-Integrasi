# Production Deployment Guide - AVEVA PI Authentication System

## 🚀 Production Deployment Checklist

**System:** AVEVA PI Integration - Authentication System  
**Target Environment:** Production  
**Last Updated:** October 9, 2025  

---

## Pre-Deployment Requirements

### 1. Server Requirements

**Backend Server:**
- **OS:** Linux (Ubuntu 20.04 LTS or later recommended)
- **Node.js:** v18.x or later
- **Memory:** Minimum 2GB RAM
- **Storage:** Minimum 10GB available
- **Network:** Private network or public with firewall

**Frontend Server:**
- **OS:** Linux (Ubuntu 20.04 LTS or later recommended)
- **Node.js:** v18.x or later
- **Memory:** Minimum 2GB RAM
- **Storage:** Minimum 5GB available

**Database:**
- **SQLite:** Built-in (no separate server needed)
- **Backup Storage:** Separate volume or S3-compatible storage

---

## Step 1: Server Preparation

### 1.1 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x or later
npm --version
```

### 1.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Enable PM2 startup on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

### 1.4 Install Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.5 Configure Firewall
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify
sudo ufw status
```

---

## Step 2: Backend Deployment

### 2.1 Create Application Directory
```bash
# Create app directory
sudo mkdir -p /var/www/aveva-pi-backend
sudo chown $USER:$USER /var/www/aveva-pi-backend

# Navigate to directory
cd /var/www/aveva-pi-backend
```

### 2.2 Clone or Upload Code
**Option A: Git Clone**
```bash
git clone https://github.com/yourusername/aveva-pi.git .
cd avevapi
```

**Option B: Upload Files**
```bash
# Use scp or rsync to upload files
scp -r ./avevapi user@server:/var/www/aveva-pi-backend/
```

### 2.3 Install Dependencies
```bash
cd /var/www/aveva-pi-backend/avevapi
npm install --production
```

### 2.4 Configure Environment Variables

Create `/var/www/aveva-pi-backend/avevapi/.env`:
```bash
# Generate strong secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Create .env file
cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=3000

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_TIMEOUT_MINUTES=60
ACCOUNT_LOCK_DURATION_MINUTES=30
MAX_LOGIN_ATTEMPTS=5

# Rate Limiting
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_WINDOW_MINUTES=60
RATE_LIMIT_API_MAX=100
RATE_LIMIT_API_WINDOW_MINUTES=15

# Database
DATABASE_PATH=./data/aveva.db

# Default Admin (CHANGE PASSWORD AFTER FIRST LOGIN!)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=CHANGE_THIS_PASSWORD_NOW!

# Logging
LOG_LEVEL=info
EOF

echo "✅ Environment file created with generated secrets"
echo "⚠️  IMPORTANT: Change DEFAULT_ADMIN_PASSWORD immediately!"
```

### 2.5 Set Proper Permissions
```bash
# Set file permissions
chmod 600 .env
chmod 755 .
chmod -R 755 routes services middleware utils config core plugins data-sources
chmod 644 *.js *.json

# Create data directory if not exists
mkdir -p data
chmod 700 data
```

### 2.6 Initialize Database
```bash
# Run application once to create database and default admin
node main.js &
sleep 5
pkill node

# Verify database created
ls -lh data/aveva.db
```

### 2.7 Start with PM2
```bash
# Start application
pm2 start main.js --name aveva-pi-backend --time

# Save PM2 configuration
pm2 save

# Monitor logs
pm2 logs aveva-pi-backend --lines 50
```

### 2.8 Configure PM2 Ecosystem (Optional)

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'aveva-pi-backend',
    script: './main.js',
    instances: 2,  // Number of instances (CPU cores)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '500M',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

Start with ecosystem:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Step 3: Frontend Deployment

### 3.1 Create Application Directory
```bash
# Create app directory
sudo mkdir -p /var/www/aveva-pi-frontend
sudo chown $USER:$USER /var/www/aveva-pi-frontend

# Navigate to directory
cd /var/www/aveva-pi-frontend
```

### 3.2 Upload and Build
```bash
# Upload frontend files
# (Use scp or git clone)

cd /var/www/aveva-pi-frontend/frontend

# Install dependencies
npm install
```

### 3.3 Configure Environment

Create `/var/www/aveva-pi-frontend/frontend/.env.production`:
```bash
# Backend API URL (use actual domain or IP)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Or for same-server deployment:
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### 3.4 Build for Production
```bash
npm run build

# Verify build
ls -lh .next
```

### 3.5 Start with PM2
```bash
# Start Next.js production server
pm2 start npm --name aveva-pi-frontend -- start

# Or use ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'aveva-pi-frontend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save
```

---

## Step 4: Nginx Configuration

### 4.1 Configure Backend Proxy

Create `/etc/nginx/sites-available/aveva-pi-backend`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Change to your domain

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;  # Change to your domain

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    location /api/auth/login {
        limit_req zone=api_limit burst=5 nodelay;
        proxy_pass http://localhost:3000;
    }

    # Logs
    access_log /var/log/nginx/aveva-backend-access.log;
    error_log /var/log/nginx/aveva-backend-error.log;
}
```

### 4.2 Configure Frontend Proxy

Create `/etc/nginx/sites-available/aveva-pi-frontend`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Change to your domain

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;  # Change to your domain

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Next.js frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3001;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Logs
    access_log /var/log/nginx/aveva-frontend-access.log;
    error_log /var/log/nginx/aveva-frontend-error.log;
}
```

### 4.3 Enable Sites
```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/aveva-pi-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/aveva-pi-frontend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 5: SSL/TLS Configuration (Let's Encrypt)

### 5.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain Certificates
```bash
# For backend
sudo certbot --nginx -d api.yourdomain.com

# For frontend
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 5.3 Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up cron job for renewal
```

---

## Step 6: Database Backup Configuration

### 6.1 Create Backup Script

Create `/var/www/aveva-pi-backend/scripts/backup-database.sh`:
```bash
#!/bin/bash

# Configuration
DB_PATH="/var/www/aveva-pi-backend/avevapi/data/aveva.db"
BACKUP_DIR="/var/backups/aveva-pi"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/aveva_db_$(date +%Y%m%d_%H%M%S).db"

# Copy database
cp $DB_PATH $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "aveva_db_*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Database backup completed: $BACKUP_FILE.gz"
```

### 6.2 Make Script Executable
```bash
chmod +x /var/www/aveva-pi-backend/scripts/backup-database.sh
```

### 6.3 Configure Cron Job
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /var/www/aveva-pi-backend/scripts/backup-database.sh >> /var/log/aveva-backup.log 2>&1
```

---

## Step 7: Monitoring & Logging

### 7.1 PM2 Monitoring
```bash
# View all apps
pm2 list

# Monitor resources
pm2 monit

# View logs
pm2 logs aveva-pi-backend --lines 100
pm2 logs aveva-pi-frontend --lines 100

# Flush logs
pm2 flush
```

### 7.2 Log Rotation

Create `/etc/logrotate.d/aveva-pi`:
```
/var/www/aveva-pi-backend/avevapi/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/aveva-*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### 7.3 System Monitoring (Optional)

Install monitoring tools:
```bash
# htop for system monitoring
sudo apt install -y htop

# netdata for real-time monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

---

## Step 8: Post-Deployment Security

### 8.1 Change Default Admin Password

```bash
# Login to application
# Navigate to: https://yourdomain.com/login
# Login with: admin / CHANGE_THIS_PASSWORD_NOW!
# Go to: User Management → Change Password

# Or via API:
curl -X PUT https://api.yourdomain.com/api/users/<admin-user-id>/password \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=<your-token>" \
  -d '{
    "currentPassword": "CHANGE_THIS_PASSWORD_NOW!",
    "newPassword": "YourSecurePassword123!"
  }'
```

### 8.2 Fix npm Vulnerabilities
```bash
cd /var/www/aveva-pi-backend/avevapi
npm audit fix

# If needed, force fix
npm audit fix --force

# Restart application
pm2 restart aveva-pi-backend
```

### 8.3 Review Audit Logs
```bash
# Check security dashboard
# Navigate to: https://yourdomain.com/dashboard/security

# Check audit logs
# Navigate to: https://yourdomain.com/dashboard/audit-logs
```

---

## Step 9: Testing Production Deployment

### 9.1 Health Checks
```bash
# Backend health
curl https://api.yourdomain.com/api/auth/check

# Frontend health
curl -I https://yourdomain.com
```

### 9.2 Test Authentication Flow
1. Visit `https://yourdomain.com`
2. Login with admin credentials
3. Verify dashboard loads
4. Test user management
5. Test security monitoring
6. Test audit logs

### 9.3 Test SSL/TLS
```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check SSL rating (online tool)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

---

## Step 10: Performance Optimization

### 10.1 Enable Gzip Compression (Nginx)

Add to Nginx configuration:
```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

### 10.2 Enable Caching

Add to backend Nginx config:
```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 10.3 Database Optimization
```bash
# Vacuum database (compact and optimize)
sqlite3 /var/www/aveva-pi-backend/avevapi/data/aveva.db "VACUUM;"

# Analyze database (update statistics)
sqlite3 /var/www/aveva-pi-backend/avevapi/data/aveva.db "ANALYZE;"
```

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
pm2 logs aveva-pi-backend --err

# Check port availability
sudo netstat -tulpn | grep 3000

# Check environment variables
cat /var/www/aveva-pi-backend/avevapi/.env
```

### Frontend Not Loading
```bash
# Check logs
pm2 logs aveva-pi-frontend

# Check build
cd /var/www/aveva-pi-frontend/frontend
npm run build

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Database Errors
```bash
# Check database file
ls -lh /var/www/aveva-pi-backend/avevapi/data/aveva.db

# Check permissions
chmod 600 /var/www/aveva-pi-backend/avevapi/data/aveva.db
chmod 700 /var/www/aveva-pi-backend/avevapi/data
```

### SSL Certificate Issues
```bash
# Check certificate expiry
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

---

## Maintenance Tasks

### Daily
- [x] Monitor PM2 logs for errors
- [x] Check system resources (CPU, memory, disk)
- [x] Review security dashboard for anomalies

### Weekly
- [x] Review audit logs for suspicious activity
- [x] Check database backup integrity
- [x] Monitor application performance

### Monthly
- [x] Update npm dependencies (`npm update`)
- [x] Review and rotate logs
- [x] Security audit (review security checklist)
- [x] Database optimization (VACUUM, ANALYZE)

### Quarterly
- [x] Full security audit
- [x] Performance testing
- [x] Disaster recovery drill (restore from backup)
- [x] Review and update documentation

---

## Emergency Procedures

### Application Crash
```bash
# Restart application
pm2 restart aveva-pi-backend
pm2 restart aveva-pi-frontend

# If persistent, check logs
pm2 logs aveva-pi-backend --err --lines 200
```

### Database Corruption
```bash
# Stop application
pm2 stop aveva-pi-backend

# Restore from backup
cp /var/backups/aveva-pi/aveva_db_<latest>.db.gz /tmp/
gunzip /tmp/aveva_db_<latest>.db.gz
cp /tmp/aveva_db_<latest>.db /var/www/aveva-pi-backend/avevapi/data/aveva.db

# Start application
pm2 start aveva-pi-backend
```

### Security Breach
1. **Immediately:** Stop all services (`pm2 stop all`)
2. **Isolate:** Disconnect from network
3. **Investigate:** Review audit logs, check for unauthorized access
4. **Remediate:** Change all passwords, rotate JWT secrets
5. **Restore:** From known good backup if needed
6. **Report:** Document incident and actions taken

---

## Support & Resources

### Logs Location
- **Backend Logs:** `/var/www/aveva-pi-backend/avevapi/logs/`
- **Frontend Logs:** PM2 logs
- **Nginx Logs:** `/var/log/nginx/`
- **System Logs:** `/var/log/syslog`

### Commands Reference
```bash
# PM2
pm2 list                    # List all apps
pm2 logs <app>              # View logs
pm2 restart <app>           # Restart app
pm2 stop <app>              # Stop app
pm2 delete <app>            # Delete app
pm2 save                    # Save configuration

# Nginx
sudo nginx -t               # Test configuration
sudo systemctl reload nginx # Reload configuration
sudo systemctl status nginx # Check status

# System
htop                        # System monitor
df -h                       # Disk usage
free -h                     # Memory usage
```

---

## 🎉 Deployment Complete!

Your AVEVA PI Authentication System is now deployed and running in production!

**Next Steps:**
1. Change default admin password
2. Create additional admin users
3. Configure monitoring alerts
4. Schedule regular backups
5. Perform security audit
6. Document any customizations

**Access URLs:**
- Frontend: https://yourdomain.com
- Backend API: https://api.yourdomain.com
- Security Dashboard: https://yourdomain.com/dashboard/security

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Production URL:** _______________  
**Notes:** _______________
