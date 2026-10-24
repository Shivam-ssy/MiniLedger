# MiniLedger 💰

> A robust, production-grade full-stack application to track loans and money lent to friends, with strict integer minor-unit financial accounting, mock OTP authentication, overdue calculations, receipt attachments, and a React Native (Expo) mobile experience.

---

## 📑 Table of Contents
- [Architecture](#-architecture)
- [Monorepo Structure](#-monorepo-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started & Setup](#-getting-started--setup)
- [How to Find the OTP in Logs](#-how-to-find-the-otp-in-logs)
- [API Reference](#-api-reference)
- [Running Tests & Coverage](#-running-tests--coverage)
- [Assumptions & Design Choices](#-assumptions--design-choices)
- [Known Limitations](#-known-limitations)
- [What I'd Do Next](#-what-id-do-next)
- [Requirements Traceability Checklist](#-requirements-traceability-checklist)

---

## 🏛 Architecture

### Backend Architecture
The backend follows a strict layered architectural pattern:
```
Routes ──► Controllers ──► Services ──► Repositories ──► PostgreSQL (Prisma)
  ▲             │              │              │
  │      Zod Validation   Domain Logic  Parameterized
Middlewares                                 Queries
```
1. **Routes (`src/routes/`)**: Mount endpoints and apply middlewares (`authMiddleware`, `uploadReceiptMiddleware`).
2. **Controllers (`src/controllers/`)**: Validate request boundary inputs via Zod, extract authenticated caller ID (`req.user.id`), and pass sanitized data to services.
3. **Services (`src/services/`)**: Implement business logic, minor unit paise conversions, rate limiting, and domain transformations.
4. **Repositories (`src/repositories/`)**: Direct database access via Prisma and parameterized raw SQL queries, guaranteeing ownership isolation and race-safe conditional updates.
5. **Central Error Handler (`src/middlewares/error-handler.middleware.ts`)**: Catches all errors and outputs a uniform error envelope `{ error: { code, message, details? } }`.

### Mobile App Architecture
- **State Management & Auth Flow**: Centralized in `AuthContext` with automatic session restoration on app relaunch.
- **Navigation**: Dual-stack architecture via React Navigation (`RootNavigator`):
  - **Auth Stack**: `LoginScreen` (2-step: phone + 6-digit OTP with cooldown countdown).
  - **App Stack**: `HomeScreen` (Hero summary card, filter chips, overdue badges, optimistic repay) and `AddEntryScreen` (native date picker, validation, receipt picker).
- **Network Layer**: Axios client configured with automatic base URL detection (`10.0.2.2:4000` on Android emulator, `localhost:4000` on iOS/Web), token injection, and global 401 interceptor that logs the user out when session expires.
- **Secure Token Storage**: Encrypted storage via `expo-secure-store` (with web `localStorage` fallback).

---

## 📂 Monorepo Structure

```
MiniLedger/
├── backend/                        # Express + TypeScript + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema with CHECK constraints
│   │   ├── seed.ts                 # Idempotent demo seed data
│   │   └── migrations/             # Versioned SQL migrations
│   ├── src/
│   │   ├── controllers/            # auth, loan, summary, health controllers
│   │   ├── errors/                 # AppError class & status code helpers
│   │   ├── middlewares/            # requestLogger, errorHandler, auth, upload
│   │   ├── repositories/           # user, otp, loan, summary repositories
│   │   ├── routes/                 # Express routers
│   │   ├── services/               # Core business services
│   │   ├── utils/                  # phone, crypto, jwt, date, money, file-validator
│   │   ├── validators/             # Zod boundary schemas
│   │   ├── app.ts                  # Express application factory
│   │   ├── prisma.ts               # Shared PrismaClient instance
│   │   └── server.ts               # Application entrypoint
│   ├── tests/                      # Jest + Supertest test suites
│   │   ├── setup.ts                # Test DB configuration
│   │   ├── unit/                   # Pure helper unit tests
│   │   └── integration/            # Auth, Loans, Summary, Receipt integration tests
│   ├── uploads/                    # Uploaded receipts storage
│   ├── package.json
│   └── tsconfig.json
├── app/                            # React Native (Expo) mobile application
│   ├── assets/                     # App icons and graphics
│   ├── src/
│   │   ├── context/                # AuthContext (JWT, session, user state)
│   │   ├── navigation/             # RootNavigator (Auth Stack vs App Stack)
│   │   ├── screens/                # LoginScreen, HomeScreen, AddEntryScreen
│   │   ├── services/               # api.service (Axios), storage.service (SecureStore)
│   │   ├── types/                  # TypeScript types for navigation & loans
│   │   ├── utils/                  # format (currency, date, overdue days)
│   │   └── App.tsx                 # Root React component
│   ├── app.json                    # Expo configuration
│   ├── index.js                    # Entrypoint registering root component
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml              # PostgreSQL service container
├── MiniLedger.http                 # Executable REST Client collection
├── package.json                    # Root workspace package.json
└── README.md
```

---

## 🛠 Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Backend** | Node.js 20+, TypeScript (strict), Express, PostgreSQL, Prisma ORM, Zod, JWT (`jsonwebtoken`), Multer |
| **Testing** | Jest, Supertest, ts-jest |
| **Mobile App** | React Native (Expo SDK 52), TypeScript, React Navigation, Axios, expo-secure-store, expo-image-picker, @react-native-community/datetimepicker |
| **Infrastructure** | Docker, Docker Compose, PostgreSQL 16 Alpine |

---

## 🚀 Getting Started & Setup

### Prerequisites
- **Node.js**: v20 or higher
- **PostgreSQL**: Local PostgreSQL running or Docker installed
- **npm**: v9 or higher

### 1. Database Setup
You can either run PostgreSQL via Docker or use a local instance.

#### Option A: Docker Compose
```bash
docker compose up -d
```

#### Option B: Local PostgreSQL
Create two databases:
```sql
CREATE DATABASE miniledger;
CREATE DATABASE miniledger_test;
```

### 2. Configure Environment Variables
Copy `.env.example` in `backend/`:
```bash
cp backend/.env.example backend/.env
```
Ensure your `DATABASE_URL` and `TEST_DATABASE_URL` match your Postgres credentials:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:Shivam123@localhost:5432/miniledger?schema=public
TEST_DATABASE_URL=postgresql://postgres:Shivam123@localhost:5432/miniledger_test?schema=public
JWT_SECRET=super-secret-jwt-key-miniledger-production-change-me
UPLOAD_DIR=uploads
CORS_ORIGIN=*
```

### 3. Run Migrations & Seed Demo Data
```bash
# In backend directory:
cd backend
npm run migrate
npx prisma db seed
```
Demo user created: `+919876543210` with:
- Rahul Sharma: ₹5,000.00 (Pending, future due date)
- Priya Patel: ₹2,500.00 (Pending, overdue by 3 days)
- Amit Verma: ₹1,000.00 (Repaid)

### 4. Start the Backend Server
```bash
npm run dev
```
The server will start listening on port `4000`:
- Health check: `http://localhost:4000/health`

### 5. Run the Mobile App
In another terminal:
```bash
cd app
npm start
```
- Press `w` to run in web browser (`http://localhost:8081`).
- Press `a` to run in Android emulator (automatically connects to `http://10.0.2.2:4000`).
- Press `i` to run in iOS simulator.

---

## 🔑 How to Find the OTP in Logs

Per the specification, OTPs are **never returned in API responses** and are never logged anywhere except for a single mock-SMS log line.

When you request an OTP from the app or via curl:
```bash
curl -X POST http://localhost:4000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```
Look at your terminal running `npm run dev` (backend server):
```
[MOCK SMS] Phone: +919876543210 | OTP: 684129 (expires in 5 minutes)
```
Enter this 6-digit passcode into the verification prompt.

---

## 📖 API Reference

All error responses strictly follow the standard shape:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Error description",
    "details": []
  }
}
```

### Health Check
- `GET /health`
  - Response (200): `{"status": "ok", "timestamp": "2026-10-24T11:00:00.000Z"}`

### Authentication
- `POST /auth/request-otp`
  - Body: `{"phone": "+919876543210"}`
  - Response (200): `{"message": "OTP sent successfully"}`
  - Edge cases: 30s cooldown (429), max 5/hour (429).
- `POST /auth/verify-otp`
  - Body: `{"phone": "+919876543210", "otp": "684129"}`
  - Response (200):
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "b5b8f7c0-...",
        "phone": "+919876543210",
        "createdAt": "2026-10-24T11:00:00.000Z"
      }
    }
    ```
- `GET /auth/me` *(Protected)*
  - Header: `Authorization: Bearer <accessToken>`
  - Response (200): `{"user": {"id": "...", "phone": "+919876543210", "createdAt": "..."}}`

### Loans *(Protected)*
- `POST /loans`
  - Body: `{"friendName": "Rohan Sharma", "amount": 2500.50, "dueDate": "2026-11-15"}`
  - Response (201):
    ```json
    {
      "loan": {
        "id": "cffed617-...",
        "userId": "2c95ecff-...",
        "friendName": "Rohan Sharma",
        "amount": 2500.50,
        "dueDate": "2026-11-15",
        "status": "PENDING",
        "isOverdue": false,
        "repaidAt": null,
        "receiptUrl": null,
        "createdAt": "2026-10-24T11:00:00.000Z"
      }
    }
    ```
- `GET /loans?status=&overdue=&page=&limit=`
  - Query params: `status` (`PENDING` | `REPAID`), `overdue` (`true` | `false`), `page` (default 1), `limit` (max 100).
  - Sorting: **Overdue entries first**, then by `dueDate ASC`.
  - Response (200):
    ```json
    {
      "loans": [...],
      "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
    }
    ```
- `GET /loans/:id`
  - Response (200): `{"loan": {...}}`
  - Returns 404 for nonexistent or other user's loans.
- `PATCH /loans/:id/repay`
  - Marks loan as `REPAID` and records `repaidAt`.
  - Conditional update `WHERE status = 'PENDING'`.
  - Repaying an already repaid loan returns **409 Conflict**.
- `POST /loans/:id/receipt` *(Multipart Form-Data)*
  - Field: `receipt` (JPEG, PNG, WebP only, max 5MB).
  - Validates magic bytes; deletes old receipt file on replacement; serves statically at `/uploads/<random-uuid>.<ext>`.

### Summary *(Protected)*
- `GET /summary`
  - Aggregated via single SQL query.
  - Response (200):
    ```json
    {
      "totalLent": 8500.00,
      "totalRepaid": 1000.00,
      "overdueAmount": 2500.00,
      "outstanding": 7500.00,
      "counts": {
        "total": 3,
        "repaid": 1,
        "overdue": 1
      }
    }
    ```
  - Empty state returns zeros, never null.

---

## 🧪 Running Tests & Coverage

The test suite runs against the dedicated test database (`miniledger_test`) and includes unit tests for pure helpers and Supertest integration tests for every API flow.

Run tests:
```bash
cd backend
npm test
```

Run tests with code coverage:
```bash
npm run test:coverage
```

### Coverage Report
```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   89.89 |    70.74 |   88.88 |   89.91 |                   
 src/controllers   |   83.56 |       30 |    92.3 |   83.56 |                   
 src/middlewares   |   86.53 |    71.42 |     100 |   86.27 |                   
 src/repositories  |   83.63 |    42.85 |   93.33 |   83.63 |                   
 src/routes        |   97.77 |      100 |      90 |     100 |                   
 src/services      |   93.38 |    69.04 |      90 |   93.38 |                   
 src/utils         |   92.85 |       94 |     100 |   92.85 |                   
-------------------|---------|----------|---------|---------|-------------------
Test Suites: 7 passed, 7 total
Tests:       38 passed, 38 total (100% passing)
```

---

## 🧠 Assumptions & Design Choices

1. **Money Stored as Minor Units (Paise)**:
   - Money is strictly stored as integer paise in PostgreSQL (`amount INT NOT NULL CHECK (amount > 0)`).
   - ₹150.50 is stored as `15050` paise.
   - All SQL summations and aggregations operate on exact integers, completely eliminating floating-point IEEE-754 drift (e.g. `0.1 + 0.2 != 0.3`).
   - The API layer consistently maps paise to standard Rupee floats with 2 decimal places.
2. **Overdue Definition**:
   - `status = PENDING AND dueDate < today` (date-only comparison in UTC).
   - "Due today is NOT overdue". A loan due on 2026-10-24 is not overdue on 2026-10-24. It becomes overdue on 2026-10-25 at 00:00:00 UTC.
3. **Repaying Already-Repaid Loans**:
   - We chose **409 Conflict** (`{ error: { code: 'CONFLICT', message: 'Loan has already been marked as repaid' } }`) to explicitly notify clients of idempotent conflict and state mismatch.
4. **Phone Normalization Rules**:
   - Default country code is `+91` (India).
   - Formats handled: `9876543210` -> `+919876543210`, `09876543210` -> `+919876543210`, `919876543210` -> `+919876543210`, `+91 98765-43210` -> `+919876543210`.
   - International E.164 numbers (e.g., `+14155552671`) are preserved.
5. **Ownership Isolation**:
   - Querying another user's loan returns **404 Not Found** (never 403 Forbidden) to prevent enumeration of resources across accounts.
6. **Magic Bytes Image Validation**:
   - Binary buffer signatures (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `RIFF...WEBP`) are verified rather than relying on file extensions to guarantee security against malicious file uploads.

---

## 📸 Screenshots / Preview

```
+-------------------------------------------------------------+
|  MiniLedger                          +91 98765 43210        |
|  [ TOTAL OUTSTANDING: ₹7,500.00 ]                           |
|  Total Lent: ₹8,500.00 | Repaid: ₹1,000.00 | Overdue: ₹2,500 |
+-------------------------------------------------------------+
|  Priya Patel                      ₹2,500.00                |
|  Due on 21 Oct 2026                                         |
|  [ ⚠️ Overdue by 3 days ]             [ Mark as Repaid ]    |
+-------------------------------------------------------------+
|  Rahul Sharma                     ₹5,000.00                |
|  Due on 31 Oct 2026                                         |
|  [ ⏳ Pending ]                       [ Mark as Repaid ]    |
+-------------------------------------------------------------+
|  Amit Verma                       ₹1,000.00                |
|  Repaid on 19 Oct 2026                                      |
|  [ ✓ Repaid ]                                               |
+-------------------------------------------------------------+
```

---

## ⚠️ Known Limitations
- Mock OTP prints to server console rather than sending actual SMS.
- Single attachment per loan (uploading a second receipt replaces the previous one).
- Full repayment only (partial repayments not supported in current data model).

---

## 🔮 What I'd Do Next
1. **Real SMS Gateway Integration**: Connect to AWS SNS, Twilio, or MSG91 with webhook delivery status reports.
2. **Refresh Tokens & Rotation**: Implement HTTP-only refresh tokens stored in Redis for silent session renewal.
3. **Partial Repayments**: Add a `repayments(id, loanId, amount, paymentMethod, paidAt)` table allowing friends to pay off debts incrementally.
4. **Push Reminders & WhatsApp Alerts**: Schedule automated reminder notifications via Expo Notifications and WhatsApp Business Cloud API 2 days before due date.
5. **Multi-Currency & FX**: Add currency codes (`INR`, `USD`, `EUR`, `GBP`) with live conversion rates for international friends.

---

## ✅ Requirements Traceability Checklist

| Specification Requirement | Implementation Location | Verified Status |
| :--- | :--- | :---: |
| **Strict TS, no `any`, layered architecture** | `backend/src/` (routes, controllers, services, repositories) | ✅ Tested & Lint Clean |
| **Consistent error envelope `{ error: { code, message, details? } }`** | `backend/src/middlewares/error-handler.middleware.ts` | ✅ Verified |
| **Prisma schema with check constraints (`amount > 0`, `status IN (...)`)** | `backend/prisma/migrations/20261024111048_init/migration.sql` | ✅ Verified in Postgres |
| **Money in integer minor units (paise), 2 decimals output** | `backend/src/utils/money.util.ts`, `backend/src/services/loan.service.ts` | ✅ 100% Tested |
| **Overdue = PENDING and dueDate < today (UTC date-only, due today is NOT overdue)** | `backend/src/utils/date.util.ts` (`isLoanOverdue`) | ✅ 100% Tested |
| **Re-runnable migrations & demo seed script** | `backend/prisma/seed.ts` | ✅ Seed Verified |
| **Mock OTP: 6 digits, hashed storage, printed to log, no OTP in response** | `backend/src/services/auth.service.ts` | ✅ Verified |
| **Phone normalization (default +91, invalid formats rejected)** | `backend/src/utils/phone.util.ts` | ✅ Verified & Tested |
| **30s OTP cooldown & max 5/hour rate limit (429 retryAfter)** | `backend/src/services/auth.service.ts` | ✅ Tested in Integration |
| **Single-use OTP, lock after 5 wrong attempts, generic 400** | `backend/src/services/auth.service.ts` | ✅ Tested in Integration |
| **Concurrent first-login safety** | `backend/src/repositories/user.repository.ts` (`findOrCreate`) | ✅ Concurrency Handled |
| **Protected Loan CRUD APIs** | `backend/src/routes/loan.routes.ts`, `backend/src/controllers/loan.controller.ts` | ✅ Verified |
| **Ownership isolation: other user's loan returns 404 (not 403)** | `backend/src/services/loan.service.ts` | ✅ Tested in Integration |
| **Idempotent-safe repay via conditional UPDATE, 409 on already-repaid** | `backend/src/repositories/loan.repository.ts` (`repayLoan`) | ✅ Tested in Integration |
| **Summary API via single aggregate SQL query with zeros on empty state** | `backend/src/repositories/summary.repository.ts` | ✅ Tested in Integration |
| **Bonus Receipt Upload: JPEG/PNG/WebP magic bytes, 5MB limit, file replacement** | `backend/src/utils/file-validator.util.ts`, `backend/src/services/loan.service.ts` | ✅ Tested in Integration |
| **Backend Jest + Supertest test suite with ~90% coverage** | `backend/tests/` (38 tests) | ✅ 100% Passing |
| **React Native (Expo) App: Auth stack vs App stack** | `app/src/navigation/RootNavigator.tsx` | ✅ Verified |
| **Login screen: phone input, OTP input, resend timer, change number** | `app/src/screens/LoginScreen.tsx` | ✅ Verified |
| **Secure token storage & auto-login on relaunch** | `app/src/services/storage.service.ts`, `app/src/context/AuthContext.tsx` | ✅ Verified |
| **Global 401 interceptor triggering automatic logout** | `app/src/services/api.service.ts` | ✅ Verified |
| **Home screen: Summary card, FlatList, overdue highlighted, optimistic repay** | `app/src/screens/HomeScreen.tsx` | ✅ Verified |
| **Add Entry form: validation, native date picker, receipt photo, retry upload** | `app/src/screens/AddEntryScreen.tsx` | ✅ Verified |
