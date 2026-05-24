-- Tasks (master list, can be pre-added for the week)
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('work','personal','health','learning','other')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Weekly plan: pre-planned tasks with expected hours per day
CREATE TABLE IF NOT EXISTS weekly_plans (
  id            SERIAL PRIMARY KEY,
  task_id       INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  planned_date  DATE NOT NULL,
  expected_mins INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Actual time records (one row per manual log or timer session)
CREATE TABLE IF NOT EXISTS time_sessions (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  actual_mins INTEGER NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
