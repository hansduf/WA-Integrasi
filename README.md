# AVEVA PI - WhatsApp Data Platform

## Cara Setup

### 1. Cek IP Address WSL2
Buka terminal Ubuntu (WSL2):
```bash
hostname -I
```
Atau bisa juga:
```bash
ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
```
Copy IP Address yang muncul (contoh: 192.168.137.221)

### 2. Buka `docker-compose.yml`
Cari dan ganti IP dengan IP Anda di **3 tempat**:

1. **Backend** (Line ~23):
   ```yaml
   CORS_ORIGINS=http://YOUR_IP:3002
   ```

2. **Frontend - build args** (Line ~40):
   ```yaml
   - NEXT_PUBLIC_BACKEND_URL=http://YOUR_IP:8002
   ```

3. **Frontend - environment** (Line ~47):
   ```yaml
   - NEXT_PUBLIC_BACKEND_URL=http://YOUR_IP:8002
   ```

Ganti `YOUR_IP` dengan IP yang sudah dicopy dari step 1

### 3. Kalo Mau Ubah Port
Ubah di:
- `docker-compose.yml` → `8002:8002` jadi `XXXX:8002` (backend)
- `docker-compose.yml` → `3002:3002` jadi `YYYY:3002` (frontend)
- `docker-compose.yml` → environment variables sesuai port baru
- `Dockerfile.backend` → `EXPOSE 8002` jadi `EXPOSE XXXX`
- `Dockerfile.frontend` → `EXPOSE 3002` jadi `EXPOSE YYYY`

### 4. Build
```bash
docker-compose build
```

### 5. Run
```bash
docker-compose up
```

### 6. Login
Buka di browser: `http://192.168.137.221:3002`
- Username: `admin`
- Password: `CHANGE_ME_NOW!`

## Command Penting

| Perintah | Fungsi |
|----------|--------|
| `docker-compose up` | Jalankan semua service |
| `docker-compose down` | Stop semua service |
| `docker-compose logs -f backend` | Lihat log backend real-time |
| `docker-compose logs -f frontend` | Lihat log frontend real-time |
| `docker-compose logs -f wa-bot` | Lihat log WhatsApp bot real-time |
| `docker-compose build` | Build ulang image |
| `docker-compose restart` | Restart semua service |

## Struktur Folder

```
WA-Integrasi/
├── avevapi/           ← Backend (Express.js)
├── frontend/          ← Frontend (Next.js)
├── wa/                ← WhatsApp Bot
├── docker-compose.yml ← Konfigurasi Docker
└── Dockerfile.*       ← Image definition
```

## Catatan

- Database auto-created di `avevapi/data/`
- WhatsApp sessions di `wa/sessions/`
- Port default: Backend 8002, Frontend 3002
- Ganti password admin ASAP

---
v1.0 - Simple Documentation
