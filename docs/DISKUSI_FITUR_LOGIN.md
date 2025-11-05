# Diskusi Fitur Login - AVEVA PI Integration System

**Tanggal:** Oktober 9, 2025  
**Status:** Final Requirements - Ready for Implementation  
**Topik:** Implementasi Fitur Login untuk Sistem AVEVA PI Integration

---

## 🎯 **FINAL REQUIREMENTS**

### **User Management:**
- **Role**: Admin saja (single role system)
- **Multi-user**: Ya, banyak admin bisa login
- **Registration**: Tidak ada self-registration
- **Account Creation**: Setiap admin bisa create akun admin lain
- **User Management**: Tab baru di home untuk manage akun admin

### **Authentication & Access:**
- **Login Purpose**: Akses semua fitur sistem
- **Session Timeout**: 1 jam
- **Audit Trail**: Ya, logging aktivitas user

### **UI/UX:**
- **Login Page**: Halaman standalone (/login)
- **Post-Login Redirect**: Direct ke tab trigger
- **User Management**: Tab baru di home.tsx

### **🔒 SECURITY REQUIREMENTS:**

#### **Password Security:**
- **Minimal Length**: 8 karakter
- **Complexity**: Harus kombinasi huruf dan angka
- **Example**: "admin123" ✅, "admin" ❌, "12345678" ❌

#### **Account Security:**
- **Failed Login Limit**: Maksimal 5x percobaan gagal
- **Lock Duration**: 30 menit jika mencapai limit
- **Auto Unlock**: Otomatis unlock setelah 30 menit

#### **Session Security:**
- **Session Timeout**: 1 jam idle time
- **Cookie Security**: HTTP-only, Secure, SameSite
- **Token Storage**: Server-side session management

#### **User Management Security:**
- **Edit Permissions**: Bisa edit nama lengkap dan email admin lain
- **Account Control**: Bisa disable/enable account admin lain
- **Delete Permissions**: Bisa delete account admin lain (soft delete)
- **Audit Logging**: Semua user management actions dicatat

#### **Audit Trail Security:**
- **Logged Actions**: login, logout, create_user, update_user, delete_user, disable_user, enable_user
- **Retention Period**: 90 hari
- **Log Security**: IP address, timestamp, user agent tracking

#### **Additional Security:**
- **Remember Me**: Ya, 7 hari validity
- **Last Login Display**: Tampilkan di dashboard
- **Rate Limiting**: 10 login attempts per IP per jam

### **Database:**
- **Database**: SQLite existing
- **New Tables**: users, audit_logs

---

## 🎯 **UPDATED REQUIREMENTS (Private Network Deployment)**

### **Deployment Context:**
- **Server**: Private network deployment
- **Access**: Internal network only
- **Users**: One session per user (single device login)
- **Logout**: Perfect logout (invalidate all user sessions)

### **Security Implications:**
- **CORS**: ❌ **TIDAK DIPERLUKAN** - karena frontend & backend dalam private network
- **Session Management**: One active session per user
- **Network Security**: Rely on private network isolation

---

## 🚨 **CORS DISCUSSION - NOT NEEDED FOR PRIVATE NETWORK**

### **Mengapa CORS Tidak Perlu:**

#### **Deployment Architecture:**
```
Private Network
├── Frontend Server (localhost:3000 / internal IP)
├── Backend API Server (localhost:3001 / internal IP)
└── Database Server (SQLite local / internal)
```

#### **Cross-Origin Scenarios:**
- ❌ **Public Web**: Frontend di `domain.com`, API di `api.domain.com` → **Perlu CORS**
- ❌ **CDN Deployment**: Frontend di CDN, API di server berbeda → **Perlu CORS**
- ✅ **Private Network**: Semua dalam internal network → **TIDAK Perlu CORS**

#### **Security Benefits:**
- **Network Isolation**: Private network sudah provide security layer
- **No External Access**: Tidak ada cross-origin dari public internet
- **Simplified Config**: Tidak perlu CORS middleware complexity

### **Rekomendasi: Skip CORS Implementation**
- ✅ Focus security efforts pada authentication & authorization
- ✅ Simplify deployment configuration
- ✅ Reduce potential CORS-related bugs

---

## 🔒 **SESSION MANAGEMENT STRATEGY**

### **One Session Per User:**
- **Login Behavior**: Jika user login dari device baru → kick session lama
- **Session Tracking**: Store session ID per user di database
- **Logout**: Invalidate current session + clear all user sessions

### **Perfect Logout Implementation:**
```javascript
// On login - check existing sessions
const existingSession = await db.getUserActiveSession(userId);
if (existingSession) {
  // Invalidate old session
  await db.invalidateSession(existingSession.id);
  // Log: "Previous session terminated due to new login"
}

// Create new session
const newSession = await createNewSession(userId);
```

### **Session Security:**
- **Storage**: HTTP-only secure cookies
- **Expiration**: 1 hour sliding expiration
- **Invalidation**: Perfect logout clears all user sessions
- **Tracking**: Single active session per user

---

## 📋 **DETAILED IMPLEMENTATION PIPELINE**

### **Phase 1: Database & Backend Foundation (2 hari)** 🔒

#### **Day 1: Database Schema & Migration**
**Objective:** Setup secure database foundation
```
✅ Tasks:
├── Create users table with security fields
├── Create audit_logs table for compliance
├── Create user_sessions table for session tracking
├── Implement UUID generation for secure IDs
├── Create database migration scripts
└── Test schema with sample secure data
```

#### **Day 2: Authentication Backend + Security Foundation**
**Objective:** Implement core authentication with security**
```
✅ Tasks:
├── Install bcrypt for password hashing (12 rounds)
├── Create JWT authentication middleware
├── Implement password complexity validation (8+ chars, letter+number)
├── Create /api/auth/login endpoint with security validation
├── Implement one-session-per-user logic (invalidate old sessions)
├── Add failed login attempt tracking
├── Create /api/auth/logout endpoint (perfect logout)
├── Create /api/auth/me endpoint for session validation
├── Add 1-hour session timeout with sliding expiration
└── Test complete authentication flow
```

### **Phase 2: User Management Backend (1 hari)** 🔒

#### **Day 3: User CRUD Operations + Security**
**Objective:** Complete user management with audit trails**
```
✅ Tasks:
├── Implement /api/users GET (list all users with security)
├── Implement /api/users POST (create user with validation)
├── Implement /api/users/:id PUT (update user securely)
├── Implement /api/users/:id DELETE (soft delete with audit)
├── Add admin-only middleware protection
├── Implement comprehensive audit logging for all operations
├── Add permission validation (admin-only access)
├── Track user creation in audit logs with creator info
└── Test all user management APIs with security
```

### **Phase 3: Advanced Security Features (2 hari)** 🔒

#### **Day 4: Account Security & Session Management**
**Objective:** Implement advanced security controls**
```
✅ Tasks:
├── Implement account locking (5 failed attempts → 30 min lock)
├── Add rate limiting (10 attempts/IP/hour)
├── Implement one-session-per-user enforcement
├── Add session invalidation on logout (perfect logout)
├── Configure secure cookie settings (HTTP-only, Secure, SameSite)
├── Implement sliding session expiration (reset on activity)
├── Add comprehensive input validation and sanitization
├── Implement session conflict detection and handling
└── Test security controls integration
```

#### **Day 5: Audit Trail & Monitoring**
**Objective:** Complete security monitoring system**
```
✅ Tasks:
├── Implement comprehensive audit logging system
├── Add IP address and user agent tracking
├── Implement log encryption for sensitive data
├── Add security event monitoring and alerting
├── Implement intrusion detection (suspicious patterns)
├── Add session activity logging
├── Create security metrics and reporting
└── Perform security testing and vulnerability assessment
```

### **Phase 4: Frontend Implementation (2 hari)** 🔒

#### **Day 6: Login Page & Authentication**
**Objective:** Build secure frontend authentication**
```
✅ Tasks:
├── Create /login standalone page with validation
├── Implement client-side password validation
├── Integrate login API with comprehensive error handling
├── Implement JWT token storage (HTTP-only cookies)
├── Handle session conflict messages ("Another session active")
├── Implement auto-redirect to trigger tab after login
├── Add CSRF protection tokens
├── Implement session timeout handling (1 hour)
├── Add remember me functionality (7 days)
└── Test authentication UI flow
```

