# Task Time Tracker

A full-stack time tracking application to log daily task progress, plan weekly tasks, and visualize productivity metrics.

## Features

- 📅 **Calendar View**: Click any date to log actual time spent on tasks
- 📊 **Dashboard**: Visualize time tracking with charts (daily, weekly, monthly)
- 📋 **Weekly Plan**: Pre-plan expected time for tasks each day
- 📈 **Ratio Tracking**: Compare actual vs. expected time spent (displayed as percentage)
- 🏷️ **Task Categories**: Organize tasks by work, personal, health, learning, or other

## Tech Stack

### Frontend
- **React 18** + Vite (HMR dev server)
- **Tailwind CSS** for styling
- **React Router v6** for navigation
- **Zustand** for state management
- **Recharts** for data visualization
- **date-fns** for date manipulation

### Backend
- **Node.js** + Express
- **PostgreSQL 17** with pg (node-postgres)
- **express-validator** for request validation
- **CORS** enabled for cross-origin requests

### Infrastructure
- **Docker** + **Docker Compose** (3 services: db, server, client)
- Environment-based configuration

## Project Structure

```
task-time-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # fetch wrappers for API endpoints
│   │   ├── pages/         # Calendar, Dashboard, WeeklyPlan
│   │   ├── store/         # Zustand stores (tasks, plans, sessions)
│   │   ├── App.jsx        # Router setup
│   │   └── index.css      # Tailwind imports
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── server/                # Express API
│   ├── routes/           # tasks, plans, sessions, summary
│   ├── db/               # pg pool singleton + migrations
│   ├── utils/            # date helpers
│   ├── index.js          # Express app entry
│   └── Dockerfile
├── docker-compose.yml    # 3 services + volumes
├── .env.example         # Environment template
└── CLAUDE.md            # Project documentation
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- (Optional) Node.js 18+ for local development

### Setup

1. **Clone & install:**
   ```bash
   git clone https://github.com/tomishing/task-time-tracker.git
   cd task-time-tracker
   cp .env.example .env
   ```

2. **Start with Docker:**
   ```bash
   docker-compose up
   ```

3. **Open in browser:**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - Database: localhost:5432

### Local Development (without Docker)

1. **Install dependencies:**
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

2. **Start PostgreSQL** (or use Docker just for the DB):
   ```bash
   docker run -d -p 5432:5432 \
     -e POSTGRES_DB=timetracker \
     -e POSTGRES_USER=app \
     -e POSTGRES_PASSWORD=secret \
     postgres:17-alpine
   ```

3. **Run migrations:**
   ```bash
   psql -U app -d timetracker -h localhost < server/db/migrations/001_init.sql
   ```

4. **Start backend:**
   ```bash
   cd server
   npm run dev
   ```

5. **Start frontend** (in another terminal):
   ```bash
   cd client
   npm run dev
   ```

## API Documentation

All responses use `{ data, error }` envelope format.

### Tasks
- `GET /api/tasks` — List all tasks
- `POST /api/tasks` — Create task `{ name, category }`
- `DELETE /api/tasks/:id` — Delete task

### Weekly Plans
- `GET /api/plans?week=YYYY-MM-DD` — Plans for week containing date
- `POST /api/plans` — Add plan `{ task_id, planned_date, expected_mins }`
- `PUT /api/plans/:id` — Update expected time `{ expected_mins }`
- `DELETE /api/plans/:id` — Remove plan

### Time Sessions
- `POST /api/sessions` — Log time `{ task_id, logged_date, actual_mins, note }`
- `DELETE /api/sessions/:id` — Delete session

### Summary (Aggregations)
- `GET /api/summary?period=daily|weekly|monthly&date=YYYY-MM-DD`

Response includes:
- Total actual/expected minutes and ratio
- Breakdown by category
- Breakdown by task

## Database Schema

```sql
-- Tasks (master list)
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('work','personal','health','learning','other')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly plan (pre-planned tasks with expected hours)
CREATE TABLE weekly_plans (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  expected_mins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Actual time records
CREATE TABLE time_sessions (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  actual_mins INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Key Concepts

### Ratio Logic
- `ratio = actual_mins / expected_mins`
- Displayed as percentage: `ratio * 100` → e.g., `120%`
- If `expected_mins = 0`, display as `—` (no expectations set)
- No cap on ratio — shows 150%, 200%, etc. as-is

### Date Handling
- Frontend uses `date-fns` for date manipulation
- Database uses `DATE` type (no timezone needed for dates)
- Weekly view is Monday–Sunday
- Monthly view is 1st–last day of month

## Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** and test locally

3. **Commit with descriptive message:**
   ```bash
   git commit -m "Add feature description"
   ```

4. **Push and create PR:**
   ```bash
   git push origin feature/your-feature
   ```

## Environment Variables

See `.env.example` and individual `.env.example` files in `client/` and `server/`.

Key variables:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — Database config
- `DATABASE_URL` — Connection string for Node.js
- `VITE_API_URL` — Frontend API endpoint (default: http://localhost:4000)
- `PORT` — Server port (default: 4000)
- `NODE_ENV` — Environment mode (development/production)

## Troubleshooting

### Database connection fails
- Check `.env` has correct `POSTGRES_PASSWORD` matching docker-compose.yml
- Ensure PostgreSQL container is running: `docker ps`
- Check logs: `docker-compose logs db`

### Port already in use
- Change ports in docker-compose.yml or kill the process:
  ```bash
  lsof -i :3000  # Frontend
  lsof -i :4000  # API
  lsof -i :5432  # Database
  ```

### Clear all data
```bash
docker-compose down -v
docker-compose up
```

## License

MIT

## Contributing

Contributions welcome! Please follow the conventions in CLAUDE.md.
