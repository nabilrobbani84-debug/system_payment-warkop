# Panduan Menghubungkan Laporan Warkop ke Google Sheets

Aplikasi Warkop Anda sekarang memiliki fitur untuk mengirim setiap transaksi secara otomatis ke Google Sheets. Dari sana, Anda dapat mengunduh laporan penjualan dalam bentuk PDF. Ikuti panduan berikut ini:

## Langkah 1: Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.google.com).
2. Buat spreadsheet baru (Blank/Kosong).
3. Beri nama spreadsheet (misalnya: "Laporan Penjualan Warkop").
4. Di baris pertama (Baris 1), tulis header berikut:
   - Cell A1: `Order ID`
   - Cell B1: `Meja`
   - Cell C1: `Total`
   - Cell D1: `Status`
   - Cell E1: `Metode Pembayaran`
   - Cell F1: `Tanggal`
   - Cell G1: `Detail Item`
5. **Copy URL Spreadsheet Anda** dari *address bar* browser Anda (contohnya: `https://docs.google.com/spreadsheets/d/abcid12345/edit`). URL ini akan Anda isikan di kolom "URL Spreadsheet Pembacaan" di pengaturan aplikasi Anda.

## Langkah 2: Buat Google Apps Script
1. Di dalam Google Sheet yang sama, klik menu **Extensions (Ekstensi)** > **Apps Script**.
2. Hapus semua kode bawaan yang ada di editor tersebut.
3. **Copy & Paste kode berikut ini:**

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Menambahkan baris data transaksi
    sheet.appendRow([
      data.orderId,
      data.tableId,
      data.totalAmount,
      data.status,
      data.paymentMethod,
      data.createdAt,
      data.items
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Langkah 3: Deploy Apps Script (Dapatkan Web App URL)
1. Di halaman Apps Script, klik tombol biru **Deploy** di pojok kanan atas, lalu pilih **New deployment**.
2. Pilih tipe: klik ikon gir ⚙️ di sebelah "Select type", pilih **Web app**.
3. Di bagian "Description": Bebas (misal: "Sync Warkop V1").
4. Di bagian "Execute as": Pilih **Me (Anda sendiri)**.
5. Di bagian "Who has access": Pilih **Anyone (Siapa saja)**. *(Ini wajib agar aplikasi web bisa mengirim data tanpa perlu login form)*.
6. Klik **Deploy**.
7. Akan muncul tab *Authorize Access*, klik dan beri izin menggunakan akun Google Anda (klik *Advanced > Go to project* jika ada peringatan keamanan).
8. **Copy URL Web App** yang muncul (Contoh: `https://script.google.com/macros/s/.../exec`). 
   URL ini akan Anda isikan di kolom "Web App URL" di pengaturan aplikasi.

## Langkah 4: Masukkan Konfigurasi di Web App Warkop
1. Buka web Warkop Order System Anda, masuk ke tampilan Admin.
2. Buka Menu/Tab **Laporan**.
3. Di bagian **Ringkasan Hari Ini**, klik **ikon Setting (Roda Gigi) ⚙️**.
4. Akan muncul modal "Koneksi Google Sheet".
5. Masukkan URL Spreadsheet (dari *Langkah 1*) agar Anda bisa langsung klik tombol Unduh PDF yang memanggil Spreadsheet tersebut.
6. Masukkan Web App URL Apps Script (dari *Langkah 3*) agar otomatis sinkronisasi ke Spreadsheet tiap ada kasir "Confirm Payment".
7. Klik **Simpan Konfigurasi**.

Selesai! Sekarang setiap pesanan yang **di-Konfirmasi (Selesai)** oleh kasir akan otomatis tercatat ke dalam Google Sheet tersebut, dan Anda bisa mendownload PDF dari web Warkop langsung.