#### **Day 7: User Management UI + Security**
**Objective:** Complete admin user management interface**
```
✅ Tasks:
├── Add "👥 Admin Users" tab to home.tsx
├── Create user list component with status indicators
├── Implement role-based UI rendering (admin only)
├── Create secure user creation modal/form
├── Implement user edit functionality with validation
├── Add disable/enable user toggle with confirmation
├── Implement secure user deletion with audit confirmation
├── Add input sanitization and XSS prevention
├── Display last login information securely
├── Show active session status per user
└── Test complete user management workflow
```

### **Phase 5: Integration & Security Testing (1 hari)** 🔒

#### **Day 8: System Integration & Security Audit**
**Objective:** Final integration and security validation**
```
✅ Tasks:
├── Add protected routes middleware to all components
├── Integrate authentication with existing system components
├── Implement logout functionality in UI (perfect logout)
├── Implement secure logout (clear all user sessions)
├── Test one-session-per-user behavior thoroughly
├── Test end-to-end authentication flow
├── Test complete user management workflow
├── Perform penetration testing and security audit
├── Conduct compliance check and validation
├── Performance testing and security optimization
└── Create deployment and maintenance documentation
```

---

## 📁 **DIRECTORY STRUCTURE & NEW FILES**

### **Backend Files (avevapi/)**

#### **New Directories:**
```
avevapi/
├── middleware/
│   ├── auth.middleware.js          # JWT authentication middleware
│   ├── admin.middleware.js         # Admin-only access control
│   └── security.middleware.js      # Security controls (rate limiting, etc.)
├── services/
│   ├── auth.service.js             # Authentication business logic
│   ├── user.service.js             # User management business logic
│   └── audit.service.js            # Audit logging service
├── routes/
│   ├── auth.js                     # Authentication routes (/api/auth/*)
│   └── users.js                    # User management routes (/api/users/*)
└── utils/
    ├── security.utils.js           # Security utilities (hashing, tokens)
    ├── validation.utils.js         # Input validation utilities
    └── audit.utils.js              # Audit logging utilities
```

#### **Modified Files:**
```
avevapi/
├── main.js                         # Add health check, session management
├── config/index.js                 # Add security configuration
├── lib/database.js                 # Add user/auth tables, prepared statements
└── package.json                    # Add security dependencies
```

### **Frontend Files (frontend/)**

#### **New Directories:**
```
frontend/src/
├── components/auth/
│   ├── LoginForm.tsx               # Login form component
│   ├── ProtectedRoute.tsx          # Route protection wrapper
│   └── SessionManager.tsx          # Session handling utilities
├── components/admin/
│   ├── UserManagement.tsx          # Main user management component
│   ├── UserList.tsx                # User list with status
│   ├── UserForm.tsx                # Create/edit user form
│   └── UserActions.tsx             # User action buttons
├── hooks/
│   ├── useAuth.ts                  # Authentication hook
│   └── useSession.ts               # Session management hook
├── services/
│   ├── auth.service.ts             # Authentication API calls
│   └── user.service.ts             # User management API calls
├── types/
│   ├── auth.types.ts               # Authentication type definitions
│   └── user.types.ts               # User management types
└── utils/
    ├── security.utils.ts           # Client-side security utilities
    └── validation.utils.ts         # Form validation utilities
```

#### **New Pages:**
```
frontend/src/app/
├── login/
│   └── page.tsx                    # Standalone login page
└── admin/
    └── users/
        └── page.tsx                # User management page (optional)
```

#### **Modified Files:**
```
frontend/src/
├── app/layout.tsx                  # Add authentication context
├── components/home.tsx             # Add Admin Users tab
├── middleware.ts                   # Add authentication middleware (Next.js)
└── package.json                    # Add authentication dependencies
```

### **Configuration Files**

#### **Environment Files:**
```
frontend/
├── .env.local                      # Frontend environment variables
└── .env.example                    # Environment template

avevapi/
├── .env                            # Backend environment variables
└── .env.example                    # Environment template
```

### **Documentation Files**
```
docs/
├── DISKUSI_FITUR_LOGIN.md          # This comprehensive documentation
├── SECURITY_IMPLEMENTATION.md      # Detailed security guide
└── DEPLOYMENT_CHECKLIST.md         # Deployment security checklist
```

---

## � **FILE CREATION SUMMARY**

### **🔧 BACKEND - NEW FILES TO CREATE:**

#### **Middleware (4 files):**
1. `avevapi/middleware/auth.middleware.js` - JWT authentication validation
2. `avevapi/middleware/admin.middleware.js` - Admin-only access control
3. `avevapi/middleware/security.middleware.js` - Rate limiting, input validation
4. `avevapi/middleware/session.middleware.js` - Session management

#### **Services (3 files):**
1. `avevapi/services/auth.service.js` - Login, logout, session management
2. `avevapi/services/user.service.js` - CRUD operations for users
3. `avevapi/services/audit.service.js` - Security event logging

#### **Routes (2 files):**
1. `avevapi/routes/auth.js` - `/api/auth/*` endpoints
2. `avevapi/routes/users.js` - `/api/users/*` endpoints

#### **Utils (3 files):**
1. `avevapi/utils/security.utils.js` - Password hashing, token generation
2. `avevapi/utils/validation.utils.js` - Input validation functions
3. `avevapi/utils/audit.utils.js` - Audit logging helpers

#### **Configuration (2 files):**
1. `avevapi/.env` - Environment variables (JWT secret, etc.)
2. `avevapi/.env.example` - Environment template

---

### **🎨 FRONTEND - NEW FILES TO CREATE:**

#### **Components/Auth (3 files):**
1. `frontend/src/components/auth/LoginForm.tsx` - Login form with validation
2. `frontend/src/components/auth/ProtectedRoute.tsx` - Route protection wrapper
3. `frontend/src/components/auth/SessionManager.tsx` - Session handling utilities

#### **Components/Admin (4 files):**
1. `frontend/src/components/admin/UserManagement.tsx` - Main user management component
2. `frontend/src/components/admin/UserList.tsx` - User list with status indicators
3. `frontend/src/components/admin/UserForm.tsx` - Create/edit user form
4. `frontend/src/components/admin/UserActions.tsx` - User action buttons

#### **Hooks (2 files):**
1. `frontend/src/hooks/useAuth.ts` - Authentication state management
2. `frontend/src/hooks/useSession.ts` - Session timeout handling

#### **Services (2 files):**
1. `frontend/src/services/auth.service.ts` - API calls for authentication
2. `frontend/src/services/user.service.ts` - API calls for user management

#### **Types (2 files):**
1. `frontend/src/types/auth.types.ts` - TypeScript types for auth
2. `frontend/src/types/user.types.ts` - TypeScript types for users

#### **Utils (2 files):**
1. `frontend/src/utils/security.utils.ts` - Client-side security helpers
2. `frontend/src/utils/validation.utils.ts` - Form validation utilities

#### **Pages (1 file):**
1. `frontend/src/app/login/page.tsx` - Standalone login page

#### **Configuration (2 files):**
1. `frontend/.env.local` - Frontend environment variables
2. `frontend/.env.example` - Environment template

---

### **📝 MODIFIED EXISTING FILES:**

#### **Backend (4 files):**
1. `avevapi/main.js` - Add authentication routes, session management
2. `avevapi/config/index.js` - Add security configuration
3. `avevapi/lib/database.js` - Add user/auth tables, prepared statements
4. `avevapi/package.json` - Add security dependencies

#### **Frontend (4 files):**
1. `frontend/src/app/layout.tsx` - Add authentication context provider
2. `frontend/src/components/home.tsx` - Add "👥 Admin Users" tab
3. `frontend/middleware.ts` - Add Next.js authentication middleware
4. `frontend/package.json` - Add authentication dependencies

---

### **📚 DOCUMENTATION FILES:**

#### **New Documentation (3 files):**
1. `docs/SECURITY_IMPLEMENTATION.md` - Detailed security implementation guide
2. `docs/DEPLOYMENT_CHECKLIST.md` - Security deployment checklist
3. `docs/USER_MANUAL.md` - Administrator user manual

---

## 🔢 **TOTAL FILE COUNT:**

- **New Backend Files:** 17 files
- **New Frontend Files:** 18 files
- **Modified Files:** 8 files
- **Documentation:** 3 files
- **Configuration:** 4 files

**TOTAL: 50 files to create/modify**

---

## �📦 **NEW DEPENDENCIES**

