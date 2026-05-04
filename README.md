<p align="center">
  <img src="./images/icon.png" alt="LanggananinAja logo" width="160" />
</p>

<h1 align="center">LanggananinAja</h1>

<p align="center">
  A full-stack & offline-first subscription manager for tracking recurring expenses, payment schedules, budgets, and subscription analytics.
</p>

## Overview

LanggananinAja helps users manage recurring subscriptions from a mobile-first interface. The app features a powerful Expo React Native client with local SQLite database for full offline capabilities, paired with an Express and PostgreSQL API. It gives users a practical way to record subscriptions, monitor monthly spending, track payment history, and stay ahead of upcoming bills without relying on constant internet connection.

## Features

- **Local Offline Database**: Built-in SQLite database for offline-first user registration, data persistence, and subscription management without internet.
- Email and password authentication with JWT-based protected API routes for cloud sync (optional).
- Subscription CRUD with billing cycle, category, currency, start date, and next payment date.
- Dashboard summary for active subscriptions, inactive subscriptions, monthly totals, yearly estimates, and monthly budget usage.
- Search, status filtering, and sorting for subscription lists.
- Payment logging with automatic next-payment-date updates.
- Analytics views for category breakdowns, upcoming due dates, expensive subscriptions, and spending trends.
- Monthly budget configuration with usage warnings.
- Custom Confirm Dialog UI for consistent, native-feeling alert management.
- Local receipt attachment support through camera or gallery.
- Local app lock using a 4-digit PIN.
- Light and dark theme support.
- PDF export for active subscription reports.
- Database export functionality for backup.
- Local notification reminders before upcoming billing dates.

## Tech Stack

### Client

- Expo 54
- React Native 0.81
- Expo Router
- TypeScript
- Zustand
- Expo SQLite & File System (Local Database)
- React Hook Form
- Zod
- Expo Secure Store
- Expo Notifications
- React Native Gifted Charts

### Server

- Node.js
- Express 5
- Prisma 7
- PostgreSQL
- JWT
- bcrypt
- Zod

## Project Structure

```text
LanggananinAja/
|-- Client/                 # Expo React Native application
|   |-- app/                # Expo Router screens and layouts
|   |-- components/         # Reusable UI and feature components
|   |-- constants/          # Theme, API URL, and app constants
|   |-- hooks/              # Shared React hooks
|   |-- lib/                # Local SQLite DB, API client, utilities, notifications, storage
|   |-- schemas/            # Client-side validation schemas
|   |-- store/              # Zustand stores
|   `-- types/              # Shared client TypeScript types
|-- Server/                 # Express API
|   |-- prisma/             # Prisma schema and migrations
|   `-- src/
|       |-- controllers/    # Route handlers
|       |-- lib/            # Prisma client setup
|       |-- middlewares/    # Auth, validation, and error handling
|       |-- routes/         # API route definitions
|       |-- schemas/        # Server-side validation schemas
|       `-- utils/          # Response and error helpers
`-- README.md
```

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL
- Expo development environment for Android or iOS builds

## Environment Variables

Create a `.env` file inside `Server/`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="replace-with-a-secure-secret"
PORT=3000
```

Create a `.env` file inside `Client/`:

```env
EXPO_PUBLIC_API_URL="http://localhost:3000/api"
```

For physical Android or iOS devices, replace `localhost` with the machine IP address that runs the server, for example:

```env
EXPO_PUBLIC_API_URL="http://192.168.1.17:3000/api"
```

## Getting Started

### 1. Install Client Dependencies

The client application can run fully locally using `expo-sqlite` and `expo-file-system`.

```bash
cd Client
npm install
```

### 2. Start the Mobile App

```bash
npm run start
```

You can also run platform-specific builds:

```bash
npm run android
npm run ios
npm run web
```

### 3. Server Setup (Optional for cloud backend)

To use the Express backend API instead of the local SQLite DB:

```bash
cd Server
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

## Available Scripts

### Client

```bash
npm run start
npm run android
npm run ios
npm run web
```

### Server

```bash
npm run dev
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in and receive a JWT |
| POST | `/api/auth/logout` | Clear the authentication cookie |
| PUT | `/api/auth/profile` | Update profile name or email |
| PUT | `/api/auth/change-password` | Change account password |
| PUT | `/api/auth/budget` | Set or clear the monthly budget |

### Subscriptions

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/subscriptions` | List the authenticated user's subscriptions |
| POST | `/api/subscriptions` | Create a subscription |
| GET | `/api/subscriptions/summary` | Get subscription and budget summary |
| GET | `/api/subscriptions/analytics` | Get category analytics |
| PUT | `/api/subscriptions/:id` | Update a subscription |
| DELETE | `/api/subscriptions/:id` | Delete a subscription |

### Payments

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/subscriptions/:id/pay` | Mark a subscription as paid |
| GET | `/api/subscriptions/:id/payments` | Get payment history for a subscription |

## Data Model

The database contains three primary models:

- `User`: account data, authentication credentials, and monthly budget.
- `Subscription`: recurring subscription details owned by a user.
- `PaymentLog`: payment records attached to a subscription.

Supported billing cycles:

- `MONTHLY`
- `YEARLY`

Supported categories:

- `ENTERTAINMENT`
- `UTILITY`
- `FINANCE`
- `EDUCATION`
- `GAMING`
- `OTHER`

## Notes

- The app now operates natively on a **Local SQLite Database** giving an offline-first experience.
- The server provides REST API capabilities if you wish to sync or use remote data source.
- Receipt images and app-lock settings are stored locally on the device.
- Notification reminders are scheduled locally by the mobile app.

## License

This project is currently licensed under the `ISC` license declared in the server package.

