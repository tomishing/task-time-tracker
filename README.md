# Task Time Tracker

A full-stack time tracking application to log daily task progress, plan weekly tasks, and visualize productivity metrics.

## Features

- **Calendar View**: Click any date to see planned tasks and navigate to the log page
  - Month navigation (Prev / Today / Next)
  - Task chips on each calendar day (up to 3 shown, +N more) — loaded automatically for the full month
  - Side panel shows the full task list for the selected date
  - Clicking a date with no tasks redirects automatically to Weekly Plan

- **Log Time**: Dedicated page per date for recording actual time
  - Table of planned tasks with Planned, Timer, and Actual columns
  - **Timer**: Per-task stopwatch with Start, Pause, and Stop buttons
    - Increments by 1-minute intervals every 60 seconds
    - Timer value persists across page navigation via localStorage
    - Stop button transfers timer value to Actual column
  - Click any value in the Actual column to edit inline
  - Actual time is color-coded against the plan (green / amber / red)
  - Totals row shows planned vs. logged minutes

- **Dashboard**: Visualize productivity with Recharts
  - Toggle between Daily, Weekly, and Monthly views
  - Date navigation: Prev / Today / Next buttons for all periods
  - Date label shows the exact date, week range, or month for the selected period
  - **Weekly view**: Line chart showing daily task progress across the week
  - **Monthly view**: Clustered bar chart showing actual time by task and week (1st–4th)
  - Bar charts by category and by task
  - Summary cards showing totals and ratio
  - Task breakdown table with color-coded ratios
  - Ratio coloring: Green (≤100%), Amber (100–150%), Red (>150%)

- **Weekly Plan**: Pre-plan expected time for each day
  - Week navigation (Prev / This Week / Next)
  - Add tasks with expected minutes per day
  - **Whole Week** option — repeat a task across all 7 days at once with one click
  - 7-day grid (Sunday–Saturday) showing all planned tasks
  - Inline editing of expected minutes
  - Delete planned tasks from any day

- **Tasks**: Manage the master task list
  - Add tasks with name and category
  - Delete tasks (cascades to plans and sessions)
  - Category badges: Work, Personal, Health, Learning, Other

- **Ratio Tracking**: Compare actual vs. expected time
  - Displayed as percentage (e.g., 120%)
  - Aggregated by category, by task, and overall
  - Visual indicators for over/under target

- **Robust Error Handling**: Professional UX across all pages
  - Loading spinners during async operations
  - Error states with retry buttons
  - Empty states with helpful guidance

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
│   │   ├── pages/         # Calendar, Dashboard, WeeklyPlan, Tasks, LogTime
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

1. **Clone & configure:**
   ```bash
   git clone https://github.com/tomishing/task-time-tracker.git
   cd task-time-tracker
   cp .env.example .env
   ```