### **Backend Dependencies (package.json):**
```json
{
  "dependencies": {
    "bcrypt": "^5.1.0",              // Password hashing
    "jsonwebtoken": "^9.0.0",        // JWT tokens
    "express-rate-limit": "^6.7.0",  // Rate limiting
    "joi": "^17.9.0",                // Input validation
    "helmet": "^6.0.0",              // Security headers
    "express-validator": "^6.14.0",  // Request validation
    "crypto": "built-in"             // Encryption utilities
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0"
  }
}
```

### **Frontend Dependencies (package.json):**
```json
{
  "dependencies": {
    "axios": "^1.4.0",               // HTTP client for API calls
    "js-cookie": "^3.0.5",           // Cookie management
    "react-hook-form": "^7.45.0",    // Form handling
    "zod": "^3.22.0"                 // Schema validation
  },
  "devDependencies": {
    "@types/js-cookie": "^3.0.3"
  }
}
```

---

## 🔄 **DEVELOPMENT WORKFLOW**

### **Daily Development Process:**
```
1. Morning Standup (15 min)
   ├── Review previous day progress
   ├── Discuss blockers and solutions
   ├── Plan current day tasks
   └── Update timeline if needed

2. Development (6-7 hours)
   ├── Implement assigned tasks
   ├── Write unit tests for security functions
   ├── Test integration with existing code
   └── Document implementation details

3. Security Review (1 hour)
   ├── Code security review
   ├── Vulnerability assessment
   ├── OWASP compliance check
   └── Security testing

4. Testing & Validation (1 hour)
   ├── Unit tests for new functions
   ├── Integration tests
   ├── Security tests
   └── End-to-end testing

5. Documentation (30 min)
   ├── Update implementation docs
   ├── Document security decisions
   ├── Create user guides
   └── Update deployment guides
```

### **Code Review Process:**
```
1. Self-review before commit
2. Automated security scanning (if available)
3. Peer code review with security focus
4. Security team review for critical components
5. Final approval and merge
```

### **Testing Strategy:**
```
1. Unit Tests: Individual functions (auth, validation, security)
2. Integration Tests: API endpoints, database operations
3. Security Tests: Penetration testing, vulnerability scanning
4. End-to-End Tests: Complete user workflows
5. Performance Tests: Load testing, response times
```

---

## 📊 **PROGRESS TRACKING**

### **Daily Progress Reports:**
- **Tasks Completed**: Check off completed items
- **Issues Found**: Document bugs and security issues
- **Blockers**: Technical challenges and solutions
- **Risk Assessment**: Updated risk status
- **Timeline Status**: On-track, delayed, or ahead

### **Quality Gates:**
- **Code Quality**: Passes linting, follows standards
- **Security**: Passes security review, no vulnerabilities
- **Testing**: 80%+ test coverage, all critical tests pass
- **Documentation**: Complete and up-to-date
- **Performance**: Meets performance requirements

### **Milestone Reviews:**
- **End of Phase 1**: Database and basic auth working
- **End of Phase 2**: User management APIs complete
- **End of Phase 3**: Security controls implemented
- **End of Phase 4**: Frontend authentication complete
- **End of Phase 5**: System ready for production

---

## 🚨 **RISK MANAGEMENT**

### **Technical Risks:**
- **JWT Secret Exposure**: Use environment variables, rotate regularly
- **Database Connection Issues**: Implement connection pooling, retry logic
- **Session State Inconsistency**: Use database transactions, atomic operations
- **Performance Degradation**: Implement caching, optimize queries

### **Security Risks:**
- **Dependency Vulnerabilities**: Regular dependency updates, security scanning
- **Configuration Errors**: Secure defaults, configuration validation
- **Human Error**: Code reviews, automated testing, training

### **Project Risks:**
- **Timeline Delays**: Daily progress tracking, early issue detection
- **Scope Creep**: Strict requirements adherence, change control process
- **Resource Constraints**: Backup plans, knowledge sharing

### **Contingency Plans:**
- **Security Breach**: Immediate isolation, incident response activation
- **Data Loss**: Regular backups, disaster recovery procedures
- **System Downtime**: Redundancy planning, failover procedures

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Success:**
- [ ] Users can login securely with username/password
- [ ] Session management works (1 hour timeout, one session per user)
- [ ] Admin users can manage other admin accounts
- [ ] All security controls function properly
- [ ] Audit logging captures all security events

### **Security Success:**
- [ ] No critical vulnerabilities found
- [ ] All OWASP Top 10 risks mitigated
- [ ] Security testing passes with 95%+ score
- [ ] Incident response procedures tested

### **Quality Success:**
- [ ] Code coverage >80% for security functions
- [ ] Performance meets requirements (<500ms response time)
- [ ] Documentation complete and accurate
- [ ] User acceptance testing passes

### **Deployment Success:**
- [ ] Secure deployment to private network
- [ ] Configuration properly secured
- [ ] Monitoring systems operational
- [ ] Administrator training complete

---

## 📞 **COMMUNICATION PLAN**

### **Daily Communication:**
- **Standup Meetings**: 9:00 AM - Progress updates, blocker discussion
- **End-of-Day Reports**: 5:00 PM - Daily accomplishments, next day plans

### **Weekly Communication:**
- **Progress Reviews**: Every Friday - Week summary, risk assessment
- **Security Reviews**: Weekly security status, vulnerability updates

### **Issue Communication:**
- **Blockers**: Immediate notification, collaborative problem-solving
- **Security Issues**: Priority escalation, security team involvement
- **Scope Changes**: Formal change request process

### **Stakeholder Communication:**
- **Weekly Updates**: Progress summaries, milestone achievements
- **Risk Updates**: Changes in risk status, mitigation plans
- **Final Delivery**: Complete system handover, documentation delivery

---

## 🏁 **FINAL DELIVERABLES**

### **Code Deliverables:**
- Complete authentication system
- User management interface
- Security controls implementation
- Audit logging system
- Comprehensive test suite

### **Documentation Deliverables:**
- Security architecture documentation
- API documentation
- User guides for administrators
- Deployment and maintenance guides
- Incident response procedures

### **Training Deliverables:**
- Administrator training materials
- Security awareness guidelines
- System maintenance procedures
- Troubleshooting guides

**Implementation Pipeline: READY FOR EXECUTION** ✅

---

## 🏗️ **TECHNICAL ARCHITECTURE**

### **Database Schema:**
```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  created_by TEXT, -- ID of admin who created this account
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME
);

-- Audit logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT, -- login, logout, create_user, delete_user, etc.
  details TEXT, -- JSON details
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User sessions table (for one-session-per-user enforcement)
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE, -- One session per user
  token_hash TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **API Endpoints:**
- `POST /api/auth/login` - User login with security validation
- `POST /api/auth/logout` - User logout (perfect logout)
- `GET /api/auth/me` - Get current user info and session validation
- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only, soft delete)

### **Frontend Pages:**
- `/login` - Standalone login page with validation
- `/admin/users` - User management tab (integrated in home.tsx)
- Protected routes with authentication middleware

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Pre-Implementation:**
- [ ] Review all security requirements
- [ ] Setup development environment
- [ ] Install required dependencies
- [ ] Create database migration scripts
- [ ] Setup environment variables

### **Phase 1 Implementation:**
- [ ] Database schema creation
- [ ] Authentication backend
- [ ] Basic security controls
- [ ] API testing

### **Phase 2 Implementation:**
- [ ] User management backend
- [ ] Advanced security features
- [ ] Audit logging system

### **Phase 3 Implementation:**
- [ ] Login page frontend
- [ ] User management UI
- [ ] Integration testing

### **Phase 4 Implementation:**
- [ ] Security testing
- [ ] Performance optimization
- [ ] Documentation completion

### **Post-Implementation:**
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Administrator training

---

## ✅ **DOCUMENT COMPLETENESS CHECKLIST**

### **📋 1. DATABASE SCHEMA - LENGKAP ✅**

#### **Tabel yang Akan Dibuat (3 tabel):**

**1️⃣ Tabel `users`** - User credentials dan status
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- UUID untuk user
  username TEXT UNIQUE NOT NULL,    -- Username untuk login
  password_hash TEXT NOT NULL,      -- Hashed password (bcrypt)
  full_name TEXT,                   -- Nama lengkap admin
  email TEXT,                       -- Email admin
  created_by TEXT,                  -- ID admin yang create
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,              -- Timestamp login terakhir
  is_active BOOLEAN DEFAULT 1,      -- Status aktif/disabled
  login_attempts INTEGER DEFAULT 0, -- Counter failed login
  locked_until DATETIME,            -- Timestamp unlock otomatis
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```
**Fungsi:** Menyimpan data admin, credentials, dan status account

