Task Time Tracker

A full-stack time tracking application to log daily task progress, plan weekly tasks, and visualize productivity metrics.

## Features

- 📅 **Calendar View**: Click any date to log actual time spent on tasks
  - See all planned tasks for a day
  - Log time with optional notes
  - Quick task selection from master list

- 📊 **Dashboard**: Visualize productivity with Recharts
  - Toggle between Daily, Weekly, and Monthly views
  - Bar charts by category and by task
  - Summary cards showing totals and ratio
  - Task breakdown table with color-coded ratios
  - Ratio coloring: Green (≤100%), Amber (100-150%), Red (>150%)

- 📋 **Weekly Plan**: Pre-plan expected time for each day
  - Week navigation (Prev/Next/This Week)
  - Add tasks with expected minutes
  - 7-day grid showing all planned tasks
  - Inline editing of expected minutes
  - Weekly summary with totals and averages

- 📈 **Ratio Tracking**: Compare actual vs. expected time
  - Displayed as percentage (e.g., 120%)
  - Aggregated by category, by task, and overall
  - Visual indicators for over/under target

- 🏷️ **Task Categories**: Organize tasks by type
  - Work, Personal, Health, Learning, Other
  - Filter and group by category in dashboard

- ⚠️ **Robust Error Handling**: Professional UX across all pages
  - Loading spinners during async operations
  - Error states with retry buttons
  - Empty states with helpful guidance
  - Form validation with inline feedback
  - Disabled inputs during submission (prevents double-submit)

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
│   │   ├── components/    # Reusable UI: LoadingSpinner, ErrorState, EmptyState
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

## User Workflows

### 1. Plan Your Week
1. Go to Weekly Plan page
2. Click "Add Task to Week" form
3. Select task, date, and expected minutes
4. View your plan in the 7-day grid
5. Edit expected minutes inline as needed

### 2. Log Your Time (Daily)
1. Go to Calendar page
2. Click a date to open the side panel
3. See all planned tasks for that day
4. Select a task and enter actual minutes
5. Add optional notes and submit

### 3. Review Progress
1. Go to Dashboard page
2. Toggle between Daily, Weekly, or Monthly views
3. Check your ratio in the summary card:
   - **Green (≤100%)**: You're on or under target
   - **Amber (100-150%)**: You're over-invested in this task
   - **Red (>150%)**: You spent way more than planned
4. Examine task breakdown table for details

## Key Concepts

### Ratio Logic
- `ratio = actual_mins / expected_mins`
- Displayed as percentage: `ratio * 100` → e.g., `120%`
- If `expected_mins = 0`, display as `—` (no expectations set)
- No cap on ratio — shows 150%, 200%, etc. as-is

**Color Coding:**
- **≤100%** (Green) — On target
- **100-150%** (Amber) — Over by up to 50%
- **>150%** (Red) — Over by more than 50%

### Date Handling
- Frontend uses `date-fns` for date manipulation
- Database uses `DATE` type (no timezone needed for dates)
- Weekly view is Monday–Sunday
- Monthly view is 1st–last day of month
- All dates are stored in UTC and displayed in local time

## User Experience Components

### Loading States
- **LoadingSpinner**: Animated spinner in 3 sizes (sm, md, lg)
  - Appears in form submit buttons
  - Shown during async API calls
  - Prevents user confusion during waiting periods

- **LoadingState**: Full-page loading display
  - Large centered spinner + message
  - Used when fetching dashboard data
  - Graceful UX while data loads

### Error Handling
- **ErrorState**: Professional error display
  - Red background with icon
  - Clear error message from API
  - "Try Again" retry button
  - Used for API failures and network issues

- **Form Validation**: Inline error messages
  - Validates required fields
  - Shows error above form
  - Form inputs disabled during submission

### Empty States
- **EmptyState**: Helpful placeholder for missing data
  - Centered with icon
  - Clear message explaining what's missing
  - Optional action button (e.g., "Add Task")
  - Examples: No tasks planned, no data for period

### State Management
All pages use proper loading/error state variables:
- `isLoading`: For form submissions and data fetch
- `tasksLoading`: For initial task list load
- `error`: For API-level errors
- `formError`: For form validation errors
- Form inputs disabled (`disabled={isLoading}`) to prevent double-submit

## Dashboard Visualizations

### Summary Cards
- **Total Actual**: Total minutes logged in the period
- **Total Expected**: Total minutes planned in the period
- **Ratio**: Actual ÷ Expected, with color-coded border

### Bar Charts
- **By Category**: Groups tasks by category (work, personal, health, etc.)
  - Blue bars = actual time
  - Gray bars = expected time
- **By Task**: Individual task breakdown
  - Useful for identifying which tasks take longer than planned

### Task Table
- Sortable by task name, actual, expected, or ratio
- Color-coded ratio cells:
  - Green background = on target
  - Amber background = over target
  - Red background = far over target
- Quick reference for task-level analysis

## Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** and test locally:
   ```bash
   docker compose up -d
   # Make your changes
   # Vite will hot-reload automatically
   ```

3. **Commit with descriptive message:**
   ```bash
   git commit -m "Add feature description"
   ```

4. **Push and create PR:**
   ```bash
   git push origin feature/your-feature
   ```

## Testing the App

### Quick Start Test
```bash
# 1. Create a task
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Task","category":"work"}'

# 2. Plan it for today
TODAY=$(date +%Y-%m-%d)
curl -X POST http://localhost:4000/api/plans \
  -H "Content-Type: application/json" \
  -d "{\"task_id\":1,\"planned_date\":\"$TODAY\",\"expected_mins\":120}"

# 3. Log time
curl -X POST http://localhost:4000/api/sessions \
  -H "Content-Type: application/json" \
  -d "{\"task_id\":1,\"logged_date\":\"$TODAY\",\"actual_mins\":90}"

# 4. View summary
curl http://localhost:4000/api/summary?period=daily&date=$TODAY | jq .
```

### UI Test
1. Open http://localhost:3000
2. Go to Weekly Plan and add tasks
3. Go to Calendar and log time
4. Go to Dashboard and check charts/ratio colors

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

## Architecture Notes

### Frontend State Management
- **Zustand stores**: `useTaskStore`, `usePlanStore`, `useSessionStore`
- Stores are hydrated from API on page load
- Updates are optimistic (UI changes immediately, API called in background)

### Backend Design
- **Express routes** organized by resource: tasks, plans, sessions, summary
- **pg pool singleton** for efficient database connections
- **express-validator** for input validation on all endpoints
- **Date utilities** handle week/month calculations

### Database
- All queries use parameterized statements to prevent SQL injection
- Foreign keys cascade on delete
- Indexes on commonly-queried columns (task_id, date fields)

## Known Limitations & Future Ideas

- No user authentication yet (multi-user support)
- No recurring task templates
- No edit UI for existing tasks (only via API)
- No export to CSV/PDF
- No mobile-responsive design (desktop-first)
- No time tracking timer (manual entry only)
- No Slack/email integrations

## License

MIT

## Contributing

Contributions welcome! Please follow the conventions in CLAUDE.md.
