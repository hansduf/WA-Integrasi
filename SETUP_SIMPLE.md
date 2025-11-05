# 🚀 AVEVA PI - Setup Development

**Update**: November 3, 2025

---

## � Quick Start (Copy-Paste Ready)

```
START
  |
  /|\- Langkah 1: Clone 3 Repository
  | ├─ Backend:  git clone https://github.com/hansduf/backend-Avevapi.git avevapi
  | ├─ Bot:      git clone https://github.com/hansduf/BotWa-Avevapi.git wa
  | └─ Frontend: git clone https://github.com/hansduf/Frontend-Avevapi.git frontend
  |
  /|\- Langkah 2: Install Dependencies
  | ├─ cd avevapi && npm install && cd ..
  | ├─ cd wa && npm install && cd ..
  | └─ cd frontend && npm install && cd ..
  |
  /|\- Langkah 3: Buat .env Files
  | ├─ avevapi/.env (Backend config)
  | ├─ wa/.env (Bot config)
  | └─ frontend/.env.local (Frontend config)
  |
  /|\- Langkah 4: Jalankan 3 Terminal
  | ├─ Terminal 1: cd avevapi && npm run dev (Port 8001)
  | ├─ Terminal 2: cd wa && npm run dev (scan QR)
  | └─ Terminal 3: cd frontend && npm run dev (Port 3000)
  |
  END (Siap development!)
```

---

## ⚙️ Config: Backend & Frontend

> **Penting:** Ketika port berubah, **harus update di 2 tempat sekaligus**

### Backend (BE) - Port 8001

**File: `avevapi/.env`**
```properties
PORT=8001
HOST=localhost
API_KEY=universal-api-key-2025
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME_NOW!
WA_TIMEOUT=30000
ALLOW_NGROK_COOKIES=true
```

**Jika port berubah (misal 9001):**
1. Ubah `PORT=9001` di `.env`
2. Config akan auto-load dari `avevapi/config/index.js`
3. Backend akan jalan di `http://localhost:9001`

---

### Frontend (FE) - Port 3000

**File: `frontend/.env.local`**
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_API_KEY=universal-api-key-2025
NEXT_PUBLIC_TRIGGERS_ADMIN_KEY=universal-api-key-2025
```

**Jika backend port berubah ke 9001:**
1. Ubah `NEXT_PUBLIC_BACKEND_URL=http://localhost:9001` di `.env.local`
2. Frontend akan proxy ke port baru
3. Restart frontend (`npm run dev`)

**File: `frontend/next.config.js` (Auto-detect, ga perlu edit)**
```javascript
// Line 12: Baca BACKEND_URL dari .env
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001';
```

---

### Bot - Tidak ada Frontend Port (Client Only)

**File: `wa/.env`**
```properties
API_BASE_URL=http://localhost:8001
BOT_NAME=LearnAI Assistant
BOT_PREFIX=🤖
SESSION_PATH=./sessions
DEBUG=true
```

**Jika backend port berubah ke 9001:**
1. Ubah `API_BASE_URL=http://localhost:9001` di `.env`
2. Restart bot (`npm run dev`)

---

## 🔗 Step-by-Step Setup

### Langkah 1: Clone Repository

```bash
mkdir aveva-pi && cd aveva-pi

git clone https://github.com/hansduf/backend-Avevapi.git avevapi
git clone https://github.com/hansduf/BotWa-Avevapi.git wa
git clone https://github.com/hansduf/Frontend-Avevapi.git frontend
```

---

### Langkah 2: Install Dependencies

```bash
cd avevapi && npm install && cd ..
cd wa && npm install && cd ..
cd frontend && npm install && cd ..
```

---

### Langkah 3: Setup `.env` Files

**Backend: `avevapi/.env`**
```properties
PORT=8001
HOST=localhost
API_KEY=universal-api-key-2025
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME_NOW!
WA_TIMEOUT=30000
ALLOW_NGROK_COOKIES=true
```

**Bot: `wa/.env`**
```properties
API_BASE_URL=http://localhost:8001
BOT_NAME=LearnAI Assistant
BOT_PREFIX=🤖
SESSION_PATH=./sessions
DEBUG=true
```