**2️⃣ Tabel `audit_logs`** - Security event logging
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,              -- UUID untuk log entry
  user_id TEXT,                     -- ID user yang melakukan action
  action TEXT,                      -- Jenis action (login, logout, dll)
  details TEXT,                     -- JSON dengan detail tambahan
  ip_address TEXT,                  -- IP address client
  user_agent TEXT,                  -- Browser/device info
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```
**Fungsi:** Mencatat semua security events untuk compliance dan investigation

**3️⃣ Tabel `user_sessions`** - One session per user enforcement
```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,              -- UUID untuk session
  user_id TEXT UNIQUE,              -- ID user (UNIQUE = one session only)
  token_hash TEXT,                  -- Hashed JWT token
  expires_at DATETIME,              -- Session expiration time
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,                  -- IP address saat login
  user_agent TEXT,                  -- Device info
  is_active BOOLEAN DEFAULT 1,      -- Status session
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```
**Fungsi:** Enforce one active session per user, session tracking

---

### **🔄 2. AUTHENTICATION FLOW - LENGKAP ✅**

#### **Login Flow:**
```
1. User masukkan username + password di /login page
   ↓
2. Frontend kirim POST /api/auth/login
   ↓
3. Backend validate credentials:
   - Check username exists
   - Verify password hash (bcrypt)
   - Check account locked (locked_until)
   - Check account active (is_active)
   ↓
4. Jika credentials VALID:
   a. Check existing active session di user_sessions
   b. Jika ada session lama → invalidate (perfect logout)
   c. Reset login_attempts = 0
   d. Update last_login timestamp
   e. Generate JWT access token (1 jam)
   f. Generate JWT refresh token (7 hari) jika remember me
   g. Create new session di user_sessions
   h. Set HTTP-only secure cookies
   i. Log audit: LOGIN_SUCCESS
   j. Return user data + redirect to trigger tab
   ↓
5. Jika credentials INVALID:
   a. Increment login_attempts
   b. Jika login_attempts >= 5 → set locked_until (30 min)
   c. Log audit: LOGIN_FAILED
   d. Return error message (generic untuk security)
```

#### **Session Management Flow:**
```
1. Setiap API request:
   ↓
2. Auth middleware validate JWT token:
   - Check token signature
   - Check token expiration
   - Check token blacklist (jika logout)
   ↓
3. Jika token VALID:
   - Update session expires_at (sliding expiration)
   - Allow request
   ↓
4. Jika token EXPIRED:
   - Check refresh token (jika ada)
   - Generate new access token
   - Continue request
   ↓
5. Jika NO valid token:
   - Return 401 Unauthorized
   - Redirect to /login
```

#### **Logout Flow:**
```
1. User click logout button
   ↓
2. Frontend kirim POST /api/auth/logout
   ↓
3. Backend:
   a. Invalidate current session (set is_active = 0)
   b. Delete session dari user_sessions
   c. Clear HTTP-only cookies
   d. Log audit: LOGOUT
   e. Return success
   ↓
4. Frontend:
   a. Clear local state
   b. Redirect to /login page
```

---

### **👥 3. USER MANAGEMENT FLOW - LENGKAP ✅**

#### **Create User Flow:**
```
1. Admin buka tab "👥 Admin Users"
   ↓
2. Click "Create New User" button
   ↓
3. Form modal muncul dengan fields:
   - Username (3-50 chars, alphanumeric)
   - Password (8+ chars, letter + number)
   - Full Name (optional)
   - Email (optional)
   ↓
4. Frontend validate input client-side
   ↓
5. Kirim POST /api/users dengan data
   ↓
6. Backend:
   a. Validate admin authentication
   b. Validate input (Joi schema)
   c. Check username unique
   d. Hash password (bcrypt, 12 rounds)
   e. Generate UUID untuk id
   f. Insert ke users table dengan created_by = current admin
   g. Log audit: USER_CREATED
   h. Return success + new user data
   ↓
7. Frontend refresh user list
```

#### **Edit User Flow:**
```
1. Admin click edit button pada user
   ↓
2. Form modal dengan current data
   ↓
3. Admin edit: full_name dan/atau email (tidak bisa edit username/password)
   ↓
4. Kirim PUT /api/users/:id
   ↓
5. Backend:
   a. Validate admin authentication
   b. Validate input
   c. Check user exists
   d. Update users table
   e. Log audit: USER_UPDATED
   f. Return success
   ↓
6. Frontend refresh user list
```

#### **Disable/Enable User Flow:**
```
1. Admin toggle switch disable/enable
   ↓
2. Confirmation dialog muncul
   ↓
3. Kirim PUT /api/users/:id dengan is_active = 0/1
   ↓
4. Backend:
   a. Validate admin authentication
   b. Update is_active di users table
   c. Jika disable: invalidate active sessions
   d. Log audit: USER_DISABLED / USER_ENABLED
   e. Return success
   ↓
5. Frontend update UI status
```

#### **Delete User Flow:**
```
1. Admin click delete button
   ↓
2. Confirmation dialog dengan warning
   ↓
3. Kirim DELETE /api/users/:id
   ↓
4. Backend:
   a. Validate admin authentication
   b. Check: tidak bisa delete diri sendiri
   c. Soft delete: set is_active = 0 atau hard delete
   d. Invalidate all user sessions
   e. Log audit: USER_DELETED
   f. Return success
   ↓
