# QueueSmart

QueueSmart is a real-time queue management platform for hospitals, banks, salons, government offices, restaurants, and other service venues. Visitors can join a queue from their phone, track their live position, and return when their turn is close. Staff operate queues and service counters from a dedicated dashboard, while administrators manage venues, teams, analytics, and platform access.

> Take a digital number. Keep your place. Lose the line.

## Highlights

- Guest queue joining -- no account or app download required
- QR-based queue entry and token sharing
- Live token and queue updates over WebSockets
- Estimated wait times and live queue positions
- Multi-counter queue operation
- Priority token handling
- Queue pause, resume, open, and close controls
- In-app notifications and token history
- Venue, staff, queue, and role management
- Peak-hour, queue, and platform analytics
- Responsive public experience and role-based dashboards

## User roles

| Role | Capabilities |
| --- | --- |
| Visitor | Browse venues, join as a guest, receive a token, and track its position |
| User | Manage profile, view token history, statistics, and notifications |
| Staff | Operate assigned queues, call/skip/complete tokens, and manage counters |
| Admin | Create queues, manage venue staff, view analytics, and inspect audit logs |
| Super admin | Manage all venues, users, roles, and platform-wide statistics |

## Multi-counter workflow

Each queue can contain multiple service counters. Staff can:

1. Create and activate counters for a queue.
2. Select the counter from which they are working.
3. Call the next token or a specific waiting token.
4. Complete or skip the active token before calling another customer.

A counter cannot serve two active tokens at the same time. When a token is called, the visitor's tracking screen shows the assigned counter.

## Technology stack

### Backend

- Go
- Gin HTTP framework
- GORM
- PostgreSQL 15
- Redis 7 for pub/sub and token-related state
- Gorilla WebSocket
- JWT access and refresh tokens
- bcrypt password hashing
- go-qrcode

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Zustand
- React Router
- Axios
- React Hook Form and Zod
- Recharts

### Infrastructure

- Docker and Docker Compose
- Nginx
- RabbitMQ service available for future asynchronous workloads

## Architecture

```text
Browser
  |
  +-- HTTP -----------+
  +-- WebSocket ------+
                      |
                      v
                Nginx / Vite
                      |
                      v
                 Go API (Gin)
             +--------+---------+
             v        v         v
         PostgreSQL  Redis   WebSocket Hub
             |        |
             +--------+-- live queue events
```

The backend follows a handler -> service -> repository structure. PostgreSQL stores application data, Redis supports real-time event distribution, and the React client uses REST APIs plus queue/token WebSocket channels.

## Project structure

```text
Queue_Smart/
|-- backend/
|   |-- cmd/server/               # API entry point and routes
|   |-- config/                   # Environment configuration
|   |-- internal/
|   |   |-- handlers/             # HTTP handlers
|   |   |-- middleware/           # Auth, RBAC, CORS, logs, rate limits
|   |   |-- models/               # Database models
|   |   |-- repository/           # Repository interfaces and PostgreSQL code
|   |   |-- services/             # Queue, notification, and prediction logic
|   |   +-- websocket/            # Real-time hub and clients
|   +-- pkg/                      # JWT, QR, Redis, and response helpers
|-- frontend/
|   |-- src/
|   |   |-- components/           # Shared UI, navigation, token and queue UI
|   |   |-- pages/                # Public, auth, user, staff, admin pages
|   |   |-- services/             # REST and WebSocket clients
|   |   |-- stores/               # Zustand state
|   |   |-- types/                # TypeScript domain types
|   |   +-- utils/                # Constants and formatting helpers
|   +-- nginx.conf
|-- docker-compose.yml
+-- README.md
```

## Getting started

### Option 1: Docker Compose

Requirements:

- Docker
- Docker Compose

Start the complete stack:

```bash
docker compose up --build
```

Services:

| Service | URL/port |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Health check | http://localhost:8080/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| RabbitMQ | localhost:5672 |
| RabbitMQ management | http://localhost:15672 |

Stop the stack:

```bash
docker compose down
```

Remove containers and database volumes:

```bash
docker compose down -v
```

### Option 2: Local development

Requirements:

- Go matching the version declared in `backend/go.mod`
- Node.js and npm
- PostgreSQL
- Redis

#### Backend

```bash
cd backend
cp .env.example .env
go mod download
go run ./cmd/server
```

On PowerShell, use:

```powershell
cd backend
Copy-Item .env.example .env
go mod download
go run ./cmd/server
```

