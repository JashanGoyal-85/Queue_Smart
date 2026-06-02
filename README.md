<div align="center">

<img src="https://img.shields.io/badge/QueueSmart-v1.0.0-2563EB?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMiA2Yy4yOCAwIC41LjIyLjUuNXY1aDMuNWMuMjggMCAuNS4yMi41LjVzLS4yMi41LS41LjVIMTJjLS4yOCAwLS41LS4yMi0uNS0uNVY2LjVjMC0uMjguMjItLjUuNS0uNXoiLz48L3N2Zz4=" />

# QueueSmart

### 🚀 A Real-Time Smart Queue Management System

**Skip the wait. Save your time.**  
QueueSmart lets people join queues at hospitals, banks, salons, and more — from their phone — and get notified the moment their turn arrives.

[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Run with Docker (Recommended)](#run-with-docker-recommended)
  - [Run Locally (Dev Mode)](#run-locally-dev-mode)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [WebSocket Events](#-websocket-events)
- [User Roles](#-user-roles)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

QueueSmart is a production-ready, full-stack queue management platform built for venues that serve large numbers of people daily. It eliminates physical queues by allowing visitors to join digitally via a QR code or a link — no app download required.

Staff manage queues in real-time from a dedicated dashboard. Admins configure queues and manage staff. Super-admins oversee the entire platform. Everyone gets live updates via WebSockets.

---

## ✨ Features

### For Visitors (Public)
- 🔍 **Browse Venues** — Search by name, city, or category (hospital, bank, salon, canteen, government)
- 📱 **QR Code Join** — Scan to join instantly, no account needed (guest join supported)
- 🎟️ **Live Token Tracker** — Real-time position updates and estimated wait time via WebSocket
- 🔔 **Turn Notification** — Instant "It's your turn!" alert with celebration screen
- 📊 **Wait Estimation** — AI-driven wait time predictions based on historical data

### For Users (Registered)
- 📁 **Token History** — View all past and active queue tokens
- 🔔 **Notification Centre** — In-app notifications (token called, queue updates, announcements)
- ⚙️ **Account Settings** — Profile management and password change
- 📈 **Personal Stats** — Total queues joined, average wait, time saved

### For Staff
- ⚡ **Real-time Queue Board** — Live list of waiting tokens with priority indicators
- ▶️ **Call Next / Call Specific** — Flexible token calling with one click
- ✅ **Complete / Skip / Cancel** — Full token lifecycle management
- ⭐ **Priority Toggle** — Instantly promote any token to priority
- ⏸️ **Queue Controls** — Open, pause, resume, or close any queue instantly

### For Admins
- ➕ **Queue Management** — Create, configure, and delete queues
- 👥 **Staff Management** — Add/remove staff members, assign roles
- 📊 **Peak Hours Heatmap** — 7×24 visual heatmap of busiest times
- 🗒️ **Audit Logs** — Full log of all staff actions

### For Super-Admins
- 🏢 **Venue Management** — Create and manage all venues on the platform
- 👤 **User Management** — View all users and change roles
- 📡 **System Overview** — Platform-wide stats and health check

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Go 1.22+** | Core application language |
| **Gin** | HTTP web framework |
| **GORM** | ORM for PostgreSQL |
| **PostgreSQL 15** | Primary database |
| **Redis 7** | Pub/Sub for WebSocket broadcast + token storage |
| **Gorilla WebSocket** | Real-time bidirectional communication |
| **JWT (golang-jwt/jwt/v5)** | Access & refresh token authentication |
| **RabbitMQ** | Message queue for async processing |
| **bcrypt** | Password hashing |
| **go-qrcode** | QR code generation |
| **golang.org/x/time/rate** | Per-IP rate limiting |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library |
| **TypeScript 5** | Type safety |
| **Vite** | Build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | Global state management |
| **React Query (TanStack)** | Server state, caching, refetching |
| **Axios** | HTTP client with auth interceptors |
| **React Router v6** | Client-side routing |
| **Recharts** | Analytics charts |
| **React Hook Form + Zod** | Form validation |
| **React Hot Toast** | Toast notifications |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Container orchestration |
| **Nginx** | Frontend serving + reverse proxy |
| **Multi-stage Docker builds** | Optimized production images |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                    Nginx (Port 3000)                            │
│              Frontend SPA  │  Proxy → /api/*  → :8080          │
│                            │  Proxy → /ws/*   → :8080          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                  Go API Server (Port 8080)                      │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Auth   │  │  Queue   │  │  Staff   │  │  SuperAdmin  │   │
│  │ Handler  │  │ Handler  │  │ Handler  │  │   Handler    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │              │                │           │
│  ┌────▼──────────────▼──────────────▼────────────────▼──────┐  │
│  │                     Service Layer                        │  │
│  │   QueueService │ NotificationService │ PredictionService │  │
│  └────┬───────────────────────────────────────────────┬─────┘  │
│       │                                               │         │
│  ┌────▼────────────┐                      ┌───────────▼──────┐ │
│  │  Repository     │                      │  WebSocket Hub   │ │
│  │  (GORM/PgSQL)   │                      │  (Redis Pub/Sub) │ │
│  └────┬────────────┘                      └───────────┬──────┘ │
└───────┼───────────────────────────────────────────────┼────────┘
        │                                               │
┌───────▼──────────┐     ┌───────────────┐   ┌─────────▼──────┐
│   PostgreSQL 15  │     │   RabbitMQ    │   │    Redis 7     │
│   (Primary DB)   │     │  (Async Jobs) │   │ (Cache/PubSub) │
└──────────────────┘     └───────────────┘   └────────────────┘
```

---

## 📁 Project Structure

```
QueueSmart/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── go.mod / go.sum
│   ├── cmd/
│   │   └── server/
│   │       └── main.go              # Application entry point
│   ├── config/
│   │   └── config.go                # Config loader from env
│   ├── internal/
│   │   ├── models/                  # GORM domain models
│   │   │   ├── user.go
│   │   │   ├── venue.go
│   │   │   ├── queue.go
│   │   │   ├── token.go
│   │   │   ├── analytics.go
│   │   │   ├── notification.go
│   │   │   ├── audit_log.go
│   │   │   └── constants.go
│   │   ├── handlers/                # HTTP handler functions
│   │   │   ├── auth.go
│   │   │   ├── user.go
│   │   │   ├── venue.go
│   │   │   ├── queue.go
│   │   │   ├── staff.go
│   │   │   ├── admin.go
│   │   │   ├── superadmin.go
│   │   │   └── ws.go
│   │   ├── services/                # Business logic layer
│   │   │   ├── queue_service.go
│   │   │   ├── notification_service.go
│   │   │   └── prediction_service.go
│   │   ├── repository/              # Data access layer
│   │   │   ├── interfaces.go
│   │   │   └── postgres/
│   │   │       ├── user_repo.go
│   │   │       ├── venue_repo.go
│   │   │       ├── queue_repo.go
│   │   │       ├── token_repo.go
│   │   │       ├── analytics_repo.go
│   │   │       ├── notification_repo.go
│   │   │       └── audit_repo.go
│   │   ├── middleware/
│   │   │   ├── auth.go              # JWT middleware
│   │   │   ├── rbac.go              # Role-based access
│   │   │   ├── ratelimit.go         # Per-IP rate limiting
│   │   │   ├── logger.go
│   │   │   └── cors.go
│   │   └── websocket/
│   │       ├── hub.go               # WebSocket hub (Redis pub/sub)
│   │       └── client.go            # WebSocket client handler
│   └── pkg/
│       ├── jwt/jwt.go
│       ├── redis/redis.go
│       ├── qrcode/qrcode.go
│       └── response/response.go
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx                  # Routes & role guards
        ├── main.tsx
        ├── types/index.ts           # TypeScript domain models
        ├── services/
        │   ├── api.ts               # Axios + all API calls
        │   └── websocket.ts         # WebSocket client wrapper
        ├── stores/
        │   ├── authStore.ts         # Zustand auth state
        │   └── notificationStore.ts
        ├── components/
        │   ├── layout/              # Sidebar, Navbar, Layout
        │   ├── ui/                  # Button, Input, Badge, Modal, Table...
        │   ├── token/               # TokenCard
        │   └── queue/               # QRCodeCard
        ├── pages/
        │   ├── public/              # Landing, Venues, VenueDetail, JoinQueue, TrackToken
        │   ├── auth/                # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
        │   ├── user/                # Dashboard, MyTokens, Notifications, Settings
        │   ├── staff/               # StaffDashboard, QueueManagement, Analytics
        │   ├── admin/               # AdminDashboard, CreateQueue, QueueSettings, StaffManagement, PeakHours
        │   └── superadmin/          # SystemOverview, VenueManagement, UserManagement
        └── utils/
            ├── formatters.ts
            └── constants.ts
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:

| Tool | Version | Download |
|---|---|---|
| **Docker** | 24+ | [docker.com](https://www.docker.com/get-started) |
| **Docker Compose** | v2+ | Included with Docker Desktop |
| **Git** | any | [git-scm.com](https://git-scm.com/) |

> For local development without Docker: Go 1.22+ and Node.js 20+

---

### Run with Docker (Recommended)

This single command starts the entire stack — PostgreSQL, Redis, RabbitMQ, Go API, and React frontend.

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/QueueSmart.git
cd QueueSmart
```

**2. Start all services**
```bash
docker compose up --build
```

**3. Open in browser**
| Service | URL |
|---|---|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ API | http://localhost:8080/api/v1 |
| 🐇 RabbitMQ Dashboard | http://localhost:15672 (guest/guest) |
| 🗄️ PostgreSQL | localhost:5432 |
| 🔴 Redis | localhost:6379 |

**Run in background (detached mode)**
```bash
docker compose up --build -d
```

**Stop all services**
```bash
docker compose down
```

**Stop and remove all data (volumes)**
```bash
docker compose down -v
```

**View logs**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f frontend
```

**Rebuild a single service after code change**
```bash
docker compose up --build app
docker compose up --build frontend
```

---

### Run Locally (Dev Mode)

**Step 1 — Start infrastructure only**
```bash
docker compose up postgres redis rabbitmq -d
```

**Step 2 — Run the backend**
```bash
cd backend
cp .env.example .env      # Edit .env if needed
go mod download
go run ./cmd/server/main.go
```
> API available at: http://localhost:8080

**Step 3 — Run the frontend**
```bash
cd frontend
npm install
npm run dev
```
> Frontend available at: http://localhost:3000

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | Environment (`development` / `production`) |
| `APP_PORT` | `8080` | API server port |
| `JWT_SECRET` | — | **Change this!** Secret key for JWT signing |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | `168h` | Refresh token lifetime (7 days) |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `queuesmart` | Database user |
| `DB_PASSWORD` | `queuesmart123` | Database password |
| `DB_NAME` | `queuesmart` | Database name |
| `DB_SSLMODE` | `disable` | SSL mode (`disable` for local) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672/` | RabbitMQ URL |
| `BASE_URL` | `http://localhost:8080` | Backend public URL |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL (used for CORS) |

> ⚠️ **Never commit your real `.env` file.** It's already in `.gitignore`.

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Register new user |
| `POST` | `/auth/login` | ❌ | Login, returns JWT tokens |
| `POST` | `/auth/logout` | ✅ | Invalidate refresh token |
| `POST` | `/auth/refresh` | ❌ | Get new access token |
| `POST` | `/auth/forgot-password` | ❌ | Send password reset email |
| `POST` | `/auth/reset-password` | ❌ | Reset password with token |
| `POST` | `/auth/verify-email` | ❌ | Verify email address |

### Venues
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/venues` | ❌ | List all active venues (filterable) |
| `GET` | `/venues/:slug` | ❌ | Get venue + its active queues |

### Queues & Tokens
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/queues/:id` | Optional | Queue status + wait time |
| `POST` | `/queues/:id/join` | Optional | Join a queue (guest or auth) |
| `GET` | `/queues/:id/position/:tokenId` | ❌ | Token position in queue |
| `GET` | `/queues/:id/qr` | ❌ | Get queue QR code (PNG) |
| `GET` | `/tokens/:id` | ✅ | Get token details |
| `POST` | `/tokens/:id/cancel` | ✅ | Cancel own token |

### User (Requires auth)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/me` | Get own profile |
| `PUT` | `/me` | Update name/phone/avatar |
| `PUT` | `/me/password` | Change password |
| `GET` | `/me/tokens` | Token history (paginated) |
| `GET` | `/me/stats` | Personal stats |
| `GET` | `/me/notifications` | All notifications |
| `PUT` | `/me/notifications/:id` | Mark notification read |

### Staff (`staff`, `admin`, `superadmin`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/staff/queues` | All queues for venue |
| `GET` | `/staff/queues/:id/tokens` | All active tokens in queue |
| `POST` | `/staff/queues/:id/call-next` | Call next token |
| `POST` | `/staff/tokens/:id/call` | Call specific token |
| `POST` | `/staff/tokens/:id/complete` | Mark token completed |
| `POST` | `/staff/tokens/:id/skip` | Skip token |
| `POST` | `/staff/tokens/:id/priority` | Toggle priority |
| `PUT` | `/staff/queues/:id/status` | Change queue status |
| `GET` | `/staff/queues/:id/analytics` | Today's queue analytics |

### Admin (`admin`, `superadmin`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/admin/queues` | Create new queue |
| `PUT` | `/admin/queues/:id` | Update queue settings |
| `DELETE` | `/admin/queues/:id` | Soft delete queue |
| `GET` | `/admin/venues/:id/stats` | Venue statistics |
| `GET` | `/admin/venues/:id/peak-hours` | Peak hours heatmap data |
| `GET` | `/admin/venues/:id/users` | All venue staff |
| `POST` | `/admin/venues/:id/staff` | Add staff member |
| `DELETE` | `/admin/venues/:id/staff/:userId` | Remove staff |
| `GET` | `/admin/audit-logs` | Audit log |

### Super Admin (`superadmin` only)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/superadmin/venues` | Create venue |
| `GET` | `/superadmin/venues` | List all venues |
| `PUT` | `/superadmin/venues/:id` | Update venue |
| `GET` | `/superadmin/users` | List all users |
| `PUT` | `/superadmin/users/:id/role` | Change user role |
| `GET` | `/superadmin/stats` | System-wide statistics |

### WebSocket
| Endpoint | Description |
|---|---|
| `WS /ws/queue/:id` | Subscribe to queue-level events |
| `WS /ws/token/:id` | Subscribe to personal token events |

---

## 📡 WebSocket Events

### Queue channel (`/ws/queue/:id`)
| Event | Payload | Description |
|---|---|---|
| `queue.joined` | `{ tokenNumber, displayCode, currentCount }` | Someone joined the queue |
| `token_called` | `{ tokenID, tokenNumber, displayCode, calledAt }` | A token was called |
| `position.updated` | `{ tokenID, status }` | Token completed/skipped |
| `queue.status_changed` | `{ queueID, status }` | Queue opened/paused/closed |

### Token channel (`/ws/token/:id`)
| Event | Payload | Description |
|---|---|---|
| `your_turn` | `{ tokenID, displayCode, calledAt }` | 🎉 It's this token's turn |
| `token.cancelled` | `{ tokenID, status }` | Token was cancelled |

---

## 👤 User Roles

| Role | Access |
|---|---|
| **User** | Browse venues, join queues, track tokens, manage own account |
| **Staff** | All user access + call/complete/skip tokens, manage queue status |
| **Admin** | All staff access + create/edit queues, manage staff, view analytics |
| **SuperAdmin** | Full platform access — manage all venues, users, and system settings |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes** following [Conventional Commits](https://www.conventionalcommits.org/)
   ```bash
   git commit -m "feat: add email notification on token called"
   ```
4. **Push** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against `main`

### Code Style
- **Go:** Follow standard `gofmt` formatting. Run `go vet ./...` before committing.
- **TypeScript:** ESLint + Prettier. Run `npm run lint` before committing.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Gin Web Framework](https://github.com/gin-gonic/gin)
- [GORM](https://gorm.io/)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)
- [Recharts](https://recharts.org/)

---

<div align="center">

**Made with ❤️ by [Jashan Goyal](https://github.com/jashangoyal)**

⭐ Star this repo if you find it useful!

</div>
