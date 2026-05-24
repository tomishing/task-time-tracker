# Task Time Tracker — CLAUDE.md

## Stack

- **Frontend**: React 18 + Vite, React Router v6, Zustand (state), Recharts (charts), Tailwind CSS
- **Backend**: Node.js + Express, pg (node-postgres), express-validator
- **Database**: PostgreSQL 17
- **Infra**: Docker + Docker Compose (one service per container)

---

## Project structure

```
/
├── client/               # React app
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Calendar, Dashboard, WeeklyPlan
│   │   ├── store/        # Zustand stores
│   │   └── api/          # fetch wrappers (api/tasks.js, api/sessions.js, etc.)
│   └── Dockerfile
├── server/               # Express API
│   ├── routes/           # tasks.js, sessions.js, summary.js, plans.js
│   ├── db/
│   │   ├── index.js      # pg Pool singleton
│   │   └── migrations/   # SQL migration files (001_init.sql, etc.)
│   └── Dockerfile
├── docker-compose.yml
└── CLAUDE.md
```

---

## Database schema

```sql
-- Tasks (master list, can be pre-added for the week)
CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('work','personal','health','learning','other')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Weekly plan: pre-planned tasks with expected hours per day
CREATE TABLE weekly_plans (
  id            SERIAL PRIMARY KEY,
  task_id       INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  planned_date  DATE NOT NULL,
  expected_mins INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Actual time records (one row per manual log or timer session)
CREATE TABLE time_sessions (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  actual_mins INTEGER NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## API design

All responses use `{ data, error }` envelope. Use 422 for validation errors, 500 for unexpected.

| Method | Route                                       | Description                                            |
| ------ | ------------------------------------------- | ------------------------------------------------------ |
| GET    | /api/tasks                                  | List all tasks                                         |
| POST   | /api/tasks                                  | Create task `{ name, category }`                       |
| DELETE | /api/tasks/:id                              | Delete task                                            |
| GET    | /api/plans?week=YYYY-MM-DD                  | Weekly plan for the week containing that date          |
| POST   | /api/plans                                  | Add plan `{ task_id, planned_date, expected_mins }`    |
| PUT    | /api/plans/:id                              | Update expected time                                   |
| DELETE | /api/plans/:id                              | Remove from plan                                       |
| POST   | /api/sessions                               | Log time `{ task_id, logged_date, actual_mins, note }` |
| DELETE | /api/sessions/:id                           | Delete a log entry                                     |
| GET    | /api/summary?period=daily&date=YYYY-MM-DD   | Aggregate for one day                                  |
| GET    | /api/summary?period=weekly&date=YYYY-MM-DD  | Aggregate for the week                                 |
| GET    | /api/summary?period=monthly&date=YYYY-MM-DD | Aggregate for the month                                |

### Summary response shape

```json
{
  "data": {
    "period": "weekly",
    "total_actual_mins": 1320,
    "total_expected_mins": 1200,
    "ratio": 1.1,
    "by_category": [
      {
        "category": "work",
        "actual_mins": 780,
        "expected_mins": 720,
        "ratio": 1.08
      }
    ],
    "by_task": [
      {
        "task_id": 3,
        "name": "API integration",
        "actual_mins": 240,
        "expected_mins": 200,
        "ratio": 1.2
      }
    ]
  }
}
```

---

## Ratio logic

- `ratio = actual_mins / expected_mins`
- Display as percentage: `ratio * 100` → e.g. `120%`
- If `expected_mins = 0`, display ratio as `—` (no expected set)
- No cap on ratio — show 150%, 200%, etc. as-is

---

## Key UI flows

### 1. Log time for a date

1. User clicks a date on the calendar
2. Side panel opens showing: tasks planned for that day + any already-logged sessions
3. User picks a task from the planned list (or types to add a new one)
4. Enters actual minutes (or hours) + optional note → POST /api/sessions

### 2. Weekly planning

1. User goes to Weekly Plan page, sees the current week (Mon–Sun)
2. For each day, can search/select from master task list and set expected_mins
3. Saves to `weekly_plans` table
4. These appear as suggestions when logging time on the Calendar page

### 3. Dashboard

- Toggle: Daily | Weekly | Monthly
- Charts (Recharts): bar chart of actual vs expected by day/category
- Table: task breakdown with actual, expected, ratio columns
- Ratio > 100% shown in amber; ratio > 150% shown in red

---

## Docker Compose

```yaml
services:
  db:
    image: tomishing/postgis:17
    environment:
      POSTGRES_DB: timetracker
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./server/db/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  server:
    build: ./server
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/timetracker
      PORT: 4000
    ports:
      - "4000:4000"
    depends_on:
      - db

  client:
    build: ./client
    environment:
      VITE_API_URL: http://localhost:4000
    ports:
      - "3000:3000"
    depends_on:
      - server

volumes:
  pg_data:
```

---

## Coding conventions

- TypeScript throughout (`.tsx` for React, `.ts` for server)
- Functional React components only, no class components
- Zustand stores: one per domain (`useTaskStore`, `usePlanStore`, `useSessionStore`)
- All DB queries go through `server/db/index.js` pool — no raw pg calls in route handlers
- Date handling: use `date-fns` on frontend, `DATE` type in Postgres (no timezone needed for dates)
- Tailwind only for styling — no inline styles, no CSS modules
