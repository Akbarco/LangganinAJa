# PRD Landing Page Langganinaja

## 1. Ringkasan Produk

Langganinaja adalah aplikasi Android offline untuk mencatat, memantau, dan mengontrol biaya langganan pribadi seperti Netflix, Spotify, YouTube Premium, ChatGPT Plus, listrik, edukasi, game, dan layanan berulang lainnya.

Landing page ini dibuat sebagai halaman promosi sederhana satu halaman. Fokus utamanya adalah menjelaskan manfaat aplikasi dengan cepat dan menyediakan tombol download APK yang langsung mengunduh file aplikasi.

## 2. Tujuan Landing Page

1. Menjelaskan Langganinaja sebagai aplikasi pencatat langganan yang bisa dipakai full offline.
2. Meyakinkan user bahwa data tersimpan lokal di perangkat, tanpa perlu server atau akun online.
3. Menampilkan fitur inti aplikasi secara ringkas dan jelas.
4. Membuat user bisa klik tombol `Download APK` dan langsung mengunduh file `.apk`.
5. Menjadi halaman frontend-only yang bisa di-host sebagai static site.

## 3. Scope

### In Scope

- Satu halaman landing page.
- Frontend only menggunakan React + Vite.
- Tidak memakai backend.
- Tombol download langsung ke file APK.
- Responsive untuk mobile dan desktop.
- Konten promosi berdasarkan fitur nyata dari folder app saat ini.
- Visual sederhana, bersih, modern, dan fokus ke aplikasi.

### Out of Scope

- Login user di website.
- Dashboard web.
- Upload APK dari admin panel.
- Backend download tracker.
- Payment gateway.
- Blog atau multi halaman.
- CMS.
- Form kontak yang mengirim data ke server.

## 4. Target User

### Primary User

Pengguna Android yang punya banyak langganan bulanan/tahunan dan ingin tahu total pengeluaran, tanggal jatuh tempo, serta riwayat pembayaran tanpa ribet memakai spreadsheet.

### Secondary User

User yang lebih nyaman memakai aplikasi lokal dan tidak ingin data langganannya tersimpan di server.

## 5. Positioning

Langganinaja diposisikan sebagai:

> Aplikasi Android offline untuk mencatat semua langganan, melihat total pengeluaran bulanan, mengatur budget, dan mengingat tanggal bayar berikutnya.

Hindari positioning sebagai aplikasi bank, aplikasi pembayaran otomatis, atau cloud subscription manager. Aplikasi ini adalah pencatat dan pengingat lokal.

## 6. Pesan Utama

### Headline Utama

Kelola semua langganan dari satu aplikasi offline.

### Subheadline

Catat biaya bulanan, pantau jatuh tempo, atur budget, dan simpan riwayat pembayaran langsung di perangkat Android kamu.

### CTA Utama

Download APK

### CTA Sekunder

Lihat fitur

## 7. Struktur Halaman

Landing page hanya satu halaman dengan urutan section berikut.

### 7.1 Header

Konten:

- Logo Langganinaja.
- Nama brand: `Langganinaja`.
- Navigasi anchor ringan: Fitur, Offline, Download.
- Tombol kecil: Download APK.

Catatan:

- Header sticky boleh dipakai, tapi tetap ringan.
- Di mobile, navigasi bisa disembunyikan atau jadi menu sederhana.

### 7.2 Hero Section

Tujuan:

Langsung menjelaskan fungsi aplikasi dan mendorong download.

Konten:

- Label kecil: `Full Offline Android App`
- H1: `Kelola semua langganan dari satu aplikasi offline.`
- Paragraph: `Langganinaja bantu kamu mencatat biaya langganan, melihat total pengeluaran bulanan, memantau tanggal bayar, dan menyimpan riwayat pembayaran tanpa server.`
- CTA utama: `Download APK`
- CTA sekunder anchor: `Lihat fitur`
- Trust notes kecil:
  - `Data tersimpan lokal`
  - `Tidak perlu backend`
  - `Android APK`

Visual:

- Mockup phone atau screenshot-style panel dari dashboard aplikasi.
- Jika screenshot asli belum tersedia, gunakan UI mockup statis yang menggambarkan:
  - Pengeluaran bulanan
  - Langganan aktif
  - Tanggal pembayaran berikutnya
  - Budget progress

### 7.3 Problem Section

Tujuan:

Membuat user merasa masalahnya relevan.

