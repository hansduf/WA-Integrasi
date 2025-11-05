# DEBUG AUTH ISSUE - DOKUMENTASI LENGKAP

## 🚨 MASALAH UTAMA
- User login sukses di frontend
- Tab Management error 401 ketika akses `/api/users`
- Cookie tidak efektif meskipun terkirim

## 🔍 TEMUAN DEBUGGING

### ✅ YANG BERHASIL:
1. **Login endpoint OK**
   ```bash
   curl -X POST http://localhost:8001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"Admin123!"}' \
     -c cookies.txt
   # ✅ Response: 200 OK
   # ✅ Set-Cookie: accessToken=... (HttpOnly; SameSite=Strict)
   ```

2. **JWT Token valid**
   ```javascript
   // Token payload:
   {
     "userId": "c23e2d76-a2ab-449c-aa0b-ebd9f8abba9d",
     "username": "admin",
     "iat": 1760068555,
     "exp": 1760072155, // Future time, not expired
     "aud": "aveva-pi-client",
     "iss": "aveva-pi-system"
   }
   ```

3. **Database records OK**
   ```javascript
   // User exists:
   {
     "id": "c23e2d76-a2ab-449c-aa0b-ebd9f8abba9d",
     "username": "admin",
     "is_active": 1,
     "locked_until": null
   }
   
   // Session exists and valid:
   {
     "id": "b818a56b-9265-4382-88d4-da7e488e19a0",
     "user_id": "c23e2d76-a2ab-449c-aa0b-ebd9f8abba9d",
     "expires_at": "2025-10-10T04:55:55.620Z", // Future time
     "is_active": 1
   }
   ```

4. **Auth flow simulation OK**
   ```bash
   node debug-auth-flow.js
   # ✅ Token verification: SUCCESS
   # ✅ User found: true
   # ✅ User active: true
   # ✅ Session found: true
   # ✅ Session valid: true
   ```

### ❌ YANG GAGAL:
1. **Protected endpoint 401**
   ```bash
   curl -X GET http://localhost:8001/api/users -b cookies.txt
   # ❌ Response: 401 Unauthorized
   # ❌ Message: "Authentication required"
   ```

2. **Auth middleware tidak dipanggil**
   - Added debug logs to `auth.middleware.js`
   - Added debug logs to `main.js` route registration
   - **NO LOGS APPEAR** when curl hits `/api/users`
   - This indicates middleware is **NOT BEING CALLED AT ALL**

## 🔬 ROOT CAUSE ANALYSIS

### Kemungkinan masalah:

#### A. **Middleware tidak terdaftar dengan benar**
```javascript
// File: routes/users.js line 22
router.use(authenticateToken); // ✅ Ada

// File: main.js line 114
app.use('/api/users', usersRoutes); // ✅ Ada
```

#### B. **Backend tidak restart setelah perubahan**
- User claim: "backend sudah saya restart ampe enter saya jeboll"
- Tapi debug logs tidak muncul
- **KEMUNGKINAN:** Backend tidak restart dengan benar atau ada error saat startup

#### C. **Request tidak sampai ke Express route handler**
- Ada middleware sebelumnya yang block?
- CORS middleware issue?
- Parse error?

#### D. **Cache atau session issue**
- Express route cache?
- Node.js module cache?

## 🛠️ ACTION PLAN SISTEMATIS

### STEP 1: Verifikasi Backend Status
```bash
# Cek apakah backend benar-benar running di port 8001
curl http://localhost:8001/api/auth/login
# Jika tidak response atau error -> Backend not running properly

# Cek apakah ada error saat startup
# Lihat terminal backend untuk error messages
```

### STEP 2: Force Backend Restart
```bash
# Di terminal backend:
# 1. Ctrl+C (force close)
# 2. Tunggu 5 detik
# 3. node main.js
# 4. Pastikan muncul pesan startup success
# 5. Pastikan tidak ada error
```

### STEP 3: Verifikasi Route Registration
```bash
# Test endpoint lain untuk pastikan Express routing work
curl http://localhost:8001/api/triggers
curl http://localhost:8001/api/data-sources

# Jika endpoints lain juga 404/error -> Express routing broken
```

### STEP 4: Test Minimal Auth
```bash
# Test dengan manual token di header (bypass cookie)
curl -X GET http://localhost:8001/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Jika ini berhasil -> Cookie parsing issue
# Jika ini juga 401 -> Middleware issue
```

### STEP 5: Check Express Middleware Order
```javascript
// Pastikan order middleware di main.js:
app.use(helmet()); // Security headers
app.use(cors(config.cors)); // CORS
app.use(express.json()); // JSON parsing
app.use(cookieParser()); // Cookie parsing <- PENTING!
app.use('/api/users', usersRoutes); // Routes
```

## 🎯 KEMUNGKINAN SOLUSI

### 1. **cookieParser() Missing atau Salah Order**
```javascript
// Di main.js, pastikan ini ada SEBELUM routes:
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

### 2. **Backend Not Fully Restarted**
```bash
# Force restart dengan kill process:
taskkill /f /im node.exe
node main.js
```

### 3. **Express Route Conflict**
```javascript
// Cek apakah ada route lain yang interfere:
app.use('/api', dataSourcesRoutes); // <- INI BISA CONFLICT!
app.use('/api/users', usersRoutes);

// Solusi: Specific routes HARUS sebelum generic routes
```

### 4. **Module Import Issue**
```javascript
// Cek import di routes/users.js:
import { authenticateToken } from '../middleware/auth.middleware.js';
// Pastikan path benar dan file exists
```

## 📋 LANGKAH SELANJUTNYA

1. ✅ **Dokumentasi created** (file ini)
2. ⏳ **Verifikasi cookieParser** di main.js
3. ⏳ **Force restart backend** dengan kill process
4. ⏳ **Test lagi** dengan debug logs
5. ⏳ **Fix route order** jika diperlukan

---

**Generated:** 2025-10-10 03:59 GMT
**Status:** Investigation complete, awaiting verification steps