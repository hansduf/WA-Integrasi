## FIX: WhatsApp contact upsert causing UNIQUE constraint failure

Status: Completed

Summary
-------
Pada tanggal ini ditemukan bug pada alur penyimpanan kontak yang menyebabkan backend mengembalikan error 500 dengan pesan:

```
UNIQUE constraint failed: contacts.phone
```

Ringkasan masalah
------------------
- Bot WhatsApp mengirimkan data kontak ke endpoint `POST /api/contacts`.
- Dalam beberapa kasus bot mengirim `phone` dalam format JID (`256817720475733@c.us`) atau mengirim `id` berbeda dari `phone` (mis. menggunakan JID sebagai `id`).
- Database memiliki constraint UNIQUE pada kolom `phone`.
- Ketika backend mencoba INSERT kontak baru dengan `phone` yang sudah ada pada baris lain (tetapi `id` berbeda), SQLite menolak operasi dan mengembalikan 500.

Root cause
----------
1. Bot tidak menormalisasi field `phone` sebelum mengirim ke backend (mengandung `@c.us` atau karakter non-digit).
2. Backend hanya mengecek keberadaan kontak berdasarkan `id` (bukan `phone`), sehingga kasus "different id, same phone" menyebabkan upsert menjadi insert dan menabrak constraint UNIQUE.

Perubahan yang diterapkan
------------------------
1. Bot (`wa/index.js`)
   - Menambahkan fungsi `normalizePhone(input)` yang:
     - Menghapus suffix `@...` (mis. `@c.us` / `@g.us`).
     - Menghapus semua karakter non-digit sehingga backend menerima hanya digit.
   - Memperbaiki logging ketika penyimpanan kontak gagal agar menampilkan status dan body response dari API.

2. Backend (`avevapi/routes/messages.js`)
   - `POST /api/contacts` sekarang:
     - Menormalisasi `phone` (hapus non-digit) dari request.
     - Mengecek keberadaan kontak berdasarkan `id`. Jika ada → update.
     - Jika tidak ada berdasarkan `id`, cek berdasarkan `phone`. Jika ada → update record yang ada (menghindari insert duplikat).
     - Jika tidak ada sama sekali → coba INSERT. Jika INSERT gagal karena UNIQUE constraint pada `phone`, jalankan fallback SELECT (mencocokkan `REPLACE(phone,'+','') = incomingDigits`) lalu update record itu.

Files changed
-------------
- `wa/index.js` — tambah normalisasi phone dan perbaikan logging saat mengirim kontak ke API.
- `avevapi/routes/messages.js` — ubah handler `POST /api/contacts` menjadi robust terhadap duplikasi phone.

How to test (manual)
--------------------
1. Restart backend:

   ```cmd
   cd g:\NExtJS\aveva-pi\avevapi
   node main.js
   ```

2. Restart WA bot:

   ```cmd
   cd g:\NExtJS\aveva-pi\wa
   npm run dev
   ```

3. Kirim pesan grup mention seperti:

   ```text
   @256817720475733 p
   ```

4. Expected behaviour:
   - Bot menyimpan pesan: `💾 Message saved to database via API`.
   - Bot menyimpan atau mengupdate kontak: `💾 Contact saved to database via API (phone: ...)` atau `Contact updated (matched by phone) ...`.
   - Tidak ada error 500 terkait UNIQUE constraint.

Further recommendations
-----------------------
- Normalisasikan seluruh data `contacts.phone` yang sudah ada di database (migration script) agar konsisten (digit-only, tambahkan country-code jika diperlukan).
- Pertimbangkan menggunakan nomor telepon ternormalisasi sebagai `id` primary untuk contacts untuk menghilangkan konflik `different id, same phone`.
- Tambahkan unit/integration test untuk skenario: insert contact A → kirim kontak dengan different id tapi same phone → backend harus update, bukan error.

Change log note (short)
-----------------------
- Fixed contact upsert logic to handle duplicate phone entries and normalized phone input from WhatsApp bot. Files: `wa/index.js`, `avevapi/routes/messages.js`.

Reporter: Automated investigation + developer patch