5. Frontend remove dari list
```

---

### **🔐 4. SECURITY CONTROLS - LENGKAP ✅**

#### **Password Security:**
- ✅ Minimum 8 characters
- ✅ Must contain letters AND numbers
- ✅ Bcrypt hashing (12 rounds)
- ✅ Never log or display passwords
- ✅ Client + server validation

#### **Account Protection:**
- ✅ Failed login counter (login_attempts)
- ✅ Account locking after 5 failed attempts
- ✅ Auto unlock after 30 minutes (locked_until)
- ✅ Rate limiting: 10 attempts per IP per hour

#### **Session Security:**
- ✅ One active session per user (UNIQUE user_id)
- ✅ JWT tokens dengan expiration (1 hour)
- ✅ HTTP-only cookies (prevent XSS)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Sliding expiration (reset on activity)
- ✅ Perfect logout (invalidate all sessions)

#### **Audit Logging:**
- ✅ All security events logged
- ✅ IP address tracking
- ✅ User agent tracking
- ✅ Timestamp tracking
- ✅ 90-day retention
- ✅ Log encryption untuk sensitive data

#### **Input Validation:**
- ✅ Client-side validation (React Hook Form + Zod)
- ✅ Server-side validation (Joi)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input sanitization)

---

### **📁 5. FILE STRUCTURE - LENGKAP ✅**

#### **Backend Files (14 new + 4 modified = 18 files):**

**Middleware (4 files):**
- ✅ `avevapi/middleware/auth.middleware.js` - JWT validation
- ✅ `avevapi/middleware/admin.middleware.js` - Admin access control
- ✅ `avevapi/middleware/security.middleware.js` - Rate limiting
- ✅ `avevapi/middleware/session.middleware.js` - Session management

**Services (3 files):**
- ✅ `avevapi/services/auth.service.js` - Login, logout, session
- ✅ `avevapi/services/user.service.js` - User CRUD
- ✅ `avevapi/services/audit.service.js` - Audit logging

**Routes (2 files):**
- ✅ `avevapi/routes/auth.js` - Authentication endpoints
- ✅ `avevapi/routes/users.js` - User management endpoints

**Utils (3 files):**
- ✅ `avevapi/utils/security.utils.js` - Hashing, tokens
- ✅ `avevapi/utils/validation.utils.js` - Input validation
- ✅ `avevapi/utils/audit.utils.js` - Audit helpers

**Config (2 files):**
- ✅ `avevapi/.env` - Environment variables
- ✅ `avevapi/.env.example` - Template

**Modified (4 files):**
- ✅ `avevapi/main.js` - Add auth routes
- ✅ `avevapi/config/index.js` - Add security config
- ✅ `avevapi/lib/database.js` - Add tables
- ✅ `avevapi/package.json` - Add dependencies

#### **Frontend Files (17 new + 4 modified = 21 files):**

**Components (7 files):**
- ✅ `frontend/src/components/auth/LoginForm.tsx`
- ✅ `frontend/src/components/auth/ProtectedRoute.tsx`
- ✅ `frontend/src/components/auth/SessionManager.tsx`
- ✅ `frontend/src/components/admin/UserManagement.tsx`
- ✅ `frontend/src/components/admin/UserList.tsx`
- ✅ `frontend/src/components/admin/UserForm.tsx`
- ✅ `frontend/src/components/admin/UserActions.tsx`

**Hooks (2 files):**
- ✅ `frontend/src/hooks/useAuth.ts`
- ✅ `frontend/src/hooks/useSession.ts`

**Services (2 files):**
- ✅ `frontend/src/services/auth.service.ts`
- ✅ `frontend/src/services/user.service.ts`

**Types (2 files):**
- ✅ `frontend/src/types/auth.types.ts`
- ✅ `frontend/src/types/user.types.ts`

**Utils (2 files):**
- ✅ `frontend/src/utils/security.utils.ts`
- ✅ `frontend/src/utils/validation.utils.ts`

**Pages (1 file):**
- ✅ `frontend/src/app/login/page.tsx`

**Config (2 files):**
- ✅ `frontend/.env.local`
- ✅ `frontend/.env.example`

**Modified (4 files):**
- ✅ `frontend/src/app/layout.tsx` - Auth context
- ✅ `frontend/src/components/home.tsx` - Admin Users tab
- ✅ `frontend/middleware.ts` - Next.js auth middleware
- ✅ `frontend/package.json` - Dependencies

---

### **📦 6. DEPENDENCIES - LENGKAP ✅**

#### **Backend (7 packages):**
- ✅ `bcrypt` (^5.1.0) - Password hashing
- ✅ `jsonwebtoken` (^9.0.0) - JWT tokens
- ✅ `express-rate-limit` (^6.7.0) - Rate limiting
- ✅ `joi` (^17.9.0) - Input validation
- ✅ `helmet` (^6.0.0) - Security headers
- ✅ `express-validator` (^6.14.0) - Request validation
- ✅ `crypto` (built-in) - Encryption utilities

#### **Frontend (4 packages):**
- ✅ `axios` (^1.4.0) - HTTP client
- ✅ `js-cookie` (^3.0.5) - Cookie management
- ✅ `react-hook-form` (^7.45.0) - Form handling
- ✅ `zod` (^3.22.0) - Schema validation

---

### **🔌 7. API ENDPOINTS - LENGKAP ✅**

#### **Authentication Endpoints (3):**
- ✅ `POST /api/auth/login` - User login dengan validation
- ✅ `POST /api/auth/logout` - Perfect logout
- ✅ `GET /api/auth/me` - Get current user + session validation

#### **User Management Endpoints (4):**
- ✅ `GET /api/users` - List all users (admin only)
- ✅ `POST /api/users` - Create new user (admin only)
- ✅ `PUT /api/users/:id` - Update user (admin only)
- ✅ `DELETE /api/users/:id` - Delete user (admin only)

**Total: 7 API endpoints**

---

### **📱 8. UI PAGES - LENGKAP ✅**

#### **Pages (2):**
- ✅ `/login` - Standalone login page
- ✅ `/` - Home dengan tab "👥 Admin Users"

#### **Components:**
- ✅ Login form dengan validation
- ✅ User list dengan status indicators
- ✅ Create user modal/form
- ✅ Edit user modal/form
- ✅ Delete confirmation dialog
- ✅ Disable/enable toggle
- ✅ Protected route wrapper
- ✅ Session timeout handler

---

### **📋 9. IMPLEMENTATION PHASES - LENGKAP ✅**

#### **Phase 1: Database & Backend (2 hari)** ✅
- Day 1: Database schema creation
- Day 2: Authentication backend + security

#### **Phase 2: User Management (1 hari)** ✅
- Day 3: User CRUD APIs + audit logging

#### **Phase 3: Advanced Security (2 hari)** ✅
- Day 4: Account locking + session management
- Day 5: Audit trail + monitoring

#### **Phase 4: Frontend (2 hari)** ✅
- Day 6: Login page + authentication
- Day 7: User management UI

#### **Phase 5: Testing (1 hari)** ✅
- Day 8: Integration + security testing

**Total: 8 hari**

---

### **🧪 10. TESTING STRATEGY - LENGKAP ✅**

#### **Unit Tests:**
- ✅ Password hashing/validation
- ✅ JWT token generation/verification
- ✅ Input validation functions
- ✅ Audit logging functions

#### **Integration Tests:**
- ✅ Authentication endpoints
- ✅ User management endpoints
- ✅ Session management
- ✅ Database operations

#### **Security Tests:**
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Account locking
- ✅ Session security

#### **End-to-End Tests:**
- ✅ Complete login flow
- ✅ User management workflow
- ✅ Session timeout handling
- ✅ Perfect logout

---

### **📊 11. DOCUMENTATION - LENGKAP ✅**

#### **Technical Documentation:**
- ✅ Database schema dengan penjelasan
- ✅ API endpoints dengan request/response
- ✅ Authentication flow diagram
- ✅ Security architecture
- ✅ Deployment checklist

#### **Security Documentation:**
- ✅ Threat modeling
- ✅ Security controls matrix
- ✅ Incident response plan
- ✅ Security testing checklist

#### **User Documentation:**
- ✅ Administrator user manual (planned)
- ✅ Security awareness guidelines (planned)
- ✅ Troubleshooting guide (planned)

---

### **✅ FINAL VERIFICATION SUMMARY**

| Category | Status | Details |
|----------|--------|---------|
| **Database Schema** | ✅ LENGKAP | 3 tables defined with relationships |
| **Authentication Flow** | ✅ LENGKAP | Login, session, logout flows documented |
| **User Management Flow** | ✅ LENGKAP | Create, edit, disable, delete flows |
| **Security Controls** | ✅ LENGKAP | 12 security controls defined |
| **File Structure** | ✅ LENGKAP | 50 files to create/modify |
| **Dependencies** | ✅ LENGKAP | 11 packages specified |
| **API Endpoints** | ✅ LENGKAP | 7 endpoints documented |
| **UI Pages** | ✅ LENGKAP | 2 pages + 8 components |
| **Implementation Phases** | ✅ LENGKAP | 5 phases, 8 days timeline |
| **Testing Strategy** | ✅ LENGKAP | 4 testing levels defined |
| **Documentation** | ✅ LENGKAP | Technical + security docs |

---

## 🎯 **KELENGKAPAN DOKUMEN: 100% LENGKAP** ✅

### **Yang Sudah Tercakup:**
✅ Requirements lengkap (functional + security)  
✅ Database schema 3 tabel dengan relasi  
✅ Authentication flow (login, session, logout)  
✅ User management flow (CRUD lengkap)  
✅ Security architecture (12 controls)  
✅ File structure (50 files detail)  
✅ Dependencies (11 packages)  
✅ API endpoints (7 endpoints)  
✅ UI design (2 pages + components)  
✅ Implementation timeline (8 hari)  
✅ Testing strategy (4 levels)  
✅ Risk management  
✅ Deployment checklist  

### **Ready untuk Eksekusi:**
- **Database**: Schema SQL siap execute
- **Backend**: File structure + dependencies jelas
- **Frontend**: Components + pages terstruktur
- **Security**: Controls + testing defined
- **Timeline**: 8 hari dengan daily breakdown

**STATUS: DOCUMENT COMPLETE - READY FOR IMPLEMENTATION** 🚀

---

*Dokumen ini akan diupdate seiring berjalannya implementasi fitur login.*
- [ ] Implement `/api/users` POST (create new user)
- [ ] Implement `/api/users/:id` PUT (update user)
- [ ] Implement `/api/users/:id` DELETE (soft delete user)
- [ ] **Security**: Add admin-only middleware protection
- [ ] **Audit**: Add audit logging untuk semua user operations
- [ ] **Security**: Validate user permissions (admin only)
- [ ] **NEW**: Track user creation in audit logs
- [ ] Test user management APIs

### **Phase 3: Advanced Security Features (2 hari)** 🔒

#### **Day 4: Account Security & Session Management**
- [ ] **Security**: Implement account locking (5 failed attempts → 30 min lock)
- [ ] **Security**: Add rate limiting (10 attempts/IP/hour)
- [ ] **Session**: Implement one-session-per-user enforcement
- [ ] **Session**: Add session invalidation on logout
- [ ] **Security**: Implement secure cookie settings (HTTP-only, Secure, SameSite)
- [ ] **Session**: Add sliding expiration (reset on activity)
- [ ] **Security**: Add input validation dan sanitization
- [ ] **NEW**: Implement session conflict detection

#### **Day 5: Audit Trail & Monitoring**
- [ ] **Audit**: Implement comprehensive audit logging
- [ ] **Audit**: Add IP address dan user agent tracking
- [ ] **Security**: Implement log encryption untuk sensitive data
- [ ] **Monitoring**: Add security event monitoring
- [ ] **Security**: Implement intrusion detection (suspicious login patterns)
- [ ] **Session**: Add session activity logging
- [ ] **Testing**: Security testing dan vulnerability assessment

### **Phase 4: Frontend Implementation (2 hari)** 🔒

#### **Day 6: Login Page & Authentication**
- [ ] Create `/login` page dengan form validation
- [ ] **Security**: Implement client-side password validation
- [ ] Implement login API integration dengan error handling
- [ ] **Session**: Add JWT token storage (HTTP-only cookies)
- [ ] **NEW**: Handle session conflict messages ("Another session active")
- [ ] Implement auto-redirect ke tab trigger setelah login
- [ ] **Security**: Add CSRF protection
- [ ] **Session**: Implement session timeout handling (1 jam)
- [ ] Add remember me functionality (7 hari)

#### **Day 7: User Management UI + Security**
- [ ] Add "👥 Admin Users" tab di home.tsx
- [ ] Create user list component dengan status indicators
- [ ] **Security**: Implement role-based UI rendering
- [ ] Implement create user modal/form dengan validation
- [ ] Implement edit user functionality
- [ ] Implement disable/enable user toggle
- [ ] Implement delete user dengan confirmation
- [ ] **Security**: Add input sanitization di frontend
- [ ] Add last login info display
- [ ] **NEW**: Show active session status per user

### **Phase 5: Integration & Security Testing (1 hari)** 🔒

#### **Day 8: System Integration & Security Audit**
- [ ] Add protected routes middleware
- [ ] **Security**: Integrate authentication dengan existing components
- [ ] Add logout functionality di UI
- [ ] **Security**: Implement perfect logout (clear all user sessions)
- [ ] **NEW**: Test one-session-per-user behavior
- [ ] Test end-to-end authentication flow
- [ ] Test user management workflow
- [ ] **Security**: Penetration testing
- [ ] **Security**: Security audit dan compliance check
- [ ] Performance testing dan optimization

---

## 🔒 **COMPREHENSIVE SECURITY ARCHITECTURE**

### **Security Principles:**
1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimum required permissions
3. **Fail-Safe Defaults**: Secure by default configuration
4. **Zero Trust**: Never trust, always verify
5. **Audit Everything**: Comprehensive logging

---

## 🛡️ **THREAT MODELING**

### **Threat Actors:**
- **Internal Users**: Legitimate admins with potential malicious intent
- **External Attackers**: Attempting to breach private network
- **Insider Threats**: Authorized users abusing privileges
- **Supply Chain Attacks**: Compromised dependencies

### **Attack Vectors:**
- **Authentication Bypass**: Weak passwords, session hijacking
- **Authorization Bypass**: Privilege escalation, IDOR attacks
- **Data Exposure**: SQL injection, insecure storage
- **Session Attacks**: Cookie theft, session fixation
- **Brute Force**: Password guessing, credential stuffing
- **Denial of Service**: Account locking abuse, resource exhaustion

### **Assets to Protect:**
- **User Credentials**: Passwords, session tokens
- **User Data**: Personal information, login history
- **System Access**: Admin privileges, system configuration
- **Audit Logs**: Security event records
- **Database Integrity**: Data consistency and availability

---

## 🔐 **SECURITY CONTROLS MATRIX**

| Security Control | Implementation | Status |
|------------------|----------------|--------|
| **Authentication** | JWT + bcrypt password hashing | ✅ Planned |
| **Authorization** | Role-based access (admin only) | ✅ Planned |
| **Session Management** | One session per user, sliding expiration | ✅ Planned |
| **Password Security** | 8+ chars, letter+number requirement | ✅ Planned |
| **Account Protection** | 5 failed attempts → 30 min lock | ✅ Planned |
| **Rate Limiting** | 10 login attempts per IP/hour | ✅ Planned |
| **Audit Logging** | All security events logged | ✅ Planned |
| **Input Validation** | Server & client-side validation | ✅ Planned |
| **Data Encryption** | Passwords hashed, logs encrypted | ✅ Planned |
| **Secure Cookies** | HTTP-only, Secure, SameSite | ✅ Planned |
| **CSRF Protection** | Token-based CSRF prevention | ✅ Planned |
| **XSS Prevention** | Input sanitization, Content Security Policy | ✅ Planned |

---

## 🔍 **DETAILED SECURITY IMPLEMENTATION**

### **1. Authentication Security:**

#### **Password Hashing:**
```javascript
// bcrypt configuration
const saltRounds = 12; // Industry standard
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verification
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

