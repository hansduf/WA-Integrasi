Back‑office (Fitur untuk Administrator)

Dokumen ini menjelaskan fitur Back‑office yang tersedia di sistem. Isi berikut ditulis dalam bahasa yang mudah dimengerti dan sesuai dengan implementasi kode saat ini.

1. Login dan Pengaturan Sesi

   - Administrator dapat masuk ke sistem menggunakan username dan password. Setelah masuk, sistem memberikan token (JWT) yang digunakan untuk mengakses fitur admin.
   - Administrator dapat melihat sesi aktif (siapa yang sedang login) dan memutus sesi tertentu.
2. Kelola Pengguna

   - Admin dapat melihat daftar pengguna yang terdaftar.
   - Admin dapat membuat pengguna baru.
   - Admin dapat mengubah data pengguna (nama lengkap, email).
   - Admin dapat mengganti password pengguna.
   - Admin dapat menonaktifkan atau mengaktifkan akun pengguna.
   - Admin dapat menghapus akun (soft delete: menonaktifkan dan menghapus sesi).
   - Catatan: pengguna biasa hanya dapat mengubah data mereka sendiri; beberapa tindakan sensitif (mis. pembuatan pengguna, menonaktifkan akun) memerlukan akses admin.
3. Keamanan & Audit

   - Admin dapat melihat ringkasan keamanan sistem (security overview).
   - Admin dapat melihat percobaan login yang gagal dan akun yang terkunci.
   - Admin dapat membuka kunci akun yang terkunci.
   - Admin dapat melihat audit log (riwayat tindakan) dengan filter.
   - Admin dapat menjalankan pembersihan sesi kadaluarsa.
4. Manajemen Trigger

   - Admin dapat melihat daftar trigger (aturan otomatis yang menjalankan aksi).
   - Admin dapat membuat trigger baru, mengubah trigger, mengaktifkan atau menonaktifkan trigger, dan menghapus trigger.
   - Admin dapat mengeksekusi trigger secara manual untuk pengujian.
5. Pesan & Kontak

   - Admin dapat melihat daftar pesan (masuk dan keluar) serta statistik pesan.
   - Admin dapat melihat detail pesan tertentu.
   - Endpoint untuk penyimpanan/pembuatan pesan tersedia untuk bot menggunakan X-API-Key.
   - Admin dapat melihat dan mengelola daftar kontak (tambah/ubah).
6. Manajemen Data Source (Koneksi)

   - Admin dapat menambah koneksi ke sumber data (database atau sistem eksternal), menguji koneksi, mengubah konfigurasi, dan menghapus koneksi.
   - Saat menampilkan konfigurasi koneksi, informasi sensitif (mis. password atau token) disamarkan.
   - Sistem mendukung preview schema / sample data untuk koneksi database tertentu.
7. Kontrol Bot WhatsApp

   - Admin dapat melihat status bot WhatsApp (terhubung / menunggu QR / terputus).
   - Admin dapat meminta QR code untuk autentikasi bot, memulai proses koneksi bot, atau memutus koneksi bot.
   - Informasi status bot disimpan dalam file status yang dapat dibaca oleh backend.
8. Plugin & Inisialisasi Otomatis

   - Sistem memuat plugin dari folder plugin saat server dimulai dan mencoba menghubungkan semua data source yang terdaftar.
   - Admin dapat melihat hasil inisialisasi plugin dan status koneksi saat startup.
9. Catatan Teknis Singkat

   - Otentikasi pengguna menggunakan JWT (token di-cookie) untuk akses admin.
   - Komunikasi bot ke API menggunakan X-API-Key yang dikonfigurasi.
   - Beberapa endpoint manajemen (trigger, data source, user) dilindungi dan hanya bisa diakses oleh pengguna yang terautentikasi.

Catatan penting:

- Penjelasan di atas sesuai dengan implementasi kode saat ini. Saat ini fungsi pembuatan pengguna menyimpan peran (role) default sebagai 'admin' di database, sehingga akun yang dibuat akan memiliki hak admin menurut implementasi sekarang. Jika diperlukan perubahan perilaku (mis. membuat default role bukan admin), itu merupakan perubahan kode yang harus diimplementasikan secara eksplisit.

Referensi kode (beberapa file penting):

- Authentication & users: `avevapi/routes/auth.js`, `avevapi/routes/users.js`, `avevapi/services/user.service.js`
- Security: `avevapi/routes/security.js`, `avevapi/middleware/admin.middleware.js`
- Triggers: `avevapi/routes/triggers.js`, `avevapi/core/trigger-engine.js`
- Data-sources & plugins: `avevapi/routes/data-sources.js`, `avevapi/core/data-source-manager.js`, `avevapi/core/plugin-loader.js`
- WhatsApp bot: `wa/index.js`, status file `wa/.status/whatsapp-status.json`

Generated: 2025-10-14