Copy:

`Langganan kecil sering tidak terasa, tapi total bulanannya bisa membengkak. Tanpa catatan rapi, kamu gampang lupa tanggal bayar, lupa layanan yang masih aktif, atau telat sadar budget sudah lewat.`

Tampilkan 3 pain points:

- Lupa tanggal tagihan berikutnya.
- Tidak tahu total pengeluaran bulanan.
- Sulit melacak layanan aktif dan nonaktif.

### 7.4 Feature Highlights

Tampilkan 6 fitur inti:

1. `Dashboard pengeluaran`
   - Lihat total pengeluaran bulanan, estimasi tahunan, jumlah langganan aktif, dan status budget.
2. `Catat langganan`
   - Tambahkan nama layanan, harga, siklus bulanan/tahunan, kategori, tanggal mulai, dan tanggal bayar berikutnya.
3. `Kalender tagihan`
   - Lihat jadwal tagihan lokal per bulan supaya tahu kapan harus bayar.
4. `Budget warning`
   - Atur batas anggaran bulanan dan lihat peringatan saat pengeluaran mendekati atau melewati budget.
5. `Riwayat pembayaran`
   - Tandai langganan sudah dibayar, simpan riwayat, lalu tanggal bayar berikutnya bergeser otomatis.
6. `Bukti dan export`
   - Lampirkan bukti pembayaran dari kamera/galeri, export daftar ke PDF, dan export database `.db`.

### 7.5 Offline And Privacy Section

Tujuan:

Menjadikan full offline sebagai selling point utama.

Copy:

`Langganinaja berjalan lokal di perangkat. Data akun, daftar langganan, budget, dan riwayat pembayaran disimpan menggunakan SQLite di HP kamu. Cocok untuk user yang ingin pencatatan pribadi tanpa tergantung koneksi internet atau server.`

Poin:

- Data tersimpan di perangkat.
- Login/register lokal untuk memisahkan data user di device yang sama.
- Tidak perlu server untuk fitur inti.
- Bisa export database lokal.
- Mendukung app lock PIN 4 digit.

Disclaimer kecil:

`Karena data tersimpan lokal, backup/export tetap penting jika ingin memindahkan data ke perangkat lain.`

### 7.6 Analytics Preview Section

Tampilkan ringkasan fitur statistik:

- Breakdown kategori.
- Top langganan termahal.
- Tren jatuh tempo 6 bulan.
- Kalender tagihan bulanan.
- Insight budget aman, warning, atau terlampaui.

Copy:

`Bukan cuma mencatat. Langganinaja bantu kamu melihat pola pengeluaran supaya lebih mudah memutuskan layanan mana yang masih perlu dipakai.`

### 7.7 How It Works

Tampilkan 3 langkah sederhana:

1. `Download APK`
   - Install aplikasi di Android.
2. `Buat akun lokal`
   - Register langsung di perangkat, tanpa server.
3. `Catat langganan`
   - Tambahkan layanan, cek dashboard, dan tandai pembayaran saat sudah dibayar.

### 7.8 Download Section

Tujuan:

CTA akhir yang jelas.

Konten:

- Heading: `Siap rapikan pengeluaran langganan kamu?`
- Paragraph: `Download APK Langganinaja dan mulai catat langganan langsung dari HP Android.`
- CTA: `Download APK`
- Detail kecil:
  - `Versi 1.0.0`
  - `Android APK`
  - `Frontend download tanpa login`

Behavior:

- Klik CTA harus menjalankan download file APK.
- Link download diarahkan ke file APK statis.
- Rekomendasi path saat implementasi Vite:
  - Simpan APK di `public/download/Langganinaja.apk`.
  - Tombol memakai `<a href="/download/Langganinaja.apk" download>Download APK</a>`.

Catatan artifact saat ini:

- File APK yang ditemukan saat scan: `Client/dist/Langgainaja.apk`.
- Nama brand di app config dan UI: `Langganinaja`.
- Saat landing page diimplementasikan, rekomendasi rename file publik menjadi `Langganinaja.apk` agar konsisten dengan brand. File sumber boleh tetap di-copy dari `Client/dist/Langgainaja.apk`.

### 7.9 Footer

Konten:

- Brand: `Langganinaja`
- Copy kecil: `Aplikasi pencatat langganan offline untuk Android.`
- Link anchor: Fitur, Offline, Download.
- Version text: `v1.0.0`

## 8. Content Tone