#### **JWT Token Security:**
```javascript
// Access Token (short-lived)
const accessToken = jwt.sign(
  { userId: user.id, role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Refresh Token (long-lived)
const refreshToken = jwt.sign(
  { userId: user.id, type: 'refresh' },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

#### **Token Storage:**
- **Access Token**: HTTP-only cookie (not accessible via JavaScript)
- **Refresh Token**: HTTP-only cookie (secure storage)
- **No localStorage**: Prevents XSS attacks

### **2. Session Security:**

#### **One Session Per User:**
```sql
-- user_sessions table
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### **Session Management Logic:**
```javascript
// Login: Check and invalidate existing sessions
async function handleLogin(username, password, clientIP, userAgent) {
  const user = await validateCredentials(username, password);
  
  // Find existing active session
  const existingSession = await db.getActiveSession(user.id);
  if (existingSession) {
    await db.invalidateSession(existingSession.id);
    await auditLog('session_terminated', {
      userId: user.id,
      reason: 'new_login',
      oldSessionId: existingSession.id,
      ip: clientIP
    });
  }
  
  // Create new session
  const sessionToken = generateSecureToken();
  const session = await db.createSession({
    userId: user.id,
    sessionToken,
    ipAddress: clientIP,
    userAgent,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  });
  
  return { accessToken, refreshToken, session };
}
```

### **3. Account Protection:**

#### **Failed Login Tracking:**
```javascript
async function handleFailedLogin(username, ipAddress) {
  const user = await db.getUserByUsername(username);
  if (!user) return; // Don't reveal if user exists
  
  // Increment failed attempts
  user.login_attempts += 1;
  
  // Lock account after 5 failed attempts
  if (user.login_attempts >= 5) {
    user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await auditLog('account_locked', {
      userId: user.id,
      reason: 'failed_attempts',
      attempts: user.login_attempts,
      ip: ipAddress
    });
  }
  
  await db.updateUser(user);
}
```

#### **Rate Limiting:**
```javascript
// Express rate limiting configuration
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per IP
  message: {
    error: 'Too many login attempts',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Store in memory for private network (consider Redis for scaling)
});
```

### **4. Audit Logging:**

#### **Audit Events:**
```javascript
const AUDIT_EVENTS = {
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  SESSION_TERMINATED: 'session_terminated',
  
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_DISABLED: 'user_disabled',
  USER_ENABLED: 'user_enabled',
  
  // Security
  PASSWORD_CHANGED: 'password_changed',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};
```

#### **Audit Log Structure:**
```javascript
async function auditLog(event, details, userId = null, ipAddress = null, userAgent = null) {
  const logEntry = {
    id: generateUUID(),
    user_id: userId,
    action: event,
    details: JSON.stringify(details),
    ip_address: ipAddress,
    user_agent: userAgent,
    timestamp: new Date()
  };
  
  // Encrypt sensitive details if needed
  if (details.password || details.token) {
    logEntry.details = encrypt(JSON.stringify(details));
  }
  
  await db.insertAuditLog(logEntry);
}
```

### **5. Input Validation & Sanitization:**

#### **Server-side Validation:**
```javascript
const userValidation = {
  username: Joi.string().min(3).max(50).alphanum().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*\d)/).required(),
  email: Joi.string().email().optional(),
  full_name: Joi.string().min(2).max(100).optional()
};

function validateUserInput(data, schema) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new ValidationError(error.details.map(d => d.message));
  }
  return value;
}
```

#### **SQL Injection Prevention:**
```javascript
// Use parameterized queries
const user = await db.prepare(`
  SELECT * FROM users 
  WHERE username = ? AND is_active = 1
`).get(username);
```

### **6. Error Handling Security:**

#### **Secure Error Messages:**
```javascript
// DON'T reveal sensitive information
// ❌ Bad: "User 'admin' not found"
// ✅ Good: "Invalid username or password"

// DON'T leak system information
// ❌ Bad: "SQL syntax error at line 45"
// ✅ Good: "An error occurred. Please try again."
```

