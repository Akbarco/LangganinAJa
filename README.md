<p align="center">
  <img src="./IMG-20260422-WA0002%281%29.jpg.jpeg" alt="LanggananinAja logo" width="160" />
</p>

<h1 align="center">LanggananinAja</h1>

<p align="center">
  A full-stack subscription manager for tracking recurring expenses, payment schedules, budgets, and subscription analytics.
</p>

## Overview

LanggananinAja helps users manage recurring subscriptions from a mobile-first interface. The app combines an Expo React Native client with an Express and PostgreSQL API, giving users a practical way to record subscriptions, monitor monthly spending, track payment history, and stay ahead of upcoming bills.

## Features

- Email and password authentication with JWT-based protected API routes.
- Subscription CRUD with billing cycle, category, currency, start date, and next payment date.
- Dashboard summary for active subscriptions, inactive subscriptions, monthly totals, yearly estimates, and monthly budget usage.
- Search, status filtering, and sorting for subscription lists.
- Payment logging with automatic next-payment-date updates.
- Analytics views for category breakdowns, upcoming due dates, expensive subscriptions, and spending trends.
- Monthly budget configuration with usage warnings.
- Local receipt attachment support through camera or gallery.
- Local app lock using a 4-digit PIN.
- Light and dark theme support.
- PDF export for active subscription reports.
- Local notification reminders before upcoming billing dates.

## Tech Stack

### Client

- Expo 54
- React Native 0.81
- Expo Router
- TypeScript
- Zustand
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
|   |-- lib/                # API client, utilities, notifications, storage
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

### 1. Install Server Dependencies

```bash
cd Server
npm install
```

### 2. Configure the Database

Make sure PostgreSQL is running and `DATABASE_URL` points to a valid database, then apply the Prisma migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Start the API

```bash
npm run dev
```

The API runs on:

```text
http://localhost:3000
```

### 4. Install Client Dependencies

Open a new terminal:

```bash
cd Client
npm install
```

### 5. Start the Mobile App

```bash
npm run start
```

You can also run platform-specific builds:

```bash
npm run android
npm run ios
npm run web
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

- The server must be running before the client can fetch or mutate data.
- The client automatically resolves the API URL from `EXPO_PUBLIC_API_URL`; when it is not set, it falls back to local development defaults.
- Receipt images and app-lock settings are stored locally on the device.
- Notification reminders are scheduled locally by the mobile app.

## License

This project is currently licensed under the `ISC` license declared in the server package.
