# BUSINESS PROCESS — WA-Integrasi

Dokumen ini menjelaskan alur bisnis utama WA-Integrasi secara ringkas, jelas, dan siap digunakan di laporan. Gunakan bagian "Diagram" untuk gambaran visual cepat dan bagian "Langkah" untuk detail proses.

---

## Diagram (ASCII)

```
   [Admin - Web UI]
        |
        | (1) konfigurasi koneksi, template, trigger
        v
   [Backend / Trigger Engine]
        |         ^
        | (2) simpan konfigurasi, daftar trigger
        v         | (5) hasil query / response
   [Data Sources] |  (AVEVA/PI, Oracle, MySQL, AI)
        ^         |
        | (4) query / ambil data
        |
   [Backend / Formatter]
        |
        | (6) format hasil sesuai template
        v
   [WA Bot (whatsapp-web.js)]
        |
        | (7) kirim balasan / notifikasi
        v
   [User / Operator via WhatsApp]

Parallel: Backend -> [Logs / messages DB / outgoing-messages.json]
Parallel: Admin UI <--- Backend (lihat histori, audit, status koneksi)
```

---

## Langkah proses (penjelasan setiap nomor pada diagram)

1. Admin (melalui web UI) menambahkan atau mengubah konfigurasi koneksi data (mis. AVEVA/PI, Oracle, MySQL), membuat chat template, dan mendefinisikan trigger/aturan yang akan dipanggil oleh bot.

2. Backend menyimpan konfigurasi dan mendaftarkan trigger ke Trigger Engine. Trigger tersimpan di database (migrasi JSON→DB telah dilakukan).

3. Operator/ User mengirim permintaan atau perintah lewat WhatsApp kepada WA Bot (contoh: minta nilai sensor, minta ringkasan alarm).

4. WA Bot menerima pesan, memetakan pesan ke template/trigger yang sesuai, lalu meneruskan request ke Backend (bot melakukan request HTTP ke API backend memakai header `X-API-Key`).

5. Backend menjalankan trigger: mengeksekusi query ke data source yang relevan (AVEVA/PI, Oracle, MySQL, atau memanggil plugin AI jika diatur) dan menunggu hasil.

6. Setelah hasil tersedia, Backend memformat output sesuai chat template yang disimpan (mengganti placeholder, menyesuaikan format agar mudah dibaca di WA).

7. Backend mengirim hasil terformat ke WA Bot; WA Bot mengirim pesan balasan/ notifikasi ke operator via WhatsApp. Semua pesan keluar dan metadata disimpan di tabel `messages` dan/atau `outgoing-messages.json` untuk audit.

---

## Jalur error & retry (singkat)
- Jika koneksi ke data source gagal: Backend mencatat kegagalan, mencoba reconnect sesuai policy (lihat `dataSourceManager`), dan mengirim pesan error yang diformat ke WA Bot bila permintaan berasal dari user.
- Jika WA Bot kehilangan sesi (QR expired): WA Bot mencatat status di `wa/.status/whatsapp-status.json` dan admin diberi notifikasi via UI atau log; proses pengiriman menunggu sampai sesi dipulihkan.
- Jika eksekusi trigger gagal (query error): backend mengembalikan pesan error yang jelas ke bot, dan event error direkam untuk audit.

---

## Titik integrasi utama (file / modul referensi)
- Frontend (Admin UI): `frontend/` — manajemen koneksi, template, trigger, histori.
- Backend: `avevapi/main.js`, `core/trigger-engine.js`, `core/data-source-manager.js`, `routes/*.js` (terutama `routes/triggers.js`, `routes/data-sources.js`, `routes/messages.js`).
- WA Bot: `wa/index.js` — pengelolaan sesi WhatsApp, QR, pengiriman/penerimaan pesan.
- Penyimpanan pesan dan log: `messages` DB table, `outgoing-messages.json`.

---

## Catatan penggunaan singkat (untuk operator & admin)
- Admin: gunakan Frontend untuk menambah/ubah koneksi dan trigger; pantau status koneksi dan sesi WA di halaman admin. Pastikan API Key bot tersimpan di konfigurasi bot.
- Operator: cukup kirim perintah lewat WhatsApp sesuai format yang disepakati (contoh template tersedia pada dokumentasi template chat). Balasan akan dikirim langsung oleh bot.

---

Jika Anda ingin, saya bisa: menyimpan diagram ini ke file PNG/SVG, menambahkan contoh payload pesan WA (contoh request/response), atau memperluas diagram untuk menampilkan alur retry lebih rinci. Mana yang Anda pilih?