### **7. Configuration Security:**

#### **Environment Variables:**
```bash
# Security-related environment variables
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=different-secret-for-refresh-tokens
SESSION_SECRET=random-session-secret
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=10
ACCOUNT_LOCK_ATTEMPTS=5
ACCOUNT_LOCK_DURATION_MINUTES=30
```

---

## 🧪 **SECURITY TESTING CHECKLIST**

### **Authentication Testing:**
- [ ] Password complexity enforcement
- [ ] JWT token expiration
- [ ] Invalid token handling
- [ ] Refresh token rotation
- [ ] Concurrent session limits

### **Authorization Testing:**
- [ ] Admin-only access control
- [ ] API endpoint protection
- [ ] Role-based UI rendering
- [ ] Permission validation

### **Session Management Testing:**
- [ ] Session timeout (1 hour)
- [ ] One session per user enforcement
- [ ] Session invalidation on logout
- [ ] Secure cookie attributes

### **Account Protection Testing:**
- [ ] Failed login attempt counting
- [ ] Account locking mechanism
- [ ] Automatic unlock after timeout
- [ ] Rate limiting effectiveness

### **Audit Logging Testing:**
- [ ] All security events logged
- [ ] Log integrity (no tampering)
- [ ] Log retention (90 days)
- [ ] Log access controls

### **Input Validation Testing:**
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Input sanitization
- [ ] File upload security (if applicable)

### **Vulnerability Testing:**
- [ ] OWASP Top 10 coverage
- [ ] Dependency vulnerability scanning
- [ ] Configuration review
- [ ] Code security review

---

## 📋 **INCIDENT RESPONSE PLAN**

### **Security Incident Categories:**
1. **Unauthorized Access**: Brute force, credential theft
2. **Data Breach**: Sensitive data exposure
3. **System Compromise**: Malware, backdoors
4. **Denial of Service**: Account locking abuse
5. **Insider Threat**: Authorized user abuse

### **Response Procedures:**

#### **Immediate Response (0-1 hour):**
- Isolate affected systems
- Preserve evidence (logs, memory dumps)
- Notify security team
- Assess damage scope

#### **Investigation (1-4 hours):**
- Analyze audit logs
- Identify attack vector
- Determine data exposure
- Document findings

#### **Containment (4-8 hours):**
- Change all compromised credentials
- Revoke active sessions
- Implement temporary security measures
- Monitor for further attacks

#### **Recovery (8-24 hours):**
- Restore from clean backups
- Verify system integrity
- Monitor for anomalies
- Update security controls

#### **Post-Incident (1-7 days):**
- Root cause analysis
- Update security policies
- Implement preventive measures
- Report to stakeholders

### **Communication Plan:**
- **Internal**: Security team, system administrators
- **External**: If required by compliance (none for private system)
- **Users**: Notify affected users about security measures

---

## 📊 **COMPLIANCE CONSIDERATIONS**

### **For Private Network Deployment:**
- **No GDPR/CCPA**: Internal system, no personal data collection
- **No PCI DSS**: No payment processing
- **No HIPAA**: No health data
- **Internal Security Standards**: Follow organizational security policies

### **Recommended Practices:**
- **Data Classification**: Identify sensitive data
- **Access Controls**: Implement least privilege
- **Regular Audits**: Quarterly security reviews
- **Training**: Security awareness for administrators

---

## 🔧 **SECURITY MONITORING & ALERTS**

### **Real-time Monitoring:**
- Failed login attempts (>3 per user)
- Multiple login attempts from same IP
- Account lockouts
- Session anomalies
- Unusual login times/patterns

### **Alert Thresholds:**
```javascript
const ALERT_THRESHOLDS = {
  FAILED_LOGINS_PER_HOUR: 10,
  ACCOUNT_LOCKOUTS_PER_HOUR: 5,
  SUSPICIOUS_IPS: 3,
  SESSION_ANOMALIES: 2
};
```

### **Automated Responses:**
- Temporary IP blocks for brute force
- Account lockouts for suspicious activity
- Alert notifications to administrators
- Log escalation for investigation

---

## 🚀 **DEPLOYMENT SECURITY CHECKLIST**

### **Pre-Deployment:**
- [ ] Environment variables configured securely
- [ ] Database initialized with secure defaults
- [ ] SSL/TLS certificates (if HTTPS needed)
- [ ] Firewall rules configured
- [ ] Backup systems tested

### **Deployment:**
- [ ] Secure file permissions
- [ ] Service accounts with minimal privileges
- [ ] Configuration files protected
- [ ] Log files secured
- [ ] Monitoring systems enabled

### **Post-Deployment:**
- [ ] Security testing completed
- [ ] Penetration testing passed
- [ ] Baseline security metrics established
- [ ] Incident response plan tested
- [ ] Administrator training completed

---

## 📈 **SECURITY METRICS & KPIs**

### **Authentication Metrics:**
- Successful login rate (>99%)
- Failed login attempts (<1%)
- Account lockout incidents (<0.1%)
- Session timeout compliance (100%)

### **Security Incident Metrics:**
- Time to detect incidents (<1 hour)
- Time to respond (<4 hours)
- False positive rate (<5%)
- Incident resolution time (<24 hours)

### **Audit & Compliance:**
- Audit log completeness (100%)
- Security control effectiveness (>95%)
- Vulnerability remediation time (<7 days)
- Security training completion (100%)

---

## 🎯 **FINAL SECURITY SUMMARY**

### **Security Layers Implemented:**
1. **Network**: Private network isolation
2. **Perimeter**: Rate limiting, account locking
3. **Authentication**: Strong passwords, JWT tokens
4. **Authorization**: Role-based access control
5. **Session**: Secure session management
6. **Data**: Encryption, input validation
7. **Monitoring**: Comprehensive audit logging
8. **Response**: Incident response procedures

### **Risk Mitigation:**
- **High Risk**: Credential theft → Multi-factor session management
- **Medium Risk**: Unauthorized access → Account locking, rate limiting
- **Low Risk**: Data exposure → Encryption, access controls

### **Maintenance Requirements:**
- **Weekly**: Review failed login attempts
- **Monthly**: Security log analysis
- **Quarterly**: Security assessment
- **Annually**: Full security audit

**Security Architecture: PRODUCTION-READY** ✅

---

## 📊 **FINAL TIMELINE**

| Phase | Duration | Key Features | Status |
|-------|----------|--------------|--------|
| **Phase 1**: Database & Auth | 2 hari | Users table, JWT auth, one-session logic | Pending |
| **Phase 2**: User Management | 1 hari | CRUD APIs, audit logging | Pending |
| **Phase 3**: Advanced Security | 2 hari | Account locking, session management | Pending |
| **Phase 4**: Frontend | 2 hari | Login UI, user management tab | Pending |
| **Phase 5**: Testing | 1 hari | Integration testing, security audit | Pending |

**Total: 8 hari** (optimized for private network deployment)

---

## ✅ **DEPLOYMENT CONSIDERATIONS**

### **Private Network Benefits:**
- ✅ **Simplified Security**: No CORS complexity
- ✅ **Network Isolation**: Primary security barrier
- ✅ **Performance**: Lower latency, no public internet exposure
- ✅ **Compliance**: Internal system requirements

### **Configuration:**
```javascript
// Environment variables for private deployment
NODE_ENV=production
FRONTEND_URL=http://internal-server:3000  // Internal only
BACKEND_URL=http://internal-server:3001   // Internal only
SESSION_SECRET=your-secure-secret-here
DATABASE_PATH=/internal/path/to/database.db
```

---

## ❓ **FINAL DISCUSSION POINTS:**

1. **Session Conflict Handling**: Apa pesan yang ditampilkan jika user login dari device lain?
2. **Remember Me Duration**: 7 hari cukup atau perlu lebih lama?
3. **Audit Log Retention**: 90 hari cukup untuk private system?
4. **Password Reset**: Perlu mechanism untuk admin reset password user lain?

**Mari kita finalize semua detail sebelum eksekusi!** 🚀

---

## 🔒 **DETAILED SECURITY ARCHITECTURE**

### **CORS Configuration:**
```javascript
// cors middleware configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
};
```

