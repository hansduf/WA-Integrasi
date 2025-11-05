# 📊 ANALISIS LENGKAP: Status Migrasi JSON ke SQLite

**Tanggal Analisis:** 6 Oktober 2025  
**Status:** ⚠️ **MIGRASI BELUM SELESAI - Ada 4 Area Masih Pakai JSON**

---

## ✅ SUDAH SELESAI MIGRASI KE DATABASE

### 1. **Data Sources** ✅ SELESAI
- **Status:** 100% Database
- **File:** `core/data-source-manager.js`
- **Tabel:** `data_sources` (9 records)
- **Bukti:**
  ```javascript
  // Sudah pakai database
  async getAllDataSources() {
    const rows = db.preparedStatements.getAllDataSources.all();
  }
  
  async loadDataSource(id) {
    const row = db.preparedStatements.getDataSource.get(id);
  }
  
  async saveDataSource(dataSource) {
    db.preparedStatements.updateDataSource.run(...);
  }
  ```

### 2. **Messages (Incoming from WA)** ✅ SELESAI
- **Status:** 100% Database
- **File:** `routes/messages.js`
- **Tabel:** `messages` (237 records)
- **API:** `/api/messages` → baca dari database

### 3. **Contacts** ✅ SELESAI
- **Status:** 100% Database
- **File:** `routes/contacts.js`
- **Tabel:** `contacts` (1 record)
- **API:** `/api/contacts` → baca dari database

---

## ⚠️ MASIH PAKAI JSON (Belum Migrasi)

### 1. **Triggers** ⚠️ MASIH JSON
**Lokasi File:** `avevapi/triggers.json`  
**Files Yang Menggunakan:**
- ✅ Database: `core/trigger-engine.js` (sudah migrasi)
- ❌ JSON: `routes/trigger-groups.js` (line 18-30)
- ❌ JSON: `routes/pi_routes.js` (line 29-41)
- ❌ JSON: `routes/triggers.js` (line 137)

**Contoh Kode Yang Masih JSON:**
```javascript
// routes/trigger-groups.js - LINE 18-30
function readTriggers() {
  try {
    const data = fs.readFileSync(triggersPath, 'utf-8');  // ❌ MASIH BACA JSON
    const raw = data ? JSON.parse(data) : {};
    return raw;
  } catch (e) {
    return { behaviors: {}, names: {} };
  }
}

function writeTriggers(obj) {
  fs.writeFileSync(triggersPath, JSON.stringify(obj, null, 2), 'utf-8');  // ❌ MASIH TULIS JSON
}
```

**Tabel Database:** `triggers` (4 records) - **SUDAH ADA TAPI TIDAK DIGUNAKAN!**

**Kenapa Ini Masalah:**
- ⚠️ Data inconsistency: Database ada, JSON juga ada
- ⚠️ Trigger Engine baca dari database, routes baca dari JSON
- ⚠️ Kalau update via API → tulis ke JSON, tapi Trigger Engine tidak lihat

---

### 2. **Trigger Groups** ⚠️ MASIH JSON
**Lokasi File:** `avevapi/trigger-groups.json`  
**Files Yang Menggunakan:**
- ❌ JSON: `routes/trigger-groups.js` (line 48-62)
- ❌ JSON: `routes/pi_routes.js` (line 12-25)
- ❌ JSON: `routes/triggers.js` (line 159)

**Contoh Kode Yang Masih JSON:**
```javascript
// routes/trigger-groups.js - LINE 48-62
function readTriggerGroups() {
  try {
    if (!fs.existsSync(triggerGroupsPath)) {
      return { groups: {}, names: {} };
    }
    const data = fs.readFileSync(triggerGroupsPath, 'utf-8');  // ❌ MASIH BACA JSON
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading trigger groups:', error);
    return { groups: {}, names: {} };
  }
}
```

**Tabel Database:** `trigger_groups` - **MUNGKIN BELUM ADA!**

**Kenapa Ini Masalah:**
- ⚠️ Tidak ada sinkronisasi dengan database
- ⚠️ Kalau JSON hilang/corrupt, data groups hilang

---

### 3. **Messages (Outgoing to WA)** ⚠️ MASIH JSON
**Lokasi File:** `wa/outgoing-messages.json`  
**Files Yang Menggunakan:**
- ❌ JSON: `wa/index.js` (line 170, 1246, 1285, 1344)
- ❌ JSON: `avevapi/main.js` (line 656, 665)

**Contoh Kode Yang Masih JSON:**
```javascript
// wa/index.js - LINE 1244-1268
function addOutgoingMessage(to, message) {
    const logFile = './outgoing-messages.json';

    try {
        let logData = { messages: [] };

        // Read existing log if it exists
        if (fs.existsSync(logFile)) {
            logData = JSON.parse(fs.readFileSync(logFile, 'utf8'));  // ❌ MASIH BACA JSON
        }

        // Add new message
        const newMessage = {
            to: to,
            message: message,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };

        logData.messages.push(newMessage);
        logData.lastUpdate = new Date().toISOString();

        // Write updated log
        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));  // ❌ MASIH TULIS JSON
```

**Tabel Database:** **BELUM ADA!** (Tidak ada tabel `outgoing_messages`)

**Kenapa Ini Masalah:**
- ⚠️ Log pesan keluar tidak terpusat
- ⚠️ Sulit track history pesan WA
- ⚠️ Tidak bisa query/filter dengan SQL

---

