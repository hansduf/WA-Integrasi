// config/index.js
import dotenv from 'dotenv';

// Load environment variables (optional)
dotenv.config();

/**
 * Universal Data Platform Configuration
 * Minimal configuration needed - data sources are created dynamically
 */
export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 8001,
    host: process.env.HOST || 'localhost'
  },

  // API Configuration (required for security)
  api: {
    baseUrl: process.env.API_BASE_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 8001}/api`,
    key: process.env.API_KEY || 'universal-api-key-2025'
  },

  // WhatsApp Integration (optional)
  whatsapp: {
    timeout: parseInt(process.env.WA_TIMEOUT) || 30000
  },

  // CORS Configuration
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      // Frontend ngrok tunnel for remote access
      // IMPORTANT: Update this with your active ngrok frontend URL when testing via ngrok
      // Example: 'https://your-frontend-id.ngrok-free.app'
      'https://02d900e8f817.ngrok-free.app',
      'https://ea0f4c8470aa.ngrok-free.app'
      // Note: Ngrok URLs change on each restart (free tier), so update accordingly
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization', 'X-User', 'ngrok-skip-browser-warning'],
    credentials: true,
    exposedHeaders: ['X-Auth-Cleared']
  },

  // Authentication & Security Configuration
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'change-this-secret-in-production-min-32-characters',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret-in-production-min-32-characters',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },
    session: {
      timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 60
    },
    accountLock: {
      maxAttempts: parseInt(process.env.ACCOUNT_LOCK_ATTEMPTS) || 5,
      durationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES) || 30
    },
    rateLimit: {
      maxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 10,
      windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 60
    },
    defaultAdmin: {
      username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!'
    }
  }
};

// Validation function to check required configurations
export function validateConfig() {
  const errors = [];

  // Check API configuration
  if (!config.api.key) errors.push('API_KEY is required');

  // Check Authentication configuration
  if (config.auth.jwt.secret.includes('change-this')) {
    console.warn('⚠️  WARNING: Using default JWT secret. Please change JWT_SECRET in production!');
  }
  if (config.auth.jwt.refreshSecret.includes('change-this')) {
    console.warn('⚠️  WARNING: Using default refresh secret. Please change JWT_REFRESH_SECRET in production!');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }

  console.log('✅ Universal Data Platform configuration validated successfully');
  return true;
}

// Export individual config sections for convenience
export const { server, api, whatsapp, cors, auth } = config;

export default config;