Tone harus:

- Simple.
- Praktis.
- Tidak terlalu marketing berlebihan.
- Pakai bahasa Indonesia yang natural.
- Tekankan manfaat langsung: catat, pantau, ingat, kontrol.

Hindari:

- Klaim sinkronisasi cloud.
- Klaim pembayaran otomatis.
- Klaim keamanan enterprise.
- Copy terlalu panjang.
- Istilah teknis yang terlalu developer-facing di area utama.

## 9. Visual Direction

### Style

- Clean mobile app landing page.
- Modern, ringan, dan tidak ramai.
- Dominan putih atau very light background.
- Aksen biru sesuai app config Android adaptive icon: `#0A5AF2`.
- Bisa memakai aksen hijau untuk status aman/budget.

### Layout

- Desktop: hero dua kolom, text kiri dan app mockup kanan.
- Mobile: hero satu kolom, CTA di atas fold, mockup di bawah text.
- Section pendek, tidak terlalu banyak paragraf.
- Gunakan card hanya untuk feature item atau mockup, jangan terlalu banyak nested card.

### Asset

- Logo bisa memakai `Client/assets/images/icon.png` atau `Client/assets/images/langganinaja-logo.svg`.
- APK source saat ini ada di `Client/dist/Langgainaja.apk`.

## 10. Functional Requirements

1. Landing page dibuat dengan React + Vite.
2. Halaman harus bisa berjalan sebagai static frontend tanpa backend.
3. Tombol download utama dan tombol download header mengarah ke APK yang sama.
4. File APK harus bisa terunduh ketika link diklik.
5. Navigasi anchor harus scroll ke section terkait.
6. Layout harus responsive minimal untuk:
   - Mobile width 360px.
   - Tablet width 768px.
   - Desktop width 1280px.
7. Tidak ada form yang bergantung server.
8. Tidak ada call API.
9. Tidak perlu auth.
10. Build production harus menghasilkan static assets yang bisa di-host.

## 11. Non Functional Requirements

- Cepat dibuka.
- SEO basic: title, meta description, Open Graph sederhana.
- Accessibility basic:
  - Button/link punya label jelas.
  - Kontras teks aman.
  - CTA bisa diakses keyboard.
- File APK jangan di-import ke bundle JS, cukup static file di `public`.
- Tidak memakai dependency berat untuk landing page sederhana.

## 12. Suggested Tech Stack

- React.
- Vite.
- TypeScript.
- CSS plain atau CSS Modules.
- Icon library ringan seperti `lucide-react` jika dibutuhkan.
- Tidak perlu state management.
- Tidak perlu router.
- Tidak perlu backend.

## 13. Suggested File Structure For Future Implementation

```text
Landing/
|-- public/
|   |-- download/
|   |   `-- Langganinaja.apk
|   |-- icon.png
|   `-- preview.png
|-- src/
|   |-- App.tsx
|   |-- main.tsx
|   `-- styles.css
|-- index.html
|-- package.json
`-- vite.config.ts
```

Catatan: struktur di atas hanya rekomendasi untuk fase implementasi landing page. PRD ini sendiri disimpan di root project sesuai request.

## 14. Acceptance Criteria

- User membuka landing page dan langsung paham bahwa Langganinaja adalah app Android offline untuk mencatat langganan.
- Tombol `Download APK` terlihat di hero dan section akhir.
- Klik tombol download memulai unduhan APK.
- Tidak ada fitur website yang membutuhkan backend.
- Konten sesuai fitur app aktual: dashboard, subscription CRUD, budget, kalender tagihan, analytics, payment history, receipt attachment, PDF export, database export, app lock PIN, light/dark theme.
- Halaman nyaman dibaca di mobile dan desktop.
- Nama publik konsisten memakai `Langganinaja`.

## 15. Implementation Notes

- README saat ini masih banyak menjelaskan versi server-backed lama, jadi landing page jangan mengambil copy mentah dari README.
- Fokus copy harus mengikuti kondisi app terbaru: full offline, SQLite lokal, Android APK.
- Jangan menjanjikan sinkronisasi antar device karena fitur inti saat ini local-on-device.
- Untuk download statis, copy APK dari `Client/dist/Langgainaja.apk` ke folder public landing page dan gunakan nama publik `Langganinaja.apk`.
- Jika nanti ingin tracking jumlah download, itu fase berbeda dan butuh backend atau analytics pihak ketiga.