The API starts on `http://localhost:8080`. GORM automatically creates or updates the required tables during startup.

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:3000` and proxies `/api` and `/ws` requests to the backend.

## Environment variables

Create `backend/.env` from `backend/.env.example`.

| Variable | Default | Description |
| --- | --- | --- |
| `APP_ENV` | `development` | Application environment |
| `APP_PORT` | `8080` | API port |
| `JWT_SECRET` | Not set | Secret used to sign JWTs; replace in production |
| `JWT_ACCESS_EXPIRES` | `15m` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES` | `168h` | Refresh-token lifetime |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `queuesmart` | PostgreSQL user |
| `DB_PASSWORD` | `queuesmart123` | PostgreSQL password |
| `DB_NAME` | `queuesmart` | PostgreSQL database |
| `DB_SSLMODE` | `disable` | PostgreSQL SSL mode |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672/` | RabbitMQ connection URL |
| `BASE_URL` | `http://localhost:8080` | Public backend URL |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed frontend origin |

Never use the example database password or JWT secret in production.

## API overview

All REST endpoints use the `/api/v1` prefix.

### Authentication

| Method | Endpoint |
| --- | --- |
| `POST` | `/auth/register` |
| `POST` | `/auth/login` |
| `POST` | `/auth/logout` |
| `POST` | `/auth/refresh` |
| `POST` | `/auth/forgot-password` |
| `POST` | `/auth/reset-password` |
| `GET` | `/auth/verify-email` |

### Public queues and venues

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/venues` | Browse and filter venues |
| `GET` | `/venues/:slug` | Get venue details and queues |
| `GET` | `/queues/:id` | Get queue status |
| `GET` | `/queues/:id/qr` | Generate a queue QR code |
| `POST` | `/queues/:id/join` | Join a queue as a guest or user |
| `GET` | `/queues/:id/position/:tokenId` | Get live position and wait estimate |
| `GET` | `/tokens/:id` | Get token details |

### Authenticated user

| Method | Endpoint |
| --- | --- |
| `GET`, `PUT` | `/me` |
| `PUT` | `/me/password` |
| `GET` | `/me/tokens` |
| `GET` | `/me/stats` |
| `GET` | `/me/notifications` |
| `PUT` | `/me/notifications/:id/read` |
| `PUT` | `/me/notifications/read-all` |
| `POST` | `/tokens/:id/cancel` |

### Staff and counters

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/staff/queues` | List assigned venue queues |
| `GET` | `/staff/queues/:id/tokens` | List active tokens |
| `GET`, `POST` | `/staff/queues/:id/counters` | List or create counters |
| `PUT` | `/staff/counters/:counterId` | Rename or activate/deactivate a counter |
| `POST` | `/staff/queues/:id/call-next` | Call the next token at a counter |
| `POST` | `/staff/tokens/:id/call` | Call a specific token |
| `POST` | `/staff/tokens/:id/complete` | Complete service |
| `POST` | `/staff/tokens/:id/skip` | Skip a token |
| `POST` | `/staff/tokens/:id/priority` | Toggle token priority |
| `PUT` | `/staff/queues/:id/status` | Change queue status |
| `GET` | `/staff/queues/:id/analytics` | Get queue analytics |

Counter-aware call requests accept an optional body:

```json
{
  "counter_id": "counter-uuid"
}
```

### Admin and super admin

Admin endpoints manage queues, venue statistics, staff, peak hours, and audit logs under `/admin`. Super-admin endpoints manage platform venues, users, roles, and system statistics under `/superadmin`.

## WebSocket channels

| Channel | URL | Typical events |
| --- | --- | --- |
| Queue | `/ws/queue/:id` | `queue.joined`, `token_called`, `position.updated`, `queue.status_changed` |
| Token | `/ws/token/:id` | `your_turn`, `token.cancelled` |

When a token is called, the event includes its display code and assigned counter when available.

## Useful commands

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

The repository currently includes a lint script, but an ESLint configuration must be added before `npm run lint` can run.

### Backend

```bash
go run ./cmd/server
go test ./...
```

## Security notes

- Replace all example secrets and passwords before deployment.
- Serve the application over HTTPS in production.
- Restrict allowed CORS origins.
- Keep access-token lifetimes short and rotate refresh tokens as needed.
- Place PostgreSQL, Redis, and RabbitMQ on private networks.
- Review role assignments and audit logs regularly.

## Current development notes

- Email verification and password-reset delivery require a production email provider.
- RabbitMQ is included in the infrastructure but is not yet required by the core queue flow.
- The frontend build reports a large-bundle warning; route-based code splitting is a useful future optimization.
- Automated backend test files and end-to-end browser tests can be expanded further.

## Roadmap ideas

- SMS and WhatsApp notifications
- Appointment and walk-in hybrid scheduling
- No-show grace periods and token recall
- Public television queue boards with voice announcements
- Queue transfers between departments
- Customer feedback and service ratings
- CSV and PDF reporting
- Improved forecasting using staffing and recent service velocity

## Contributing

1. Create a feature branch.
2. Make focused changes.
3. Run `go test ./...` in `backend`.
4. Run `npm run build` in `frontend`.
5. Open a pull request describing the change and verification performed.

## License

Add a `LICENSE` file before publishing the project publicly. Until then, all rights remain with the project owner.
