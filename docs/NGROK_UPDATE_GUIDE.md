# Panduan Update Ngrok URL

## 📋 Overview
Dokumen ini menjelaskan langkah-langkah untuk mengupdate URL ngrok ketika tunnel expired atau Anda membuat tunnel baru untuk AVEVA PI Dashboard.

## 🎯 Situasi yang Memerlukan Update
- Ngrok tunnel expired (biasanya 8 jam untuk free tier)
- Membuat tunnel ngrok baru
- Mengubah port atau konfigurasi ngrok
- Pindah ke paid plan ngrok

## 📁 File yang Perlu Diubah

### 1. Frontend Environment Variable
**File:** `frontend/.env.local`

```bash
# Contoh konfigurasi
NEXT_PUBLIC_BACKEND_URL=https://abcd1234.ngrok-free.app
NEXT_PUBLIC_API_KEY=universal-api-key-2025
NEXT_PUBLIC_TRIGGERS_ADMIN_KEY=universal-api-key-2025
```

### 2. Backend CORS Configuration
**File:** `avevapi/config/index.js`

```javascript
// CORS Configuration
cors: {
  origins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    // Frontend ngrok tunnel for remote access
    'https://xxxxx.ngrok-free.app'  // ← UPDATE INI
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization', 'X-User', 'ngrok-skip-browser-warning'],
  credentials: true
}
```

## 🚀 Langkah-Langkah Update

### Step 1: Persiapkan Ngrok Tunnel Baru
```bash
# Terminal 1 - Frontend tunnel (port 3000)
ngrok http 3000

# Terminal 2 - Backend tunnel (port 8001)
ngrok http 8001
```

**Catat kedua URL yang dihasilkan:**
- Frontend URL: `https://xxxxx.ngrok-free.app`
- Backend URL: `https://yyyyy.ngrok-free.app`

### Step 2: Update Frontend Configuration
Edit file `frontend/.env.local`:

```bash
# Ganti dengan backend URL yang baru
NEXT_PUBLIC_BACKEND_URL=https://yyyyy.ngrok-free.app
```

### Step 3: Update Backend CORS
Edit file `avevapi/config/index.js`:

```javascript
origins: [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  // Update dengan frontend URL yang baru
  'https://xxxxx.ngrok-free.app'
]
```

### Step 4: Restart Server
```bash
# Terminal 1 - Restart Frontend
cd frontend
npm run dev

# Terminal 2 - Restart Backend
cd avevapi
npm run dev
```

### Step 4.1: Enable Cookie Authentication for Ngrok (PENTING!)

#### 🔐 Mengapa Perlu Flag Ini?

Saat testing via ngrok, browser memerlukan cookie dengan atribut `SameSite=None` dan `Secure=true` untuk mengirim cookie lintas domain (cross-site). Tanpa flag ini, cookie authentication TIDAK akan bekerja dan akan mendapat error 401 Unauthorized.

#### 🚀 Cara Mengaktifkan

Pilih salah satu dari dua opsi berikut:

**Option A — ALLOW_NGROK_COOKIES (Recommended untuk ngrok)**

Flag eksplisit khusus untuk development ngrok. Lebih jelas dan self-documenting.

Windows (cmd.exe):
```batch
set ALLOW_NGROK_COOKIES=true
cd avevapi
npm run dev
```

macOS / Linux (bash / zsh):
```bash
export ALLOW_NGROK_COOKIES=true
cd avevapi
npm run dev
```

**Option B — FORCE_HTTPS (Alternatif)**

Flag general untuk memaksa behavior HTTPS. Berguna untuk testing berbagai scenario.

Windows (cmd.exe):
```batch
set FORCE_HTTPS=true
cd avevapi
npm run dev
```

macOS / Linux (bash / zsh):
```bash
export FORCE_HTTPS=true
cd avevapi
npm run dev
```

#### ⚠️ PENTING - Langkah Setelah Restart Backend

1. **Login ULANG via ngrok frontend** (cookie lama tidak akan update otomatis)
2. **Clear browser cookies** untuk domain backend (optional tapi recommended)
3. **Verifikasi di DevTools**:
   - Network → POST /api/auth/login → Response Headers
   - Harus ada: `Set-Cookie: accessToken=...; Secure; SameSite=None`

#### 🔍 Troubleshooting

