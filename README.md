# RS Inventory – Solo

Offline-first Windows desktop inventory and billing application designed for small retail businesses in India.

---

## 1. Project Overview

**RS Inventory – Solo** is an offline-first Windows desktop software suite tailored specifically for independent Indian retail shops, grocers, electronics stores, and local merchants. It operates 100% locally without requiring internet connectivity, providing fast barcode billing, offline inventory control, thermal printing, GST compliant records, and local SQLite data integrity.

The core architecture is built with a strictly decoupled layered pattern so the exact same business logic and domain entities can be transitioned to:

- **RS Inventory – LAN** (Multi-counter retail setup using PostgreSQL over a local network)
- **RS Inventory – Business** (Multi-branch / Enterprise cloud-synchronized edition)

---

## 2. Technology Stack

- **Desktop Host**: Electron 34+, Electron Builder
- **Frontend / Renderer**: React 18/19, TypeScript, Vite 6, Tailwind CSS, Lucide React Icons
- **Backend / Desktop Application Layer**: Node.js 22/24, TypeScript
- **Database & Data Access**: SQLite, Prisma ORM
- **State Management**: Zustand
- **Testing**: Vitest
- **Code Quality**: ESLint, Prettier, TypeScript Strict Mode

---

## 3. Architecture

RS Inventory enforces strict separation of concerns. React components are prohibited from executing SQL queries directly or accessing the filesystem.

```text
React UI (Renderer)
   ↓ (window.rsInventory via Preload Bridge)
Electron Main IPC Router
   ↓
Application Services (ProductService, CustomerService, etc.)
   ↓
Business Logic & Domain Models
   ↓ (Interfaces: IProductRepository, ICustomerRepository, etc.)
Repository Layer
   ↓
Data Access (DatabaseService & Prisma Client)
   ↓
SQLite Database (Solo) / PostgreSQL (Future LAN)
```

### Security Highlights

- `contextIsolation: true`
- `nodeIntegration: false`
- No filesystem access from renderer
- Secure preload with strictly typed API contract (`window.rsInventory`)
- Error sanitizer strips sensitive stack traces before sending IPC responses to UI

---

## 4. Project Structure

```text
rs-inventory/
├── desktop/
│   ├── electron/               # Electron main process, IPC router, services
│   │   ├── src/
│   │   │   ├── ipc/            # Typed IPC handlers (system, config, db, logs)
│   │   │   ├── services/       # ConfigService, LoggerService, BackupService
│   │   │   ├── main.ts         # Window management & startup sequence
│   │   │   └── preload.ts      # Secure preload context bridge
│   │   └── package.json
│   │
│   └── renderer/               # React + Vite desktop frontend
│       ├── src/
│       │   ├── components/     # ErrorBoundary, Toasts, ProtectedRoute
│       │   ├── layouts/        # Sidebar, Topbar, AppLayout
│       │   ├── pages/          # DashboardPage, ComingSoonPage
│       │   ├── routes/         # Application router
│       │   ├── store/          # Zustand stores (app, auth, company, settings)
│       │   ├── index.css       # Tailwind CSS & custom scrollbars
│       │   ├── App.tsx         # Root app wrapper
│       │   └── main.tsx        # React DOM entry point
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   ├── types/                  # Shared TypeScript interfaces & IPC contracts
│   ├── database/               # Prisma schema (21 tables) & DatabaseService
│   ├── business/               # Repositories interfaces, AppError hierarchy, services
│   └── printing/               # Thermal 58mm/80mm receipt printing interfaces
│
├── server/                     # Future LAN backend server stub
├── tests/
│   ├── unit/                   # Config, Error, Logger unit tests
│   └── integration/            # Database SQLite & Transaction tests
├── scripts/                    # Build & verification utilities
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 5. Installation

Ensure Node.js (v20+ or v24+) and npm are installed:

```bash
# Clone the repository
git clone <repository-url>
cd rs-inventory

# Install all workspace dependencies
npm install
```

---

## 6. Development Setup

Create your `.env` configuration from `.env.example`:

```bash
cp .env.example .env
```

---

## 7. Environment Configuration

The application uses centralized configuration (`ConfigService`). By default on Windows, data files are located in the user's roaming AppData directory:

```env
APP_NAME=RS Inventory
APP_VERSION=1.0.0
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

### Windows Application Data Location:

- Database: `%APPDATA%\RS Inventory\database\rs_inventory.db`
- Backups: `%APPDATA%\RS Inventory\backups\`
- Logs: `%APPDATA%\RS Inventory\logs\application.log`
- Exports: `%APPDATA%\RS Inventory\exports\`

The application automatically creates these folders on startup.

---

## 8. Database Setup & Migrations

The database foundation defines 21 core retail tables:

1. `companies`
2. `users`
3. `categories`
4. `units`
5. `products`
6. `stock_movements`
7. `purchases`
8. `purchase_items`
9. `sales_invoices`
10. `sales_items`
11. `sales_returns`
12. `sales_return_items`
13. `purchase_returns`
14. `purchase_return_items`
15. `customers`
16. `suppliers`
17. `payments_received`
18. `payments_made`
19. `customer_ledger`
20. `supplier_ledger`
21. `audit_logs`

Generate the Prisma client:

```bash
npm run db:generate
```

Push or migrate the database schema:

```bash
npm run db:push
```

Open Prisma Studio to inspect local records:

```bash
npm run db:studio
```

---

## 9. Running Development Version

Start the concurrent development environment (Vite renderer on port 5173 + compiled Electron main):

```bash
npm run dev
```

To run only the React Vite renderer in the browser for UI prototyping:

```bash
npm run dev:renderer
```

---

## 10. Building Windows Application

To compile all packages, build the production Vite web bundle, and build the Electron main process:

```bash
npm run build
```

To package the Windows installer (`.exe` / NSIS installer and portable executable):

```bash
npm run build:win
```

Installers are generated in the `release/` directory.

---

## 11. Testing

Run automated unit and integration tests (Vitest):

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

---

## 12. Linting & Formatting

```bash
# Lint source code
npm run lint

# Check formatting
npm run format:check

# Format files with Prettier
npm run format

# Run TypeScript strict typecheck across all workspaces
npm run typecheck
```

---

## 13. Backup Architecture

The `BackupService` provides offline snapshots of the active SQLite database:

- Backups are stored in `%APPDATA%\RS Inventory\backups\` with timestamped naming: `rs_inventory_backup_YYYY-MM-DDTHH-mm-ss.db`
- Can be triggered automatically on application close or manually via Settings.

---

## 14. Future LAN Architecture

In **RS Inventory – LAN**:

- Multiple cashier terminals running the same React UI connect to a central local server (`server/`).
- The `DatabaseService` switches from SQLite to PostgreSQL via environment configuration.
- The business logic and repository interfaces (`IProductRepository`, `ISalesRepository`, etc.) remain identical, guaranteeing zero rewrite of business rules.

---

## License

MIT License &copy; 2026 RS Inventory Team
