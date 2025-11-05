#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import db from '../lib/database.js';
import { hashPassword } from '../utils/security.utils.js';

// Load env from avevapi/.env if present
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

function validatePassword(pw) {
  if (!pw || typeof pw !== 'string') return false;
  return pw.length >= 8; // basic check
}

async function run() {
  try {
    let username = process.env.ADMIN_USERNAME || null;
    let password = process.env.ADMIN_PASSWORD || null;

    if (!username) {
      username = (await prompt('Admin username: ')).trim();
    }

    if (!password) {
      // Ask for password interactively
      // We can't hide input easily without extra libs; ask twice for confirmation
      const p1 = (await prompt('Admin password (min 8 chars): ')).trim();
      const p2 = (await prompt('Confirm password: ')).trim();
      if (p1 !== p2) {
        console.error('Passwords do not match. Aborting.');
        process.exit(2);
      }
      password = p1;
    }

    if (!username) {
      console.error('No username provided. Aborting.');
      process.exit(3);
    }

    if (!validatePassword(password)) {
      console.error('Password validation failed (min 8 chars). Aborting.');
      process.exit(4);
    }

    console.log('🔒 Hashing password...');
    const passwordHash = await hashPassword(password);

    console.log(`📝 Creating admin user '${username}' ...`);
    const user = await db.createDefaultAdminUser(username, passwordHash);
    if (user) {
      console.log(`✅ Admin user created: ${user.username} (id: ${user.id})`);
      process.exit(0);
    } else {
      console.error('❌ Failed to create admin user (no user returned)');
      process.exit(5);
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('create-admin.js')) {
  run();
}