### 4. **Config Files (messages.json di main.js)** ⚠️ MASIH JSON
**Lokasi File:** `messages.json` (di root avevapi)  
**Files Yang Menggunakan:**
- ❌ JSON: `avevapi/main.js` (line 556, 726, 842, 983)

**Contoh Kode Yang Masih JSON:**
```javascript
// avevapi/main.js - LINE 556
const messagesData = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));

// LINE 726
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
```

**Purpose:** Mungkin template messages atau config lainnya

**Tabel Database:** **BELUM ADA!**

---

## 📊 RINGKASAN STATUS MIGRASI

| **Komponen**              | **Status**       | **Tabel Database** | **JSON File**              | **Priority** |
|---------------------------|------------------|--------------------|----------------------------|--------------|
| Data Sources              | ✅ Database      | `data_sources` ✅  | ~~data-sources/*.json~~ ❌ | -            |
| Messages (Incoming)       | ✅ Database      | `messages` ✅      | ~~messages.json~~ ❌       | -            |
| Contacts                  | ✅ Database      | `contacts` ✅      | -                          | -            |
| **Triggers**              | ⚠️ **Partial**   | `triggers` ⚠️      | `triggers.json` ⚠️         | **HIGH** 🔴  |
| **Trigger Groups**        | ❌ **JSON Only** | **BELUM ADA** ❌   | `trigger-groups.json` ⚠️   | **HIGH** 🔴  |
| **Outgoing Messages**     | ❌ **JSON Only** | **BELUM ADA** ❌   | `outgoing-messages.json` ⚠️| **MEDIUM** 🟡|
| **Config/Templates**      | ❌ **JSON Only** | **BELUM ADA** ❌   | `messages.json` ⚠️         | **LOW** 🟢   |

---

## 🎯 REKOMENDASI PRIORITAS MIGRASI

### Priority 1: **Triggers** 🔴 CRITICAL
**Alasan:** Data inconsistency - database dan JSON tidak sinkron

**Yang Harus Dilakukan:**
1. ✅ Verifikasi data di tabel `triggers` sudah lengkap
2. ❌ Update `routes/trigger-groups.js` → ganti `readTriggers()` pakai database
3. ❌ Update `routes/pi_routes.js` → ganti `readTriggers()` pakai database
4. ❌ Update `routes/triggers.js` → ganti ke database query
5. ❌ Hapus fungsi `writeTriggers()` yang tulis ke JSON
6. ❌ Test semua CRUD operations untuk triggers

**Estimasi:** 2-3 jam

---

### Priority 2: **Trigger Groups** 🔴 CRITICAL
**Alasan:** Tidak ada di database sama sekali, tapi banyak digunakan

**Yang Harus Dilakukan:**
1. ❌ Buat tabel `trigger_groups` di database
2. ❌ Buat migration script `scripts/migrate-trigger-groups.js`
3. ❌ Migrate data dari `trigger-groups.json` ke database
4. ❌ Update semua routes yang baca `trigger-groups.json`
5. ❌ Test CRUD operations untuk trigger groups

**Estimasi:** 3-4 jam

---

### Priority 3: **Outgoing Messages** 🟡 MEDIUM
**Alasan:** Logging system, tidak kritis tapi berguna untuk tracking

**Yang Harus Dilakukan:**
1. ❌ Buat tabel `outgoing_messages` di database
2. ❌ Update `wa/index.js` → ganti write ke database
3. ❌ Buat API endpoint `/api/outgoing-messages` untuk query history
4. ❌ Optional: Dashboard untuk monitor pesan keluar

**Estimasi:** 2-3 jam

---

### Priority 4: **Config/Templates** 🟢 LOW
**Alasan:** Static config files, jarang berubah

**Yang Harus Dilakukan:**
- Biarkan sebagai JSON file (tidak perlu migrasi)
- Atau migrasi ke environment variables
- Atau migrasi ke tabel `app_config`

**Estimasi:** 1-2 jam (optional)

---

## 🔧 TOOLS UNTUK VERIFIKASI

### Check Database Tables
```bash
cd g:\NExtJS\aveva-pi\avevapi
node -e "import db from './lib/database.js'; console.log(db.database.prepare('SELECT name FROM sqlite_master WHERE type=\\\"table\\\"').all())"
```

### Check Triggers Data
```bash
node -e "import db from './lib/database.js'; console.log(db.preparedStatements.getAllTriggers.all())"
```

### Check Trigger Groups Table
```bash
node -e "import db from './lib/database.js'; try { console.log(db.database.prepare('SELECT * FROM trigger_groups').all()) } catch(e) { console.log('Table not exists:', e.message) }"
```

---

## 📝 KESIMPULAN

### ✅ Yang Sudah Selesai:
- Data Sources: 100% database ✅
- Messages (Incoming): 100% database ✅
- Contacts: 100% database ✅

### ⚠️ Yang Masih Kurang:
- **Triggers:** Partial (database ada tapi routes masih baca JSON) 🔴
- **Trigger Groups:** Belum migrasi sama sekali 🔴
- **Outgoing Messages:** Belum migrasi sama sekali 🟡
- **Config Files:** Optional, bisa tetap JSON 🟢

### 🎯 Next Steps:
1. Migrasi **Triggers** dari JSON ke Database (Priority 1)
2. Migrasi **Trigger Groups** ke Database (Priority 2)
3. Migrasi **Outgoing Messages** ke Database (Priority 3)

**Total Estimasi Waktu:** 7-10 jam untuk complete migration

---

**Apakah kamu mau mulai migrasi dari Priority 1 (Triggers)?** 🚀
