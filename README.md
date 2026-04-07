# LanggainAJa

## Google OAuth + JWT (Pure Backend)

Fitur login Google sudah pakai pola:

1. Client Expo login ke Google dan ambil `idToken`.
2. Client kirim `idToken` ke `POST /api/auth/google`.
3. Server verifikasi token Google, buat/cari user, lalu keluarkan JWT internal.

## Setup Environment

### Server (`Server/.env`)

Salin `Server/.env.example` lalu isi:

- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID` (Web Client ID dari Google Cloud Console)
- `GOOGLE_ANDROID_CLIENT_ID` (opsional, untuk login Google di Android/dev build)
- `GOOGLE_IOS_CLIENT_ID` (opsional, untuk login Google di iOS/dev build)

### Client (`Client/.env`)

Salin `Client/.env.example` lalu isi:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (disarankan untuk Android/dev build)
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (disarankan untuk iOS/dev build)

## Catatan Expo + Google OAuth

- Expo Go tidak cocok untuk testing OAuth redirect (termasuk Google login).
- Gunakan development build (`expo-dev-client`) untuk uji login Google di mobile.

## Endpoint Baru

- `POST /api/auth/google`
  - body: `{ "idToken": "..." }`
  - response sukses: `{ user, token }` (sama seperti login email/password)
