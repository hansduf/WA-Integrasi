# GLOSSARY — WA-Integrasi

Dokumen ini menjelaskan istilah teknis dan akronim yang digunakan di proyek WA-Integrasi. Penjelasan ditulis agar dapat dimengerti oleh pembaca non-teknis namun tetap akurat dengan implementasi kode.

## Platform & Framework
- Node.js: Runtime JavaScript untuk menjalankan backend server.
- Express: Framework web untuk Node.js yang menangani rute dan middleware.
- Next.js: Framework React untuk membangun antarmuka web (frontend).
- React: Library JavaScript untuk membangun tampilan pengguna.

## Database & Data Source
- AVEVA/PI: Sistem historian industri yang menyimpan data proses dan alarm.
- SQLite: Database ringan yang digunakan untuk penyimpanan lokal pada sistem (via `better-sqlite3`).
- Oracle, MySQL, PostgreSQL: Contoh database relasional yang dapat dihubungkan melalui plugin/driver.
- Data Source: Sumber data apa pun yang terhubung ke sistem (database, historian, atau layanan AI).
- Plugin Driver: Modul yang menambahkan kemampuan koneksi ke jenis data source tertentu.

## Autentikasi & Keamanan
- JWT (JSON Web Token): Token yang digunakan untuk autentikasi user web.
- API Key: Kunci rahasia yang dipakai layanan otomatis (mis. bot WhatsApp) untuk mengakses API.
- Dual Auth Middleware: Mekanisme otentikasi yang menerima JWT atau API Key sesuai konteks.
- X-API-Key: Header HTTP yang digunakan untuk mengirim API Key dalam permintaan bot.
- CORS: Pengaturan untuk mengontrol akses lintas-domain dari browser.

## Integrasi WhatsApp
- whatsapp-web.js: Library untuk mengotomatisasi sesi WhatsApp Web dari server.
- Puppeteer: Library untuk menjalankan dan mengontrol browser headless yang digunakan oleh bot.
- QR Code: Kode yang dipindai untuk mengautentikasi sesi WhatsApp Web.
- Session Files: File yang menyimpan sesi agar tidak perlu scan QR setiap kali bot dijalankan.

## Sistem Trigger
- Trigger: Sebuah aturan atau konfigurasi yang, ketika dipanggil atau kondisinya terpenuhi, akan mengeksekusi aksi (mis. menjalankan query dan mengirimkan hasilnya ke user via WhatsApp).
- Trigger Engine: Modul di backend yang mengelola pendaftaran, penyimpanan, dan eksekusi trigger.
- Trigger Groups: Pengelompokan trigger berdasar kategori atau fungsi.
- Query Trigger: Trigger yang menjalankan query ke data source dan mengembalikan hasil.

## API & Komunikasi
- REST API: Antarmuka HTTP yang digunakan frontend dan bot untuk berkomunikasi dengan backend.
- Endpoint: URL spesifik di API yang menjalankan fungsi tertentu (mis. `/api/triggers`).
- Middleware: Lapisan fungsi yang dijalankan sebelum handler utama (contoh: autentikasi, logging).
- Route: Rangkaian path dan handler yang menangani permintaan tertentu.

## Pengembangan & Deployment
- ESM (ES Modules): Sistem modul JavaScript modern yang dipakai di backend.
- Environment Variables (.env): Variabel konfigurasi yang menyimpan kredensial dan alamat layanan.
- Hot Reload / Nodemon: Alat development yang me-restart server otomatis saat kode berubah.
- Native Dependencies: Library sistem operasi yang dibutuhkan (contoh: Oracle Instant Client, library Chromium untuk Puppeteer).

## Istilah Industri
- Historian: Sistem penyimpanan time-series untuk data proses industri.
- Alarm Data: Data peringatan yang berasal dari sistem monitoring.
- Real-time Data: Data yang tersedia dan diproses dengan latensi rendah.
- Monitoring Platform: Sistem yang digunakan untuk memantau status dan performa peralatan.

## Komponen Teknis Tambahan
- Plugin System: Arsitektur modular yang memungkinkan penambahan driver tanpa mengubah inti aplikasi.
- Health Check: Pengecekan berkala untuk memastikan koneksi ke data source tetap aktif.
- Connection Pool: Manajemen kumpulan koneksi ke database untuk efisiensi (jika dipakai oleh driver tertentu).

---

Jika Anda ingin saya tambahkan istilah lain atau contoh singkat (mis. contoh header `X-API-Key` yang digunakan oleh bot, atau contoh struktur trigger), beri tahu istilah mana yang ingin diperluas.