2. **Start with Docker:**
   ```bash
   docker compose up
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
- `GET /api/sessions?date=YYYY-MM-DD` — Sessions for a date
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
1. Go to **Tasks** and add tasks to the master list
2. Go to **Weekly Plan**
3. Select a task, pick a day (or **Whole Week** to add it to all 7 days), and set expected minutes
4. Edit expected minutes inline as plans change

### 2. Log Your Time (Daily)
1. Go to **Calendar** and click a date
   - If no tasks are planned for that date, you'll be redirected to **Weekly Plan** to add some
2. Side panel shows all planned tasks for that day
3. Click **Log Time for This Day** to open the log page
4. For each task, you can either:
   - **Use the Timer**: Click Start to begin counting, Pause to stop counting, Stop to transfer time to Actual
   - **Edit Directly**: Click any value in the **Actual** column to edit it inline
5. Press Enter or click away to save
6. Timer values persist across page navigation—pause a timer, navigate away, and return to resume

### 3. Review Progress
1. Go to **Dashboard**
2. Toggle between Daily, Weekly, or Monthly views
3. Use Prev / Today / Next to navigate to different dates
4. Check the date label to confirm the period you're viewing
5. Review the charts:
   - **Weekly view**: Line chart shows daily task progress across the week
   - **Monthly view**: Clustered bar chart shows time distribution by task and week
6. Check your ratio in the summary card:
   - **Green (≤100%)**: On or under target
   - **Amber (100–150%)**: Over-invested in this task
   - **Red (>150%)**: Spent much more than planned
7. Examine the task breakdown table for details

## Key Concepts

### Ratio Logic
- `ratio = actual_mins / expected_mins`
- Displayed as percentage: `ratio * 100` → e.g., `120%`
- If `expected_mins = 0`, display as `—` (no expectations set)
- No cap on ratio — shows 150%, 200%, etc. as-is

**Color Coding:**
- **≤100%** (Green) — On target
- **100–150%** (Amber) — Over by up to 50%
- **>150%** (Red) — Over by more than 50%

### Date Handling
- Frontend uses `date-fns` for date manipulation
- Database uses `DATE` type (no timezone needed for dates)
- Week runs Sunday–Saturday on both client and server
- Monthly view covers the 1st through last day of the month

## Dashboard Visualizations

### Summary Cards
- **Total Actual**: Total minutes logged in the period
- **Total Expected**: Total minutes planned in the period
- **Ratio**: Actual ÷ Expected, with color-coded border

### Period Date Label
- **Daily**: Full date — e.g., `Sunday, May 24, 2026`
- **Weekly**: Date range — e.g., `May 24 – May 30, 2026`
- **Monthly**: Month and year — e.g., `May 2026`

### Date Navigation
- **Prev / Today / Next** buttons let you navigate between:
  - Days (in Daily view)
  - Weeks (in Weekly view)
  - Months (in Monthly view)
- Useful for reviewing historical productivity data

### Line Chart (Weekly View)
- **Daily Task Progress**: Shows actual time spent per task for each day of the week
- X-axis: Days (Sun–Sat)
- Y-axis: Minutes
- Legend: Task names (one line per task with distinct colors)
- Helps identify which tasks took longer on specific days

### Clustered Bar Chart (Monthly View)
- **Actual Time by Task and Week**: Shows how time was distributed across weeks
- X-axis: Task names
- Y-axis: Actual minutes
- Legend: Week 1 (days 1–7), Week 2 (days 8–14), Week 3 (days 15–21), Week 4 (days 22–end)
- Each task shows up to 4 bars for each week
- Useful for seeing workload distribution across the month

### Bar Charts (All Views)
- **By Category**: Groups tasks by category (work, personal, health, etc.)
  - Blue bars = actual time, gray bars = expected time
- **By Task**: Individual task breakdown — useful for spotting which tasks run long

### Task Table
- Color-coded ratio cells: green / amber / red backgrounds
- Quick reference for task-level analysis

## Environment Variables

See `.env.example` for all required variables.

Key variables:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — Database config
- `DATABASE_URL` — Connection string for Node.js
- `VITE_API_URL` — Frontend API endpoint (default: http://localhost:4000)
- `PORT` — Server port (default: 4000)

## Troubleshooting

### Database connection fails
- Check `.env` has the correct `POSTGRES_PASSWORD` matching docker-compose.yml
- Ensure the PostgreSQL container is running: `docker ps`
- Check logs: `docker compose logs db`

### Port already in use
```bash
lsof -i :3000  # Frontend
lsof -i :4000  # API
lsof -i :5432  # Database
```

### Clear all data
```bash
docker compose down -v
docker compose up
```

## Architecture Notes

### Frontend State Management
- **Zustand stores**: `useTaskStore`, `usePlanStore`, `useSessionStore`
- Stores are hydrated from API on page load

### Backend Design
- **Express routes** organized by resource: tasks, plans, sessions, summary
- **pg pool singleton** for efficient database connections
- **express-validator** for input validation on all endpoints
- **Date utilities** handle week/month boundary calculations

### Database
- All queries use parameterized statements to prevent SQL injection
- Foreign keys cascade on delete (deleting a task removes its plans and sessions)

## License

MIT
