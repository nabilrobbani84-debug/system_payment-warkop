# Panduan Mengaktifkan Database Online Warkop (Firebase)

Aplikasi Warkop Anda sekarang **telah dirancang untuk bisa aktif tersambung ke Internet 100% Real-time** dengan Database. Artinya, ketika pembeli memesan lewat HP mereka dari Meja, pesanan itu akan langsung **otomatis muncul di layar Kasir secara real-time** tanpa perlu di-refresh.

Karena database ini akan menampung data toko yang rahasia, saya menyediakan "Pintu" agar Anda bisa memakai akun Database Google (Firebase) milik Anda sendiri secara **gratis**. 

Ikuti panduan ini:

## Langkah 1: Buat Akun & Proyek Firebase
1. Buka [firebase.google.com](https://firebase.google.com/) dan login menggunakan akun Google Anda.
2. Klik tombol **"Get Started"** atau **"Go to console"** di pojok kanan atas.
3. Klik **"Create a project"** (Buat proyek).
4. Beri nama proyek Anda (contoh: `warkop-app-live`), matikan Google Analytics (karena tidak perlu), lalu klik **Create project**.

## Langkah 2: Buat "Realtime Database"
1. Setelah masuk ke panel kontrol proyek Anda, lihat menu di sebelah kiri.
2. Temukan menu **Build**, klik tanda panah ke bawah, lalu pilih **Realtime Database**.
3. Klik tombol besar **"Create Database"**.
4. Pilih lokasi terdekat (misalnya: *Singapore / asia-southeast1*). Kik Next.
5. Di bagian Security Rules, pilih **"Start in test mode"**.
6. Klik **Enable**. (Pastikan Anda sudah masuk ke mode Test agar HP pembeli di luar sana bisa mengirim pesanan).

## Langkah 3: Dapatkan "Kunci Rahasia" (Firebase Config)
1. Di panel Firebase Anda, klik logo "Roda Gigi" ⚙️ -> **Project Settings** di menu kiri atas.
2. Scroll ke bawah sampai Anda menemukan opsi "Your apps".
3. Karena belum ada aplikasi, klik ikon hijau berbentuk **`</>` (Web)**.
4. Beri nama app (misal: "Web Warkop"), lalu klik **Register app**.
5. Anda akan diberikan teks kode blok bernama `firebaseConfig`. Bentuknya akan seperti ini:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyCX.........",
     authDomain: "warkop-app-xxx.firebaseapp.com",
     databaseURL: "https://warkop-app-xxx-rtdb.asia-southeast1.firebasedatabase.app",
     projectId: "warkop-app-xxx",
     storageBucket: "warkop-app-xxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567:web:abcde123"
   };
   ```

## Langkah 4: Masukkan Kunci tersebut ke Web Warkop Anda
1. Buka *Source Code* web Anda (di Code Editor / VSCode).
2. Temukan dan buka file **`src/store/dataManager.ts`**.
3. Di sekitar baris ke-65, Anda akan melihat kode seperti berikut:
   ```javascript
   const FIREBASE_CONFIG = {
     apiKey: "", 
     authDomain: "", 
     databaseURL: "", 
     ...
   }
   ```
4. **Copy nilai (isi teks) dari Kunci Rahasia Firebase Anda** ke dalam tanda kutip `""` di file tersebut. *(Jangan ubah kata `const FIREBASE_CONFIG =` nya, cukup isi bagian dalam `{ ... }` nya saja).*
5. **Simpan (Save)** file tersebut.

### SELESAI! 🎉
Jika Anda mengisinya dengan benar, maka saat ini web Warkop Anda **sudah sepenuhnya tersambung ke internet**. 

Semua Data Menu, Data Kasir, dan Pesanan yang terbuat akan otomatis tersimpan ganda secara *Real-Time* ke Firebase Database Anda. Jika ada pembeli yang *Check Out* pesanan memakai HP mereka lewat internet, seketika detik itu juga langsung muncul ke *Dashboard Kasir* dan *Admin* Anda. 

Jika kuncinya Anda biarkan kosong `""`, maka web ini akan berjalan menggunakan *local storage browser* (hanya untuk latihan/demo di laptop yang sama layaknya semula).