### **Session Management Strategy:**
```javascript
// JWT + Refresh Token Strategy
{
  accessToken: {
    expiresIn: '1h',     // Short-lived for security
    httpOnly: true,      // Prevent XSS attacks
    secure: true,        // HTTPS only
    sameSite: 'strict'   // CSRF protection
  },
  refreshToken: {
    expiresIn: '7d',     // Longer-lived for convenience
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  }
}
```

### **Security Layers:**
1. **Network Layer**: CORS, HTTPS enforcement
2. **Transport Layer**: JWT tokens, secure cookies
3. **Application Layer**: Input validation, authentication middleware
4. **Data Layer**: Password hashing, audit logging
5. **Monitoring Layer**: Failed login tracking, intrusion detection

---

## 📊 **UPDATED TIMELINE & MILESTONES**

| Phase | Duration | Security Focus | Status |
|-------|----------|----------------|--------|
| **Phase 1**: Database & Auth Backend | 2 hari | Password security, basic auth, CORS | Pending |
| **Phase 2**: User Management Backend | 1 hari | Permission validation, audit logging | Pending |
| **Phase 3**: Advanced Security | 2 hari | Account locking, rate limiting, session security | Pending |
| **Phase 4**: Frontend Implementation | 2 hari | CSRF protection, secure storage, validation | Pending |
| **Phase 5**: Integration & Testing | 1 hari | Security audit, penetration testing | Pending |

**Total Timeline: 8 hari development** (ditingkatkan dari 7 hari untuk security yang lebih baik)

---

## 🚨 **CORS & SESSION DISCUSSION POINTS**

### **CORS Configuration:**
- **Origin**: Hanya allow frontend domain (localhost:3000 untuk dev, domain production untuk prod)
- **Credentials**: Ya, untuk cookie-based authentication
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, X-Requested-With
- **Preflight**: Handle OPTIONS requests properly

### **Session Management Options:**

#### **Option A: JWT-only (Stateless)**
- ✅ Scalable, tidak perlu server-side storage
- ✅ Works well dengan microservices
- ❌ Token tidak bisa diinvalidate secara selektif
- ❌ Logout sulit diimplementasikan dengan sempurna

#### **Option B: Session-based (Stateful)**
- ✅ Bisa invalidate session anytime
- ✅ Perfect logout implementation
- ❌ Perlu server-side storage (Redis/database)
- ❌ Kurang scalable untuk microservices

#### **Option C: JWT + Refresh Token (Hybrid) - RECOMMENDED**
- ✅ Access token short-lived (1 jam) untuk security
- ✅ Refresh token longer-lived (7 hari) untuk convenience
- ✅ Bisa invalidate refresh tokens jika perlu
- ✅ Balance antara security dan usability

### **Session Timeout Strategy:**
- **Sliding Expiration**: Reset timer on activity (recommended)
- **Fixed Expiration**: Strict 1 jam dari login
- **Warning**: Show warning 5 menit sebelum expire

**Rekomendasi saya: JWT + Refresh Token dengan sliding expiration**

---

## ❓ **PERTANYAAN UNTUK DISKUSI:**

1. **CORS**: Apakah perlu custom CORS configuration atau default sudah cukup?
2. **Session**: JWT-only atau JWT + refresh token?
3. **Timeout**: Sliding expiration atau fixed 1 jam?
4. **Logout**: Perfect logout (invalidate all sessions) atau basic logout?
5. **Multi-device**: Allow multiple concurrent sessions atau one session per user?

**Mari kita diskusikan pilihan security yang sesuai dengan use case Anda!** 🔒

---

## 🛠️ **TECHNICAL SPECIFICATIONS**

### **Backend Dependencies:**
```json
{
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "express-rate-limit": "^6.7.0"
}
```

### **Database Schema Details:**
```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT,
  action TEXT NOT NULL, -- login, logout, create_user, update_user, delete_user, disable_user, enable_user
  details TEXT, -- JSON string dengan detail tambahan
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **API Response Formats:**
```javascript
// Login Response
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "full_name": "Administrator",
    "last_login": "2025-10-09T10:00:00Z"
  },
  "token": "jwt_token_here"
}

// User List Response
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "username": "admin1",
      "full_name": "John Doe",
      "email": "john@example.com",
      "is_active": true,
      "last_login": "2025-10-09T09:30:00Z",
      "created_at": "2025-10-01T08:00:00Z"
    }
  ]
}
```

---

## 📊 **TIMELINE & MILESTONES**

| Phase | Duration | Deliverables | Status |
|-------|----------|--------------|--------|
| **Phase 1**: Database & Auth Backend | 2 hari | DB schema, auth APIs, session management | Pending |
| **Phase 2**: User Management Backend | 1 hari | User CRUD APIs, audit logging | Pending |
| **Phase 3**: Security Features | 1 hari | Password validation, rate limiting, security hardening | Pending |
| **Phase 4**: Frontend Implementation | 2 hari | Login page, user management UI, session handling | Pending |
| **Phase 5**: Integration & Testing | 1 hari | End-to-end testing, security audit, documentation | Pending |

**Total Timeline: 7 hari development**

---

## ✅ **ACCEPTANCE CRITERIA**

### **Functional Requirements:**
- [ ] Admin bisa login dengan username/password
- [ ] Session timeout otomatis 1 jam
- [ ] Setiap admin bisa buat akun admin lain
- [ ] User management tab berfungsi lengkap
- [ ] Audit trail mencatat semua aktivitas
- [ ] Remember me berfungsi 7 hari

### **Security Requirements:**
- [ ] Password minimal 8 karakter + huruf + angka
- [ ] 5x failed login → 30 menit lock
- [ ] Rate limiting 10 attempts/IP/hour
- [ ] HTTP-only secure cookies
- [ ] Audit logs 90 hari retention

### **UI/UX Requirements:**
- [ ] Login page standalone di /login
- [ ] Redirect ke tab trigger setelah login
- [ ] User management tab di home
- [ ] Responsive design
- [ ] Error messages yang jelas

---

## 🚨 **RISK MITIGATION**

### **Security Risks:**
- **Password Storage**: Menggunakan bcrypt hashing ✅
- **Session Hijacking**: HTTP-only cookies + secure flags ✅
- **Brute Force**: Rate limiting + account locking ✅
- **Audit Trail**: Comprehensive logging ✅

### **Technical Risks:**
- **Database Migration**: Backup existing data sebelum migration ✅
- **Session Management**: Test thoroughly di multiple browsers ✅
- **API Security**: Validate semua input dan sanitize output ✅

### **Business Risks:**
- **Downtime**: Implementasi incremental, test di staging dulu ✅
- **User Impact**: Maintain existing functionality selama development ✅
- **Data Loss**: Regular backups selama development ✅

---

## 📞 **NEXT STEPS**

1. **Approval**: Review dan approve final requirements
2. **Kickoff**: Setup development environment
3. **Development**: Mulai Phase 1 (Database & Backend)
4. **Daily Standup**: Progress update setiap hari
5. **Testing**: Comprehensive testing setiap phase
6. **Deployment**: Production deployment dengan monitoring

**Status: READY FOR IMPLEMENTATION** 🚀
- **Home Tabs**: Tambah tab "👥 Admin Users" di home.tsx
- **Protected Routes**: Semua route butuh authentication
- **Session Management**: Auto-logout setelah 1 jam

---

## 📊 **Timeline Estimasi**

- **Phase 1**: Database schema + backend auth (2-3 hari)
- **Phase 2**: Frontend login + user management (2-3 hari)
- **Phase 3**: Audit trail + testing (1-2 hari)

**Total: 5-8 hari development**

---

## 🚨 **Next Discussion Points**

1. Password requirements policy
2. Failed login handling
3. User management permissions
4. Audit trail details
5. Additional features (remember me, etc.)

---

## 🚨 **Pertanyaan yang Masih Perlu Dijawab**

- [ ] Password policy requirements? (minimal length, complexity)
- [ ] Rate limiting untuk failed login attempts?
- [ ] Password reset mechanism?
- [ ] Remember me feature?
- [ ] Logout confirmation?
- [ ] Session extension on activity?

---

## 🏗️ **Technical Architecture Plan**

### **Database Schema:**
```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  created_by TEXT, -- ID of admin who created this account
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME
);

-- Audit logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT, -- login, logout, create_user, delete_user, etc.
  details TEXT, -- JSON details
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User sessions table (optional, for session management)
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  token_hash TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **API Endpoints Plan:**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh session
- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### **Frontend Pages:**
- `/login` - Standalone login page
- `/admin/users` - User management tab
- Protected routes with auth middleware

---

*Dokumen ini akan diupdate seiring berjalannya diskusi fitur login.*