**Masih 401 setelah set flag?**
- ✅ Sudah restart backend? (env var hanya terbaca saat startup)
- ✅ Sudah login ulang via ngrok? (bukan login di localhost)
- ✅ Cookie attributes benar? (cek DevTools → Application → Cookies)
- ✅ CORS origin sudah include frontend ngrok URL? (cek config/index.js)

**Cookie tidak tersimpan di browser?**
- Coba Chrome incognito tanpa extensions
- Cek browser setting: Allow all cookies (untuk testing)
- Pastikan login via frontend ngrok (bukan localhost)

#### 📝 Note Penting

- ⚠️ Flag ini HANYA untuk development/testing dengan ngrok
- ⚠️ Jangan commit env var ke repository
- ⚠️ Production sudah otomatis pakai Secure cookies (NODE_ENV=production)
- ✅ Localhost development tetap works tanpa flag (menggunakan sameSite: lax)

### Step 5: Test Koneksi
1. Buka browser ke frontend URL: `https://xxxxx.ngrok-free.app`
2. Lakukan hard refresh: `Ctrl+Shift+R`
3. Verifikasi dashboard load dengan data

## 🔧 Troubleshooting

### Error: "Network error: Failed to fetch"
- Pastikan backend URL di `frontend/.env.local` sudah benar
- Restart frontend server setelah update environment variable
- Cek apakah backend server running

### Error: "CORS policy: Request header field not allowed"
- Pastikan `ngrok-skip-browser-warning` ada di `allowedHeaders`
- Update CORS origins dengan frontend URL yang benar
- Restart backend server setelah update konfigurasi

### Dashboard tidak load data
- Cek browser console untuk error details
- Verifikasi kedua ngrok tunnel masih aktif
- Test API endpoint langsung: `https://yyyyy.ngrok-free.app/api/dashboard-data`

## 📝 Quick Update Script

Buat file `update-ngrok.bat` untuk update cepat:

```batch
@echo off
echo === NGROK URL UPDATE TOOL ===
echo.

echo Masukkan URL Frontend Ngrok baru (contoh: https://abcd1234.ngrok-free.app):
set /p FRONTEND_URL=

echo Masukkan URL Backend Ngrok baru (contoh: https://efgh5678.ngrok-free.app):
set /p BACKEND_URL=

echo.
echo Updating frontend/.env.local...
(
echo NEXT_PUBLIC_BACKEND_URL=%BACKEND_URL%
echo NEXT_PUBLIC_API_KEY=universal-api-key-2025
echo NEXT_PUBLIC_TRIGGERS_ADMIN_KEY=universal-api-key-2025
) > frontend/.env.local

echo Updating avevapi/config/index.js...
powershell -Command "
$content = Get-Content 'avevapi/config/index.js' -Raw
$content -replace 'https://[a-zA-Z0-9]+\.ngrok-free\.app(?='', '')', '%FRONTEND_URL%' | Set-Content 'avevapi/config/index.js'
"

echo.
echo ✅ Update selesai!
echo.
echo Next steps:
echo 1. Restart frontend server: cd frontend && npm run dev
echo 2. Restart backend server: cd avevapi && npm run dev
echo 3. Hard refresh browser: Ctrl+Shift+R
echo 4. Test dashboard di: %FRONTEND_URL%
echo.
pause
```

## ✅ Checklist Update
- [ ] Frontend ngrok tunnel aktif (port 3000)
- [ ] Backend ngrok tunnel aktif (port 8001)
- [ ] Frontend URL tercatat
- [ ] Backend URL tercatat
- [ ] `frontend/.env.local` diupdate
- [ ] `avevapi/config/index.js` diupdate
- [ ] Frontend server direstart
- [ ] Backend server direstart
- [ ] Browser di-hard refresh
- [ ] Dashboard dapat diakses dan load data

## 📞 Support
Jika mengalami masalah:
1. Cek browser console untuk error details
2. Verifikasi ngrok tunnel status
3. Test API endpoint secara manual
4. Pastikan semua server running

## 📅 Last Updated
October 2, 2025

## 🔗 Related Documents
- `README.md` - Project overview
- `PROJECT_DOCUMENTATION.md` - Technical documentation
- `AVEVA_PI_CUSTOM_QUERY_DISCUSSION.md` - AVEVA PI integration details</content>
<parameter name="filePath">g:\NExtJS\aveva-pi\NGROK_UPDATE_GUIDE.md