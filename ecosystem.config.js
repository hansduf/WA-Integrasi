// Production PM2 Configuration
// Usage: pm2 start ecosystem.config.js
// 
// IMPORTANT: Update the following values:
// 1. Replace '/home/user/WA-Integrasi' with actual project path
// 2. Update .env files before starting

module.exports = {
  apps: [
    // ==========================================
    // Backend API Server
    // ==========================================
    {
      name: 'aveva-backend',
      script: './avevapi/main.js',
      cwd: '/home/user/WA-Integrasi', // CHANGE THIS PATH
      instances: 1,
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 8001
      },

      // Logging
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Restart Policy
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'data', 'logs', 'sessions'],
      max_memory_restart: '500M',
      restart_delay: 4000,

      // Uptime
      min_uptime: '10s',
      max_restarts: 10,

      // Kill timeout
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Graceful shutdown
      shutdown_with_message: true
    },

    // ==========================================
    // Frontend (Next.js)
    // ==========================================
    {
      name: 'aveva-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/user/WA-Integrasi/frontend', // CHANGE THIS PATH
      instances: 1,
      exec_mode: 'fork',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Logging
      error_file: '../logs/frontend-error.log',
      out_file: '../logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Restart Policy
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', '.next'],
      max_memory_restart: '300M',
      restart_delay: 4000,

      // Uptime
      min_uptime: '10s',
      max_restarts: 5,

      // Kill timeout
      kill_timeout: 5000,

      // Graceful shutdown
      shutdown_with_message: true
    },

    // ==========================================
    // WhatsApp Bot
    // ==========================================
    {
      name: 'aveva-whatsapp',
      script: './wa/index.js',
      cwd: '/home/user/WA-Integrasi', // CHANGE THIS PATH
      instances: 1,
      exec_mode: 'fork',

      // Environment
      env: {
        NODE_ENV: 'production'
      },

      // Logging
      error_file: './logs/whatsapp-error.log',
      out_file: './logs/whatsapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Restart Policy
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'sessions', '.wwebjs_cache'],
      max_memory_restart: '400M',
      restart_delay: 5000,

      // Uptime
      min_uptime: '10s',
      max_restarts: 5,

      // Kill timeout
      kill_timeout: 10000,

      // Notes
      // ⚠️ WhatsApp bot requires manual QR scan on first run
      // After first successful login, session will be persistent
      // If session expires, manually restart: pm2 restart aveva-whatsapp
    }
  ],

  // ==========================================
  // Cluster Configuration
  // ==========================================
  deploy: {
    production: {
      user: 'user',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'https://github.com/hansduf/WA-Integrasi.git',
      path: '/home/user/WA-Integrasi',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};

/*
==========================================
QUICK START COMMANDS
==========================================

# Start all processes
pm2 start ecosystem.config.js

# Start specific process
pm2 start ecosystem.config.js --only aveva-backend

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# View processes
pm2 list

# Monitor resources
pm2 monit

# View logs
pm2 logs aveva-backend
pm2 logs aveva-frontend
pm2 logs aveva-whatsapp

# Setup auto-restart on system reboot
pm2 startup
pm2 save

# Delete processes
pm2 delete all

# Check process details
pm2 show aveva-backend

# Save process list
pm2 save

# Restore process list
pm2 resurrect

==========================================
ENVIRONMENT VARIABLES
==========================================

Backend (.env):
  PORT=8001
  HOST=0.0.0.0
  API_KEY=your-secure-key
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD=secure-password

Frontend (.env.local):
  NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
  NEXT_PUBLIC_API_KEY=your-secure-key

WhatsApp (.env):
  API_BASE_URL=http://localhost:8001
  SESSION_PATH=./sessions

==========================================
MONITORING
==========================================

# Real-time monitoring
pm2 monit

# Check CPU usage
pm2 list

# View error logs
pm2 logs --err

# Save logs to file
pm2 logs > pm2-logs.txt

==========================================
TROUBLESHOOTING
==========================================

# Port already in use
sudo lsof -i :8001

# Clear cache
pm2 kill
pm2 flush

# Force delete
pm2 delete all
rm ~/.pm2/dump.pm2
pm2 flush

# Check process status
pm2 status

# View detailed logs
pm2 logs aveva-backend --lines 100

==========================================
*/