**Frontend: `frontend/.env.local`**
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_API_KEY=universal-api-key-2025
NEXT_PUBLIC_TRIGGERS_ADMIN_KEY=universal-api-key-2025
```

---

### Langkah 4: Jalankan Services

Buka 3 terminal terpisah:

**Terminal 1 - Backend (Jalankan PERTAMA):**
```bash
cd avevapi && npm run dev
```
> Tunggu sampai: `Server running on port 8001`

**Terminal 2 - Bot (Jalankan SETELAH backend siap):**
```bash
cd wa && npm run dev
```
> Tunggu QR code muncul, scan dengan WhatsApp phone

**Terminal 3 - Frontend (Jalankan kapanpun):**
```bash
cd frontend && npm run dev
```
> Buka: `http://localhost:3000`

---

## ✅ Selesai!

| Service | URL |
|---------|-----|
| Backend | `http://localhost:8001` |
| Frontend | `http://localhost:3000` |
| Bot | WhatsApp Connected |

---

## 🔄 Checklist: File yang Perlu Diubah Jika Port Berubah

### ✏️ Jika Backend Port Berubah (8001 → Port Lain)

File yang **HARUS** diubah:

**Backend:**
- [ ] `avevapi/.env` → ubah `PORT=XXXX`

**Bot:**
- [ ] `wa/.env` → ubah `API_BASE_URL=http://localhost:XXXX`

**Frontend (2 tempat!):**
- [ ] `frontend/.env.local` → ubah `NEXT_PUBLIC_BACKEND_URL=http://localhost:XXXX`
- [ ] `frontend/.env.local` → ubah `BACKEND_URL=http://localhost:XXXX` (tambah ini jika belum ada!)

**Setelah ubah:**
- Restart: Backend → Bot → Frontend (urutan penting!)

---

### ✏️ Penjelasan Frontend URL

Frontend punya 2 variable backend URL:

| Variable | Lokasi | Fungsi |
|----------|--------|--------|
| `NEXT_PUBLIC_BACKEND_URL` | `frontend/.env.local` | Client-side (browser) |
| `BACKEND_URL` | `frontend/.env.local` | Server-side (rewrites) |

**Kedua harus sama!** Jika backend port berubah, ubah keduanya.

---

### ✏️ Auto-Config Files (TIDAK perlu diubah manual):

- ✅ `avevapi/config/index.js` → Auto-baca dari `avevapi/.env`
- ✅ `frontend/next.config.js` (line 12) → Auto-baca `BACKEND_URL` dari `.env.local`
- ✅ `wa/index.js` (line 22) → Auto-baca dari `wa/.env`
- ✅ `frontend/src/lib/api.ts` (line 1) → Auto-baca dari `NEXT_PUBLIC_BACKEND_URL`

**Kesimpulannya: Cukup ubah 4 variable di 2 `.env` file!**
- `avevapi/.env`: 1 var (`PORT`)
- `wa/.env`: 1 var (`API_BASE_URL`)
- `frontend/.env.local`: 2 var (`NEXT_PUBLIC_BACKEND_URL` + `BACKEND_URL`)

---

## 📝 File Structure Setelah Setup

```
aveva-pi/
├── avevapi/          ← Backend (Express.js, Port 8001)
│   ├── .env          ← ⭐ PENTING: PORT & API_KEY
│   ├── config/
│   │   └── index.js  ← Auto-load config dari .env
│   └── main.js
│
├── wa/               ← Bot (WhatsApp Client)
│   ├── .env          ← ⭐ PENTING: API_BASE_URL
│   └── index.js
│
└── frontend/         ← Frontend (Next.js, Port 3000)
    ├── .env.local    ← ⭐ PENTING: NEXT_PUBLIC_BACKEND_URL
    ├── next.config.js ← Auto-detect backend URL
    └── src/
        └── lib/
            └── api.ts
```

---

## ⚡ Pro Tips

1. **Port conflict?** Ubah `PORT` di `avevapi/.env` ke port lain (misal 8002)
2. **Bot QR tidak keluar?** Hapus folder `wa/sessions/` lalu restart
3. **Frontend CORS error?** Pastikan `NEXT_PUBLIC_BACKEND_URL` benar di `.env.local`
4. **Bot tidak connect ke backend?** Pastikan `API_BASE_URL` benar di `wa/.env`
