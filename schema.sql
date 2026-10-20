-- MyGymTrack schema, v2 (multi-user). Paste into the Neon SQL editor and run.
-- Safe to run several times, and upgrades a v1 (single-user) database in place:
-- existing data is kept and given to the first account created.
DO $$
BEGIN
  create table if not exists users (
    id serial primary key,
    email text not null unique,
    password_hash text not null,
    name text not null,
    created_at timestamptz not null default now(),
    goal text not null default 'muscle',        -- muscle | fat | strength | fit
    experience text not null default 'beginner', -- beginner | intermediate | advanced
    days_per_week integer not null default 3,
    equipment text not null default 'gym',       -- gym | dumbbells | bodyweight
    sex text,                                    -- m | f
    birth_year integer,
    height_cm real,
    onboarded boolean not null default false
  );

  create table if not exists auth_sessions (
    id text primary key, -- sha256 of the cookie token
    user_id integer not null references users(id) on delete cascade,
    expires_at timestamptz not null
  );
  create index if not exists auth_sessions_user_idx on auth_sessions(user_id);

  create table if not exists password_resets (
    id text primary key, -- sha256 of the emailed token
    user_id integer not null references users(id) on delete cascade,
    expires_at timestamptz not null,
    used boolean not null default false
  );

  -- Rate limiting (login attempts, sign-ups, AI calls).
  create table if not exists rate_events (
    key text not null,
    at timestamptz not null default now()
  );
  create index if not exists rate_events_idx on rate_events(key, at);

  create table if not exists sessions (
    id serial primary key,
    date date not null
  );
  alter table sessions add column if not exists user_id integer references users(id) on delete cascade;
  alter table sessions add column if not exists title text;
  alter table sessions add column if not exists plan_day integer; -- index of the programme day, null for a free session
  create index if not exists sessions_user_idx on sessions(user_id, date);

  create table if not exists sets (
    id serial primary key,
    session_id integer not null references sessions(id) on delete cascade,
    muscle text not null,
    exercise text not null,
    weight_kg real not null,
    reps integer not null,
    created_at timestamptz not null default now()
  );
  create index if not exists sets_session_idx on sets(session_id);
  create index if not exists sets_exercise_idx on sets(exercise);

  create table if not exists meals (
    id serial primary key,
    date date not null,
    name text,
    calories integer not null,
    protein_g real not null default 0
  );
  alter table meals add column if not exists user_id integer references users(id) on delete cascade;
  alter table meals add column if not exists carbs_g real not null default 0;
  alter table meals add column if not exists fat_g real not null default 0;
  create index if not exists meals_user_idx on meals(user_id, date);

  create table if not exists body_weight (
    id serial primary key,
    date date not null,
    weight_kg real not null
  );
  alter table body_weight add column if not exists user_id integer references users(id) on delete cascade;
  create index if not exists body_weight_user_idx on body_weight(user_id, date);

  create table if not exists settings (
    key text not null,
    value text not null
  );
  alter table settings add column if not exists user_id integer references users(id) on delete cascade;
  alter table settings drop constraint if exists settings_pkey;
  create unique index if not exists settings_user_key on settings(user_id, key);

  create table if not exists coach_reports (
    id serial primary key,
    created_at timestamptz not null default now(),
    content text not null
  );
  alter table coach_reports add column if not exists user_id integer references users(id) on delete cascade;

  -- Training programme written by the coach (JSON, see lib/plan.ts).
  create table if not exists plans (
    id serial primary key,
    user_id integer not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    content jsonb not null
  );
  create index if not exists plans_user_idx on plans(user_id, id);

  -- Shared by everyone: weekly research notes and French translations of exercise instructions.
  create table if not exists research_notes (
    id serial primary key,
    title text not null,
    summary text not null,
    source_url text not null unique,
    created_at timestamptz not null default now()
  );

  create table if not exists exercise_fr (
    id text primary key,
    steps jsonb not null
  );

  -- Web push subscriptions for streak reminders.
  create table if not exists push_subscriptions (
    endpoint text primary key,
    user_id integer not null references users(id) on delete cascade,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
  );
END $$;
