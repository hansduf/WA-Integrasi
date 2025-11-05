# Authentication System - Quick Start Guide

## 🚀 Quick Start

### 1. Update Environment Variables

Add to `avevapi/.env`:
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Password Security
BCRYPT_ROUNDS=12

# Session Configuration
SESSION_TIMEOUT_MINUTES=60

# Account Locking
ACCOUNT_LOCK_ATTEMPTS=5
ACCOUNT_LOCK_DURATION_MINUTES=30

# Rate Limiting
RATE_LIMIT_MAX_ATTEMPTS=10

# Default Admin User (created on first startup if no users exist)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=Admin123!
```

### 2. Start Server

```bash
cd avevapi
npm install
npm start
```

You should see:
```
👤 Initializing authentication system...
📝 No users found. Creating default admin user...
✅ Default admin user created: admin
⚠️ IMPORTANT: Please change the default password after first login!
✅ Authentication system ready (1 user(s) found)
```

### 3. Test Authentication Flow

#### Option A: Using the Test Script

```bash
node test-auth-flow.js
```

Expected output:
```
🧪 Testing Authentication Flow

Test 1: Login with default admin credentials
Status: 200
Success: true
Message: Login successful
User: admin (some-uuid)
✅ Login successful

Test 2: Get current user info
Status: 200
Success: true
User: admin
Full Name: System Administrator
Active: true
✅ Get user info successful

Test 3: Check authentication status
Status: 200
Authenticated: true
✅ Check auth successful

Test 4: Logout
Status: 200
Success: true
Message: Logged out successfully
✅ Logout successful

Test 5: Try to access protected route after logout
Status: 401
Success: false
Error: session_expired
✅ Protected route correctly blocked after logout

Test 6: Login with wrong password
Status: 401
Success: false
Error: invalid_credentials
Message: Invalid username or password. 4 attempt(s) remaining.
Attempts left: 4
✅ Login with wrong password correctly rejected

🎉 All tests completed!
```

#### Option B: Using Postman/Thunder Client

**1. Login**
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!",
  "rememberMe": false
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "username": "admin",
    "full_name": "System Administrator",
    "email": null,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt-token-here",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

**2. Get Current User** (requires authentication)
```
GET http://localhost:3000/api/auth/me
Cookie: accessToken=jwt-token-from-login
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "username": "admin",
    "full_name": "System Administrator",
    "email": null,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "expiresAt": "2024-01-01T01:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**3. Check Authentication Status**
```
GET http://localhost:3000/api/auth/check
Cookie: accessToken=jwt-token-from-login
```

Response:
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "uuid-here",
    "username": "admin",
    "full_name": "System Administrator"
  }
}
```

**4. Logout**
```
POST http://localhost:3000/api/auth/logout
Cookie: accessToken=jwt-token-from-login
```

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Option C: Using curl

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin123!\",\"rememberMe\":false}" \
  -c cookies.txt
```

**Get Current User:**
```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

**Logout:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## 📊 Database Inspection

Check created users and sessions:

```bash
cd avevapi
sqlite3 data/app.db
```

```sql
-- View all users
SELECT id, username, full_name, is_active, login_attempts, locked_until, created_at, last_login 
FROM users;

-- View audit logs
SELECT user_id, action, details, ip_address, timestamp 
FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- View active sessions
SELECT s.id, s.user_id, u.username, s.expires_at, s.created_at, s.ip_address, s.is_active
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = 1;

-- Exit SQLite
.quit
```

## 🔒 Security Features

### 1. Password Requirements
- Minimum 8 characters
- Must contain at least one letter
- Must contain at least one number
- Passwords are hashed with bcrypt (12 rounds)

### 2. Account Locking
- 5 failed login attempts → account locked for 30 minutes
- Counter resets on successful login
- Admin can manually unlock accounts

### 3. Session Management
- One session per user (single device enforcement)
- 1-hour session timeout (configurable)
- Session invalidated on logout
- Expired sessions cleaned up automatically

### 4. Rate Limiting
- Login endpoint: 10 attempts per IP per hour
- General API: 100 requests per 15 minutes per IP

### 5. Audit Logging
All authentication events are logged with:
- User ID
- Action type (login, logout, failed login, etc.)
- IP address
- User agent
- Timestamp
- Additional details

## 🐛 Troubleshooting

### Issue: "User not found" after login
**Solution:** Check if default admin was created:
```sql
sqlite3 data/app.db "SELECT * FROM users;"
```

If no users exist, restart the server to trigger auto-creation.

### Issue: "Account is locked"
**Solution:** Wait 30 minutes or manually unlock in database:
```sql
sqlite3 data/app.db "UPDATE users SET login_attempts = 0, locked_until = NULL WHERE username = 'admin';"
```

### Issue: "Session expired" immediately after login
**Solution:** Check system time and JWT configuration. Make sure `JWT_SECRET` is set in `.env`.

### Issue: "Invalid token" error
**Solution:** 
1. Check if `JWT_SECRET` in `.env` matches what was used to create tokens
2. Clear cookies and login again
3. Check if user account is still active

### Issue: Rate limit exceeded
**Solution:** Wait for the rate limit window to reset (1 hour for login, 15 minutes for API).

## 📝 API Error Codes

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `unauthorized` | No authentication token provided | 401 |
| `invalid_token` | Token is malformed or invalid | 401 |
| `token_expired` | JWT token has expired | 401 |
| `session_expired` | Session has expired | 401 |
| `user_not_found` | User does not exist | 401 |
| `invalid_credentials` | Wrong username or password | 401 |
| `account_locked` | Too many failed login attempts | 401 |
| `account_disabled` | User account is disabled | 403 |
| `server_error` | Internal server error | 500 |

## 🎯 Next Steps

1. **Change default admin password** after first login (Phase 2)
2. **Create additional users** with user management API (Phase 2)
3. **Implement frontend login page** (Phase 4)
4. **Add role-based access control** (Phase 3)
5. **Set up monitoring and alerts** (Phase 3)

## 📚 Related Documentation

- `DISKUSI_FITUR_LOGIN.md` - Complete authentication feature specification
- `PHASE1_DAY2_COMPLETED.md` - Detailed implementation documentation
- `test-auth-flow.js` - Automated test script

## ✅ Checklist

- [ ] Environment variables configured in `.env`
- [ ] Server started successfully
- [ ] Default admin user created
- [ ] Login test successful
- [ ] Logout test successful
- [ ] Protected routes working
- [ ] Audit logs being created
- [ ] Ready to proceed to Phase 2 (User Management)
